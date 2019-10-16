'use strict';
const moduleName = require('../module-name');
const buildMenu = require('./menu').buildMenu;

module.exports = function (req, res, scope) {
  res.render('view/404', {
    module: moduleName,
    title: 'Отчет не найден',
    pageCode: '404',
    node: `${req.params.mine}@${req.params.report}`,
    leftMenu: buildMenu(moduleName, scope.settings, scope.reportMeta, scope.metaRepo),
    user: scope.auth.getUser(req),
    logo: scope.settings.get(moduleName + '.logo')
  });
};
