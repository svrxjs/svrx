const expect = require('expect.js');
const libPath = require('path');
const rcFileRead = require('../../lib/rc-file-read');

const TEST_SVRX_DIR = libPath.join(__dirname, '../fixture/.svrx');

describe('rcFileRead', () => {
  const { SVRX_DIR } = process.env;
  before(() => {
    process.env.SVRX_DIR = TEST_SVRX_DIR;
  });
  after(() => {
    process.env.SVRX_DIR = SVRX_DIR;
  });

  it('should return global rc configs correctly', () => {
    const options = rcFileRead();
    expect(options).to.eql({
      https: true,
      open: false,
    });
  });
});
