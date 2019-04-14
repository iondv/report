// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/**
 * Created by kras on 24.05.16.
 */
'use strict';

const moduleName = require('../../module-name');
const di = require('core/di');
const processSheet = require('../../backend/util').processSheet;
const formFilter = require('../../backend/util').formFilter;
const pnf = require('../../backend/pnf');
const locale = require('locale');
const moment = require('moment');

/* jshint maxstatements: 50, maxcomplexity: 30 */
module.exports = function (req, res) {
  /**
   * @type {{reportMeta: ReportMetaRepository, reportBuilder: ReportBuilder}}
   */
  let scope = di.context(moduleName);

  /**
   * @type {DataMine|null}
   */
  let mine = scope.reportMeta.getDataMine(req.params.mine);
  if (!mine) {
    return pnf(req, res, scope);
  }

  /**
   * @type {Report}
   */
  let report = mine.report(req.params.report);
  if (!report) {
    return pnf(req, res, scope);
  }

  let sheet = report.sheet(req.params.sheet);
  if (!sheet) {
    return pnf(req, res, scope);
  }

  let template = req.params.template || 'public/index';
  let locales = new locale.Locales(req.headers['accept-language']);
  let lang = locales[0] ? locales[0].language : 'ru';
  let opts = {namespace: mine.namespace(), lang: lang};

  formFilter(sheet, req, opts, lang);

  scope.reportBuilder.sheetData(mine.name(), sheet, opts)
    .then((data) => {
      let hideSingleGroup = req.query ? req.query._hsg_ || false : false;
      let skipFirstCol = false;
      if (hideSingleGroup) {
        if (data.length === 1 && Array.isArray(data[0]._data)) {
          let tmp = data[0]._data;
          if (data[0]._totals) {
            tmp = tmp.concat(data[0]._totals);
          }
          data = tmp;
          skipFirstCol = true;
        }
      }
      let options = {
        baseUrl: req.app.locals.baseUrl,
        module: moduleName,
        locale: {
          lang: lang,
          dateFormat: moment.localeData(lang).longDateFormat('L'),
          dateTimeFormat: moment.localeData(lang).longDateFormat('L') + ' ' + moment.localeData(lang).longDateFormat('LT')
        },
        data: data,
        sheet: processSheet(sheet, opts.filter, skipFirstCol, opts.params)
      };
      res.render(template, options);
    })
    .catch((err) => {
      scope.sysLog.error(err);
      res.sendStatus(500);
    });
};
