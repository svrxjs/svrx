const semver = require('../../lib/util/semver');
const consts = require('../../lib/constant');
const _ = require('../../lib/util/helper');
const im = require('../../lib/util/im');
const expect = require('expect.js');



describe('Svrx Utility', () => {
    describe('helper.semver', ()=>{
        it('satisfies', ()=>{
            expect(semver.satisfies('^0.0.5', '0.0.1')).to.equal(false)
            expect(semver.satisfies('~0.0.1', '0.0.1')).to.equal(true)
            expect(semver.satisfies('~0.1.1', '0.1.9')).to.equal(true)
        })
        it('getClosetPackages', ()=>{

            const PRE_VERSION = consts.VERSION;
            consts.VERSION = '0.0.2';

            expect(semver.getClosestPackage([
                { version:'0.0.1', pattern: '0.0.2' }, 
                { version: '0.0.3', pattern: '~0.0.2' },
                { version: '0.0.6', pattern: '~0.0.2' },
                { version: '0.0.9', pattern: '^0.0.4' }
            ]).version).to.equal('0.0.6')

            consts.VERSION = PRE_VERSION;

        })

    })
    describe('helper.im', () => {

        it('im#set basic', () => {
            const obj1 = {a: {b:1}}
            const obj2 = im.set(obj1, 'a.b', 3)
            expect( obj1 ).to.not.equal( obj2 )
            expect( obj2.a.b ).to.equal( 3 )
        })

        it('im#set autoCreaete', ()=>{
            const obj1 = {a: {b:1}}
            const obj2 = im.set(obj1, 'a.c.d', 4)
            expect(obj2.a.c.d).to.equal(4)
        })

        it('im#set replace', ()=>{
            const obj1 = {a: {b:1}}
            const replaced = {d: 'd'}
            const obj2 = im.set(obj1, 'a', replaced)
            expect(obj2.a.d).to.equal('d')
            expect(obj2.a).to.not.equal(replaced)
            const obj3 = im.set(obj1, 'a', replaced, true)
            expect(obj3.a).to.equal(replaced)
        })

        it('im#set noCreate', ()=>{
            const obj1 = {a: 1}
            expect(()=>{
                im.set(obj1, 'a.c.d', 4, {
                    noCreate: true
                })
            }).to.throwError()
        })

        it('im#set nothing happen when target === origin', ()=>{
            const obj1 = {a: 1}
            expect(im.set(obj1, 'a', 1)).to.equal(obj1)
        })

        it('im#get basic', () => {
            const obj1 = {a: {b:1}}
            expect( im.get(obj1, 'a.b') ).to.equal( 1 )
            expect( im.get(obj1, 'a.b.c') ).to.equal( undefined )
        })

        it('im#get Array', ()=>{
            const obj1 = {a: [{b:1}]}
            expect( im.get(obj1, 'a.0.b') ).to.equal( 1 )
            expect( im.get(obj1, 'a.1.c') ).to.equal( undefined )
        })

        it('im#del Basic', ()=>{
            const obj1 = {a: [{b:1}]}
            expect( 'b' in im.del(obj1, 'a.0.b').a[0]  ).to.equal( false )

            const obj2 = {a: [{b:1}]}

            expect( 'b' in im.del(obj1, 'a.b').a  ).to.equal( false )

        })

        it('im#del #set #get Number', ()=>{
            const obj1 =  {'1': [{b:1}]}           

            expect( im.get(obj1, 1)).to.equal(obj1['1'])
            const obj2 = im.set(obj1, 1, 'hello');
            expect( obj2[1]).to.equal('hello')
            const obj3 = im.del(obj1, 1 );

            expect('1' in obj3).to.equal(false);

        })

        it('im#splice basic', ()=>{
            const obj1 =  {'a': [{b:1}]}           
            const obj2 = im.splice(obj1, 'a', 0, 1, {c:2})

            expect( obj1 ).to.not.equal( obj2 );

            expect(obj2.a).to.eql([{c:2}]);

        })


    })
})