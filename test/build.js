var Q = require("q");
var path = require("path");

describe('Packages build', function() {
    it('can build a simple package', function(done) {
        qdone(
            packager.loadPackage(path.join(__dirname, "fixtures/client"))
            .then(function(pkg) {
                return pkg.optimizeClient();
            })
        , done);
    });

    it('can build an empty package', function(done) {
        qdone(
            packager.loadPackage(path.join(__dirname, "fixtures/empty"))
            .then(function(pkg) {
                return pkg.optimizeClient();
            })
        , done);
    });
});
