'use strict';

const moduleName = require('../../module-name');
const di = require('core/di');
const locale = require('locale');

function findField(fieldId, columns) {
  let f = null;
  if (Array.isArray(columns) && columns.length) {
    for (let i = 0; i < columns.length; i++) {
      if (columns[i].field === fieldId) {
        f = columns[i];
      } else if (columns[i].columns) {
        f = findField(fieldId, columns[i].columns);
      }
      if (f) {
        break;
      }
    }
  }
  return f;
}

/* jshint maxstatements: 50, maxcomplexity: 30 */
module.exports = function (req, res) {
  /**
   * @type {{reportMeta: ReportMetaRepository, reportBuilder: ReportBuilder}}
   */
  let scope = di.context(moduleName);

  let mineName = req.params.mine.split('@');

  /**
   * @type {DataMine|null}
   */
  let mine = scope.reportMeta.getDataMine(
    mineName.length > 1 ? mineName[1] : mineName[0],
    mineName.length > 1 ? mineName[0] : null
  );
  if (!mine) {
    res.sendStatus(404);
    return;
  }

  /**
   * @type {Report}
   */
  let report = mine.report(req.params.report);
  if (!report) {
    res.sendStatus(404);
    return;
  }

  let sheet = report.sheet(req.params.sheet);
  if (!sheet) {
    res.sendStatus(404);
    return;
  }

  let opts = {namespace: mine.namespace()};
  let locales = new locale.Locales(req.headers['accept-language']);
  let lang = locales[0] ? locales[0].language : 'ru';
  opts.lang = lang;
  let filterType = req.path.split('/').pop();
  let filter;
  if (filterType === 'filter') {
    let field = findField(req.params.filterName, sheet.columns);
    filter = field && field.filter;
  } else if (filterType === 'param') {
    let param = req.params.filterName;
    filter = sheet.params && sheet.params[param] && sheet.params[param].selectQuery;
  }
  if (!filter) {
    res.sendStatus(404);
    return;
  }

  scope.reportBuilder.sheetFilters(mine.name(), sheet, filter, opts)
    .then(data => res.send(data))
    .catch((err) => {
      scope.sysLog.error(err);
      res.sendStatus(500);
    });
};
