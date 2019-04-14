/**
 * Created by krasilneg on 28.12.16.
 */
'use strict';

/**
 * @param {{name: String, caption: String, sheets: Object[]}} base
 * @param {DataMine} dataMine
 * @constructor
 */
function Report(base, dataMine) {

  var sheets = [];
  var sheetByName = {};

  var mine = dataMine;

  base.sheets.forEach(function (s) {
    sheets.push(s);
    sheetByName[s.name] = s;
  });

  this.mine = function () {
    return mine;
  };

  this.sheets = function () {
    return sheets;
  };

  this.sheet = function (name) {
    return sheetByName[name];
  };

  this.name = function () {
    return base.name;
  };

  this.caption = function () {
    return base.caption;
  };
}

module.exports = Report;
