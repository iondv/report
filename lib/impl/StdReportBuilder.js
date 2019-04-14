/**
 * Created by krasilneg on 27.12.16.
 */
'use strict';
const ReportBuilder = require('../interfaces/ReportBuilder');
const parseConditions = require('core/ConditionParser');
const clone = require('clone');
const moment = require('moment');
const Operations = require('core/FunctionCodes');
const Item = require('core/interfaces/DataRepository').Item;
const PropertyTypes = require('core/PropertyTypes');
const F = require('core/FunctionCodes');
const parseMineName = require('../util/parseMineName');

// jshint maxcomplexity:20, maxstatements: 40, maxdepth

/**
 * @param {{dataSource: DataSource, dataRepo: DataRepository, metaRepo: MetaRepository}} cOptions
 * @constructor
 */
function MongoReportBuilder(cOptions) {

  const SOURCE_NOT_READY = '__SOURCE_NOT_READY__';

  function processExpression(expr, params) {
    let result;
    if (Array.isArray(expr)) {
      result = [];
      expr.forEach((e) => {
        result.push(processExpression(e, params));
      });
      return result;
    }

    if (typeof expr !== 'object' || expr instanceof Date) {
      if (typeof expr === 'string' && expr && expr[0] === ':') {
        if (typeof params[expr.substr(1)] !== 'undefined') {
          return processExpression(params[expr.substr(1)], params);
        }
        return null;
      }

      if (!isNaN(expr) && !(expr instanceof Date)) {
        return Number(expr);
      }

      return expr;
    }

    result = {};
    for (let nm in expr) {
      if (expr.hasOwnProperty(nm)) {
        if (nm === Operations.LITERAL) {
          return expr;
        } else {
          result[nm] = processExpression(expr[nm], params);
        }
      }
    }
    return result;
  }

  function srcTn(mine, namespace, nm) {
    let dest = 'ion_bi_';
    if (mine.indexOf('@') > 0) {
      dest = dest + mine.replace('@', '_');
    } else {
      if (namespace) {
        dest = dest + namespace + '_';
      }
      dest = dest + mine;
    }
    return dest + '_' + nm;
  }

  /**
   * @param {String} mine
   * @param {String} namespace
   * @param {Object[]} joins
   * @returns {Object[]}
   */
  function processJoins(mine, namespace, joins, params) {
    let result = [];
    joins.forEach((j) => {
      let j2 = clone(j);
      j2.table = srcTn(mine, namespace, j.table);
      if (j.filter) {
        j2.filter = processSheetFilter(j.filter, params);
      }
      if (j.fetch) {
        processFetch(j.fetch, j2, params);
      }
      if (Array.isArray(j.join)) {
        j2.join = processJoins(mine, namespace, j.join, params);
      }
      result.push(j2);
    });
    return result;
  }

  function processSheetFilter(filter, params) {
    if (Array.isArray(filter)) {
      let result = [];
      filter.forEach((f) => {result.push(processSheetFilter(f, params));});
      return result;
    } else if (filter && typeof filter === 'object' && !(filter instanceof Date)) {
      let result = {};
      for (let nm in filter) {
        if (filter.hasOwnProperty(nm)) {
          result[nm] = processSheetFilter(filter[nm], params);
        }
      }
      return result;
    } else if (typeof filter === 'string' && filter && filter[0] === ':') {
      if (params.hasOwnProperty(filter.substr(1))) {
        return params[filter.substr(1)];
      }
      return null;
    }
    return filter;
  }

  function checkAggergator(expr) {
    if (Array.isArray(expr)) {
      for (let i = 0; i < expr.length; i++) {
        let aggr = checkAggergator(expr[i]);
        if (aggr) {
          return aggr;
        }
      }
    }

    if (expr && typeof expr === 'object') {
      for (let f in expr) {
        if (expr.hasOwnProperty(f)) {
          if (
            f === Operations.SUM ||
            f === Operations.AVG ||
            f === Operations.MAX ||
            f === Operations.MIN ||
            f === Operations.COUNT) {
            return f;
          }
        }
        let aggr = checkAggergator(expr[f]);
        if (aggr) {
          return aggr;
        }
      }
    }

    return false;
  }

  function processFetch(fetch, result, params, collectors) {
    for (let nm in fetch) {
      if (fetch.hasOwnProperty(nm)) {
        let tmp = fetch[nm];
        if (typeof tmp === 'object' && tmp) {
          let agreg = false;
          let aggr = checkAggergator(tmp);
          for (let ao in tmp) {
            if (tmp.hasOwnProperty(ao)) {
              if (ao === 'collect') {
                if (Array.isArray(collectors)) {
                  let collector = {};
                  collector.source = tmp[ao][0];
                  collector.fetch = tmp[ao][1];
                  collector.lkey = tmp[ao][2];
                  collector.rkey = tmp[ao][3];
                  if (tmp[ao].length > 4) {
                    collector.sort = tmp[ao][4];
                  }
                  collector.name = nm;

                  if (collector.source && collector.fetch && collector.lkey && collector.rkey) {
                    collectors.push(collector);
                  }
                  agreg = true;
                }
              } else if (aggr) {
                if (!result.aggregates) {
                  result.aggregates = {};
                }
                result.aggregates[nm] = {[ao]: processExpression(tmp[ao], params)};
                agreg = true;
              }
              break;
            }
          }
          if (agreg) {
            continue;
          }
        }

        if (!result.fields) {
          result.fields = {};
        }

        if (typeof tmp === 'object' && tmp) {
          result.fields[nm] = processExpression(tmp, false, params);
        } else {
          result.fields[nm] = tmp;
        }
      }
    }
  }

  /**
   * @param {String} mine
   * @param {{}} sheet
   * @param {{}} sheet.fetch
   * @param {{}} [sheet.filter]
   * @param {Array} [sheet.joins]
   * @param {{}} [options]
   * @param {{}} [options.filter]
   * @param {{}} [options.params]
   * @param {Number | String} [options.count]
   * @param {Number | String} [options.offset]
   * @param {Boolean} [options.countTotal]
   * @param {Array} [collectors]
   * @returns {{}}
   */
  function buildOptions(mine, sheet, options, collectors) {
    let result = {};
    if (sheet.filter) {
      result.filter = processSheetFilter(sheet.filter, options.params || {});
    }
    if (options) {
      if (options.filter) {
        result.filter = result.filter ? {[Operations.AND]: [result.filter, options.filter]} : options.filter;
      }
      if (options.offset) {
        result.offset = parseInt(options.offset) || null;
      }
      if (options.count) {
        result.count = parseInt(options.count) || null;
      }
      if (options.countTotal) {
        result.countTotal = true;
      }
    }

    processFetch(sheet.fetch, result, options.params || {}, collectors);

    if (Array.isArray(sheet.joins)) {
      result.joins = processJoins(mine, options.namespace, clone(sheet.joins), options.params || {});
    }

    if (sheet.sort) {
      result.sort = {};
      for (let k in sheet.sort) {
        if (sheet.sort.hasOwnProperty(k)) {
          result.sort[k] = sheet.sort[k] === 'asc' ? 1 : -1;
        }
      }
    }

    return result;
  }

  function doProcess(sheet, d) {
    return function () {
      let calculations = Promise.resolve();
      if (sheet.process) {
        for (let nm in sheet.process) {
          if (sheet.process.hasOwnProperty(nm) && typeof sheet.process[nm] === 'function') {
            calculations = calculations
              .then(() => sheet.process[nm].apply(d, [{}]))
              .then((r) => {
                d[nm] = r;
              });
          }
        }
      }
      return calculations;
    };
  }

  function dstn(mine, sheet, options) {
    let tbl = 'ion_bi_';
    if (mine.indexOf('@') > 0) {
      let parts = mine.split('@');
      tbl = tbl + parts[0] + '_';
      mine = parts[1];
    } else if (options && options.namespace) {
      tbl = tbl + options.namespace + '_';
    }
    return tbl + mine + '_' + sheet.source;
  }

  function groupId(flds, data) {
    let r = 'root';
    if (Array.isArray(flds) && flds.length) {
      flds.every(function (f) {
        if (r && data.hasOwnProperty(f)) {
          r = r + '|' + data[f];
          return true;
        } else {
          return false;
        }
      });
    }
    return r;
  }

  function flatten(value, lang) {
    if (Array.isArray(value)) {
      let result = [];
      value.forEach((v) => {result.push(flatten(v, lang));});
      return result;
    }
    if (value instanceof Item) {
      let props = value.getProperties();
      let result = {__id: value.getItemId()};
      for (let nm in props) {
        if (props.hasOwnProperty(nm)) {
          result[nm] = propertyValue(props[nm], lang);
        }
      }
      return result;
    }
    return value || '';
  }

  function propertyValue(p, lang) {
    if (p.meta.type === PropertyTypes.REFERENCE || p.meta.type === PropertyTypes.COLLECTION) {
      return flatten(p.evaluate(), lang);
    }
    return p.getDisplayValue((dv) => {
      if (!dv) {
        return '';
      }
      let d = moment(dv);
      if (lang) {
        d.locale(lang);
      }
      return d.format('L');
    });
  }

  function aggregate(mine, sheet, options) {
    let collectors = [];
    let opts = buildOptions(mine, sheet, options, collectors);
    collectors.forEach((collector) => {
      if (!sheet.fetch.hasOwnProperty(collector.lkey)) {
        opts.fields[collector.lkey] = '$' + collector.lkey;
      }
      if (!collector.fetch.hasOwnProperty(collector.rkey)) {
        collector.fetch[collector.rkey] = '$' + collector.rkey;
      }
    });

    return cOptions.dataSource.aggregate(dstn(mine, sheet, options), opts)
      .then((data) => {
        if (collectors.length === 0) {
          return data;
        }

        let p = Promise.resolve();

        collectors.forEach((collector) => {
          let dataByLeftKey = {};
          let ids = [];

          data.forEach((d) => {
            d[collector.name] = [];
            if (d[collector.lkey]) {
              if (!Array.isArray(dataByLeftKey[d[collector.lkey]])) {
                dataByLeftKey[d[collector.lkey]] = [];
              }
              dataByLeftKey[d[collector.lkey]].push(d);
              if (ids.indexOf(d[collector.lkey]) < 0) {
                ids.push(d[collector.lkey]);
              }
            }
          });

          if (ids.length) {
            let filter = {[Operations.IN]: ['$' + collector.rkey, ids]};
            p = p.then(() => {
              let sh = {
                source: collector.source,
                fetch: collector.fetch,
                filter: collector.filter ? {[Operations.AND]: [filter, collector.filter]} : filter,
                sort: collector.sort
              };
              return aggregate(mine, sh, {namespace: options.namespace, context: options.context, lang: options.lang});
            }).then((collections) => {
              collections.forEach((cd) => {
                if (dataByLeftKey.hasOwnProperty(cd[collector.rkey])) {
                  let containers = dataByLeftKey[cd[collector.rkey]];
                  containers.forEach((d) => {
                    d[collector.name].push(cd);
                  });
                }
              });
            });
          }
        });
        return p.then(() => data);
      });
  }

  /** Метод получающий данные раздела отчета
   * @param {String} mine
   * @param {{name: String, type: String, fetch: {}, source: String, groups: {totals: Array}}} sheet
   * @param {String} [sheet.className]
   * @param {String[]} [sheet.eager]
   * @param {{}} options
   * @param {String} [options.namespace]
   * @param {String} [options.context]
   * @param {String} [options.lang]
   * @returns {Promise}
   */
  this._sheetData = function (mine, sheet, options) {

    let p = Promise.resolve();

    //Проверка сорсов
    let sources = [];

    if (sheet.source) {
      sources.push(sheet.source);
    }
    if (sheet.groups && Array.isArray(sheet.groups.totals) && sheet.groups.totals.length) {
      sheet.groups.totals.forEach(function (t) {
        if (t.query && t.query.source && !sources.includes(t.query.source)) {
          sources.push(t.query.source);
        }
      });
    }
    if (sources.length) {
      p = p.then(() => {
        let nm = parseMineName(mine, options.namespace);
        return cOptions.dataSource.fetch(
          'ion_bi_sources',
          {
            filter: {
              [F.AND]: [
                {[F.EQUAL]: ['$mine', nm.name]},
                {[F.IN]: ['$name', sources]},
                {[F.EQUAL]: ['$namespace', nm.namespace]}
              ]
            }
          }
        ).then((res) => {
          let ss = {};
          res.forEach((r) => {
            ss[r.name] = r;
          });
          sources.forEach((s) => {
            if (!ss[s] || !ss[s].ready) {
              let e = new Error('Source not ready');
              e.code = SOURCE_NOT_READY;
              throw e;
            }
          });
        });
      });
    }

    let groupData = {};

    return p.then(() => {
      let gp = Promise.resolve();
      let gr = [];

      if (sheet.groups) {
        if (Array.isArray(sheet.groups.totals) && sheet.groups.totals.length) {
          sheet.groups.totals.forEach((total) => {
            if (total.query) {
              let totalOptions = clone(options);
              if (total.query.source !== sheet.source) {
                delete totalOptions.filter;
              }
              gp = gp.then(() => cOptions.dataSource.aggregate(
                dstn(mine, total.query, options),
                buildOptions(mine, total.query, totalOptions)
              ))
                .then(r => gr.push(r));
            }
          });
        }
      }
      return gp.then(() => gr);
    }).then((groupResults) => {
      for (let i = 0; i < groupResults.length; i++) {
        for (let j = 0; j < groupResults[i].length; j++) {
          let gid = groupId(sheet.groups.fields, groupResults[i][j]);
          if (gid) {
            if (!groupData[gid]) {
              groupData[gid] = {};
            }
            if (Array.isArray(sheet.groups.fields)) {
              for (let k = 0; k < sheet.groups.fields.length; k++) {
                delete groupResults[i][j][sheet.groups.fields[k]];
              }
            }
            groupData[gid][sheet.groups.totals[i].name] = groupResults[i][j];
          }
        }
      }

      if (sheet.className) {
        let cm = cOptions.metaRepo.getMeta(sheet.className, null, options.namespace);

        let f;
        if (sheet.filter) {
          if (Array.isArray(sheet.filter)) {
            f = parseConditions(
              sheet.filter,
              cm,
              options.context || {},
              options.lang
            );
          } else {
            f = sheet.filter;
          }
        }
        if (options && options.filter) {
          f = f ? {[Operations.AND]: [f, options.filter]} : options.filter;
        }

        let s;
        if (sheet.sort) {
          s = {};
          for (let k in sheet.sort) {
            if (sheet.sort.hasOwnProperty(k)) {
              s[k] = sheet.sort[k] === 'asc' ? 1 : -1;
            }
          }
        }

        let eager = [];
        if (Array.isArray(sheet.eager)) {
          sheet.eager.forEach((a) => {
            eager.push(a.split('.'));
          });
        }

        return cOptions.dataRepo
          .getList(
            cm.getCanonicalName(),
            {
              filter: f,
              sort: s,
              forceEnrichment: eager,
              count: options.listLimit || 100
            })
          .then((list) => {
            let result = [];
            let calcs = Promise.resolve();
            list.forEach((item) => {
              let d = {};
              sheet.fetch.forEach((fld) => {
                if (typeof fld.expr === 'function') {
                  calcs = calcs
                    .then(() => fld.expr.apply(item))
                    .then((v) => {
                      d[fld.field] = flatten(v, options.lang);
                    });
                } else {
                  d[fld.field] = propertyValue(item.property(fld.expr), options.lang);
                }
              });
              result.push(d);
            });
            return calcs.then(() => result);
          });
      } else {
        return aggregate(mine, sheet, options);
      }
    }).then((data) => {
      let process = Promise.resolve();
      // Считаем итоги
      for (let gid in groupData) {
        if (groupData.hasOwnProperty(gid)) {
          for (let tn in groupData[gid]) {
            if (groupData[gid].hasOwnProperty(tn)) {
              for (let tn2 in groupData[gid]) {
                if (groupData[gid].hasOwnProperty(tn2)) {
                  groupData[gid][tn][tn2] = groupData[gid][tn2];
                }
              }
              process = process.then(doProcess(sheet, groupData[gid][tn]));
            }
          }
        }
      }

      // Считаем данные
      data.forEach(function (d) {
        delete d._id;
        if (sheet.groups) {
          let gid = groupId(sheet.groups.fields, d);
          if (gid && groupData.hasOwnProperty(gid)) {
            for (let nm in groupData[gid]) {
              if (groupData[gid].hasOwnProperty(nm)) {
                d[nm] = groupData[gid][nm];
              }
            }
          }
        }
        process = process.then(doProcess(sheet, d));
      });

      return process.then(() => data);
    }).then(
      (data) => {
        if (Array.isArray(sheet.exclude)) {
          data.forEach((d) => {
              for (let i = 0; i < sheet.exclude.length; i++) {
                delete d[sheet.exclude[i]];
              }
          });
        }

        if (sheet.groups) {
          let groupedData = [];
          let groupTree = {};

          for (let gid in groupData) {
            if (groupData.hasOwnProperty(gid)) {
              for (let tn in groupData[gid]) {
                if (groupData[gid].hasOwnProperty(tn)) {
                  for (let tn2 in groupData[gid]) {
                    if (groupData[gid][tn].hasOwnProperty(tn2)) {
                      delete groupData[gid][tn][tn2];
                    }
                  }
                }
              }
            }
          }

          if (Array.isArray(sheet.groups.fields) && sheet.groups.fields.length) {
            data.forEach((d) => {
              let gr = groupTree;
              let gs = groupedData;
              let go = {};

              let g = null;
              for (let i = 0; i < sheet.groups.fields.length; i++) {
                let fn = sheet.groups.fields[i];
                if (sheet.groups.substitute && sheet.groups.substitute.hasOwnProperty(fn)) {
                  fn = sheet.groups.substitute[fn];
                }
                let gn = d[sheet.groups.fields[i]];
                let gt = null;
                if (!gr.hasOwnProperty(gn)) {
                  g = {};
                  g[sheet.groups.fields[i]] = d[fn];
                  go[sheet.groups.fields[i]] = gn;
                  let gid = groupId(sheet.groups.fields, go);
                  g._totals = [];
                  if (gid && groupData.hasOwnProperty(gid) && Array.isArray(sheet.groups.totals)) {
                    for (let tn in groupData[gid]) {
                      if (groupData[gid].hasOwnProperty(tn)) {
                        for (let j = 0; j < sheet.groups.totals.length; j++) {
                          if (!sheet.groups.totals[j].hidden && sheet.groups.totals[j].name === tn) {
                            let tv = {data: groupData[gid][tn]};
                            if (sheet.groups.totals[j].alarm) {
                              tv.alarm = true;
                            }
                            tv.name = sheet.groups.totals[j].name;
                            tv.title = sheet.groups.totals[j].caption;
                            g._totals.push(tv);
                          }
                        }
                      }
                    }
                  }
                  gt = {group: g};

                  gr[gn] = gt;
                  gs.push(g);

                  g._data = [];
                  if (i < sheet.groups.fields.length - 1) {
                      // G[sheet.groups.fields[i + 1]] = [];
                    gt.subs = {};
                  } else {
                      // G._data = [];
                  }
                } else {
                  go[sheet.groups.fields[i]] = gn;
                  gt = gr[gn];
                  g = gt.group;
                }

                if (i < sheet.groups.fields.length - 1) {
                  gr = gt.subs;
                  //Gs = g[sheet.groups.fields[i + 1]];
                  gs = g._data;
                }
                delete d[sheet.groups.fields[i]];
              }

              if (Array.isArray(sheet.groups.totals)) {
                sheet.groups.totals.forEach((t) => {
                  delete d[t.name];
                });
              }

              if (g && Array.isArray(g._data)) {
                g._data.push(d);
              }
            });
          }

          if (typeof groupData.root === 'object' && Array.isArray(sheet.groups.totals)) {
            let g = {};
            g._data = groupedData.length ? groupedData : data;
            g._totals = [];
            for (let tn in groupData.root) {
              if (groupData.root.hasOwnProperty(tn)) {
                for (let j = 0; j < sheet.groups.totals.length; j++) {
                  if (!sheet.groups.totals[j].hidden && sheet.groups.totals[j].name === tn) {
                    let tv = {data: groupData.root[tn]};
                    if (sheet.groups.totals[j].alarm) {
                      tv.alarm = true;
                    }
                    tv.name = sheet.groups.totals[j].name;
                    tv.title = sheet.groups.totals[j].caption;
                    g._totals.push(tv);
                  }
                }
              }
            }
            groupedData = [g];
          }
          return groupedData;
        }
        return data;
      }
    ).catch((e) => {
      if (e.code === SOURCE_NOT_READY) {
        return [];
      }
      throw e;
    });
  };

  /**
   * @param {String} mine
   * @param {{type: String, fetch: {}, source: String, groups: {totals: Array}}} sheet
   * @param {String} [sheet.className]
   * @param {String[]} [sheet.eager]
   * @param {{}} filter
   * @param {{}} options
   * @param {String} [options.namespace]
   * @param {String} [options.context]
   * @param {String} [options.lang]
   * @returns {Promise}
   */
  this._sheetFilters = function (mine, sheet, filter, options) {
    if (!filter || typeof filter !== 'object' || !filter.field) {
      return Promise.resolve([]);
    }
    let s = {
      source: filter.source,
      filter: filter.filter,
      joins: filter.joins,
      sort: filter.sort,
      fetch: {[filter.field]: '$' + filter.field, dummy: {[F.COUNT]: []}}
    };
    return aggregate(mine, s, options)
      .then((data) => {
          let result = [];
          if (Array.isArray(data) && data.length) {
            data.forEach(d => result.push(d[filter.field]));
          }
          return result;
        })
      .catch(() => []);
  };
}

MongoReportBuilder.prototype = new ReportBuilder();

module.exports = MongoReportBuilder;
