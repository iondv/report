/**
 * Created by kras on 27.12.16.
 */
'use strict';

const crossNav = require('@iondv/web-rte/util/crossNav');
const GLOBAL_NS = '__global';

/* jshint maxcomplexity: 25, maxstatements: 50 */
function nodeToNav(n, baseUrl) {
  if (n.mine && n.report && n.sheet) {
    return {
      id: n.code,
      hint: '',
      caption: n.caption,
      url: baseUrl + '/' + n.mine + '/' + n.report + '/' + n.sheet,
      external: false,
      nodes: buildSubMenu(n.subs, baseUrl)
    };
  } else if (n.mine && n.report) {
    return {
      id: n.code,
      hint: '',
      caption: n.caption,
      url: baseUrl + '/' + n.mine + '/' + n.report,
      external: false,
      nodes: buildSubMenu(n.subs, baseUrl)
    };
  } else if (Array.isArray(n.subs) && n.subs.length) {
    return {
      id: n.code,
      nodes: buildSubMenu(n.subs, baseUrl),
      hint: '',
      caption: n.caption,
      url: '',
      external: false
    };
  } else {
    return {
      id: n.code,
      hint: '',
      caption: n.caption,
      url: '',
      external: false,
      nodes: []
    };
  }
}


/**
 * @param {Object[]} nodes
 * @returns {Array}
 */
function buildSubMenu(nodes, baseUrl) {
  let result = [];
  if (Array.isArray(nodes)) {
    nodes.forEach(n => {
      result.push(nodeToNav(n, baseUrl));
    });
  }
  return result;
}

function processCrossNodes(nodes) {
  let result = [];
  nodes.forEach((n)=> {
    result.push({
      id: n.id,
      caption: n.caption,
      hint: n.hint,
      url: n.url,
      external: n.external,
      nodes: Array.isArray(n.subnodes) ? processCrossNodes(n.subnodes) : []
    });
  });
  return result;
}

/**
 * @param {String} moduleName
 * @param {SettingsRepository} settings
 * @param {ReportMetaRepository} repo
 * @param {MetaRepository} meta
 * @returns {Array}
 */
module.exports.buildMenu = function (moduleName, settings, repo, meta) {
  let roots;
  let result = [];
  let namespaces = settings.get(moduleName + '.namespaces') || {};

  if (namespaces && !namespaces.hasOwnProperty(GLOBAL_NS)) {
    namespaces[GLOBAL_NS] = '';
  }
  if (namespaces) {
    roots = [];
    Object.keys(namespaces).forEach((ns) => {
      roots.push(...repo.getNavigationNodes(null, ns === GLOBAL_NS ? true : ns));
    });
  } else {
    roots = repo.getNavigationNodes();
  }
  roots.forEach((r) => {
    result.push(nodeToNav(r, moduleName));
  });

  return result.concat(processCrossNodes(crossNav(moduleName, meta, settings)));
};
