var util = require('util');
var Q = require('q');
var _ = require('lodash');
var fs = require('fs');
var url = require('url');
var events = require('events');
var semver = require('semver');
var path = require('path');
var tmp = require('tmp');

var utils = require('./utils');

var Package = require('./package');

var Pkgm = function(options) {
    this.options = _.defaults(options || {}, {
        engine: "",
        version: "1.0.0",
        folder: "./packages",
        lessInclude: "",
        context: {}
    });
    this.packages = {};
};
util.inherits(Pkgm, events.EventEmitter);

// Add a package
Pkgm.prototype.add = function(pkg) {
    this.packages[pkg.pkg.name] = pkg;
    this.emit("add", pkg);
};

// Remove a package
Pkgm.prototype.remove = function(pkg) {
    this.packages[pkg.pkg.name] = undefined;
    this.emit("remove", pkg);
};

// Check a package.json content
Pkgm.prototype.checkPackageJson = function(pkg) {
    if (_.isString(pkg)) try { pkg = JSON.parse(pkg); } catch(e) { pkg = null; }

    return (pkg
    && pkg.name
    && pkg.version
    && pkg.engines
    && pkg.engines[this.options.engine]
    && semver.satisfies(this.options.version, pkg.engines[this.options.engine]));
};

// Load a package
Pkgm.prototype.loadPackage = function(folder) {
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
Pkgm.prototype.loadAll = function(folder) {
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
                .fail(function(err) {
                    return packages;
                });
            });
        }, Q([]));
    });
};

// Install a package
Pkgm.prototype.uriInfos = function(uri) {
    var parts = uri.split("#");
    var version = parts[1];
    uri = url.resolve('https://github.com', parts[0]);

    return {
        uri: uri,
        version: version
    };
};

// Install a package
Pkgm.prototype.install = function(name, uri) {
    var that = this, cloned = false;

    var parts = this.uriInfos(uri);
    var version = parts.version;
    var folder = path.resolve(this.options.folder, name);
    uri = parts.uri;

    // Package already exists
    if (this.packages[name]) {
        if (!version || this.packages[name].pkg.version == version) return Q(this.packages[name]);
        return Q.reject(new Error("This package is already installed with another version"));
    }

    // Install it
    return Q()
    .then(function() {
        return utils.exec("git clone "+uri+" "+folder, {
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
        return pkg.build();
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

// Uninstall a package
Pkgm.prototype.uninstall = function(name) {
    var that = this;

    // Check if exists
    if (!this.packages[name]) {
        return Q.reject(new Error("Package not installed"));
    }

    // Check that no packages depend on it
    var dependant = _.chain(this.packages)
    .values()
    .filter(function(pkg) {
        return (pkg.pkg.packageDependencies || {})[name] != null
    })
    .map(function(pkg) {
        return pkg.pkg.name;
    })
    .value();
    if (dependant.length) return Q.reject(new Error("Can't remove '"+name+"' since "+dependant.join(", ")+" depend on it"));


    var pkg = this.packages[name];
    return Q()
    .then(function() {
        return pkg.rm();
    })
    .then(function() {
        that.remove(pkg);

        return pkg;
    });
};

// Install by uri
Pkgm.prototype.installByUri = function(uri) {
    var folder, that = this;
    var cloned = false;
    var tofolder;
    var parts = this.uriInfos(uri);
    var version = parts.version;
    uri = parts.uri;

    // Install it
    return Q()
    .then(function() {
        return Q.nfcall(tmp.dir).get(0);
    })
    .then(function(_folder) {
        folder = _folder;

        return utils.exec("git clone "+uri+" "+folder, {
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
        if (that.packages[pkg.pkg.name]) throw "Package already installed with version '"+that.packages[pkg.pkg.name].pkg.version+"'";

        tofolder = path.resolve(that.options.folder, pkg.pkg.name);

        return pkg.mv(tofolder);
    })
    .then(function(pkg) {
        return pkg.build();
    })
    .then(function(pkg) {
        that.add(pkg);
        return pkg;
    })
    .fail(function(err) {
        if (!tofolder) return Q.reject(err);

        return utils.exec("rm -rf "+tofolder, {
            env: process.env
        })
        .thenReject(err);
    });
};

// Install all package dependencies
Pkgm.prototype.installAll = function(toInstalled) {
    var that = this;

    return _.reduce(toInstalled, function(prev, url, name) {
        return prev.then(function() {
            return that.install(name, url)
        });
    }, Q());
};

// Run all packages
Pkgm.prototype.runAll = function(context, pkgs) {
    var that = this;
    var pkgs = this.orderedPackages(pkgs);

    return _.reduce(pkgs, function(prev, pkg, name) {
        return prev.then(function() {
            return pkg.run(context);
        });
    }, Q());
};

// Prepare the package
Pkgm.prototype.prepare = function(toInstalled) {
    var that = this;

    return Q()
    .then(function() {
        return Q.nfcall(fs.mkdir, that.options.folder)
        .fail(function() { return Q(); });
    })
    .then(function() {
        return that.loadAll(that.options.folder);
    })
    .then(function(pkgs) {
        pkgs = that.orderedPackages(pkgs);

        return _.reduce(pkgs, function(prev, pkg) {
            return prev.then(function() {
                return pkg.build()
                .then(function() {
                    that.add(pkg);
                });
            });
        }, Q());
    })
    .then(function() {
        return that.installAll(toInstalled || {});
    });
};

// Sort packages
Pkgm.prototype.orderedPackages = function(pkgs) {
    var that = this;
    var resolved = [];
    var packages = pkgs || _.values(this.packages);
    var byName = _.chain(packages).map(function(pkg) {
        return [pkg.pkg.name, pkg];
    }).object().value();
    var changed = true;
    var sorted = [];

    while(packages.length && changed) {
        changed = false;

        packages.concat().forEach(function(plugin) {
            var consumes = _.chain(plugin.pkg.packageDependencies).keys().compact().concat().value();

            var resolvedAll = true;
            for (var i=0; i<consumes.length; i++) {
                var service = consumes[i];
                if (!_.contains(resolved, service)) {
                    resolvedAll = false;
                } else {
                    //plugin.pkg.packageDependencies[service] = null;
                }
            }

            if (!resolvedAll) {
                return;
            }

            packages.splice(packages.indexOf(plugin), 1);

            resolved.push(plugin.pkg.name);
            sorted.push(byName[plugin.pkg.name]);
            changed = true;
        });
    }

    return sorted;
};

module.exports = Pkgm;
