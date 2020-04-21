'use strict';
/**
 * Created by krasilneg on 20.01.17.
 */
(function ($) {

  function rowSpan(row, fields) {
    var span = 0;
    if ($.isArray(row._data)) {
      for (let j = 0; j < row._data.length; j++) {
        span = span + rowSpan(row._data[j]);
      }
    }
    if (fields instanceof Array) {
      let maxSpan = 0;
      for (let i = 0; i < fields.length; i++) {
        let fn = fields[i].field.split('.');
        let v = row[fn[0]];
        let cellSpan = 0;
        if ($.isArray(v)) {
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
    if ($.isArray(row._totals)) {
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
      return moment(obj[path[0]]).locale(navigator.language).format('L');
    }
    return (typeof obj[path[0]] !== 'undefined' && obj[path[0]] !== null) ? obj[path[0]].toString() : '';
  }

  function renderCell(d, field, path) {
    let fn = path || field.field.split('.');
    if (d.hasOwnProperty(fn[0])) {
      var span = d.__span || 1;
      if (field.filter && fn.length === 1) {
        field.filterValues = field.filterValues || [];
        if (field.filterValues.indexOf(d[field.field]) < 0) {
          field.filterValues.push(d[field.field]);
        }
      }
      if ($.isArray(d[fn[0]])) {
        if (d[fn[0]].length) {
          return renderCell(d[fn[0]][0], field, fn.slice(1));
        }
        return '<td ' +
          (
            field.format ?
            'class="' + field.format + '" ' :
              (field.align ? ' style="text-align:' + field.align + '"' : '')
          ) + 'rowspan="' + span + '"></td>';
      }
      return '<td ' +
        (
          field.format ?
          'class="' + field.format + '" ' :
            (field.align ? ' style="text-align:' + field.align + '"' : '')
        ) + 'rowspan="' + span + '">' + getVal(d, fn, field.format) + '</td>';
    }
    if ($.isArray(d._data) && d._data.length) {
      return renderCell(d._data[0], field);
    }
    return '';
  }

  function fldValues(obj, path, noSpans) {
    let v = obj[path[0]];
    let result = [];
    if ($.isArray(v) && path.length > 1) {
      for (let i = 0; i < v.length; i++) {
        Array.prototype.push.apply(result, fldValues(v[i], path.slice(1), noSpans));
      }
    } else if (v && typeof v === 'object' && path.length > 1) {
      Array.prototype.push.apply(result, fldValues(v, path.slice(1), noSpans));
    } else {
      result.push(v);
    }
    return result;
  }

  function renderCells(row, fields, depth) {
    var result = '';
    var d = isTotal(row) ? row.data : row;
    var cell = '';
    var rendered = 0;
    var colSpan = 0;
    for (let i = 0; i < fields.length; i++) {
      cell = renderCell(d, fields[i]);
      if (cell) {
        rendered++;
      }
      result = result + cell;
    }
    if (isTotal(row)) {
      colSpan = fields.length - rendered - depth;
      result = '<td' + (colSpan > 1 ? ' colspan="' + colSpan + '"' : '') + '>' + (row.title || row.name) + '</td>' + result;
      d = row.data;
    }
    return result;
  }

  function renderSubRows(row, fields, depth, styles, cssClasses) {
    var result = '';
    if ($.isArray(row._data) && row._data.length) {
      for (let i = 0; i < row._data.length; i++) {
        result = result + renderRow(row._data[i], fields, depth, i === 0, styles, cssClasses);
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
        result = result + renderRow(cntxt, fields2, depth, i === 0, styles, cssClasses);
      }
    }
    return result;
  }

  function renderRow(row, fields, depth, onlySubs, styles, cssClasses) {
    let result = '';
    let cls = cssClasses || [];
    if (styles) {
      for (let classificator in styles) {
        if (styles.hasOwnProperty(classificator) && row.hasOwnProperty(classificator)) {
          if (styles[classificator].hasOwnProperty(row[classificator]) &&
            cls.indexOf(styles[classificator][row[classificator]]) < 0) {
            cls.push(styles[classificator][row[classificator]]);
          }
        }
      }
    }
    if (!onlySubs) {
      result = '<tr' + (isTotal(row) ? ' class="total ' + (row.alarm ? 'alarm ' : '') + row.name + '"' : ' class="' + cls.join(' ') + '"') + '>' +
        renderCells(row, fields, depth) + '</tr>';
    }
    for (let i = 0; i < fields.length; i++) {
      if (row.hasOwnProperty(fields[i].field)) {
        depth++;
        break;
      }
    }
    result = result + renderSubRows(row, fields, depth, styles, cls);
    if ($.isArray(row._totals) && row._totals.length) {
      for (let i = 0; i < row._totals.length; i++) {
        result = result + renderRow(row._totals[i], fields, depth, false, styles, cls);
      }
    }
    return result;
  }

  function renderRows(data, fields, styles) {
    var rows = '';
    for (let i = 0; i < data.length; i++) {
      rowSpan(data[i], fields);
      var row = renderRow(data[i], fields, 0, false, styles);
      row = stretchHangingCells(row);
      rows += row;
    }
    return rows;
  }

  function render($this, data, fields, styles) {
    var totalCount = data.length ? data[0].__total : null;
    var rows = renderRows(data, fields, styles);
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].filter && typeof fields[i].filter !== 'object' && !fields[i].select) {
        if (fields[i].filterValues) {
          let f = $('#f_' + $this.attr('id') + '_' + fields[i].field);
          let v = f.val();
          f.find('option').remove();
          f.append(new Option('нет', '__none__', false, v == '__none__'));
          for (let j = 0; j < fields[i].filterValues.length; j++) {
            let newOption = new Option(fields[i].filterValues[j], fields[i].filterValues[j], false, v == fields[i].filterValues[j]);
            f.append(newOption);
          }
        }
      }
    }
    $('tbody', $this).html(rows);
    $this.trigger('report-loaded', [totalCount]);
  }

  function rfo(v, border, inclusive) {
    if (v) {
      if (inclusive) {
        if (inclusive === 'both' ||
          (inclusive === 'left' && border === 0) ||
          (inclusive === 'right' && border === 1)
        ) {
          return '|' + v;
        }
      }
    }
    return v;
  }

  function stretchHangingCells (data) {
    var error = null;
    var $rows = filterEmptyRows($(data));
    var maxRows = $rows.length;
    var maxColumns = getMaxColumns($rows);
    var cells = [];
    for (var i = 0; i < maxColumns; ++i) {
      cells[i] = [];
    }
    $rows.each(function (rowIndex) {
      var colIndex = 0;
      $(this).children().each(function () {
        try {
          var rowSpan = this.rowSpan || 1;
          var colSpan = this.colSpan || 1;
          for (var x = 0; x < colSpan; ++x) {
            for (var y = 0; y < rowSpan; ++y) {
              for (var i = 0; i < maxColumns; ++i) {
                if (!cells[colIndex + x + i][rowIndex + y]) {
                  cells[colIndex + x + i][rowIndex + y] = this;
                  break;
                }
              }
            }
          }
          colIndex += colSpan;
        } catch (err) {
          error = err;
        }
      });
    });
    if (!error) {
      try {
        for (var x = 0; x < maxColumns; ++x) {
          var column = cells[x];
          if (column.length < maxRows) {
            var last = column[column.length - 1];
            last.rowSpan = maxRows - column.length + 1;
          }
        }
      } catch (err) {
        error = err;
      }
    }
    if (error) {
      console.error(error);
    }
    var result = '';
    $rows.each(function () {
      result += this.outerHTML;
    });
    return result;
  }

  function filterEmptyRows ($rows) {
    return $rows.filter(function () {
      return this.children.length;
    });
  }

  function getMaxColumns ($rows) {
    var max = 1;
    $rows.each(function () {
      if (max < this.children.length) {
        max = this.children.length;
      }
    });
    return max;
  }

  function loadData(options, $this, cb, noPaging) {
    var $biSheet = $this.closest('.bi-sheet');
    if (!options.cb) {
      $('tbody', this).html('');
    }
    var url = options.url || $this.attr('fetch-url');
    var rfSetup = JSON.parse($this.attr('range-filters') || 'null');
    var paramSetup = JSON.parse($this.attr('fetch-params') || 'null');
    var pageSize = parseInt($this.attr('page-size')) || 0;
    var filter = {};

    if (!noPaging && !options.cb) {
      if (pageSize) {
        var currentPage = parseInt($this.data('page')) || 1;
        filter._count_ = pageSize;
        filter._offset_ = (currentPage - 1) * pageSize;
      }
    }

    var filtered = false;
    $biSheet.find('thead tr.filter select').each(function () {
      var select = $(this);
      if (select.val() && select.val() !== '__none__') {
        filter[select.attr('name')] = select.val();
        filtered = true;
      }
    });

    if (!options.cb) {
      if ($this.data('needFilterSet') && !filtered) {
        cb('need-filter');
        return;
      }
    }

    let rf = {};
    if (typeof options === 'object' && options.rangeFilter) {
      for (let nm in options.rangeFilter) {
        if (options.rangeFilter.hasOwnProperty(nm)) {
          if (options.rangeFilter[nm][0] || options.rangeFilter[nm][1]) {
            rf[nm] = [
              rfo(options.rangeFilter[nm][0].v || options.rangeFilter[nm][0], 0, options.rangeFilter[nm].inclusive),
              rfo(options.rangeFilter[nm][1].v || options.rangeFilter[nm][1], 1, options.rangeFilter[nm].inclusive)
            ];
          }
        }
      }
      $this.data('rangeFilter', rf);
    } else {
      rf = $this.data('rangeFilter') || {};
    }

    for (let nm in rf) {
      if (rf.hasOwnProperty(nm)) {
        filter[nm] = rf[nm];
      }
    }

    let prms = {};
    if (typeof options === 'object' && options.params) {
      for (let nm in options.params) {
        if (options.params.hasOwnProperty(nm)) {
          prms[nm] = options.params[nm];
        }
      }
      $this.data('params', prms);
    } else {
      prms = $this.data('params') || {};
    }

    for (let nm in prms) {
      if (prms.hasOwnProperty(nm)) {
        filter[nm] = prms[nm];
      }
    }

    let headerPatterns = $this.data('ion-aggregation-sheet-header-patterns');

    if (headerPatterns) {
      for (let i = 0; i < headerPatterns.length; i++) {
        let caption = headerPatterns[i].pattern.replace(headerPatterns[i].checker, function (param, nm, ind) {
          if (ind) {
            if (typeof options === 'object' && options && options.rangeFilter && Array.isArray(options.rangeFilter[nm])) {
              if (rfSetup.hasOwnProperty(nm) && rfSetup[nm].select) {
                return rfSetup[nm].select[options.rangeFilter[nm][parseInt(ind)]] || '';
              }
              return options.rangeFilter[nm][parseInt(ind)] || '';
            }
          }

          if (typeof options === 'object' && options && options.params) {
            if (paramSetup.hasOwnProperty(nm) && paramSetup[nm].select) {
              return paramSetup[nm].select[options.params[nm]];
            }
            if (options.paramTypes && options.paramTypes[nm] === "date") {
              return moment(options.params[nm]).locale(navigator.language).format('L') || '';
            }
            return options.params[nm] || '';
          }
          return '';
        });
        $(headerPatterns[i].th).text(caption);
      }
    }

    if (url) {
      $.post(url, filter)
        .done(options.cb || cb)
        .fail(function () {
          console.error(__('js.sheet.ajaxFail', {url: url}));
        }).fail(processAjaxError);
    } else {
      (options.cb || cb)([]);
    }
  }

  $.fn.sheet = function( options ) {
    var method = typeof options === 'string' ? options : options.method;
    if (method === 'init') {
      this.each(function () {
        var $this = $(this);
        if (typeof options === 'object' && options && options.data) {
          $this.data('ion-aggregation-sheet-data', options.data);
        }
        $('thead tr.filter select', this).change(function (e) {
          $this.data('page', 1);
          $this.sheet('reload');
        });

        var headerPatterns = [];
        $('thead th', this).each(function () {
          let caption = $(this).text();
          let check = /\{\$(\w+)(?:\[(\d)\])?\}/g;
          if (check.test(caption)) {
            headerPatterns.push({
              th: this,
              pattern: caption,
              checker: check
            });
          }
        });
        $this.data('ion-aggregation-sheet-header-patterns', headerPatterns);
      });
      return this;
    }

    if (method === 'reload') {
      this.each(function () {
        var $this = $(this);
        var fields = JSON.parse($this.attr('field-map') || 'null');
        var styles = JSON.parse($this.attr('row-styles') || 'null');
        var nfm = $this.data('needFilterMsg');

        var data = $this.data('ion-aggregation-sheet-data');
        if (data) {
          return render($this, data, fields, styles);
        }
        loadData(options, $this, function (data) {
          if (data === 'need-filter') {
            $('tbody', $this).html(
              '<tr><td colspan="' + fields.length + '">' +
              (nfm || __('js.sheet.filterParams')) + '</td></tr>'
            );
            $this.trigger('report-loaded');
            return;
          }
          render($this, data, fields, styles);
        });
      });
    }
    return this;
  };
})(jQuery);
