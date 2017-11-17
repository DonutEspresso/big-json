'use strict';

// core modules
const fs = require('fs');
const path = require('path');
const stream = require('stream');

// external modules
const assert = require('chai').assert;
const isStream = require('is-stream');

// local files
const json = require('../lib');
const POJO = require('./etc/small.json');
const STRINGIFIED_POJO = JSON.stringify(POJO);


describe('big-json', function() {


    describe('createStringifyStream', function() {

        it('should create a stringify stream', function(done) {
            const stringifyStream = json.createStringifyStream({
                body: POJO
            });

            assert.ok(stringifyStream);
            assert.isTrue(isStream(stringifyStream));

            return done();
        });


        it('should emit JSON string on data event', function(done) {
            const stringifyStream = json.createStringifyStream({
                body: POJO
            });
            const passthrough = new stream.PassThrough();
            let stringified = '';

            passthrough.on('data', function(chunk) {
                stringified += chunk;
            });

            passthrough.on('end', function() {
                assert.equal(stringified, JSON.stringify(POJO));
                return done();
            });

            stringifyStream.pipe(passthrough);
        });
    });


    describe('createParseStream', function() {

        it('should create a parse stream', function(done) {
            const parseStream = json.createParseStream();

            assert.ok(parseStream);
            assert.isTrue(isStream(parseStream));

            return done();
        });


        it('should allow writing to parse stream', function(done) {
            const parseStream = json.createParseStream();
            let dataValidated = false;

            parseStream.on('data', function(data) {
                assert.deepEqual(data, POJO);
                dataValidated = true;
            });

            parseStream.on('error', done);
            parseStream.on('end', function() {
                if (dataValidated === false) {
                    assert.fail('test completed without verification!');
                }
                return done();
            });
            parseStream.end(STRINGIFIED_POJO);
        });


        it('should emit "data" with reconstructed POJO and "end"',
        function(done) {
            const readStream = fs.createReadStream(
                path.join(__dirname, './etc/small.json')
            );
            const parseStream = json.createParseStream();
            let dataValidated = false;

            parseStream.on('data', function(pojo) {
                assert.deepEqual(POJO, pojo);
                dataValidated = true;
            });

            parseStream.on('end', function(data) {
                assert.isTrue(dataValidated);
                return done();
            });

            readStream.pipe(parseStream);
        });


        it('should pipe to subsequent streams', function(done) {
            const readStream = fs.createReadStream(
                path.join(__dirname, './etc/small.json')
            );
            const parseStream = json.createParseStream();
            let dataValidated = false;

            const afterStream = new stream.PassThrough({
                objectMode: true
            });

            afterStream.on('data', function(chunk) {
                assert.deepEqual(chunk, POJO);
                dataValidated = true;
            });

            afterStream.on('end', function() {
                assert.isTrue(dataValidated);
                return done();
            });

            readStream.pipe(parseStream).pipe(afterStream);
        });


        it('should pipe to multiple output streams', function(done) {
            const readStream = fs.createReadStream(
                path.join(__dirname, './etc/small.json')
            );
            const parseStream = json.createParseStream();
            const afterStream = new stream.PassThrough({
                objectMode: true
            });
            const afterStream2 = new stream.PassThrough({
                objectMode: true
            });

            let dataValidated = false;
            let streamsCompleted = 0;

            afterStream.on('data', function(chunk) {
                assert.deepEqual(chunk, POJO);
                dataValidated = true;
            });

            afterStream.on('end', function() {
                assert.isTrue(dataValidated);

                if (++streamsCompleted === 2) {
                    return done();
                }
                return null;
            });

            afterStream2.on('data', function(chunk) {
                assert.deepEqual(chunk, POJO);
                dataValidated = true;
            });

            afterStream2.on('end', function() {
                assert.isTrue(dataValidated);

                if (++streamsCompleted === 2) {
                    return done();
                }
                return null;
            });

            readStream.pipe(parseStream).pipe(afterStream);
            parseStream.pipe(afterStream2);
        });


        it('should emit "error" event when parsing bad JSON', function(done) {
            const readStream = fs.createReadStream(
                path.join(__dirname, './etc/corrupt.json')
            );
            const parseStream = json.createParseStream();

            parseStream.on('error', function(err) {
                assert.ok(err);
                assert.equal(err.name, 'Error');
                assert.include(err.message, 'Invalid JSON');
                return done();
            });

            readStream.pipe(parseStream);
        });


        it('should handle multibyte keys and vals', function(done) {
            const parseStream = json.createParseStream();

            parseStream.on('data', function(pojo) {
                assert.deepEqual(pojo, {
                    '遙': '遙遠未來的事件'
                });
                return done();
            });

            parseStream.write('{ "');
            parseStream.write(Buffer([ 0xe9, 0x81 ]));
            parseStream.write(Buffer([ 0x99 ]));
            parseStream.write('":"');
            parseStream.write(Buffer([ 0xe9, 0x81 ]));
            parseStream.write(Buffer([ 0x99, 0xe9, 0x81, 0xa0, 0xe6 ]));
            parseStream.write(Buffer([ 0x9c, 0xaa, 0xe4, 0xbe ]));
            parseStream.write(Buffer([ 0x86, 0xe7, 0x9a, 0x84,
                                     0xe4, 0xba, 0x8b ]));
            parseStream.write(Buffer([ 0xe4, 0xbb, 0xb6 ]));
            parseStream.end('"}');
        });
    });


    describe('async JSON', function() {
        it('should stringify async', function(done) {
            json.stringify({
                body: POJO
            }, function(err, stringified) {
                assert.ifError(err);
                assert.deepEqual(stringified, JSON.stringify(POJO));
                return done();
            });
        });


        it('should parse async', function(done) {
            json.parse({
                body: JSON.stringify(POJO)
            }, function(err, pojo) {
                assert.ifError(err);
                assert.deepEqual(pojo, POJO);
                return done();
            });
        });


        it('should return err in parse async', function(done) {
            json.parse({
                body: fs.readFileSync(
                    path.join(__dirname, './etc/corrupt.json')
                ).toString()
            }, function(err, pojo) {
                assert.ok(err);
                return done();
            });
        });
    });
});
