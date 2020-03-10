const codes = require('../../../errors/backend');

module.exports = {
  [codes.NO_BUILDERS]: `Не настроены сборщики источников данных для шахты "%mine"`,
  [codes.NO_BUILDERS_SRC]: `Не настроен сборщик для источника данных "%mine.%src".`,
  [codes.NO_SRC]: `Не найден сборщик для источника "%mine.%src".`,
  [codes.FILE_NOT_FOUND]: `File not found!`
};
