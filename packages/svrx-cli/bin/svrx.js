#!/usr/bin/env node

const program = require('commander');
const Manager = require('../lib');

const manager = new Manager();

program.usage('<command> [options]');

program.version(require('../package').version);

program
    .command('serve [dir]')
    .description('serve a directory')
    .alias('s')
    .action(async (dir, cmd) => {
        manager.setWorkRoot(dir);
        await manager.loadConfigFile();
        manager.loadSvrx().then((svrx) => {
            svrx.start((port) => {
                Manager.log('success', `Successfully start svrx on ${port}`);
            });
        });
    });

program.parse(process.argv);

if (!program.args.length) {
    program.help();
}
