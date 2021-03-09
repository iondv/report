/**
 * Created by kras on 09.07.16.
 */
'use strict';

var read = require('@iondv/commons/lib/config-reader');
var config = require('./config.json');

module.exports = read(config, __dirname);

