/**
 * Created by kras on 19.08.16.
 */
'use strict';

const importer = require('../lib/import');

// jshint maxcomplexity: 20, maxdepth: 10, maxstatements: 25
/**
 * @returns {Promise}
 */
module.exports = function (config) {
  return new Promise(function (resolve, reject) {
    if (config.import) {
      importer(config.import.src, config.import.namespace).
      then(resolve).
      catch(reject);
    } else {
      resolve();
    }
  });
};
