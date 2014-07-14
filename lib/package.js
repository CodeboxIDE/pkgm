var util = require('util');
var Q = require('q');
var _ = require('lodash');
var fs = require('fs');
var events = require('events');
var path = require('path');
var utils = require('./utils');


// R.js bin
var RJS = path.resolve(__dirname, "../node_modules/requirejs/bin/r.js");

var Package = function(root, pkg, manager) {
    this.root = root;
    this.pkg = pkg;
    this.manager = manager;
};
util.inherits(Package, events.EventEmitter);

// Main brower file
Package.prototype.main = function() {
    return this.pkg["main"] || "index.js";
};

// Build the package
Package.prototype.build = function() {
    return Q()
    .then(this.installDependencies.bind(this))
    .then(function() {

    });
};

// Install dependencies
Package.prototype.installDependencies = function(force) {
    var that = this;
    if (!force) {
        if (!this.hasDependencies() && !this.hasScripts()) {
            return Q(this);
        }
    }
    return utils.exec("npm install .", {
        cwd: this.root,
        env: process.env
    }).then(function() {
        return Q(that);
    });
};

// Unlink
Package.prototype.unlink = function() {
    return Q.nfcall(fs.unlink, this.root);
};

// Check if an addon is client side
Package.prototype.isClientside = function() {
    return fs.existsSync(this.main());
};

// Check if an addon is node addon
Package.prototype.isNode = function() {
    return (this.pkg.node);
};

// Check if an addon is already optimized
Package.prototype.isOptmized = function() {
    return fs.existsSync(path.join(this.root, ".build.js"));
};

// Check if node dependencies seems to be installed
Package.prototype.areDependenciesInstalled = function() {
    return fs.existsSync(path.join(this.root, "node_modules")) || this.isOptmized();
};

// Check if an addon has node dependencies
Package.prototype.hasDependencies = function() {
    return _.size(this.pkg.dependencies || {}) > 0;
};

// Check if an addon has npm scripts
Package.prototype.hasScripts = function() {
    return _.size(this.pkg.scripts || {}) > 0;
};

module.exports = Package;