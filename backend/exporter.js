'use strict';

const Background = require('@iondv/commons/lib/Background');
const path = require('path');
const fs = require('fs');
const mimes = require('mime-types');
const clone = require('clone');
const mkdirp = require('mkdirp');
const base64 = require('base64-js');

const { utils: { system: { toAbsolute: toAbsolutePath } } } = require('@iondv/core');
const toExcel = require('./export/excel');
const processSheet = require('./util').processSheet;
const formFilter = require('./util').formFilter;

/**
 * @param {{}} options
 * @param {Background} options.bg
 * @param {ReportMetaRepository} options.reportMeta
 * @param {ReportBuilder} options.reportBuilder
 */
module.exports = function ReportExporter(options) {

  function sid(opts) {
    return opts.mine + ':' + opts.report + ':' + opts.sheet + ':' + opts.format;
  }

  this.init = function () {
    if (options.bg instanceof Background) {
      options.bg.register('reportExporter');
    }
    return Promise.resolve();
  };

  this.run = function (params) {
    let mine = options.reportMeta.getDataMine(params.mine);
    let sheet = mine.report(params.report).sheet(params.sheet);
    let fn = sheet.caption;
    let uid = params.uid;
    let exportPath;
    if (options.exportPath) {
      exportPath = toAbsolutePath(options.exportPath);
    }
    if (!exportPath) {
      exportPath = path.normalize(path.join(__dirname, '..', '..', 'exports'));
    }
    exportPath = path.join(exportPath, uid);
    fn = path.join(exportPath, fn);
    let p = new Promise((resolve, reject) => {
      fs.access(exportPath, fs.constants.F_OK, (err) => {
        if (!err) {
          return resolve();
        }
        mkdirp(exportPath, err => err ? reject(err) : resolve());
      });
    });

    if (params.env) {
      let opts = {};
      let env = {body: JSON.parse(Buffer.from(base64.toByteArray(params.env)).toString())};
      formFilter(sheet, env, opts, params.lang);
      params.filter = opts.filter;
      params.params = opts.params;
    }

    if (params.previous) {
      p = p.then(() => new Promise((resolve) => {
          fs.unlink(path.join(exportPath, params.previous), (err) => {
            if (err && options.log) {
              options.log.warn(err.message);
            }
            resolve();
          });
        })
      );
    }

    switch (params.format) {
      case 'excel':
        fn = fn + '.xlsx';
        p = p.then(() => toExcel(fn, {
          builder: options.reportBuilder,
          meta: options.reportMeta,
          mine: params.mine,
          sheet: processSheet(sheet),
          filter: params.filter,
          params: params.params
        }));
        break;
      default:
      {
        p = p.then(() => {
          throw new Error('Unsupported export format ' + params.format);
        });
      }
    }

    return p.then(() => path.basename(fn));
  };

  this.export = function (uid, opts) {
    if (options.bg instanceof Background) {
      let opts2 = clone(opts);
      delete opts2.file;
      return this.result(uid, opts2)
        .then(function (previous) {
          return options.bg.start(
            uid,
            'reportExporter',
            sid(opts),
            {
              path: path.join('modules', 'report'),
              mine: opts.mine,
              report: opts.report,
              sheet: opts.sheet,
              format: opts.format,
              previous: previous || '',
              lang: opts.lang,
              env: opts.env ? base64.fromByteArray(Buffer.from(JSON.stringify(opts.env), 'UTF-8')) : ''
            }
          );
        });
    }
    throw new Error('Invalid configuration!');
  };

  /**
   * @param {String} uid
   * @param {{}} opts
   * @returns {Promise.<boolean>}
   */
  this.status = function (uid, opts) {
    if (options.bg instanceof Background) {
      return options.bg.status(uid, 'reportExporter', sid(opts)).then(status => status === Background.RUNNING);
    }
    return Promise.resolve(false);
  };

  function streamGetter(file) {
    return (cb) => {
      fs.access(file, fs.constants.R_OK, (err) => {
        if (err) {
          return cb(err, null);
        }
        return cb(null, fs.createReadStream(file));
      });
    };
  }

  function optsGetter(file) {
    return function (cb) {
      fs.open(file, 'r', (err, fd) => {
        if (err) {
          return cb(err);
        }
        fs.fstat(fd, (err, stat) => {
          if (err) {
            return cb(err);
          }
          fs.close(fd, (err) => {
            if (err) {
              return cb(err);
            }
            cb(null, {
              mimetype: mimes.lookup(file),
              size: stat.size
            });
          });
        });
      });
    };
  }

  /**
   * @param {String} uid
   * @param {{}} opts
   * @returns {Promise}
   */
  this.result = function (uid, opts) {
    if (options.bg instanceof Background) {
      return options.bg.results(uid, 'reportExporter', sid(opts))
        .then(
          (res) => {
            if (Array.isArray(res) && res.length) {
              if (res[0]) {
                if (opts.file) {
                  let exportPath;
                  if (options.exportPath) {
                    exportPath = toAbsolutePath(options.exportPath);
                  }
                  if (!exportPath) {
                    exportPath = path.normalize(path.join(__dirname, '..', '..', 'exports'));
                  }
                  let fn = path.join(exportPath, uid, res[0]);
                  return {
                    name: res[0],
                    options: optsGetter(fn),
                    stream: streamGetter(fn)
                  };
                }
                return res[0];
              }
            }
          }
        );
    }
    return Promise.resolve(null);
  };
};
