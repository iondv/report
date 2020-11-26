const codes = require('../../errors/backend');
const {w: t} = require('core/i18n');

module.exports = {
  [codes.NO_BUILDERS]: t('Builders for data mine "%mine" are not set up'),
  [codes.NO_BUILDERS_SRC]: t('Builder for data source "%mine.%src" is not set up.'),
  [codes.NO_SRC]: t('Builder for data source "%mine.%src" not found.'),
  [codes.FILE_NOT_FOUND]: t('File not found!')
};
