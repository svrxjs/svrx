const ioClient = require('socket.io-client');
const supertest = require('supertest');
const expect = require('expect.js');
const http = require('http');

const { IO_PATH } = require('../../lib/shared/consts');
const Middleware = require('../../lib/middleware');
const { createServer } = require('../util');
const IO = require('../../lib/io');

describe('IO', () => {
  const server = http.createServer();
  const middleware = new Middleware();
  const io = new IO({ server, middleware });
  after((done) => {
    server.close(done);
  });

  it('io.events', (done) => {
    server.listen(8008, () => {
      const socket = ioClient.connect('http://localhost:8008', {
        path: IO_PATH,
      });
      const handler = () => {
        io.emit('hello', 'world');
      };

      io.on('svrx', (payload) => {
        expect(payload).to.equal('hello');
        socket.close();
        io.off('svrx');
        done();
      });
      io._io.on('connection', handler);
      socket.on('$message', (evt) => {
        expect(evt.type).to.equal('hello');
        expect(evt.payload).to.equal('world');
        socket.emit('$message', { type: 'svrx', payload: 'hello' });
      });
    });
  });

  it('io.call', async () => {
    io.register('hello', async (payload) => `hi ${payload}`);
    expect(await io.call('hello', 'leeluolee')).to.equal('hi leeluolee');
  });

  it('io.call limit error', async () => {
    expect(() => {
      for (let i = 0; i < 1000; i += 1) {
        io.register(`hello${i}`, async (payload) => `hi ${i} ${payload}`);
      }
    }).to.throwError(/max service size limit exceeded/);
  });

  it('io.call:xhr', async () => {
    const svrx = createServer({
      root: __dirname,
    });
    svrx.io.register('hello', async (payload) => `hi ${payload}`);
    await svrx.setup();
    return supertest(svrx.callback())
      .post(IO_PATH)
      .send({ serviceName: 'hello', payload: 'svrx' })
      .set('Accept', 'application/json')
      .expect('hi svrx');
  });

  it('io.call:xhr error', async () => {
    const svrx = createServer({
      root: __dirname,
    });
    svrx.io.register('error', async (payload) => {
      throw Error(`hi ${payload}`);
    });
    await svrx.setup();
    return supertest(svrx.callback())
      .post(IO_PATH)
      .send({ serviceName: 'error', payload: 'svrx' })
      .set('Accept', 'application/json')
      .expect(500)
      .expect('hi svrx');
  });

  it('io.call unregist', async () => {
    try {
      await io.call('something-unregist');
    } catch (e) {
      expect(e.message).to.match(/unregisted service/);
    }
  });

  it('io.config', async () => {
    const svrx = createServer({
      root: __dirname,
      plugins: [
        {
          name: 'hello-world',
          inplace: true,
          options: {
            name: 'orpheus',
          },
        },
      ],
    });
    await svrx.setup();

    expect(
      await svrx.io.call('$.config', {
        command: 'get',
        scope: 'hello-world',
        params: ['name'],
      }),
    ).to.equal('orpheus');

    await svrx.io.call('$.config', {
      command: 'set',
      scope: 'hello-world',
      params: ['name', 'leeluolee'],
    });

    expect(
      await svrx.io.call('$.config', {
        command: 'get',
        scope: 'hello-world',
        params: ['name'],
      }),
    ).to.equal('leeluolee');

    expect(
      await svrx.io.call('$.config', {
        command: 'get',
        params: ['root'],
      }),
    ).to.equal(__dirname);

    let err;
    try {
      await svrx.io.call('$.config', {
        scope: 'not-exsits',
        command: 'get',
        params: ['hello'],
      });
    } catch (e) {
      err = e;
    }
    expect(err).to.match(/plugin not-exsits/);
  });
});
