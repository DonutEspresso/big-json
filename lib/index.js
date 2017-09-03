'use strict';

// external modules
const Assembler = require('stream-json/utils/Assembler');
const assert = require('assert-plus');
const JSONParseStream = require('stream-json/Combo');
const through2 = require('through2');
const stringifyStreamFactory = require('json-stream-stringify');


/**
 * create a JSON.parse that uses a stream interface. the underlying stream-json
 * module used to do the parsing is actually a combo stream that has 3 internal
 * streams:
 *   * Parser (reading in raw strings)
 *   * Streamer (converts token into SAX-like event stream)
 *   * Packer (which assembles individual JS primitives from parsed chunks).
 *
 * Finally, an "Assembler" class is used to reconstruct the full POJO by
 * assembling the individual JSON chunks. The caveat is that the process must
 * be able to hold the fully reconstructed object in memory.
 *
 * However, since the assembler is not stream and works outside the streams
 * themselves, we must create a wrapper stream that that encapsulates the
 * execution of the 3 internal streams an the assembler. that way external
 * consumers can expect to work with the standard stream events like 'data or
 * 'end'. the wrapper stream can be thought of as an accumulator of the JSON
 * chunks that will emit the fully constructed POJO once it is complete.
 *
 * @public
 * @function createParseStream
 * @return {Stream}
 */
function createParseStream() {
    const assembler = new Assembler();
    const parseStream = new JSONParseStream({
        packKeys: true,
        packStrings: true,
        packNumbers: true
    });
    const wrapperStream = through2.obj(function(chunk, enc, callback) {
        this.push(chunk);
        return callback();
    });
    let redirected = false;

    // when a read stream is piped in, redirect data from the wrapper stream to
    // the real underlying json stream. redirection can only be done at the
    // time of being hooked up, since we need the source stream.
    wrapperStream.on('pipe', function wrapperStreamOnPipe(source) {
        // as this is an accumulator stream, attempting to pipe in more than
        // one source stream is a user error and should be fatal.
        if (redirected === true) {
            throw new Error(
                'big-json parseStream cannot accept multiple sources!'
            );
        }

        source.unpipe(this);
        this.transformStream = source.pipe(parseStream);
        redirected = true;
    });

    // when the parse stream gets chunks of data, through them into the
    // assembler.  the assembler is basically a pointer to the current
    // object/scope from which a JSON chunk was parsed.
    parseStream.on('data', function(chunk) {
        if (assembler[chunk.name]) {
            assembler[chunk.name](chunk.value);
        }
    });

    // on completion of parsing, write the completed pojo to the wrapper stream
    // and end the stream.
    parseStream.on('end', function() {
        wrapperStream.end(assembler.current);
    });

    // make sure error is forwarded on to wrapper stream.
    parseStream.on('error', function(err) {
        wrapperStream.emit('error', err);
    });

    return wrapperStream;
}


/**
 * create a JSON.stringify readable stream.
 * @public
 * @param {Object} opts an options object
 * @param {Object} opts.body the JS object to JSON.stringify
 * @function createStringifyStream
 * @return {Stream}
 */
function createStringifyStream(opts) {
    assert.object(opts, 'opts');
    assert.ok(Array.isArray(opts.body) || typeof opts.body === 'object',
        'opts.body must be an array or object');

    return stringifyStreamFactory(opts.body);
}


module.exports = {
    createParseStream,
    createStringifyStream
};
