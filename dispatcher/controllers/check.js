/**
 * Created by krasilneg on 29.12.16.
 */
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
'use strict';

var moduleName = require('../../module-name');
var di = require('core/di');

/* jshint maxstatements: 50, maxcomplexity: 30 */

module.exports = function (req, res) {
  /**
   * @type {{reportMeta: ReportMetaRepository, reportBuilder: ReportBuilder}}
   */
  let scope = di.context(moduleName);
  let mineName = req.params.mine.split('@');

  /**
   * @type {DataMine|null}
   */
  let mine = scope.reportMeta.getDataMine(
    mineName.length > 1 ? mineName[1] : mineName[0],
    mineName.length > 1 ? mineName[0] : null
  );
  if (!mine) {
    res.sendStatus(404);
    return;
  }
  let sources = mine.sources();
  let progress = 0;
  if (req.session.mineBuilds && req.session.mineBuilds.hasOwnProperty(mine.canonicalName())) {
    progress = req.session.mineBuilds[mine.canonicalName()];
  }
  let current = sources[progress];
  res.status(200).send({
    currentSource: current ? {
      name: current.name,
      caption: current.caption
    } : null,
    progress: String(Math.round(progress * 100 / sources.length, 0))
  });
};
