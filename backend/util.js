/**
 * Created by Vasiliy Ermilov (ermilov.work@yandex.ru) on 2/2/17.
 */
'use strict';
const clone = require('clone');
const moment = require('moment');
const F = require('core/FunctionCodes');
const dateOffset = require('core/util/dateOffset');
const strToDate = require('core/strToDate');

// jshint maxcomplexity: 15

function processColumns(columns, level, rows, fieldOrder, filter, params) {
  if (rows.length <= level) {
    rows[level] = [];
  }

  columns.forEach((column) => {
    column.colSpan = 1;
    if (params) {
      column.caption = column.caption.replace(/\{\$([^}]+)\}/, (a, b) => params.hasOwnProperty(b) ? params[b] : '');
    }

    if (column.field) {
      if (filter && filter.hasOwnProperty(column.field)) {
        return;
      }

      fieldOrder.push(column);
    }
    rows[level].push(column);

    if (column.columns) {
      processColumns(column.columns, level + 1, rows, fieldOrder, filter, params);
      column.colSpan = 0;
      column.columns.forEach(function (sc) {
        column.colSpan = column.colSpan + sc.colSpan;
      });
    }
  });
}

function processRows(columns, level, rows) {
  columns.forEach(function (column) {
    column.rowSpan = rows.length - level + 1;
    if (column.columns) {
      processRows(column.columns, level + 1, rows);
      column.rowSpan -= 1;
    }
  });
}

function aggregHeader(columns, fieldOrder, filter, params) {
  var result = [];
  processColumns(columns, 0, result, fieldOrder, filter, params);
  processRows(columns, 1, result);
  return result;
}

function processSheet(sheet, filter, skipFirstCol, params) {
  var sh = clone(sheet);
  switch (sheet.type) {
    case 'list':
    case 'aggregation':
      sh.fields = [];
      if (sheet.styles) {
        sh.styles = clone(sheet.styles, true);
      }
      if (sheet.params) {
        sh.params = clone(sheet.params, true);
      }
      if (sheet.rangeFilters) {
        sh.rangeFilters = {};
        for (let nm in sheet.rangeFilters) {
          if (sheet.rangeFilters.hasOwnProperty(nm)) {
            sh.rangeFilters[nm] = clone(sheet.rangeFilters[nm], true);
            if (typeof sh.rangeFilters[nm].caption === 'string') {
              sh.rangeFilters[nm].caption = sh.rangeFilters[nm].caption.split('|');
              if (sh.rangeFilters[nm].caption.length < 2) {
                sh.rangeFilters[nm].caption.push('');
              }
            }
          }
        }
      }
      sh.header = aggregHeader(clone(skipFirstCol ? sh.columns.slice(1) : sh.columns), sh.fields, filter, params);
      break;
  }
  return sh;
}

function processReport(report) {
  let result = [];
  report.sheets().forEach(function (sheet) {
    result.push(processSheet(sheet));
  });
  return result;
}

module.exports.processReport = processReport;
module.exports.processSheet = processSheet;

function findCol(sheet, fld) {
  for (let i = 0; i < sheet.columns.length; i++) {
    if (sheet.columns[i].field === fld) {
      return sheet.columns[i];
    } else if (Array.isArray(sheet.columns[i].columns)) {
      return findCol(sheet.columns[i], fld);
    }
  }
  return null;
}

function rangeFilter(sheet, fld) {
  if (sheet.rangeFilters && sheet.rangeFilters.hasOwnProperty(fld)) {
    return sheet.rangeFilters[fld] || null;
  }
  return null;
}

function formatFilterVal(filterOpts, val, lang, ceilDate) {
  filterOpts = filterOpts || {};
  let f = filterOpts.format || null;
  if (f === 'date') {
    let dt = strToDate(val, lang);
    if (ceilDate) {
      dt.setHours(dt.getHours() + 23, 59, 59, 999);
    }
    return dateOffset(dt, filterOpts.mode);
  } else if (f === 'number') {
    try {
      let intgr = parseInt(val);
      let flt = parseFloat(val);
      return (flt > intgr) ? flt : intgr;
    } catch (err) {
      // Do nothing
    }
  }
  return val;
}

function formFilterOption(nm, oper, filterOpts, v, lang) {
  let cd = false;
  if (v[0] === '|') {
    v = v.substr(1);
    if (oper === 'lt') {
      cd = true;
    }
    oper = oper + 'e';
  }
  return {[oper]: ['$' + nm, formatFilterVal(filterOpts, v, lang, cd)]};
}

function formFilter(sheet, d, opts, lang) {
  for (let nm in d) {
    if (d.hasOwnProperty(nm) && nm !== '_hsg_' &&
      nm !== '_count_' && nm !== '_offset_') {
      if (Array.isArray(d[nm])) {
        if (!opts.filter) {
          opts.filter = {[F.AND]: []};
        }
        let filterOpts = rangeFilter(sheet, nm);
        if (d[nm][0]) {
          opts.filter[F.AND].push(formFilterOption(nm, 'gt', filterOpts, d[nm][0], lang));
        }
        if (d[nm][1]) {
          opts.filter[F.AND].push(formFilterOption(nm, 'lt', filterOpts, d[nm][1], lang));
        }
      } else {
        let col = findCol(sheet, nm);
        if (col) {
          if (!opts.filter) {
            opts.filter = {[F.AND]: []};
          }
          opts.filter[F.AND].push({[F.EQUAL]: ['$' + nm, formatFilterVal(col, d[nm], lang)]});
        } else if (sheet.params && sheet.params.hasOwnProperty(nm)) {
          if (!opts.params) {
            opts.params = {};
          }
          opts.params[nm] = formatFilterVal(sheet.params[nm], d[nm], lang);
        } else if (typeof sheet.fetch[nm] === 'string') {
          if (!opts.filter) {
            opts.filter = {[F.AND]: []};
          }
          opts.filter[F.AND].push({[F.EQUAL]: [sheet.fetch[nm], d[nm]]});
        }
      }
    }
  }
}

module.exports.formFilter = function (sheet, req, opts, lang) {
  if (req.query) {
    formFilter(sheet, req.query, opts, lang);
  }
  if (req.body) {
    formFilter(sheet, req.body, opts, lang);
  }
};

function dateToStr(date, lang) {
  let dt = moment(date);
  if (lang) {
    dt.locale(lang);
  }
  return dt.format('L LT');
}

module.exports.dateToStr = dateToStr;

/**
 * @param {MineBuilder} builder
 * @param {DataMine} mine
 * @param {String} src
 * @param {Object[]} info
 * @returns {Function}
 */
function infoPromise(builder, mine, src, info, lang) {
  return function () {
    return builder.sourceInfo(mine.name(), src, mine.namespace())
      .then(function (i) {
        if (i) {
          i.source = src.caption || i.name;
          i.buildStarted = dateToStr(i.buildStarted, lang);
          i.buildFinished = dateToStr(i.buildFinished, lang);
          info.push(i);
        }
        return Promise.resolve();
      });
  };
}

module.exports.infoPromise = infoPromise;
