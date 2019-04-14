/**
 * Created by krasilneg on 27.12.16.
 */
'use strict';
const Report = require('./Report');

/**
 * @param {{name: String, caption: String, reports: Object[], sources: Object[]}} base
 * @constructor
 */
function DataMine(base) {
  var _this = this;

  var reports = [];
  var reportsByName = {};

  base.reports.forEach(
    function (r) {
      /**
       * @type {Report}
       */
      var w = new Report(r, _this);
      reports.push(w);
      reportsByName[w.name()] = w;
    }
  );

  this.name = function () {
    return base.name;
  };

  this.namespace = function () {
    return base.namespace;
  };

  this.canonicalName = function () {
    return (this.namespace() ? this.namespace() + '@' : '') + this.name();
  };

  this.caption = function () {
    return base.caption;
  };

  /**
   * @returns {Array}
   */
  this.reports = function () {
    return reports;
  };

  this.report = function (name) {
    return reportsByName[name];
  };

  /**
   *
   * @returns {Object[]}
   */
  this.sources = function () {
    return base.sources;
  };
}

module.exports = DataMine;
