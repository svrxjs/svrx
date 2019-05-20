#!/usr/bin/env node

const program = require('commander');
const _ = require('lodash');
const Manager = require('../lib');
const commands = require('../lib/commands');

const manager = new Manager();

manager.loadConfigFile(); // load user config file

program.version(require('../package').version).usage('<command> [options]');

program
    .command('serve')
    .description('Start a develop server')
    .alias('s')
    .allowUnknownOption()
    .action(async (cmd) => {
        const svrx = await manager.loadSvrx();
        svrx.start((port) => {
            Manager.log('success', `Successfully started a server at ${port}`);
        });
    });

program
    .command('help')
    .description('List commands and options for svrx')
    .action(async () => {
        console.log('Usage: svrx <command> [options]\n');
        console.log('Commands and options:\n');

        // help info of command:serve
        console.log('serve|s    Start a develop server');
        const svrx = await manager.loadSvrx();
        const options = svrx.loadOptions();
        commands.printServeHelp(options);
    });

program.parse(process.argv);

if (!program.args.length) {
    program.help();
}
