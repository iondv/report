/**
 * Created by kras on 27.12.16.
 */
'use strict';

function ReportBuilder() {

  /**
   * @param {String} mine
   * @param {{}} sheet
   * @param {{}} [options]
   * @returns {Promise}
   */
  this.sheetData = function (mine, sheet, options) {
    return this._sheetData(mine, sheet, options);
  };

  /**
   * @param {String} mine
   * @param {{type: String, fetch: {}, source: String, groups: {totals: Array}}} sheet
   * @param {String} [sheet.className]
   * @param {String[]} [sheet.eager]
   * @param {{}} filter
   * @param {{}} options
   * @param {String} [options.namespace]
   * @param {String} [options.context]
   * @param {String} [options.lang]
   * @returns {Promise}   
   */
  this.sheetFilters = function (mine, sheet, filter, options) {
    return this._sheetFilters(mine, sheet, filter, options);
  }
}

module.exports = ReportBuilder;
