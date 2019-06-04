#!/usr/bin/env node

const Scaffold = require('../lib/scaffold');
const program = require('commander');

program.version(require('../package').version).usage('<command> [options]');

program
  .command('init')
  .description('Generate a toolkit project')
  .action(async () => {
    new Scaffold();
  });

program
  .command('help')
  .description('List commands and options for svrx-toolkit')
  .action(async () => {
    console.log('Usage: svrx-toolkit <command> [options]\n');
    console.log('Commands and options:\n');
    console.log('init    Generate a toolkit project');
  });

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}