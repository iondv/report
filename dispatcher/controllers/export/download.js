/**
 * Created by krasilneg on 29.12.16.
 */
'use strict';

const moduleName = require('../../../module-name');
const di = require('core/di');

/* jshint maxstatements: 50, maxcomplexity: 30 */

module.exports = function (req, res) {
  /**
   * @type {{reportMeta: ReportMetaRepository, reportExporter: ReportExporter}}
   */
  const scope = di.context(moduleName);

  const mineName = req.params.mine.split('@');

  /**
   * @type {DataMine|null}
   */
  const mine = scope.reportMeta.getDataMine(
    mineName.length > 1 ? mineName[1] : mineName[0],
    mineName.length > 1 ? mineName[0] : null
  );
  if (!mine) {
    res.sendStatus(404);
    return;
  }

  /**
   * @type {Report}
   */
  let report = mine.report(req.params.report);
  if (!report) {
    res.sendStatus(404);
    return;
  }

  let sheet = report.sheet(req.params.sheet);
  if (!sheet) {
    res.sendStatus(404);
    return;
  }

  let opts = {
    mine: mine.canonicalName(),
    report: report.name(),
    sheet: sheet.name,
    format: req.params.format,
    file: true
  };
  let u = scope.auth.getUser(req);
  try {
    scope.reportExporter.result(u.id(), opts)
      .then((result) => {
        if (result && result.stream) {
          result.options((err, opts) => {
            if (err) {
              return res.status(404).send('File not found!');
            }
            result.stream((err, stream) => {
              res.status(200);
              res.set('Content-Disposition',
                'attachment; filename="' + encodeURIComponent(result.name) +
                '";filename*=UTF-8\'\'' + encodeURIComponent(result.name));
              res.set('Content-Type', opts.mimetype || 'application/octet-stream');
              if (opts.size) {
                res.set('Content-Length', opts.size);
              }
              if (opts.encoding) {
                res.set('Content-Encoding', opts.encoding);
              }
              stream.pipe(res);
            });
          });
        } else {
          res.status(404).send('File not found!');
        }
      })
      .catch((err) => {
        scope.sysLog.error(err);
        res.sendStatus(500);
      });
  } catch (err) {
    scope.sysLog.error(err);
    res.sendStatus(500);
  }
};
