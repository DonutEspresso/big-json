'use strict';

// core modules
const fs = require('fs');
const path = require('path');
const stream = require('stream');

// external modules
const assert = require('chai').assert;
const isStream = require('is-stream');
const through2 = require('through2');


// local files
const json = require('../lib');
const POJO = require('./etc/small.json');


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


        it('should throw on piping multiple source streams', function(done) {
            const readStream = fs.createReadStream(
                path.join(__dirname, './etc/small.json')
            );
            const readStream2 = fs.createReadStream(
                path.join(__dirname, './etc/small.json')
            );
            const parseStream = json.createParseStream();

            assert.throws(function() {
                readStream.pipe(parseStream);
                readStream2.pipe(parseStream);
            }, Error, 'big-json parseStream cannot accept multiple sources!');

            return done();
        });


        it('should emit "error" event when parsing bad JSON', function(done) {
            const readStream = fs.createReadStream(
                path.join(__dirname, './etc/corrupt.json')
            );
            const parseStream = json.createParseStream();

            parseStream.on('error', function(err) {
                assert.ok(err);
                assert.equal(err.name, 'Error');
                assert.equal(err.message, 'Parser has expected a string value');
                return done();
            });

            readStream.pipe(parseStream);
        });


        it('should handle multibyte keys and vals', function(done) {
            const multiByte = through2.obj(function(chunk, enc, cb) {
                this.push(chunk);
                return cb();
            });

            const parseStream = json.createParseStream({
                multibyte: true
            });

            parseStream.on('data', function(pojo) {
                assert.deepEqual(pojo, {
                    '遙': '遙遠未來的事件'
                });
                return done();
            });

            multiByte.pipe(parseStream);
            multiByte.write('{ "');
            multiByte.write(Buffer([ 0xe9, 0x81 ]));
            multiByte.write(Buffer([ 0x99 ]));
            multiByte.write('":"');
            multiByte.write(Buffer([ 0xe9, 0x81 ]));
            multiByte.write(Buffer([ 0x99, 0xe9, 0x81, 0xa0, 0xe6 ]));
            multiByte.write(Buffer([ 0x9c, 0xaa, 0xe4, 0xbe ]));
            multiByte.write(Buffer([ 0x86, 0xe7, 0x9a, 0x84,
                                     0xe4, 0xba, 0x8b ]));
            multiByte.write(Buffer([ 0xe4, 0xbb, 0xb6 ]));
            multiByte.end('"}');
        });


        it('should not handle multibyte', function(done) {
            const multiByte = through2.obj(function(chunk, enc, cb) {
                this.push(chunk);
                return cb();
            });

            const parseStream = json.createParseStream({
                multibyte: false
            });

            parseStream.on('data', function(pojo) {
                assert.deepEqual(pojo, {
                    // jscs:disable
                    "���": "���遠������的事件"
                    // jscs:enable
                });
                return done();
            });

            multiByte.pipe(parseStream);
            multiByte.write('{ "');
            multiByte.write(Buffer([ 0xe9, 0x81 ]));
            multiByte.write(Buffer([ 0x99 ]));
            multiByte.write('":"');
            multiByte.write(Buffer([ 0xe9, 0x81 ]));
            multiByte.write(Buffer([ 0x99, 0xe9, 0x81, 0xa0, 0xe6 ]));
            multiByte.write(Buffer([ 0x9c, 0xaa, 0xe4, 0xbe ]));
            multiByte.write(Buffer([ 0x86, 0xe7, 0x9a, 0x84,
                                     0xe4, 0xba, 0x8b ]));
            multiByte.write(Buffer([ 0xe4, 0xbb, 0xb6 ]));
            multiByte.end('"}');

        });
    });
});
