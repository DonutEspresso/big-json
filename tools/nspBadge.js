#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const README_PATH = path.join(__dirname, '../README.md');
const FAIL_BADGE = 'vulnerabilities%20found-red';
const SUCCESS_BADGE = 'no%20vulnerabilities-green';
const NSP_LINE_ID = '[nsp status]';

process.stdin.on('data', function(exitCodeBuf) {

    let nspExitCode = parseInt(exitCodeBuf.toString(), 10);

    if (isNaN(nspExitCode)) {
        console.warn(exitCodeBuf.toString()); // eslint-disable-line no-console
        nspExitCode = 0;
    }

    const readmeStr = fs.readFileSync(README_PATH).toString();

    const out = processLines(nspExitCode, readmeStr);

    // now write it back out
    fs.writeFileSync(README_PATH, out);
});

function processLines(exitCode, readmeStr) {
    const lines = readmeStr.toString().split('\n');
    let outLines = '';

    lines.forEach(function(line) {
        if (line.indexOf(NSP_LINE_ID) > -1) {
            if (exitCode === 0) {
                outLines += line.replace(FAIL_BADGE, SUCCESS_BADGE) + '\n';
            } else {
                outLines += line.replace(SUCCESS_BADGE, FAIL_BADGE) + '\n';
            }
        } else {
            outLines += line + '\n';
        }
    });

    // chop off last newline
    return outLines.slice(0, -1);
}
