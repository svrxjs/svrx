const chalk = require('chalk');
const format = require('util').format;

const PREFIX = '   svrx-toolkit';
const sep = chalk.gray('·');

exports.log = (...args) => {
  const msg = format.apply(format, args);
  console.log(chalk.white(PREFIX), sep, msg);
};

exports.fatal = (...args) => {
  if (args[0] instanceof Error) args[0] = args[0].message.trim();
  const msg = format.apply(format, args);
  console.error(chalk.red(PREFIX), sep, msg);
  process.exit(1);
};

exports.success = (...args) => {
  const msg = format.apply(format, args);
  console.log(chalk.white(PREFIX), sep, msg);
};
