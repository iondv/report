/**
 * Created by kras on 18.08.16.
 */
'use strict';

const path = require('path');
const di = require('core/di');
const config = require('../config');
const moduleName = require('../module-name');
const {processDirAsync, readConfigFiles} = require('core/util/read');
const F = require('core/FunctionCodes');

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
        info(log, 'Шахта данных ' + m.name + ' будет записана в БД.');
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
        warn(log, 'Не найдена директория метаданных модуля отчетов ' + src);
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
        info(log, 'Узел навигации данных ' + meta.code + ' будет записан в БД.');
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
        warn(log, 'Не найдена директория метаданных модуля отчетов ' + src);
        return Promise.resolve();
      }
      throw e;
    });
}

module.exports = function (src, namespace) {
  return di(
      moduleName,
      config.di,
      {},
      'app',
    ['background'],
      'modules/' + moduleName
    ).then(
      function (scope) {
        let pth = path.resolve(path.join(__dirname, '..', '..', '..'), src);
        info(scope.sysLog, 'Импорт меты модуля отчетов из ' + pth);
        return loader(pth, scope.reportMeta.dataSource, namespace, scope.sysLog)
          .then(() => navLoader(path.join(pth, 'navigation'), scope.reportMeta.dataSource, namespace, scope.sysLog));
      }
    );
};
