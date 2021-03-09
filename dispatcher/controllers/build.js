/**
 * Created by krasilneg on 29.12.16.
 */
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
'use strict';

const { di, utils: { strings } } = require('@iondv/core');
const __ = strings.unprefix('errors');
const Errors = require('../../errors/backend');

/**
 * @param {MineBuilder} builder
 * @param {DataMine} mine
 * @param {{}} src
 * @returns {Function}
 */
function buildPromise(builder, mine, src, req) {
  return () => builder
    .buildSource(mine.name(), src, {namespace: mine.namespace()})
    .then(() =>
      new Promise((resolve) => {
        req.session.mineBuilds[mine.canonicalName()] = req.session.mineBuilds[mine.canonicalName()] + 1;
        req.session.save(() => resolve());
      })
    );
}

/* jshint maxstatements: 50, maxcomplexity: 30 */
module.exports = function (req, res) {
  /**
   * @type {{reportMeta: ReportMetaRepository, settings: SettingsRepository, sysLog: Logger}}
   */
  const scope = di.context(req.moduleName);
  const mineName = req.params.mine.split('@');

  /**
   * @type {DataMine|null}
   */
  const mine = scope.reportMeta.getDataMine(
    mineName.length > 1 ? mineName[1] : mineName[0],
    mineName.length > 1 ? mineName[0] : null
  );

  if (!mine) {
    return res.sendStatus(404);
  }

  let builders = scope.settings.get(req.moduleName + '.mineBuilders') || {};

  if (!builders.hasOwnProperty(mine.namespace()) || !builders[mine.namespace()].hasOwnProperty(mine.name())) {
    scope.sysLog.error(__(Errors.NO_BUILDERS, {mine: mine.name()}));
    return res.sendStatus(404);
  }

  builders = builders[mine.namespace()][mine.name()];

  let builder = null;

  req.session.mineBuilds = req.session.mineBuilds || {};
  req.session.mineBuilds[mine.canonicalName()] = 0;

  mine.sources().forEach(function (src) {
    if (!builders.hasOwnProperty(src.name)) {
      scope.sysLog.warn(__(Errors.NO_BUILDERS_SRC, {mine: mine.name(), src: src.name}));
      return;
    }

    /**
     * @type {MineBuilder}
     */
    const b = scope[builders[src.name]];
    if (!b) {
      scope.sysLog.warn(__(Errors.NO_SRC, {mine: mine.name(), src: src.name}));
      return;
    }

    if (!builder) {
      builder = buildPromise(b, mine, src, req)();
    } else {
      builder = builder.then(buildPromise(b, mine, src, req));
    }
  });

  if (builder) {
    builder
      .then(() => scope.sysLog.log(req.locals.t('Data %mine', {mine: mine.canonicalName()})))
      .catch((err) => {
        req.session.mineBuilds[mine.canonicalName()] = mine.sources().length;
        scope.sysLog.error(err);
      });
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
};
