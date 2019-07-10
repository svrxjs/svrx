#!/usr/bin/env node
/* eslint-disable no-console */
const parse = require('yargs-parser');
const { logger } = require('svrx-util');
const updateNotifier = require('update-notifier');
const pkg = require('../package.json');
const Manager = require('../lib');

const PAD_START = 4;
const PAD_END = 20;
const printErrorAndExit = (error) => {
  logger.error(error);
  process.exit(1);
};

// option parse
const options = parse(process.argv.slice(2));
const cmds = options._;
delete options._;

// command prepare
const manager = new Manager();
const prepareSvrx = async () => {
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
const commands = {
  ls: {
    description: 'List svrx versions installed locally',
    exec: async () => {
      try {
        const versions = Manager.getLocalVersions();
        const tags = await Manager.getRemoteTags();

        if (versions && versions.length > 0) {
          console.log('Svrx Versions Installed:\n');
          console.log(versions.join(', '), '\n');
          if (tags.latest.indexOf('-') === -1 && tags.latest
            !== versions[versions.length - 1]) {
            console.log('There is a new version of svrx, run "svrx install" to install the latest one.');
          }
        } else {
          console.log('There is no svrx installed.\n');
          console.log('You can install the latest version using: "svrx install".');
        }
      } catch (e) {
        printErrorAndExit(e);
      }
    },
  },
  'ls-remote': {
    description: 'List remote svrx versions available for install',
    exec: async () => {
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
    },
  },
  install: {
    description: 'Download and install a specific svrx < version >',
    exec: async (version) => {
      if (typeof version !== 'string') {
        version = undefined;
      }

      try {
        await Manager.install(version);
        logger.notify(`Successfully installed svrx@${version || 'latest'}`);
      } catch (e) {
        printErrorAndExit(e);
      }
    },
  },
  serve: {
    description: 'Start a develop server',
    exec: async () => {
      const svrx = await prepareSvrx();
      svrx.start();
    },
  },
};

// version
const version = async () => {
  const svrx = await prepareSvrx();

  console.log('CLI version:', require('../package').version); // eslint-disable-line
  console.log('Svrx version:', svrx.Svrx.getCurrentVersion());
  process.exit(0);
};
// help
const help = async (cmd) => {
  const svrx = await prepareSvrx();
  const single = cmd && commands[cmd];

  console.log('Usage: svrx <command> [options]\n');

  if (!single) {
    console.log('Options:\n');
    console.log(
      ''.padEnd(PAD_START),
      '-v, --version'.padEnd(PAD_END),
      'Version info of svrx-cli and currently used svrx',
    );
    console.log(
      ''.padEnd(PAD_START),
      '-h, --help'.padEnd(PAD_END),
      'Help info',
    );
  }

  console.log('\nCommands:\n');
  if (single) {
    console.log(
      ''.padEnd(PAD_START),
      cmd.padEnd(PAD_END),
      commands[cmd].description,
    );
  } else { // print all
    Object.keys(commands).forEach((c) => {
      console.log(
        ''.padEnd(PAD_START),
        c.padEnd(PAD_END),
        commands[c].description,
      );
    });
  }

  // help info of command:serve
  if (!single || cmd === 'serve') {
    svrx.Svrx.printBuiltinOptionsHelp();
  }
  process.exit(0);
};


if (options.h || options.help) {
  help(cmds.length > 0 ? cmds[0] : null);
} else if (options.v || options.version) {
  version();
} else {
  const cmd = cmds.length > 0 ? cmds[0] : 'serve'; // default cmd is 'serve'
  if (commands[cmd]) {
    commands[cmd].exec();
  } else {
    help();
  }
}

// cli update alert
updateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 * 7, // 1 week
}).notify();

// force stop
function stop(code) {
  process.exit(code);
}

process.on('SIGINT', stop.bind(null, 2));
process.on('SIGTERM', stop.bind(null, 15));
