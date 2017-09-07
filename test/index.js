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
    });
});
