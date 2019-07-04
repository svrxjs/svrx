const inquirer = require('inquirer');
const ora = require('ora');
const download = require('download-git-repo');
const home = require('user-home');
const Metalsmith = require('metalsmith');
const async = require('async');
const fetch = require('node-fetch');
const render = require('consolidate').handlebars.render;
const rm = require('rimraf').sync;
const exec = require('child_process').execSync;
const exists = require('fs').existsSync;
const path = require('path');
const logger = require('./logger');

const TEMPLATE_REPOSITORY_NAME = 'svrx-toolkit-template';
const TEMPLATE_REPOSITORY_URL = `x-orpheus/${TEMPLATE_REPOSITORY_NAME}`;

class Scaffold {
  constructor() {
    this.init();
  }

  async init() {
    const info = await this.getProjectInfo();
    await this.downloadTemplate();
    await this.generateProject(info);
  }

  getProjectInfo() {
    return inquirer.prompt([
      {
        name: 'name',
        type: 'input',
        message: 'Plugin name:',
      },
      {
        name: 'version',
        type: 'input',
        message: 'Plugin version:',
        default: '0.0.1',
      },
      {
        name: 'svrxVersion',
        type: 'input',
        message: 'Svrx version:',
        default: '0.0.3',
      },
      {
        name: 'author',
        type: 'input',
        message: 'Author:',
        default: this.getDefaultAuthor(),
      },
      {
        name: 'license',
        type: 'input',
        message: 'License:',
        default: 'MIT',
      },
    ]);
  }

  downloadTemplate() {
    return new Promise((resolve) => {
      const tmpPath = this.getTmpPath();
      if (exists(tmpPath)) rm(tmpPath);

      const spinner = ora('downloading template');
      spinner.start();
      download(TEMPLATE_REPOSITORY_URL, tmpPath, (err) => {
        spinner.stop();
        if (err) {
          logger.fatal(`Failed to download repo ${TEMPLATE_REPOSITORY_URL}: ${err.message.trim()}`);
        } else {
          resolve();
        }
      });
    });
  }

  generateProject(info) {
    return new Promise((resolve) => {
      Metalsmith(process.cwd())
        .metadata(info)
        .clean(false)
        .source(this.getTmpPath())
        .destination(`./${info.name}`)
        .use((files, metalsmith, done) => {
          const meta = metalsmith.metadata();
          const keys = Object.keys(files);
          async.each(
            keys,
            (fileName, next) => {
              const str = files[fileName].contents.toString();
              render(str, meta, (err, res) => {
                if (err) {
                  err.message = `[${fileName}] ${err.message}`;
                  return next(err);
                }
                files[fileName].contents = Buffer.from(res);
                next();
              });
            },
            done,
          );
        })
        .build((err) => {
          if (err) {
            logger.fatal(`Failed to transform template: ${err.message.trim()}`);
          } else {
            resolve();
          }
        });
    });
  }

  getDefaultAuthor() {
    let name; let
      email;

    try {
      name = exec('git config --get user.name');
      email = exec('git config --get user.email');
    } catch (e) {}

    name = name && JSON.stringify(name.toString().trim()).slice(1, -1);
    email = email && ` <${email.toString().trim()}>`;
    return (name || '') + (email || '');
  }

  getDefaultSvrxVersion() {
    fetch('');
  }

  getTmpPath() {
    return path.join(home, '.srvx-toolkit-templates', TEMPLATE_REPOSITORY_NAME);
  }
}

module.exports = Scaffold;
