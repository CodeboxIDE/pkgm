var Q = require('q');
var path = require('path');
var Pkgm = require('../lib');

// Expose assert globally
global.assert = require('assert');

// Package for tests
global.packager = new Pkgm({
    version: "1.0.0",
    engine: "test",
    context: {
        a: "test"
    },
    lessInclude: path.resolve(__dirname, "./fixtures/includes.less")
});

// Nicety for mocha / Q
global.qdone = function qdone(promise, done) {
    return promise.then(function() {
        return done();
    }, function(err) {
        return done(err);
    }).done();
};
