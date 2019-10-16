/**
 * Created by krasilneg on 21.01.17.
 */

(function ($) {
  function compileIonAggregators (replaceNulls) {
    if (!replaceNulls) {
      return $.pivotUtilities.locales.ru.aggregators;
    }
    var result = {};
    Object.keys($.pivotUtilities.locales.ru.aggregators).forEach(function (a) {
      result[a] = function() {
        var x1 = $.pivotUtilities.locales.ru.aggregators[a].apply(this, arguments);
        return function () {
          var x2 = x1.apply(this, arguments);
          var oldFormat = x2.format;
          x2.format = function (x) {
            if (!x && replaceNulls) {
              return replaceNulls;
            }
            return oldFormat(x);
          };
          return x2;
        };
      };
    });
    return result;
  }
  
  var aggregatorsNames = {
    "count": "Кол-во",
    "count Unique Values": "Кол-во уникальных",
    "list Unique Values": "Список уникальных",
    "sum": "Сумма",
    "integer Sum": "Сумма целых",
    "avg": "Среднее",
    "min": "Минимум",
    "max": "Максимум",
    "sum over Sum": "Сумма по сумме",
    "80% Upper Bound": "80% верхней границы",
    "80% Lower Bound": "80% нижней границы",
    "sum as Fraction of Total": "Доля по всему",
    "sum as Fraction of Rows": "Доля по строке",
    "sum as Fraction of Columns": "Доля по столбцу",
    "count as Fraction of Total": "Кол-во по всему",
    "count as Fraction of Rows": "Кол-во по строке",
    "count as Fraction of Columns": "Кол-во по строке"
  };

  $.fn.ionPivot = function (options) {
    this.each(function () {
      var i;
      var $this = $(this);
      $this.css({overflow: 'auto'});
      options = options || {};
      options.locale = options.locale || {lang: 'en'};
      var _this = this;
      var url = options.url || $this.attr('fetch-url');
      var cols = JSON.parse($this.attr('pivot-cols'));
      var rows = JSON.parse($this.attr('pivot-rows'));
      var vals = JSON.parse($this.attr('pivot-data'));
      var ui = JSON.parse($this.attr('pivot-customizable'));
      var aggregations = $this.attr('pivot-aggregations');
      var sorting = JSON.parse($this.attr('pivot-sorting'));
      var colTotals = !JSON.parse($this.attr('pivot-hide-col-totals'));
      var rowTotals = !JSON.parse($this.attr('pivot-hide-row-totals'));
      var captions = $this.attr('pivot-captions');
      var formatOpts = JSON.parse($this.attr('pivot-formating'));

      if (captions) {
        captions = JSON.parse(captions);
        for (i = 0; i < cols.length; i++) {
          if (captions.hasOwnProperty(cols[i])) {
            cols[i] = captions[cols[i]];
          }
        }
        for (i = 0; i < rows.length; i++) {
          if (captions.hasOwnProperty(rows[i])) {
            rows[i] = captions[rows[i]];
          }
        }
        for (i = 0; i < vals.length; i++) {
          if (captions.hasOwnProperty(vals[i])) {
            vals[i] = captions[vals[i]];
          }
        }
      }

      function source(data) {
        if (captions) {
          var nm;
          var tmp = data;
          data = [];
          var ordered = [];
          for (nm in captions) {
            if (captions.hasOwnProperty(nm)) {
              ordered.push(nm);
            }
          }
          var row = [];
          ordered.forEach(function (nm) {
            row.push(captions.hasOwnProperty(nm) ? captions[nm] : nm);
          });
          data.push(row);
          tmp.forEach(function (d) {
            row = [];
            ordered.forEach(function (nm) {
              row.push(d[nm]);
            });
            data.push(row);
          });
        }
        return data;
      }
      
      function getSorter (conf) {
        return function(a,b) {
          var _a = a, _b = b;
          if (Array.isArray(conf)) {
            _a = conf.includes(a) ? conf.indexOf(a) : conf.length;
            _b = conf.includes(b) ? conf.indexOf(b) : conf.length;
          }
          if (conf === 'desc') {
            _a = b;
            _b = a;
          }
          
          if (typeof _a !== 'number' && typeof _b !=='number') {
            var d_a = moment(_a, options.locale.dateFormat, options.locale.lang);
            var d_b = moment(_b, options.locale.dateFormat, options.locale.lang);
            if (d_a.isValid() && d_b.isValid()) {
              return d_a.diff(d_b);
            }
          }
          
          if (typeof _a === 'string' && typeof _b ==='string') {
            return _a.localeCompare(_b);
          }
          if (_a < _b) 
            return -1; 
          if (_a > _b)
            return 1;
          return 0;
        }
      }
      
      var sorters = {};
      for (var s in sorting) {
        if (sorting.hasOwnProperty(s)) {
          sorters[captions[s]] = getSorter(sorting[s]);
        }
      }

      var agr = 'Кол-во';
      if (aggregations) {
        aggregations = JSON.parse(aggregations);
        if (aggregations && aggregations.length) {
          agr = aggregatorsNames[aggregations[0]];
        }
      }
      var aggregators = compileIonAggregators(formatOpts.replaceNulls);

      var config = $this.data('pivot-state') || {
          rows: rows,
          cols: cols,
          vals: vals,
          aggregator: aggregators[agr](vals),
          aggregatorName: agr,
          aggregators: aggregators,
          sorters: sorters,
          rendererOptions: {
            table: {
              rowTotals: rowTotals,
              colTotals: colTotals
            }
          }
        };

      if (config.rows.length === 0) {
        config.rows = rows;
      }

      if (config.cols.length === 0) {
        config.cols = cols;
      }

      function construct(data) {
        if (ui) {
          config.onRefresh = function (state) {
            $this.data('pivot-state', state);
          };
          $(_this).pivotUI(
            source(data),
            config,
            true,
            'ru'
          );
        } else {
          $(_this).pivot(
            source(data),
            config,
            'ru'
          );
        }
      }

      if (options.data) {
        construct(options.data);
      } else {
        var prms = {};
        if (options && options.params) {
          prms = options.params;
        }
        var cb = function (dt) {
          construct(dt);
        };
        $.post(url, prms)
          .done(options.cb || cb)
          .fail(function () {
            console.error('не удалось получить данные по адресу ' + url);
          }).fail(processAjaxError);
      }
    });
    return this;
  };
})(jQuery);