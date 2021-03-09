/**
 * Created by krasilneg on 12.01.18.
 */
'use strict';

const MineBuilder = require('./interfaces/MineBuilder');
const { Logger } = require('@iondv/commons-contracts');
const { t } = require('@iondv/i18n');
const {format} = require('util');

/**
 * @param {{}} options
 * @param {ReportMetaRepository} options.meta
 * @param {{}} options.mineBuilders
 * @param {Logger} [options.log]
 */
module.exports = function (options) {
  let mines = options.meta.getDataMines(true);
  let p = Promise.resolve();
  mines.forEach((m) => {
    if (options.mineBuilders.hasOwnProperty(m.namespace())) {
      m.sources().forEach(
        (src) => {
          if (
            options.mineBuilders[m.namespace()].hasOwnProperty(m.name()) &&
            options.mineBuilders[m.namespace()][m.name()].hasOwnProperty(src.name) &&
            options.mineBuilders[m.namespace()][m.name()][src.name] instanceof MineBuilder) {
            let b = options.mineBuilders[m.namespace()][m.name()][src.name];
            p = p.then(() => {
              if (options.log instanceof Logger) {
                options.log.log(format(t('Data source %s.%s build started'), m.caption(), src.caption));
              }
              return b
                .buildSource(m.canonicalName(), src, {namespace: m.namespace()})
                .then(() => {
                  if (options.log instanceof Logger) {
                    options.log.log(format(t('Data source %s.%s build complete'),  m.caption(), src.caption));
                  }
                });
            });
          }
        }
      );
    }
  });
  return p;
};