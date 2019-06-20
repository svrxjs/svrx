const path = require('path');
const { logger } = require('svrx-util');
// const { prompt } = require('inquirer');
const { npm } = require('svrx-util');
// const _ = require('lodash');
const tmp = require('tmp');
const fs = require('fs-extra');
const config = require('./config');

// const fetchVersionList = async () => {
//     const result = await npm.view(['svrx', 'versions']);
//     return _.chain(result)
//         .values()
//         .first()
//         .value()
//         .versions.reverse();
// };

/**
 * if userVersion === undefined : return latest version
 * if userVersion is latest, return
 * if userVersion is not latest, ask to update
 *     yes: return latest
 *     no:  return userVersion
 * @param userVersion
 * @returns {string}
 */
// const getSatisfiedVersion = async (userVersion) => {
//     const versionList = await fetchVersionList();
//     const latest = versionList[0];
//     if (userVersion === undefined || userVersion === latest) {
//         return latest;
//     }
//     logger.warn(`There's a new version of svrx (${latest}), and your config version is ${userVersion}`);
//     const answers = await prompt([
//         {
//             type: 'confirm',
//             name: 'update',
//             message: 'Do you wanna get an update?',
//             default: true
//         }
//     ]);
//     return answers.update ? latest : userVersion;
// };

/**
 * install a specific version of svrx
 * @param version
 * @returns {Promise<*>}
 */
const install = async (version) => {
    const tmpObj = tmp.dirSync();
    const tmpPath = tmpObj.name;
    const options = {
        name: 'svrx',
        version,
        path: tmpPath,
        npmLoad: {
            loaded: false,
            prefix: tmpPath
        }
    };
    const spinner = logger.progress(`Installing svrx ${version}...`);
    const result = await npm.install(options);
    const svrxRoot = result.path;
    const destFolder = path.resolve(config.VERSIONS_ROOT, version);

    return new Promise((resolve, reject) => {
        fs.copy(svrxRoot, destFolder, (err) => {
            if (err) {
                spinner('Download failed', 'error');
                return reject(err);
            }
            spinner(`Successfully downloaded svrx into ${destFolder}`, 'info');
            resolve();
        });
    });
};

module.exports = {
    // getSatisfiedVersion,
    install
};
