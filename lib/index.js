var util = require('util');
var Q = require('q');
var _ = require('lodash');
var fs = require('fs');
var url = require('url');
var events = require('events');
var semver = require('semver');
var path = require('path');

var utils = require('./utils');

var Package = require('./package');

var Packager = function(options) {
    this.options = _.defaults(options || {}, {
        engine: "",
        version: "1.0.0",
        folder: "./packages"
    });
    this.packages = {};
};
util.inherits(Packager, events.EventEmitter);

// Add a package
Packager.prototype.add = function(pkg) {
    this.packages[pkg.pkg.name] = pkg;
    this.emit("add", pkg);
};

// Remove a package
Packager.prototype.remove = function(pkg) {
    this.packages[pkg.pkg.name] = undefined;
    this.emit("remove", pkg);
};

// Check a package.json content
Packager.prototype.checkPackageJson = function(pkg) {
    if (_.isString(pkg)) try { pkg = JSON.parse(pkg); } catch(e) { pkg = null; }

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
            _folder = path.join(folder, _folder);

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
                    return packages;
                })
                .fail(function() {
                    return packages;
                });
            });
        }, Q([]));
    });
};

// Install a package
Packager.prototype.install = function(name, url) {
    var that = this, cloned = false;

    var parts = url.split("#");
    var version = parts[1]:
    var folder = path.resolve(this.folder, name);
    url = url.resolve('https://github.com', parts[0]);

    // Package already exists
    if (this.packages[name]) {
        if (this.packages[name].pkg.version == version) return Q(this.packages[name]);
        return Q.reject(new Error("This package is already installed with another version"));
    }

    // Install it
    return Q()
    .then(function() {
        return utils.exec("git clone "+url+" "+folder, {
            env: process.env
        });
    })
    .then(function() {
        cloned = true;

        if (!version) return;
        return utils.exec("git checkout "+version, {
            cwd: folder,
            env: process.env
        });
    })
    .then(function() {
        return that.loadPackage(folder)
    })
    .then(function(pkg) {
        that.add(pkg);
        return pkg;
    })
    .fail(function(err) {
        if (!cloned) return Q.reject(err);

        return utils.exec("rm -rf "+folder, {
            env: process.env
        })
        .thenReject(err);
    });
};

// Install all package dependencies
Packager.prototype.installAll = function(toInstalled) {
    var that = this;

    return _.reduce(toInstalled, function(prev, url, name) {
        return prev.then(function() {
            return that.install(name, url)
        });
    }, Q());
};

// Prepare the package
Packager.prototype.prepare = function(toInstalled) {
    var that = this;

    return Q()
    .then(function() {
        return that.loadAll(that.folder);
    })
    .then(function(pkgs) {
        _.each(pkgs, that.add.bind(that));

        return that.installAll(toInstalled || {});
    });
};

module.exports = Packager;
