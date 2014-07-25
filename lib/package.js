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

// Package infos
Package.prototype.infos = function() {
    return _.clone(this.pkg);
};

// Main brower file
Package.prototype.main = function() {
    return (this.pkg["main"] || "").replace(".js", "");
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
    .then(this.installBowerDependencies.bind(this))
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
    return utils.exec("npm install .", {
        cwd: this.root,
        env: process.env
    })
    .thenResolve(that);
};

// Install bower dependencies
Package.prototype.installBowerDependencies = function(force) {
    var that = this;

    if (force !== true) {
        if (!fs.existsSync(path.join(this.root, "bower.json"))) {
            return Q(this);
        }
    }

    // Node dependencies
    return utils.exec("node "+path.resolve(__dirname, "../node_modules/bower/bin/bower")+" install", {
        cwd: this.root,
        env: process.env
    })
    .thenResolve(that);
};

// Optimize client build
Package.prototype.optimizeClient = function(force) {
    var that = this;
    var d = Q.defer();

    if (!this.main()) return Q(this);

    if (this.isOptmized() && force !== true) {
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
        },
        'lessInclude': "\""+that.manager.options.lessInclude+"\""
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