const { IonError } = require('@iondv/core');
const { w: t } = require('@iondv/i18n');

const PREFIX = 'report.backend';

const codes = module.exports = {
  NO_BUILDERS: `${PREFIX}.nobuilders`,
  NO_BUILDERS_SRC: `${PREFIX}.nobuilderssrc`,
  NO_SRC: `${PREFIX}.nosrc`,
  FILE_NOT_FOUND: `${PREFIX}.filenotfound`
};

IonError.registerMessages({
  [codes.NO_BUILDERS]: t('Builders for data mine "%mine" are not set up'),
  [codes.NO_BUILDERS_SRC]: t('Builder for data source "%mine.%src" is not set up.'),
  [codes.NO_SRC]: t('Builder for data source "%mine.%src" not found.'),
  [codes.FILE_NOT_FOUND]: t('File not found!')
});
