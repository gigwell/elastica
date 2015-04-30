#! /usr/bin/env sh

echo "RUNNING UNIT TESTS"
NODE_ENV=test NODE_PATH=test:lib ./node_modules/.bin/mocha test/**/*
