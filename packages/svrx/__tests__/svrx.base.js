'use strict';

const Svrx = require('../lib/svrx');
const expect= require('expect.js')
const request= require('supertest')


describe('Basic', () => {


    it('Simple Svr#Callback', (done)=>{

        const server = new Svrx();

        request(server.callback())
            .get('/path-not-exsits')
            .expect(404, done)

    });

    it('Svr#start', (done)=>{
        
        const svrx = new Svrx({
            port: 8001
        })
        svrx.start( port=>{
            expect(port).to.eql(8001)
            svrx.close(done)
        })
    })

});




