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

const { di, utils: { strings } } = require('@iondv/core');
const { load } = require('@iondv/i18n');
const { utils: { extendDi } } = require('@iondv/commons');

const {
  util: {
    staticRouter, extViews, theme, lastVisit, viewResolver: viewPathResolver
  }
} = require('@iondv/web');
const sysMenuCheck = require('@iondv/web-rte/util/sysMenuCheck');

const alias = di.alias;

const config = require('./config');
const dispatcher = require('./dispatcher');

const isProduction = process.env.NODE_ENV === 'production';

strings.registerBase('frontend', require('./strings/frontend-scripts'));
strings.registerBase('tpl', require('./strings/templates-default'));

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

app.engine('ejs', ejsLocals);
app.set('view engine', 'ejs');

app._init = function (moduleName) {
  // app.use('/' + moduleName, express.static(path.join(__dirname, 'view/static')));
  return load(path.join(process.cwd(), 'i18n'))
    .then(() => di(
      moduleName,
      extendDi(moduleName, config.di),
      {
        module: app
      },
      'app'
    ))
    .then(scope => alias(scope, scope.settings.get(moduleName + '.di-alias')))
    .then((scope) => {
      const staticOptions = isProduction ? scope.settings.get('staticOptions') : undefined;
      const themePath = scope.settings.get(moduleName + '.theme') || config.theme || 'default';
      try {
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
          app.use('/', statics);
        }
        scope.auth.bindAuth(app, moduleName, {auth: false});
        app.use('/', sysMenuCheck(scope, app, moduleName));
        app.use('/', router);
      } catch (err) {
        return Promise.reject(err);
      }
      return Promise.resolve();
    }
  );
};
