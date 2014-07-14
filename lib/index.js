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
    if (_.isString(pkg)) try { pkg = JSON.parse(pkg); catch() { pkg = null; }

    return (pkg
    && pkg.name
    && pkg.version
    && pkg.engines
    && pkg.engines[this.options.engine]
    && semver.satisfies(this.options.version, pkg.engines[this.options.engine]));
};

// Load a package
Packager.prototype.loadPackage = function(folder) {
    var that = this;
    var packageJson = path.join(folder, "package.json");

    return Q.nfcall(fs.readFile, packageJson)
    .then(function(content) {
        content = JSON.parse(content);
        if (!that.checkPackageJson(content)) return Q.reject(new Error("Invalid package"));

        return new Package(folder, content, that);
    });
};

// Load all packages
Packager.prototype.loadAll = function(folder) {
    var that = this;

    return Q.nfcall(fs.readdir, folder)
    .then(function(files) {
        return _.reduce(files, function(prev, _folder) {
            return prev.then(function(packages) {
                return Q.nfcall(fs.stat, _folder)
                .then(function(stat) {
                    if (stat.isDirectory()) {
                        return that.loadPackage(_folder)
                    }
                    return Q.reject("not a diretory");
                })
                .then(function(pkg) {
                    packages.push(pkg);
                })
                .fin(function() {
                    return packages;
                });
            });
        }, Q([]));
    });
};


module.exports = Packager;