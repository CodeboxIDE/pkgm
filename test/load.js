var Q = require("q");
var path = require("path");

describe('Packages loading', function() {
    it('can load an empty package', function(done) {
        qdone(packager.loadPackage(path.join(__dirname, "fixtures/empty")), done);
    });
});
