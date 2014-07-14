var util = require('util');
var Q = require('q');
var _ = require('lodash');
var fs = require('fs');
var events = require('events');

var Package = function(pkg) {
    this.pkg = pkg;
};
util.inherits(Package, events.EventEmitter);



module.exports = Package;