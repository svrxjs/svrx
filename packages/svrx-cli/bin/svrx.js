#!/usr/bin/env node

const program = require('commander');
const parse = require('yargs-parser');
const { logger } = require('svrx-util');
const updateNotifier = require('update-notifier');
const pkg = require('../package.json');
const Manager = require('../lib');

const COMMANDS = {
  help: {
    description: 'List commands and options of svrx',
  },
  serve: {
    description: 'Start a develop server',
  },
  ls: {
    description: 'List svrx versions installed locally',
  },
  'ls-remote': {
    description: 'List remote svrx versions available for install',
  },
  install: {
    description: 'Download and install a specific svrx < version >',
  },
};
const manager = new Manager();
const printErrorAndExit = (error) => {
  logger.error(error);
  process.exit(1);
};
const prepareSvrx = async (options) => {
  try {
    logger.debug('Loading svrx...');
    await manager.loadConfigFile(); // load user config file
    const svrx = await Manager.loadSvrx(options);
    logger.debug('Successfully loaded svrx');

    return svrx;
  } catch (e) {
    printErrorAndExit(e);
    return null;
  }
};

updateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 * 7, // 1 week
}).notify();

program.version(require('../package').version).usage('<command> [options]');

program
  .command('serve')
  .description(COMMANDS.serve.description)
  .alias('s')
  .allowUnknownOption()
  .action(async () => {
    const options = parse(process.argv.slice(2));
    // remove not-option cmd(not started with '-'
    delete options._;

    const svrx = await prepareSvrx(options);
    svrx.start();
  });

program
  .command('ls')
  .description(COMMANDS.ls.description)
  .action(async () => {
    try {
      const versions = Manager.getLocalVersions();
      const tags = await Manager.getRemoteTags();

      if (versions && versions.length > 0) {
        console.log('Svrx Versions Installed:\n');
        console.log(versions.join(', '), '\n');
        if (tags.latest.indexOf('-') === -1 && tags.latest !== versions[versions.length - 1]) {
          console.log('There is a new version of svrx, run "svrx install" to install the latest one.');
        }
      } else {
        console.log('There is no svrx installed.\n');
        console.log('You can install the latest version using: "svrx install".');
      }
    } catch (e) {
      printErrorAndExit(e);
    }
  });

program
  .command('ls-remote')
  .description(COMMANDS['ls-remote'].description)
  .action(async () => {
    try {
      const versions = await Manager.getRemoteVersions();
      const tags = await Manager.getRemoteTags();

      console.log('Available Svrx Versions:\n');
      console.log(versions.join(', '));
      console.log('\nTags:\n');
      Object.keys(tags).forEach((tag) => {
        console.log(`${tag}: ${tags[tag]}`);
      });
    } catch (e) {
      printErrorAndExit(e);
    }
  });

program
  .command('install')
  .description(COMMANDS.install.description)
  .action(async (version) => {
    if (typeof version !== 'string') {
      version = undefined;
    }

    try {
      await Manager.install(version);
      logger.notify(`Successfully installed svrx@${version}`);
    } catch (e) {
      printErrorAndExit(e);
    }
  });

program
  .command('help')
  .description(COMMANDS.help.description)
  .action(async () => {
    console.log('Usage: svrx <command> [options]\n');
    console.log('Commands and options:\n');

    Object.keys(COMMANDS).forEach((cmd) => {
      if (cmd !== 'serve') {
        console.log(`* ${cmd.padEnd(20)}${COMMANDS[cmd].description}`);
      }
    });

    // help info of command:serve
    console.log(`* ${'serve|s'.padEnd(20)}${COMMANDS.serve.description}`);

    const svrx = await prepareSvrx();
    svrx.Svrx.printHelp();
    process.exit(0);
  });

const options = parse(process.argv.slice(2));
const cmds = options._;

if (cmds.length === 0) {
  process.argv.splice(2, 0, 'serve');
}
program.parse(process.argv);

if (!program.args.length) {
  program.help();
}
