// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/**
 * Created by kras on 24.05.16.
 */
'use strict';

const { di } = require('@iondv/core');

const formFilter = require('../../backend/util').formFilter;
const locale = require('locale');

/* jshint maxstatements: 50, maxcomplexity: 30 */
module.exports = function (req, res) {
  /**
   * @type {{reportMeta: ReportMetaRepository, reportBuilder: ReportBuilder}}
   */
  let scope = di.context(req.moduleName);

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
  formFilter(sheet, req, opts, lang);
  if (sheet.type === 'list') {
    opts.count = req.query && req.query._count_ || req.body && req.body._count_;
    opts.offset = req.query && req.query._offset_ || req.body && req.body._offset_;
    opts.countTotal = opts.count ? true : false;
  }

  scope.reportBuilder.sheetData(mine.name(), sheet, opts)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      scope.sysLog.error(err);
      res.sendStatus(500);
    });
};
