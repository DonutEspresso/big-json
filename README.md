# big-json

[![NPM Version](https://img.shields.io/npm/v/big-json.svg)](https://npmjs.org/package/big-json)
[![Build Status](https://travis-ci.org/DonutEspresso/big-json.svg?branch=master)](https://travis-ci.org/DonutEspresso/big-json)
[![Coverage Status](https://coveralls.io/repos/github/DonutEspresso/big-json/badge.svg?branch=master)](https://coveralls.io/github/DonutEspresso/big-json?branch=master)
[![Dependency Status](https://david-dm.org/DonutEspresso/big-json.svg)](https://david-dm.org/DonutEspresso/big-json)
[![devDependency Status](https://david-dm.org/DonutEspresso/big-json/dev-status.svg)](https://david-dm.org/DonutEspresso/big-json#info=devDependencies)
[![bitHound Score](https://www.bithound.io/github/DonutEspresso/big-json/badges/score.svg)](https://www.bithound.io/github/DonutEspresso/big-json/master)
[![nsp status](https://img.shields.io/badge/NSP%20status-no%20vulnerabilities-green.svg)](https://travis-ci.org/DonutEspresso/big-json)

> A stream based implementation of JSON.parse and JSON.stringify for big POJOs

There exist many stream based implementations of JSON parsing or stringifying
for large data sets. These implementations typical target time series data, new
line delimited data or other array-like data, e.g., logging records or other
continuous flowing data.

This module hopes to fill a gap in the ecosystem: parsing large JSON objects
that are just _really_ big objects. With large in-memory objects, it is
possible to run up against the V8 string length limitation, which is currently
(as of 9/2017) 268435440 characters. Thus, if your large object has enough keys
or values, it is possible to exceed the string length limit when calling
[JSON.stringify](https://github.com/nodejs/node/issues/10738).

Similarly, when retrieving stored JSON from disk or over the network, if the
JSON stringified representation of the object exceeds the string length limit,
the process will throw when attempting to convert the Buffer into a string.

The only way to work with such large objects is to use a streaming
implementation of both `JSON.parse` and `JSON.stringify`. This module does just
that by normalizing the APIs for different modules that have previously
published, combining both parse and stringify functions into a single module.
These underlying modules are subject to change at anytime.

The major caveat is that the reconstructed POJO must be able to fit in memory.
If the reconstructed POJO cannot be stored in memory, then it may be time to
reconsider the way these large objects are being transported and processed.

This module currently uses [stream-json](https://github.com/uhop/stream-json/)
for parsing, and
[json-stream-stringify](https://github.com/Faleij/json-stream-stringify) for
stringification.

## Getting Started

Install the module with: `npm install big-json`

## Usage

To parse a big JSON coming from an external source:

```js
const fs = require('fs');
const path = require('path');
const json = require('big-json');

const readStream = fs.createReadStream('big.json');
const parseStream = json.createParseStream();

parseStream.on('data', function(pojo) {
    // => receive reconstructed POJO
});

readStream.pipe(parseStream);
```

To stringify JSON:
```js
const json = require('big-json');

const stringifyStream = json.createStringifyStream({
    body: BIG_POJO
});

stringifyStream.on('data', function(strChunk) {
    // => BIG_POJO will be sent out in JSON chunks as the object is traversed
});
```

IMPORTANT: Due to limitations in the implementation, directly calling
`write()` on the streams may cause unexpected behavior. For maximum
compatibility, use the Node.js streams `pipe()` method.


## API

### createParseStream(opts)

* `opts` {Object} an options object
* `opts.multibyte` {Boolean} handle multibyte chars, defaults to true

__Returns__: {Stream} a JSON.parse stream

### createStringifyStream(opts)

* `opts` {Object} an options object
* `opts.body` {Object | Array} an object or array to JSON.stringify

__Returns__: {Stream} a JSON.stringify stream

## Contributing

Ensure that all linting and codestyle tasks are passing. Add unit tests for any
new or changed functionality.

To start contributing, install the git prepush hooks:

```sh
make githooks
```

Before committing, lint and test your code using the included Makefile:
```sh
make prepush
```

If you have style errors, you can auto fix whitespace issues by running:

```sh
make codestyle-fix
```

## License

Copyright (c) 2017 Alex Liu

Licensed under the MIT license.
