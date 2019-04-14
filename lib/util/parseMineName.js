/**
 * Created by kalias_90 on 26.05.18.
 */

module.exports = function (mine, namespace) {
  if (mine.indexOf('@') >= 0) {
    let parts = mine.split('@');
    namespace = parts[0];
    mine = parts[1];
  }
  return {
    name: mine,
    namespace: namespace
  };
}
