var util = require('util');
var Q = require('q');
var _ = require('lodash');
var fs = require('fs');
var events = require('events');
var path = require('path');
var utils = require('./utils');
var browserify = require('browserify');

// R.js bin
var RJS = path.resolve(__dirname, "../node_modules/requirejs/bin/r.js");
var BUILD_NAME = "pkg-build.js";

var Package = function(root, pkg, manager) {
    this.root = root;
    this.pkg = pkg;
    this.manager = manager;
    this.errors = [];
};
util.inherits(Package, events.EventEmitter);

// Package infos
Package.prototype.infos = function() {
    var infos = _.clone(this.pkg);
    infos.errors = _.map(this.errors, function(err) {
        return err.toString();
    });
    return infos;
};

// Start the node package
Package.prototype.run = function(context) {
    var that = this;
    if (!this.pkg.node) return Q();

    context = _.extend(context || {}, this.manager.options.context);

    return Q()
    .then(function() {
        var start = require(path.resolve(that.root, that.pkg.node));

        if (_.isFunction(start)) return start(context);
    });
};

// Build the package
Package.prototype.build = function() {
    return Q()
    .then(this.installDependencies.bind(this))
    .then(this.manager.installAll.bind(this.manager, this.pkg.packageDependencies))
    .then(this.optimizeClient.bind(this))
    .thenResolve(this);
};

// Install dependencies
Package.prototype.installDependencies = function(force) {
    var that = this;

    if (force !== true) {
        if ((!this.hasDependencies()
        && !this.hasScripts())
        || (this.areDependenciesInstalled())) {
            return Q(this);
        }
    }

    // Node dependencies
    return utils.exec("npm install . --production", {
        cwd: this.root,
        env: process.env
    })
    .fail(function(e) {

    })
    .thenResolve(that);
};

// Optimize client build
Package.prototype.optimizeClient = function(force) {
    var that = this;

    if (!this.isClientside()) return Q(this);
    if (this.isOptmized() && force !== true) {
        return Q(this);
    }

    // Browserify context
    var b = browserify();

    // Base directory for the addon
    var addonPath = this.root;

    // Path to the require-tools
    var requiretoolsPath = path.resolve(__dirname, "require-tools");

    // Output file
    var output = path.resolve(addonPath, BUILD_NAME);

    // Run optimization
    return Q.nfcall(fs.unlink, output)
    .fail(function() {
        var d = Q.defer();

        // Run build
        // todo: use less with that.manager.options.lessInclude
        b.add(path.join(addonPath));
        b.bundle()
        .pipe(fs.createWriteStream(output))
        .on("end", function() {
            d.resolve();
        })
        .on("error", function(err) {
            that.manager.log("error", err);

            d.reject(new Error("Build failed"));
        });

        return d.promise;
    })
    .thenResolve(this);
};

// Unlink
Package.prototype.unlink = function() {
    return Q.nfcall(fs.unlink, this.root);
};

// Check if an addon is client side
Package.prototype.isClientside = function() {
    return !!this.pkg.browser;
};

// Check if an addon is node addon
Package.prototype.isNode = function() {
    return (this.pkg.node);
};

// Check if an addon is already optimized
Package.prototype.isOptmized = function() {
    return fs.existsSync(path.join(this.root, BUILD_NAME));
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

// Move package
Package.prototype.mv = function(to) {
    var that = this;

    return Q()
    .then(function() {
        return utils.exec("mv "+that.root+" "+to, {
            env: process.env
        });
    })
    .then(function() {
        that.root = to;
    })
    .thenResolve(that);
};

// Remove package
Package.prototype.rm = function(to) {
    var that = this;

    return Q()
    .then(function() {
        return utils.exec("rm -rf "+that.root, {
            env: process.env
        });
    })
    .thenResolve(that);
};

module.exports = Package;