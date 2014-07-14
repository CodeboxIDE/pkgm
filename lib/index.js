var util = require('util');
var Q = require('q');
var _ = require('lodash');
var fs = require('fs');
var events = require('events');
var semver = require('semver');
var path = require('path');

var Package = require('./package');

var Packager = function(options) {
    this.options = _.defaults(options || {}, {
        engine: "",
        version: "1.0.0"
    });
};
util.inherits(Packager, events.EventEmitter);

// Check a package.json content
Packager.prototype.checkPackageJson = function(pkg) {
    if (_.isString(pkg)) pkg = JSON.parse(pkg);

    return (pkg.engines
    && pkg.engines[this.options.engine]
    && semver.satisfies(this.options.version, pkg.engines[this.options.engine]));
};

// Check a folder
Packager.prototype.loadPackage = function(folder) {
    var that = this;
    var packageJson = path.join(folder, "package.json");

    return Q.nfcall(fs.readFile, packageJson)
    .then(function(content) {
        content = JSON.parse(content);
        if (!that.checkPackageJson(content)) return Q.reject(new Error("Invalid package"));

        return new Package(content);
    });
};


module.exports = Packager;