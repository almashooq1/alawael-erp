#!/usr/bin/env node
// Simple wrapper to ensure correct working directory
process.chdir(__dirname);
require('./server.js');
