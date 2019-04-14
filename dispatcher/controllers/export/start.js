/**
 * Created by krasilneg on 29.12.16.
 */
'use strict';

const moduleName = require('../../../module-name');
const di = require('core/di');
const locale = require('locale');

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

  let opts = {
    mine: mine.canonicalName(),
    report: report.name(),
    sheet: sheet.name,
    format: req.params.format
  };
  let locales = new locale.Locales(req.headers['accept-language']);
  let lang = locales[0].language;
  opts.lang = lang;
  opts.env = req.body;
  let u = scope.auth.getUser(req);
  try {
    scope.reportExporter.export(u.id(), opts)
      .then(() => {res.sendStatus(200);})
      .catch((err) => {
        scope.sysLog.error(err);
        res.sendStatus(500);
      });
  } catch (err) {
    scope.sysLog.error(err);
    res.sendStatus(500);
  }
};
