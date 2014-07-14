var Q = require("q");
var path = require("path");

describe('Packages dependencies', function() {
    it('can install dependencies', function(done) {
        qdone(
            packager.loadPackage(path.join(__dirname, "fixtures/dependencies"))
            .then(function(pkg) {
                return pkg.installDependencies();
            })
        , done);
    });
});
