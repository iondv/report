/**
 * Created by kras on 27.12.16.
 */
'use strict';

function ReportMetaRepository() {

  /**
   *
   * @returns {Promise}
   */
  this.init = function () {
    return this._init();
  };

  /**
   *
   * @param {String} [namespace]
   * @returns {DataMine[]}
   */
  this.getDataMines = function (namespace) {
    return this._getDataMines(namespace);
  };

  /**
   *
   * @param {String} name
   * @param {String} [namespace]
   * @returns {DataMine | null}
   */
  this.getDataMine = function (name, namespace) {
    return this._getDataMine(name, namespace);
  };

  this.getNavigationNodes = function (parent, namespace) {
    return this._getNavigationNodes(parent, namespace);
  };

  this.getNavigationNode = function (code, namespace) {
    return this._getNavigationNode(code, namespace);
  };
}

module.exports = ReportMetaRepository;
