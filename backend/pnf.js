'use strict';
const buildMenu = require('./menu').buildMenu;
const { t } = require('@iondv/i18n');

module.exports = (req, res, scope) => {
  res.render('view/404', {
    module: req.moduleName,
    title: t('Report not found'),
    pageCode: '404',
    node: `${req.params.mine}@${req.params.report}`,
    leftMenu: buildMenu(req.moduleName, scope.settings, scope.reportMeta, scope.metaRepo),
    user: scope.auth.getUser(req),
    logo: scope.settings.get(req.moduleName + '.logo')
  });
};
