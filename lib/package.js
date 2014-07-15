var util = require('util');
var Q = require('q');
var _ = require('lodash');
var fs = require('fs');
var events = require('events');
var path = require('path');
var utils = require('./utils');


// R.js bin
var RJS = path.resolve(__dirname, "../node_modules/requirejs/bin/r.js");
var BUILD_NAME = "pkg-build.js";

var Package = function(root, pkg, manager) {
    this.root = root;
    this.pkg = pkg;
    this.manager = manager;
};
util.inherits(Package, events.EventEmitter);

// Main brower file
Package.prototype.main = function() {
    return (this.pkg["main"] || "index.js").replace(".js", "");
};

// Build the package
Package.prototype.build = function() {
    return Q()
    .then(this.installDependencies.bind(this))
    .then(this.optimizeClient.bind(this))
    .thenResolve(this);
};

// Install dependencies
Package.prototype.installDependencies = function(force) {
    var that = this;

    if (!force) {
        if (!this.hasDependencies() && !this.hasScripts()) {
            return Q(this);
        }
    }

    // Node dependencies
    return utils.exec("npm install .", {
        cwd: this.root,
        env: process.env
    })

    // Packages dependencies
    .then(function() {
        return that.manager.installAll(that.pkg.packageDependencies);
    })

    .then(function() {
        return Q(that);
    });
};

// Optimize client build
Package.prototype.optimizeClient = function(force) {
    var that = this;
    var d = Q.defer();

    if (this.isOptmized() && !force) {
        return Q(this);
    }

    // Base directory for the addon
    var addonPath = this.root;

    // Path to the require-tools
    var requiretoolsPath = path.resolve(__dirname, "require-tools");

    // Output file
    var output = path.resolve(addonPath, BUILD_NAME);

    // Build config
    var optconfig = {
        'baseUrl': addonPath,
        'name': this.main(),
        'out': output,
        //'logLevel': 4, // silent
        'paths': {
            'require-tools': requiretoolsPath
        },
        'optimize': "uglify",
        'map': {
            '*': {
                'css': "require-tools/css/css",
                'less': "require-tools/less/less",
                'text': "require-tools/text/text"
            }
        }
    };

    // Build command for r.js
    var command = "node "+RJS+" -o "+_.reduce(utils.deepkeys(optconfig), function(s, value, key) {
        return s+key+"="+value+" ";
    }, "");

    // Run optimization
    return Q.nfcall(fs.unlink, output)
    .fail(function() {
        return Q();
    }).then(function() {
        return utils.exec(command, {
            env: process.env
        })
    }).then(function() {
        return Q(that);
    }, function(err) {
        return Q.reject(err);
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

module.exports = Package;