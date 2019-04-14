/**
 * Created by krasilneg on 28.12.16.
 */
'use strict';

const SheetTypes = {
  AGGREGATION: 'aggregation',
  PIVOT: 'pivot'
};

function Sheet() {
  this.name = function () {
    return this.base.name;
  };

  this.caption = function () {
    return this.base.caption;
  };

  this.type = function () {
    return this.base.type;
  };

  this.report = function () {
    return this.report;
  };
}

/**
 * @param {{name: String, caption: String, groupBy: String[], orderBy: String[], data: String[]}} base
 * @param {Report} report
 * @constructor
 */
function Aggregation(base, report) {

  if (base.type !== SheetTypes.AGGREGATION) {
    throw new Error('Bad parameter');
  }

  this.base = base;

  this.report = report;

  /**
   * @returns {String[]}
   */
  this.groupBy = function () {
    return this.base.groupBy;
  };

  /**
   * @returns {String[]}
   */
  this.orderBy = function () {
    return this.base.orderBy;
  };

  /**
   * @returns {String[]}
   */
  this.data = function () {
    return this.base.data;
  };
}

Aggregation.prototype = new Sheet();

/**
 * @param {{name: String, caption: String, hDimensions: String[], vDimensions: String[], data: String[]}} base
 * @param {Report} report
 * @constructor
 */
function Pivot(base, report) {

  if (base.type !== SheetTypes.PIVOT) {
    throw new Error('Bad parameter');
  }

  this.base = base;

  this.report = report;

  /**
   * @returns {String[]}
   */
  this.hDimensions = function () {
    return this.base.hDimensions;
  };

  /**
   * @returns {String[]}
   */
  this.vDimensions = function () {
    return this.base.vDimensions;
  };

  /**
   * @returns {String[]}
   */
  this.data = function () {
    return this.base.data;

  };
}

Pivot.prototype = new Sheet();

module.exports.SheetTypes = SheetTypes;
module.exports.Sheet = Sheet;
module.exports.Aggregation = Aggregation;
module.exports.Pivot = Pivot;
