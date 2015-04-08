var Q = require("q");
var path = require("path");

describe('Node packages', function() {
    it('can run a simple package', function() {
        return packager.loadPackage(path.join(__dirname, "fixtures/node"))
        .then(function(pkg) {
            return pkg.run();
        })
        .then(function() {
            if (global.nodeTest != "test") throw "test";
        });
    });

    it('can run an empty package', function() {
        return packager.loadPackage(path.join(__dirname, "fixtures/empty"))
        .then(function(pkg) {
            return pkg.run();
        });
    });
});
