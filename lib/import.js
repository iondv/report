/**
 * Created by kras on 18.08.16.
 */
'use strict';

const path = require('path');
const { di, utils: { config: { processDirAsync, readConfigFiles }, system: { toAbsolute } } } = require('@iondv/core');
const { t } = require('@iondv/i18n');
const { FunctionCodes: F } = require('@iondv/meta-model-contracts');
const { log: { IonLogger } } = require('@iondv/commons');
const extend = require('extend');
const fs = require('fs');

let config_file = process.argv[2] || process.env.ION_CONFIG_PATH || 'config';

config_file = path.isAbsolute(config_file)
  ? config_file
  : path.normalize(path.join(process.cwd(), config_file));

const config = fs.existsSync(config_file) ? require(config_file) : {};

const module_config = require('../config');

const { format } = require('util');

const sysLog = new IonLogger(config.log || {});

/**
 * @param {Logger} log
 * @param {String} msg
 */
function info(log, msg) {
  if (log) {
    log.log(msg);
  } else {
    console.log(msg);
  }
}

/**
 * @param {Logger} log
 * @param {String} msg
 */
function warn(log, msg) {
  if (log) {
    log.warn(msg);
  } else {
    console.warn(msg);
  }
}

/**
 * @param {String} src
 * @param {DataSource} dataSource
 * @param {String} namespace
 * @param {Logger} log
 * @returns {*}
 */
function loader(src, dataSource, namespace, log) {
  return processDirAsync(src)
    .then(readConfigFiles)
    .then(metas => {
      let p = Promise.resolve();
      Object.keys(metas).forEach(fname => {
        let meta = metas[fname];
        let m = {};
        m.name = meta.name;
        m.namespace = namespace;
        m.meta = JSON.stringify(meta);
        info(log, format(t('Writing data mine %s to database.'), m.name));
        p = p.then(() => dataSource.upsert(
            'ion_bi_mine',
            {
              [F.AND]: [
                {[F.EQUAL]: ['$name', m.name]},
                {[F.EQUAL]: ['$namespace', namespace]}
              ]
            },
            m));
        });
      return p;
      })
    .catch((e) => {
      if (e.code === 'ENOENT') {
        warn(log, format(t('Report module meta model directory %s not found'), src));
        return Promise.resolve();
      }
      throw e;
    });
}

function navLoader(src, dataSource, namespace, log) {
  return processDirAsync(src)
    .then(readConfigFiles)
    .then(metas => {
      let p = Promise.resolve();
      Object.keys(metas).forEach(fname => {
        let meta = metas[fname];
        meta.namespace = meta.namespace || namespace;
        info(log, format(t('Writing navigation node %s to database.'), meta.code));
        p = p.then(() => dataSource.upsert(
          'ion_bi_nav',
          {
            [F.AND]: [
              {[F.EQUAL]: ['$code', meta.code]},
              {[F.EQUAL]: ['$namespace', meta.namespace]}
            ]
          },
          meta));
      });
      return p;
    })
    .catch((e) => {
      if (e.code === 'ENOENT') {
        warn(log, format(t('Report module meta model directory %s not found'), src));
        return Promise.resolve();
      }
      throw e;
    });
}

module.exports = function (src, moduleName, namespace) {
  return di(
    'boot',
    extend(
      true,
      {        
        settings: {
          module: '@iondv/commons/lib/settings/SettingsRepository',
          initMethod: 'init',
          initLevel: 1,
          options: {
            logger: 'ion://sysLog'
          }
        }
      },
      config.bootstrap || {}
    ),
    { sysLog }
  ).then(scope =>
    di(
      'app',
      extend(
        true,
        config.di,
        module_config.di,
        scope.settings.get('plugins') || {},
        scope.settings.get(`${moduleName}.di`) || {}
      ),
      {},
      'boot',
      ['reportMeta']
    )
  )
  .then(
    (scope) => {
      src = toAbsolute(src);
      info(scope.sysLog, format(t('Importing report module meta model from %s'), src));
      return loader(src, scope.reportMeta.dataSource, namespace, scope.sysLog)
        .then(() => navLoader(path.join(src, 'navigation'), scope.reportMeta.dataSource, namespace, scope.sysLog));
    }
  );
};
