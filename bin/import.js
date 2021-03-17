#!/usr/bin/env node

const importer = require('../lib/import');

const params = {
  src: './bi',
  ns: null
};

let setParam = null;

process.argv.forEach(function (val) {
  if (val.substr(0, 2) === '--') {
    setParam = val.substr(2);
  } else if (setParam) {
      params[setParam] = val;
  }
});

importer(params.src, params.ns)
  .then(() => console.log('Import done'))
  .catch((err) => console.error(err));
