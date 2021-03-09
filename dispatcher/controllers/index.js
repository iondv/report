/**
 * Created by kras on 24.05.16.
 */
'use strict';

const buildMenu = require('../../backend/menu').buildMenu;
const { di } = require('@iondv/core');

module.exports = function (req, res) {
  /**
   * @type {{reportMeta: ReportMetaRepository}}
   */
  let scope = di.context(req.moduleName);

  /**
   * @type {SettingsRepository}
   */
  let settings = scope.settings;
  let defaultNav = settings.get(req.moduleName + '.defaultNav');
  if (defaultNav && defaultNav.mine && defaultNav.report) {
    let mine = defaultNav.mine;
    if (mine.indexOf('@') < 0) {
      let ns = defaultNav.namespace;
      if (!ns) {
        let nss = settings.get(req.moduleName + '.namespaces') || {};
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
      return res.redirect('/' + req.moduleName + '/' + mine + '/' + defaultNav.report);
    }
  }
  res.render('view/index', {
    baseUrl: req.app.locals.baseUrl,
    module: req.moduleName,
    title: req.locals.t('ION Reports'),
    pageCode: 'index',
    node: req.params.mine,
    leftMenu: buildMenu(req.moduleName, scope.settings, scope.reportMeta, scope.metaRepo),
    user: scope.auth.getUser(req),
    logo: scope.settings.get(req.moduleName + '.logo')
  });
};

