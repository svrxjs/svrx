const PackageManager = require('./package-manager');

function sendAfterClose(ret) {
  process.send(ret);
  process.exit(0);
}

process.on('message', (param) => {
  PackageManager.getInstallTask(param)
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
