/**
 * Created by kras on 20.08.16.
 */
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
'use strict';

const moduleName = require('../../module-name');
const di = require('core/di');
const pnf = require('../../backend/pnf');
const buildMenu = require('../../backend/menu').buildMenu;
const processReport = require('../../backend/util').processReport;
const infoPromise = require('../../backend/util').infoPromise;
const moment = require('moment');
const locale = require('locale');
const __ = require('core/strings').unprefix('errors');
const Errors = require('../../errors/backend');

/* jshint maxstatements: 50, maxcomplexity: 30 */

module.exports = function (req, res) {
  /**
   * @type {{reportMeta: ReportMetaRepository, settings: SettingsRepository, sysLog: Logger}}
   */
  let scope = di.context(moduleName);
  /**
   * @type {DataMine|null}
   */
  let mine = scope.reportMeta.getDataMine(req.params.mine);
  if (!mine) {
    return pnf(req, res, scope);
  }
  let report = mine.report(req.params.report);
  if (!report) {
    return pnf(req, res, scope);
  }
  let builders = scope.settings.get(moduleName + '.mineBuilders') || {};
  if (!builders.hasOwnProperty(mine.namespace()) || !builders[mine.namespace()].hasOwnProperty(mine.name())) {
    scope.sysLog.error(__(Errors.NO_BUILDERS, {mine: mine.name()}));
    return res.sendStatus(404);
  }
  builders = builders[mine.namespace()][mine.name()];

  let getter = null;
  let info = [];
  let locales = new locale.Locales(req.headers['accept-language']);
  let lang = locales[0] ? locales[0].language : 'ru';

  mine.sources().forEach(function (src) {
    if (!builders.hasOwnProperty(src.name)) {
      scope.sysLog.warn(__(Errors.NO_BUILDERS_SRC, {mine: mine.name(), src: src.name}));
      return;
    }
    /**
     * @type {MineBuilder}
     */
    let b = scope[builders[src.name]];
    if (!b) {
      scope.sysLog.warn(__(Errors.NO_SRC, {mine: mine.name(), src: src.name}));
      return;
    }
    if (!getter) {
      getter = infoPromise(b, mine, src.name, info, locales[0] ? locales[0].language : 'ru')();
    } else {
      getter = getter.then(infoPromise(b, mine, src.name, info, locales[0] ? locales[0].language : 'ru'));
    }
  });
  if (getter) {
    getter.then(function () {
      res.render(
        'view/report',
        {
          baseUrl: req.app.locals.baseUrl,
          module: moduleName,
          title: report.caption(),
          pageCode: report.name(),
          sourcesInfo: info.length ? info : null,
          mine: mine,
          node: `${req.params.mine}@${req.params.report}`,
          report: report,
          leftMenu: buildMenu(moduleName, scope.settings, scope.reportMeta, scope.metaRepo),
          locale: {
            lang: lang,
            dateFormat: moment.localeData(lang).longDateFormat('L'),
            dateTimeFormat: moment.localeData(lang).longDateFormat('L') + " " + moment.localeData(lang).longDateFormat('LT')
          },
          sheets: processReport(report),
          user: scope.auth.getUser(req),
          logo: scope.settings.get(moduleName + '.logo'),
          pageTitle: `${req.app.locals.pageTitle} - ${report.caption()}`,
        }
      );
    }).catch(function (err) {
      scope.sysLog.error(err);
      res.sendStatus(500);
    });
  } else {
    return pnf(req, res, scope);
  }
};
