'use strict';

(function () {
  $('a.sheet-export').click(function (event) {
    event.preventDefault();
    var $a = $(this);
    var $sheet = $a.closest('.bi-sheet');
    var title = $sheet.find('.title').html() || 'Отчет';
    var $table = $sheet.find('.table-responsive').children('table');
    $table.floatThead('destroy');
    var $target = $('<div><h1>' + title + '</h1>'
      + '<table border="1" cellspacing="0" cellpadding="10">'
      + $table.html() + '</table></div>');
    $table.floatThead({
      scrollContainer: function ($table) {
        return $table.parent();
      }
    });
    $target.find('.filter').remove();
    $(document.body).append($target);
    switch ($a.attr('href')) {
      case '#pdf':
        exportToPdf($target, title);
        break;
      case '#html':
        exportToHtml($target, title);
        break;
      default:
        printHtml($target, title);
    }
    $target.remove();
  });

  function printHtml ($data, title) {
    $('<style>').text('tr.total.alarm td {color: red;} tr.total{font-weight: bold;}').prependTo($data);
    $data.addClass('printed-area');
    print();
  }

  function exportToHtml ($data, title) {
    $('<style>').text('tr.total.alarm td {color: red;} tr.total{font-weight: bold;}')
      .prependTo($data);
    saveAs(new Blob([$data.html()], {
      type: "text/plain;charset=" + document.characterSet
    }), title + ".html");
  }

  function stringToArrayBbuffer (s) {
    if(typeof window.ArrayBuffer !== 'undefined') {
      var buf = new ArrayBuffer(s.length);
      var view = new Uint8Array(buf);
      for (var i = 0; i < s.length; ++i) {
        view[i] = s.charCodeAt(i) & 0xFF;
      }
      return buf;
    }
    var buf = new Array(s.length);
    for (var i=0; i < s.length; ++i) {
      buf[i] = s.charCodeAt(i) & 0xFF;
    }
    return buf;
  }

  function exportToPdf ($html, title) {
    var doc = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [20, 20, 20, 20],
      styles: {
        header: {
          fontSize: 15,
          marginBottom: 15
        },
        table: {
          fontSize: 10
        },
        bold: {
          bold: true
        },
        total: {
          bold: true,
          padding: 5
        },
        alarm: {
          bold: true,
          color: 'red',
          padding: 5
        }
      },
      content: [
        {text: title, style: 'header'},
        {table: converToPdfData($html), style:'table'}
      ]
    };
    try {
      //pdfMake.createPdf(doc).open();
      // pdfMake.createPdf(doc).print();
      pdfMake.createPdf(doc).download(title + '.pdf');
    } catch (err) {
      console.error(err);
    }
  }

  function converToPdfData ($html) {
    var body = [];
    var thead = [];
    var matrix = createTableMatrix($html);
    for (var y in matrix) {
      if (matrix.hasOwnProperty(y)) {
        var row = [];
        for (var x in matrix[y]) {
          if (matrix[y].hasOwnProperty(x)) {
            var cell = matrix[y][x];
            if (cell === true) {
              row.push('');
            } else {
              var $row = cell.$cell.parent();
              var style = $row.hasClass('alarm') ? 'alarm' : $row.hasClass('total') ? 'total' : 'cell';
              style = $row.parent('thead').length ? 'total' : style;
              var data = {
                text: cell.$cell.html(),
                style: style
              };
              if (cell.rowSpan > 1) {
                data.rowSpan = cell.rowSpan;
              }
              if (cell.colSpan > 1) {
                data.colSpan = cell.colSpan;
              }
              row.push(data);
            }
          }
        }
        body.push(row);
      }
    }
    return {
      headerRows: 1,
      body: body
    };
  }

  function createTableMatrix ($content) {
    var $rows = $content.find('tr');
    var matrix = [];
    var nRows = $rows.length;
    var nCells = 0;
    $rows.each(function () {
      matrix.push([]);
      var count = $(this).children().length;
      if (count > nCells) {
        nCells = count;
      }
    });
    var rowIndex = 0, cellIndex = 0;
    for (var y = 0; y < nRows; ++y) {
      for (var x = 0; x < nCells; ++x) {
        var cell = matrix[y][x];
        if (cell) {
          continue;
        }
        var $row = $rows.eq(rowIndex);
        var $cell = $row.children().eq(cellIndex);
        var rowSpan = parseInt($cell.attr('rowspan')) || 1;
        var colSpan = parseInt($cell.attr('colspan')) || 1;
        for (var i = 0; i < rowSpan; ++i) {
          for (var j = 0; j < colSpan; ++j) {
            matrix[y + i][x + j] = true;
          }
        }
        matrix[y][x] = {
          $cell: $cell,
          rowSpan: rowSpan,
          colSpan: colSpan
        };
        cellIndex += 1;
        if (cellIndex === $row.children().length) {
          cellIndex = 0;
          rowIndex += 1;
        }
      }
    }
    return matrix;
  }
})(jQuery);