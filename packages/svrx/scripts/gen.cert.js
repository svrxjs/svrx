const CertManager = require('node-easy-cert');
const libPath = require('path');

const options = {
  rootDirPath: libPath.join(__dirname, '../resource/cert') ,
  defaultCertAttrs: [
    { name: 'countryName', value: 'CN' },
    { name: 'organizationName', value: 'SVRX' },
    { shortName: 'ST', value: 'SH' },
    { shortName: 'OU', value: 'SVRX SSL' }
  ]
}

const crtMgr = new CertManager(options);

crtMgr.generateRootCA({ commonName: 'SVRX' });