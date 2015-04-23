var Q = require("q");
var path = require("path");
var fs = require("fs");
var os = require("os");

describe('Packages build', function() {
    it('can build a simple package', function() {
        return packager.loadPackage(path.join(__dirname, "fixtures/client"))
        .then(function(pkg) {
            return pkg.clean()
            .then(function() {
                return pkg.optimizeClient();
            });
        })
        .then(function() {
            if (!fs.existsSync(path.join(__dirname, "fixtures/client/pkg-build.js"))) throw "error";
        });
    });

    it('can build an empty package', function() {
        return packager.loadPackage(path.join(__dirname, "fixtures/empty"))
        .then(function(pkg) {
            return pkg.clean()
            .then(function() {
                return pkg.optimizeClient();
            });
        })
    });

    it('can build a package with less or css', function() {
        return packager.loadPackage(path.join(__dirname, "fixtures/css-less"))
        .then(function(pkg) {
            return pkg.clean()
            .then(function() {
                return pkg.optimizeClient();
            });
        })
        .then(function() {
            if (!fs.existsSync(path.join(__dirname, "fixtures/client/pkg-build.js"))) throw "error";
        });
    });
});
