var Q = require("q");
var path = require("path");

describe('Packages loading', function() {
    it('can load an empty package', function(done) {
        qdone(packager.loadPackage(path.join(__dirname, "fixtures/empty")), done);
    });

    it("can't load invalid package", function(done) {
        qdone(packager.loadPackage(path.join(__dirname, "fixtures/invalid"))
        .then(function() {
            return Q.reject("error!");
        }, function() {
            return Q();
        }), done);
    });

    it('can load all packages from a folder', function(done) {
        qdone(packager.loadAll(path.join(__dirname, "fixtures")), done);
    });
});
