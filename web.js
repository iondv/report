// jscs:disable requireCapitalizedComments
/**
 * Created by kras on 06.07.16.
 */
'use strict';

const path = require('path');
const express = require('express');
const route = express.Router;
const router = route();
const ejsLocals = require('ejs-locals');
const di = require('core/di');
const config = require('./config');
const rootConfig = require('../../config');
const moduleName = require('./module-name');
const dispatcher = require('./dispatcher');
const staticRouter = require('lib/util/staticRouter');
const extViews = require('lib/util/extViews');
const extendDi = require('core/extendModuleDi');
const theme = require('lib/util/theme');
const alias = require('core/scope-alias');
const sysMenuCheck = require('lib/util/sysMenuCheck');
const lastVisit = require('lib/last-visit');
const viewPathResolver = require('lib/util/viewResolver');
// const i18nSetup = require('core/i18n-setup'); -----------------------------------
// const errorSetup = require('core/error-setup'); ВРЕМЕННЫЙ ФИКС ПОД IONCORE-648
const strings = require('core/strings');
const isProduction = process.env.NODE_ENV === 'production';

const lang = config.lang || rootConfig.lang || 'ru';
// const i18nDir = path.join(__dirname, 'i18n');
// errorSetup(lang, i18nDir);                           ВРЕМЕННЫЙ ФИКС ПОД IONCORE-648
// i18nSetup(lang, config.i18n || i18nDir, moduleName); ------------------------------

router.get('/public/:mine/:report/:sheet', dispatcher.pubSheet);
router.get('/public/:mine/:report/:sheet/:template', dispatcher.pubSheet);

router.get('/', dispatcher.index);
router.get('/:mine/build', dispatcher.build);
router.get('/:mine/check', dispatcher.check);
router.get('/:mine/:report', lastVisit.saver, dispatcher.report);
router.get('/:mine/:report/:sheet', lastVisit.saver, dispatcher.sheet);
router.get('/:mine/:report/:sheet/data', dispatcher.data);
router.post('/:mine/:report/:sheet/data', dispatcher.data);
router.get('/:mine/:report/:sheet/:filterName/filter', dispatcher.filters);
router.get('/:mine/:report/:sheet/:filterName/param', dispatcher.filters);
router.post('/:mine/:report/:sheet/:format/start', dispatcher.export.start);
router.get('/:mine/:report/:sheet/:format/status', dispatcher.export.check);
router.get('/:mine/:report/:sheet/:format/download', dispatcher.export.download);

const app = express();
module.exports = app;

app.locals.sysTitle = config.sysTitle;
app.locals.staticsSuffix = process.env.ION_ENV === 'production' ? '.min' : '';
app.locals.resolveTpl = viewPathResolver(app);
app.locals.s = strings.s;
app.locals.__ = (str, params) => strings.s(moduleName, str, params);

app.use('/' + moduleName, express.static(path.join(__dirname, 'view/static')));

app.engine('ejs', ejsLocals);
app.set('view engine', 'ejs');

app._init = function () {
  return di(
      moduleName,
    extendDi(moduleName, config.di),
      {
        module: app
      },
      'app',
      [],
      'modules/' + moduleName)
    .then(scope => alias(scope, scope.settings.get(moduleName + '.di-alias')))
    .then((scope) => {
      const staticOptions = isProduction ? scope.settings.get('staticOptions') : undefined;
      try {
        let themePath = scope.settings.get(moduleName + '.theme') || config.theme || 'default';
        themePath = theme.resolve(__dirname, themePath);
        // const themeI18n = path.join(themePath, 'i18n');
        // i18nSetup(lang, themeI18n, moduleName, scope.sysLog);
        theme(
          app,
          moduleName,
          __dirname,
          themePath,
          scope.sysLog,
          staticOptions
        );
        app.locals.pageTitle = scope.settings.get(moduleName + '.pageTitle')
            || scope.settings.get('pageTitle')
            || `ION ${config.sysTitle}`;
        app.locals.pageEndContent = scope.settings.get(moduleName +'.pageEndContent') || scope.settings.get('pageEndContent') || '';
        extViews(app, scope.settings.get(moduleName + '.templates'));
        let statics = staticRouter(scope.settings.get(moduleName + '.statics'), staticOptions);
        if (statics) {
          app.use('/' + moduleName, statics);
        }
        scope.auth.bindAuth(app, moduleName, {auth: false});
        app.use((req, res, next) => {
          const user = scope.auth.getUser(req);
          res.locals.__ = (s, p) => strings.s(moduleName, s, p, user && user.language());
          next();
        });
        app.use('/' + moduleName, sysMenuCheck(scope, app, moduleName));
        app.use('/' + moduleName, router);
      } catch (err) {
        return Promise.reject(err);
      }
      return Promise.resolve();
    }
  );
};
