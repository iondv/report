'use strict';
const Excel = require('exceljs');
const moment = require('moment');

/**
 * @param {String} fn
 * @param {{}} options
 * @param {ReportBuilder} options.builder
 * @param {String} options.mine
 * @param {String} options.sheet
 */
module.exports = function (fn, options) {

  let workbook = new Excel.stream.xlsx.WorkbookWriter({
    filename: fn,
    useStyles: true,
    useSharedStrings: true
  });
  let sheet = workbook.addWorksheet(
    options.sheet && options.sheet.name ? options.sheet.name : 'report',
    options.sheet
  );

  let colWidths = {};

  function rowSpan(row, fields) {
    let span = 0;
    if (Array.isArray(row._data)) {
      for (let j = 0; j < row._data.length; j++) {
        span = span + rowSpan(row._data[j]);
      }
    }
    if (Array.isArray(fields)) {
      let maxSpan = 0;
      for (let i = 0; i < fields.length; i++) {
        let fn = fields[i].field.split('.');
        let v = row[fn[0]];
        let cellSpan = 0;
        if (Array.isArray(v)) {
          for (let j = 0; j < v.length; j++) {
            cellSpan = cellSpan + rowSpan(v[j], [{field: fn.slice(1).join('.')}]);
          }
        } else if (v && typeof v === 'object' && fn.length > 1) {
          cellSpan = rowSpan(v, [{field: fn.slice(1).join('.')}]);
        }
        if (cellSpan > maxSpan) {
          maxSpan = cellSpan;
          fields.maxSpan = maxSpan;
        }
      }
      if (maxSpan > span) {
        span = maxSpan;
      }
    }
    span = span || 1;
    if (Array.isArray(row._totals)) {
      span = span + row._totals.length;
    }
    if (!row.__span || (row.__span < span)) {
      row.__span = span;
    }
    return row.__span;
  }

  function isTotal(row) {
    return row.data && row.name;
  }

  function getVal(obj, path, format) {
    if (path.length > 1) {
      let o = obj[path[0]];
      if (o === null) {
        return '';
      }
      return getVal(o, path.slice(1));
    }
    if (format === 'date' && obj[path[0]]) {
      return (obj[path[0]] instanceof Date) ? obj[path[0]] : moment(obj[path[0]]).toDate();
    }
    return (typeof obj[path[0]] !== 'undefined' && obj[path[0]] !== null) ? obj[path[0]].toString() : '';
  }

  function adjustColWidth(v, x) {
    if (v) {
      let w = 10;
      if (v instanceof Date) {
        w = 10;
      } else {
        let str = v.toString();
        let words = str.split(/[\n\r]+/);
        words.forEach((word) => {
          if (word.length > w) {
            w = word.length;
          }
        });
      }
      if (!colWidths[x] || colWidths[x] < x) {
        colWidths[x] = w;
      }
    }
  }

  function renderCell(d, field, path, x, y) {
    let fn = path || field.field.split('.');
    if (d.hasOwnProperty(fn[0])) {
      let span = d.__span || 1;
      if (Array.isArray(d[fn[0]])) {
        if (d[fn[0]].length) {
          renderCell(d[fn[0]][0], field, fn.slice(1), x + 1, y);
        }
        if (span > 1) {
          sheet.mergeCells(y, x, y + span - 1, x);
        }
      } else if (span > 1) {
        sheet.mergeCells(y, x, y + span - 1, x);
      }
      let cell = sheet.getCell(y, x);
      cell.value = getVal(d, fn, field.format);
      adjustColWidth(cell.value, x);

      let align = 'left';
      let wt = true;
      let valign = (span > 1) ? 'top' : 'middle';
      if (field.format === 'date' || field.format === 'number') {
        align = 'right';
        wt = false;
      }
      cell.alignment = {vertical: valign, horizontal: align, wrapText: wt};
      cell.border = {
        top: {style: 'thin'},
        left: {style: 'thin'},
        right: {style: 'thin'},
        bottom: {style: 'thin'}
      };
      return true;
    }
    if (Array.isArray(d._data) && d._data.length) {
      return renderCell(d._data[0], field, null, x, y);
    }
    return false;
  }

  function fldValues(obj, path, noSpans) {
    let v = obj[path[0]];
    let result = [];
    if (Array.isArray(v) && path.length > 1) {
      for (let i = 0; i < v.length; i++) {
        result.push(...fldValues(v[i], path.slice(1), noSpans));
      }
    } else if (v && typeof v === 'object' && path.length > 1) {
      result.push(...fldValues(v, path.slice(1), noSpans));
    } else {
      result.push(v);
    }
    return result;
  }

  function renderCells(row, fields, depth, y) {
    let d = isTotal(row) ? row.data : row;
    let rendered = 0;
    let colSpan = 0;
    for (let i = 0; i < fields.length; i++) {
      if (renderCell(d, fields[i], null, i + 2, y)) {
        rendered++;
      }
    }
    if (isTotal(row)) {
      colSpan = fields.length - rendered - depth;
      if (colSpan > 1) {
        sheet.mergeCells(y, 2, y, 1 + colSpan);
      }
      sheet.getCell(y, 2).value = (row.title || row.name);
    }
  }

  function renderSubRows(row, fields, depth, y0) {
    let rc = 0;
    if (Array.isArray(row._data) && row._data.length) {
      for (let i = 0; i < row._data.length; i++) {
        rc = rc + renderRow(row._data[i], fields, depth, i === 0, y0 + rc);
      }
    } else if (row.__span > 1) {
      let columns = {};
      let fields2 = [];
      for (let j = 0; j < fields.length; j++) {
        let pth = fields[j].field.split('.');
        if (pth.length <= 2) {
          fields2.push({field: 'fld' + j, format: fields[j].format});
          columns['fld' + j] = fldValues(row, pth);
        } else {
          fields2.push({field: 'fld' + j + '.' + pth.slice(2).join('.'), format: fields[j].format});
          columns['fld' + j] = fldValues(row, pth.slice(0, 2), true);
        }
      }
      for (let i = 0; i < row.__span; i++) {
        let cntxt = {};
        for (let fn in columns) {
          if (columns.hasOwnProperty(fn)) {
            if (columns[fn].length > i) {
              cntxt[fn] = columns[fn][i];
            }
          }
        }
        rowSpan(cntxt, fields2);
        rc = rc + renderRow(cntxt, fields2, depth, i === 0, y0 + rc);
      }
    }
    return rc;
  }

  function renderRow(row, fields, depth, onlySubs, y) {
    let rc = 0;
    if (!onlySubs) {
      renderCells(row, fields, depth, y);
      rc++;
    }
    for (let i = 0; i < fields.length; i++) {
      if (row.hasOwnProperty(fields[i].field)) {
        depth++;
        break;
      }
    }
    let src = renderSubRows(row, fields, depth, y + rc);
    rc = rc + src;
    if (Array.isArray(row._totals) && row._totals.length) {
      for (let i = 0; i < row._totals.length; i++) {
        rc = rc + renderRow(row._totals[i], fields, depth, false, y + rc);
      }
    }
    return rc;
  }

  function renderRows(data, fields) {
    let y = 2;
    for (let i = 0; i < data.length; i++) {
      rowSpan(data[i], fields);
      y = y + renderRow(data[i], fields, 0, false, y);
      if (y % 100 === 0) {
        sheet.getRow(y - 1).commit();
      }
    }
  }

  function renderPivot(data, pivot) {
    const fields = [];
    fields.push(...pivot.rows);
    fields.push(...pivot.columns);
    fields.push(...pivot.data);
    sheet.columns = fields.map((field) => {
      const header = pivot.captions && pivot.captions[field] || field;
      return {header, key: field};
    });
    if (Array.isArray(data)) {
      data.forEach(d => sheet.addRow(d));
    }
  }

  return options.builder.sheetData(
    options.mine,
    options.sheet,
    {
      filter: options.filter || null,
      params: options.params || null
    })
    .then((data) => {
      let r = 1;
      if (options.sheet.type === 'pivot') {
        renderPivot(data, options.sheet);
      } else {
        options.sheet.header.forEach((row) => {
          let c = 2;
          row.forEach((h) => {
            let offsetx = c + (h.offsetx || 0);
            let offsety = r + (h.offsety || 0);
            if ((h.rowSpan - 1) || (h.colSpan - 1)) {
              sheet.mergeCells(offsety, offsetx, offsety + h.rowSpan - 1, offsetx + h.colSpan - 1);
              for (let i = r + 1; (i < r + h.rowSpan - 1) && (i < options.sheet.header.length); i++) {
                for (let j = c; (j < c + h.colSpan - 1) && (j < options.sheet.header[i].length); j++) {
                  options.sheet.header[i][j].offsetx = (options.sheet.header[i][j].offsetx || 0) + h.colSpan - 1;
                }
              }
            }
            let cell = sheet.getCell(offsety, offsetx);
            cell.alignment = {vertical: 'middle', horizontal: h.align || 'center', wrapText: true};
            cell.value = h.caption;
            cell.border = {
              top: {style: 'medium'},
              left: {style: 'medium'},
              right: {style: 'medium'},
              bottom: {style: 'medium'}
            };
            adjustColWidth(cell.value, offsetx);
            c = c + h.colSpan;
          });
          r++;
        });
        renderRows(data, options.sheet.fields, {});
        for (let c in colWidths) {
          if (colWidths.hasOwnProperty(c)) {
            sheet.getColumn(parseInt(c, 10)).width = (colWidths[c] < 15) ? 15 : (colWidths[c] + 5);
          }
        }
      }
      return workbook.commit();
    });
};
