var Q = require('q');
var Pkgm = require('../lib');

// Expose assert globally
global.assert = require('assert');

// Package for tests
global.packager = new Pkgm({
    version: "1.0.0",
    engine: "test",
    context: {
        a: "test"
    }
});

// Nicety for mocha / Q
global.qdone = function qdone(promise, done) {
    return promise.then(function() {
        return done();
    }, function(err) {
        return done(err);
    }).done();
};
