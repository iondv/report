/**
 * Created by kras on 27.12.16.
 */
'use strict';
const ReportMetaRepository = require('../interfaces/ReportMetaRepository');
const Calculator = require('core/interfaces/Calculator');
const DataMine = require('../DataMine');
const GLOBAL_NS = '__global';

/**
 * @param {{dataSource: DataSource, calc: Calculator}} options
 * @constructor
 */
function DsReportMetaRepository(options) {

  var minesByName = {};
  var mines = {};

  var nodeByCode = {};
  var navRoots = {};

  this.dataSource = options.dataSource;

  /**
   * Метод выполняет инициализацию репозитрия, осуществляя загрузку метаданных
   * возвращает обещание для передачи управления вызывающему коду
   *
   * @returns {Promise}
   */
  this.init = function () {
    return options.dataSource.fetch('ion_bi_mine')
      .then((metas) => {
        metas.forEach((meta) => {
          let ns = meta.namespace || GLOBAL_NS;
          if (!mines.hasOwnProperty(ns)) {
            minesByName[ns] = {};
            mines[ns] = [];
          }

          meta = JSON.parse(meta.meta);
          meta.namespace = ns;
          if (options.calc instanceof Calculator) {
            meta.reports.forEach(
              function (r) {
                r.sheets.forEach(function (s) {
                  if (s.process) {
                    for (let nm in s.process) {
                      if (s.process.hasOwnProperty(nm)) {
                        s.process[nm] = options.calc.parseFormula(s.process[nm]);
                      }
                    }
                  }
                  if (s.className && s.type === 'list') {
                    s.fetch.forEach((fld) => {
                      if (fld.expr.indexOf('(') >= 0) {
                        fld.expr = options.calc.parseFormula(fld.expr);
                      }
                    });
                  }
                });
              }
            );
          }

          let m = new DataMine(meta);
          minesByName[ns][m.name()] = m;
          mines[ns].push(m);
        });
      })
      .then(() => options.dataSource.fetch('ion_bi_nav'))
      .then((nav) => {
        if (!nav.length) {
          Object.keys(mines).forEach((ns) => {
            if (mines.hasOwnProperty(ns)) {
              if (!navRoots.hasOwnProperty(ns)) {
                navRoots[ns] = [];
              }
              if (!nodeByCode.hasOwnProperty(ns)) {
                nodeByCode[ns] = {};
              }
              mines[ns].forEach((m) => {
                let root = {
                  code: m.name(),
                  namespace: m.namespace(),
                  caption: m.caption(),
                  subs: []
                };
                navRoots[ns].push(root);
                nodeByCode[ns][m.name] = root;
                m.reports().forEach((r) => {
                  let sub = {
                    code: m.name() + '.' + r.name(),
                    namespace: m.namespace(),
                    caption: r.caption(),
                    mine: m.canonicalName(),
                    report: r.name()
                  };
                  root.subs.push(sub);
                  nodeByCode[ns][sub.code] = sub;
                });
                root.subs.sort(order);
              });
            }
          });
        } else {
          nav.forEach((n) => {
            let ns = n.namespace || GLOBAL_NS;
            if (!navRoots.hasOwnProperty(ns)) {
              navRoots[ns] = [];
            }
            if (!nodeByCode.hasOwnProperty(ns)) {
              nodeByCode[ns] = {};
            }
            n.subs = [];
            nodeByCode[ns][n.code] = n;
            if (!n.parent) {
              navRoots[ns].push(n);
            }
            navRoots[ns].sort(order);
          });
          for (let ns in nodeByCode) {
            if (nodeByCode.hasOwnProperty(ns)) {
              for (let code in nodeByCode[ns]) {
                if (nodeByCode[ns].hasOwnProperty(code)) {
                  let n = nodeByCode[ns][code];
                  if (n.parent && nodeByCode[ns].hasOwnProperty(n.parent)) {
                    nodeByCode[ns][n.parent].subs.push(n);
                  }
                }
              }
            }
          }
          for (let ns in nodeByCode) {
            if (nodeByCode.hasOwnProperty(ns)) {
              for (let code in nodeByCode[ns]) {
                if (nodeByCode[ns].hasOwnProperty(code)) {
                  let n = nodeByCode[ns][code];
                  if (Array.isArray(n.subs)) {
                    n.subs.sort(order);
                  }
                }
              }
            }
          }
        }
      });
  };

  function parseCode(code) {
    if (code && code.indexOf('@') >= 0) {
      code = code.split('@');
      return {code: code[1], namespace: code[0]};

    }
    return {code: code};
  }

  /**
   * Метод возвращает шахты данных указанного пространства имен
   *
   * @param {String} [namespace] - пространство имен
   * @returns {DataMine[]}
   */
  this._getDataMines = function (namespace) {
    if (namespace === true) {
      let result = [];
      for (let ns in mines) {
        if (mines.hasOwnProperty(ns)) {
          result.push(...mines[ns]);
        }
      }
      return result;
    }
    return mines[namespace || GLOBAL_NS] || [];
  };

  /**
   * Метод возвращает шахту данных соответствующую имени name
   *
   * @param {String} name - код узла
   * @param {String} [namespace] - пространство имен
   * @returns {DataMine | null}
   */
  this._getDataMine = function (name, namespace) {
    let mid = parseCode(name);
    var ns = mid.namespace || namespace || GLOBAL_NS;
    if (minesByName.hasOwnProperty(ns)) {
      if (minesByName[ns].hasOwnProperty(mid.code)) {
        return minesByName[ns][mid.code];
      }
    }
    return null;
  };

  function order(a, b) {
    return (a.order || 0) - (b.order || 0);
  }

  this._getNavigationNodes = function (parent, namespace) {
    let p = parseCode(parent);
    let ns = p.namespace || namespace;
    if (ns === true) {
      ns = GLOBAL_NS;
    }

    if (ns) {
      if (p.code) {
        if (nodeByCode.hasOwnProperty(ns) && nodeByCode[ns].hasOwnProperty(p.code)) {
          return nodeByCode[ns][p.code].subs || [];
        }
      } else {
        if (navRoots.hasOwnProperty(ns)) {
          return navRoots[ns] || [];
        }
      }
    } else {
      let result = [];
      if (p.code) {
        throw new Error('Не указано пространство имен узла навигации!');
      } else {
        for (let ns in navRoots) {
          if (navRoots.hasOwnProperty(ns)) {
            result.push(...navRoots[ns]);
          }
        }
      }
      return result.sort(order);
    }
    return [];
  };

  this._getNavigationNode = function (code, namespace) {
    let nid = parseCode(code);
    let ns = nid.namespace || namespace || GLOBAL_NS;
    if (nodeByCode.hasOwnProperty(ns) && nodeByCode[ns].hasOwnProperty(nid.code)) {
      return nodeByCode[ns][nid.code];
    }
    return null;
  };
}

DsReportMetaRepository.prototype = new ReportMetaRepository();

module.exports = DsReportMetaRepository;
