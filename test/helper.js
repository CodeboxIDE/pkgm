var Q = require('q');
var Packager = require('../lib');

// Expose assert globally
global.assert = require('assert');

// Package for tests
global.packager = new Packager({
    version: "1.0.0",
    engine: "test"
});

// Nicety for mocha / Q
global.qdone = function qdone(promise, done) {
    return promise.then(function() {
        return done();
    }, function(err) {
        return done(err);
    }).done();
};
