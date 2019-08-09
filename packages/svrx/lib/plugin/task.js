// multiple process install

const { getInstallForTask } = require('./npm');

function sendAfterClose(ret) {
  process.send(ret);
  process.exit(0);
}

process.on('message', (param) => {
  getInstallForTask(param)
    .then((ret) => {
      sendAfterClose(ret);
    })
    .catch((e) => {
      sendAfterClose({
        type: 'error',
        error: e.message,
      });
    });
});
