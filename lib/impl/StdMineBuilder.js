/**
 * Created by krasilneg on 29.12.16.
 */
'use strict';
const MineBuilder = require('../interfaces/MineBuilder');
const parseConditions = require('core/ConditionParser');
const clone = require('clone');
const F = require('core/FunctionCodes');
const parseMineName = require('../util/parseMineName');

// jshint maxstatements: 40, maxcomplexity: 30, maxdepth: 10

/**
 * @param {{dataSource: DataSource, metaRepo: MetaRepository, dataRepo: DataRepository}} cOptions
 * @param {String} [cOptions.namespaceSeparator]
 * @constructor
 */
function StdMineBuilder(cOptions) {
  this.namespaceSeparator = cOptions.namespaceSeparator || '_';

  function addZeros(number, size) {
    const value = String(number);
    if (value.length >= size) {
      return value;
    }
    const str = `000000${value}`;
    return str.substr(str.length - size);
  }

  /**
   * Метод получающий информации о последней сборке шахты данных
   * @param {String} mine
   * @param {String} name
   * @param {String} namespace
   * @returns {Promise}
   */
  this._sourceInfo = function (mine, name, namespace) {
    let nm = parseMineName(mine, namespace);
    return cOptions.dataSource.get(
      'ion_bi_sources',
      {
        [F.AND]: [
          {[F.EQUAL]: ['$mine', nm.name]},
          {[F.EQUAL]: ['$name', name]},
          {[F.EQUAL]: ['$namespace', nm.namespace]}
        ]
      }
    );
  };

  function buildResults(result, load) {
    for (let i = 0; i < load.results.length; i++) {
      if (load.results[i].expr && typeof load.results[i].expr === 'object') {
        let agreg = false;
        for (let ao in load.results[i].expr) {
          if (
            load.results[i].expr.hasOwnProperty(ao) &&
            (
              ao === F.SUM ||
              ao === F.AVG ||
              ao === F.MAX ||
              ao === F.MIN ||
              ao === F.COUNT
            )
          ) {
            if (!Array.isArray(load.results[i].expr[ao])) {
              throw new Error('Ошибка синтаксиса в выражении агрегации ' + JSON.stringify(load.results[i]));
            }
            if (!result.aggregates) {
              result.aggregates = {};
            }
            result.aggregates[load.results[i].field] = {[ao]: load.results[i].expr[ao]};
            agreg = true;
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

      if (typeof load.results[i].expr === 'object' && load.results[i].expr) {
        result.fields[load.results[i].field] = load.results[i].expr;
      } else if (typeof load.results[i].expr === 'string') {
        result.fields[load.results[i].field] = load.results[i].expr;
      } else {
        result.fields[load.results[i].field] = load.results[i].expr;
      }
    }
  }

  /**
   * @param {String} mine
   * @param {String} source
   * @param {{}} load
   * @param {Array} [load.filter]
   * @param {Array} load.results
   * @param {ClassMeta} cm
   * @param {{}} [options]
   * @param {String} [options.namespace]
   * @param {Boolean} [append]
   * @returns {{}}
   */
  function buildOptions(mine, source, load, cm, options, append) {
    let result = {};
    if (load.filter) {
      result.filter = Array.isArray(load.filter) ? parseConditions(load.filter, cm) : load.filter;
    }

    let joins = [];

    buildResults(result, load, joins, cm);

    if (joins.length) {
      result.joins = joins;
    }

    let dest = append ? 'append' : 'to';
    result[dest] = srcTn(mine, options.namespace, source);
    return result;
  }

  function aggregConstructor(cm, cOptions, opts, index) {
    return function () {
      opts = clone(opts || {});
      opts.joins = opts.joins || [];
      return cOptions.dataRepo.aggregate(cm.getCanonicalName(), opts).then(() => {
          return opts.to ? indexSource(opts.to, index) : Promise.resolve();
        });
    };
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

  function prepareJoin(mine, namespace, join) {
    join.table = srcTn(mine, namespace, join.table);
    if (join.join) {
      prepareJoins(mine, namespace, join.join);
    }
  }

  function prepareJoins(mine, namespace, joins) {
    if (Array.isArray(joins)) {
      joins.forEach(function (j) {
        prepareJoin(mine, namespace, j);
      });
    }
  }

  function indexSource(tn, index) {
    if (Array.isArray(index) && index.length) {
      let p;
      index.forEach(function (ind) {
        let def = {};
        if (!Array.isArray(ind)) {
          ind = [ind];
        }
        for (let i = 0; i < ind.length; i++) {
          def[ind[i]] = 1;
        }
        if (p) {
          p = p.then(function () {
            return cOptions.dataSource.ensureIndex(tn, def);
          });
        } else {
          p = cOptions.dataSource.ensureIndex(tn, def);
        }
      });
      if (p) {
        return p;
      }
    }
    return Promise.resolve();
  }

  function hierarchicLevelAggregation(result, sourceTn, destTn, opts, level) {
    const aggregation = clone(result);
    const parentJoin = {
      table: destTn,
      alias: 'parentJoin',
      left: opts.hierarchyBy.parent,
      right: '_elementId'
    };
    if (Array.isArray(aggregation.joins)) {
      aggregation.joins.push(parentJoin);
    } else {
      aggregation.joins = [parentJoin];
    }
    if (aggregation.filter) {
      aggregation.filter = {
        [F.AND]: [
          {[F.EQUAL]: ['$parentJoin.' + opts.hierarchyBy.level, level]},
          aggregation.filter
        ]
      };
    } else {
      aggregation.filter = {[F.EQUAL]: ['$parentJoin.' + opts.hierarchyBy.level, level]};
    }
    aggregation.fields = Object.assign({_parentOrder: '$parentJoin.' + opts.hierarchyBy.order}, aggregation.fields);

    return cOptions.dataSource.aggregate(sourceTn, aggregation)
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          let p = Promise.resolve();
          data.forEach((obj, i) => {
            obj._elementId = obj[opts.hierarchyBy.id];
            obj[opts.hierarchyBy.level] = level + 1;
            obj[opts.hierarchyBy.order] = obj._parentOrder + '.' + addZeros(i, 6);
            delete obj._parentOrder;
            p = p.then(() => cOptions.dataSource.insert(destTn, obj));
          });
          p = p.then(() => hierarchicLevelAggregation(result, sourceTn, destTn, opts, level + 1));
          return p;
        }
        return null;
      });
  }

  /**
   * @param {String} mine
   * @param {String} namespace
   * @param {{name: String, index: Array}} source
   * @param {{}} opts
   * @param {Boolean} append
   * @returns {Function}
   */
  function hierarchicAggregationConstructor(mine, namespace, source, opts, append) {
    return () => {
      try {
        if (!opts.hierarchyBy.id ||
          !opts.hierarchyBy.parent ||
          !opts.hierarchyBy.level ||
          !opts.hierarchyBy.order) {
          throw new Error('datamine source misconfiguration');
        }
        const result = {};
        const sourceTn = srcTn(mine, namespace, opts.source);
        const destTn = srcTn(mine, namespace, source.name);
        if (opts.filter) {
          result.filter = clone(opts.filter);
        }
        if (opts.sort) {
          result.sort = clone(opts.sort);
        }
        if (opts.joins) {
          result.joins = clone(opts.joins);
        }
        prepareJoins(mine, namespace, result.joins);
        let joins = [];
        buildResults(result, opts, joins);
        if (joins.length) {
          result.joins = joins.concat(result.joins || []);
        }
        const aggregation = clone(result);
        const filterSnippet = {[F.EMPTY]: ['$' + opts.hierarchyBy.parent]};
        if (aggregation.filter) {
          aggregation.filter = {
            [F.AND]: [
              filterSnippet,
              aggregation.filter
            ]
          };
        } else {
          aggregation.filter = filterSnippet;
        }
        return cOptions.dataSource.aggregate(sourceTn, aggregation)
          .then((data) => {
            let p = cOptions.dataSource.delete(destTn, {});
            if (Array.isArray(data)) {
              data.forEach((obj, i) => {
                obj._elementId = obj[opts.hierarchyBy.id];
                obj[opts.hierarchyBy.level] = 0;
                obj[opts.hierarchyBy.order] = addZeros(i, 6);
                p = p.then(() => cOptions.dataSource.insert(destTn, obj));
              });
            }
            return p;
          })
          .then(() => hierarchicLevelAggregation(result, sourceTn, destTn, opts, 0))
          .then(() => append ? Promise.resolve() : indexSource(sourceTn, source.index));
      } catch (e) {
        return Promise.reject(e);
      }
    };
  }

  /**
   * @param {String} mine
   * @param {String} namespace
   * @param {{name: String, index: Array}} source
   * @param {{}} opts
   * @param {Boolean} append
   * @returns {Function}
   */
  function sourceAggregConstructor(mine, namespace, source, opts, append) {
    return function () {
      let result = {};
      let tn = srcTn(mine, namespace, source.name);
      if (opts.filter) {
        result.filter = clone(opts.filter);
      }
      if (opts.sort) {
        result.sort = clone(opts.sort);
      }
      if (opts.joins) {
        result.joins = clone(opts.joins);
      }
      prepareJoins(mine, namespace, result.joins);
      let joins = [];
      buildResults(result, opts, joins);
      if (joins.length) {
        result.joins = joins.concat(result.joins || []);
      }
      result[append ? 'append' : 'to'] = srcTn(mine, namespace, source.name);
      return cOptions.dataSource.aggregate(srcTn(mine, namespace, opts.source), result)
        .then(() => result.to ? indexSource(result.to, source.index) : Promise.resolve());
    };
  }

  /** Метод выполняющий сборку шахты
   * @param {String} mine
   * @param {{}} source
   * @param {String} source.name
   * @param {String} source.className
   * @param {Boolean} source.append
   * @param {{}} options
   * @param {String} [options.namespace]
   * @returns {Promise}
   */
  this._buildSource = function (mine, source, options) {
    let nm = parseMineName(mine, options.namespace);
    mine = nm.name;
    let namespace = nm.namespace;
    return cOptions.dataSource.get(
      'ion_bi_sources',
      {
        [F.AND]: [
          {[F.EQUAL]: ['$mine', mine]},
          {[F.EQUAL]: ['$name', source.name]},
          {[F.EQUAL]: ['$namespace', namespace]}
        ]
      })
      .then(
        (info) => {
          if (info && !info.ready) {
            return Promise.resolve();
          }
          let start = new Date();
          if (!Array.isArray(source.load) || !source.load.length) {
            throw new Error('Не описана логика формирования источника данных.');
          }

          let p = info ?
            cOptions.dataSource.update(
              'ion_bi_sources',
              {
                [F.AND]: [
                  {[F.EQUAL]: ['$mine', mine]},
                  {[F.EQUAL]: ['$name', source.name]},
                  {[F.EQUAL]: ['$namespace', namespace]}
                ]
              },
              {
                ready: false
              }
            ) : Promise.resolve();

          let finish = function (err) {
            return cOptions.dataSource.upsert(
              'ion_bi_sources',
              {
                [F.AND]: [
                  {[F.EQUAL]: ['$mine', mine]},
                  {[F.EQUAL]: ['$name', source.name]},
                  {[F.EQUAL]: ['$namespace', namespace]}
                ]
              },
              {
                buildStarted: start,
                buildFinished: new Date(),
                ready: true
              }
            ).then(() => {
              if (err) {
                throw err;
              }
            });
          };

          return p
            .then(() => {
              let p = Promise.resolve();
              for (let i = 0; i < source.load.length; i++) {
                if (source.load[i].className) {
                  let cm = cOptions.metaRepo.getMeta(source.load[i].className, null, namespace);
                  p = p.then(
                    aggregConstructor(cm, cOptions,
                      buildOptions(mine, source.name, source.load[i], cm, options, source.append || i > 0),
                      source.index
                    )
                  );
                } else if (source.load[i].source) {
                  if (source.load[i].hierarchyBy) {
                    p = p.then(hierarchicAggregationConstructor(mine, namespace, source, source.load[i], source.append || i > 0));
                  } else {
                    p = p.then(sourceAggregConstructor(mine, namespace, source, source.load[i], source.append || i > 0));
                  }
                }
              }
              return p.then(() => null);
            })
            .then(finish, finish);
        }
      );
  };
}

StdMineBuilder.prototype = new MineBuilder();

module.exports = StdMineBuilder;
