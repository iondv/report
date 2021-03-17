/**
 * Created by kras on 09.07.16.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const read = require('@iondv/commons/lib/config-reader');
const { readConfig } = require('@iondv/core/utils/read');
const config = readConfig(path.join(__dirname, './config.json'));

let ini_dir = process.env.ION_CONFIG_PATH || 'config';

ini_dir = path.isAbsolute(ini_dir)
  ? ini_dir
  : path.normalize(path.join(process.cwd(), ini_dir));

module.exports = read(config, fs.existsSync(ini_dir) ? ini_dir : null);

