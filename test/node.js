var Q = require("q");
var path = require("path");

describe('Node packages', function() {
    it('can run a simple package', function(done) {
        qdone(
            packager.loadPackage(path.join(__dirname, "fixtures/node"))
            .then(function(pkg) {
                return pkg.run();
            })
            .then(function() {
                if (global.nodeTest != "test") throw "test";
            })
        , done);
    });
});
