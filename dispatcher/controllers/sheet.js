// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/**
 * Created by kras on 24.05.16.
 */
'use strict';

const moduleName = require('../../module-name');
const di = require('core/di');
const processSheet = require('../../backend/util').processSheet;
const infoPromise = require('../../backend/util').infoPromise;
const buildMenu = require('../../backend/menu').buildMenu;
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

  let builders = scope.settings.get(moduleName + '.mineBuilders') || {};
  if (!builders.hasOwnProperty(mine.namespace()) || !builders[mine.namespace()].hasOwnProperty(mine.name())) {
    scope.sysLog.error('Не настроены сборщики источников данных для шахты "' + mine.name() + '"');
    return res.sendStatus(404);
  }
  builders = builders[mine.namespace()][mine.name()];

  let getter = null;
  let info = [];
  let locales = new locale.Locales(req.headers['accept-language']);
  let lang = locales[0] ? locales[0].language : 'ru';

  mine.sources().forEach(function (src) {
    if (!builders.hasOwnProperty(src.name)) {
      scope.sysLog.warn('Не настроен сборщик для источника данных "' + mine.name() + '.' + src.name + '".');
      return;
    }
    /**
     * @type {MineBuilder}
     */
    let b = scope[builders[src.name]];
    if (!b) {
      scope.sysLog.warn('Не найден сборщик для источника "' + mine.name() + '.' + src.name + '".');
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
        'view/sheet',
        {
          baseUrl: req.app.locals.baseUrl,
          module: moduleName,
          title: sheet.caption,
          pageCode: sheet.name,
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
          sheet: processSheet(sheet),
          user: scope.auth.getUser(req),
          logo: scope.settings.get(moduleName + '.logo')
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
