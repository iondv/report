/**
 * Created by kras on 24.05.16.
 */
'use strict';

var buildMenu = require('../../backend/menu').buildMenu;
var moduleName = require('../../module-name');
var di = require('core/di');

module.exports = function (req, res) {
  /**
   * @type {{reportMeta: ReportMetaRepository}}
   */
  let scope = di.context(moduleName);

  /**
   * @type {SettingsRepository}
   */
  let settings = scope.settings;
  let defaultNav = settings.get(moduleName + '.defaultNav');
  if (defaultNav && defaultNav.mine && defaultNav.report) {
    let mine = defaultNav.mine;
    if (mine.indexOf('@') < 0) {
      let ns = defaultNav.namespace;
      if (!ns) {
        let nss = settings.get(moduleName + '.namespaces') || {};
        for (ns in nss) {
          if (nss.hasOwnProperty(ns)) {
            break;
          }
        }
      }
      if (ns) {
        mine = ns + '@' + mine;
      } else {
        mine = false;
      }
    }
    if (mine) {
      return res.redirect('/' + moduleName + '/' + mine + '/' + defaultNav.report);
    }
  }
  res.render('view/index', {
    baseUrl: req.app.locals.baseUrl,
    module: moduleName,
    title: 'IONDV. Reports',
    pageCode: 'index',
    node: req.params.mine,
    leftMenu: buildMenu(moduleName, scope.settings, scope.reportMeta, scope.metaRepo),
    user: scope.auth.getUser(req),
    logo: scope.settings.get(moduleName + '.logo')
  });
};

