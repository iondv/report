/**
 * Created by kras on 27.12.16.
 */
'use strict';

function ReportMetaRepository() {

  /**
   * Метод выполняет инициализацию репозитрия, осуществляя загрузку метаданных
   * возвращает обещание для передачи управления вызывающему коду
   *
   * @returns {Promise}
   */
  this.init = function () {
    return this._init();
  };

  /**
   * Метод возвращает шахты данных указанного пространства имен
   *
   * @param {String} [namespace] - пространство имен
   * @returns {DataMine[]}
   */
  this.getDataMines = function (namespace) {
    return this._getDataMines(namespace);
  };

  /**
   * Метод возвращает шахту данных соответствующую имени name
   *
   * @param {String} name - код узла
   * @param {String} [namespace] - пространство имен
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
