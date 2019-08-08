// multiple process install

const { getInstallForTask } = require('./npm');

process.on('message', (param) => {
  getInstallForTask(param).then((ret) => {
    process.send(ret);
    process.exit(0);
  }).catch((e) => {
    process.send({
      type: 'error',
      error: e.message,
    });
    process.exit(0);
  });
});
