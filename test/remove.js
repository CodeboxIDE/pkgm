var Q = require("q");
var path = require("path");

describe('Packages removing', function() {
    it('can\'t uninstall a package which is a dependency of an other one', function(done) {
        qdone(
        packager.loadAll(path.join(__dirname, "fixtures/order"))
        .then(packager.uninstall.bind(packager, "p2"))
        .then(function() {
            return Q.reject("error!");
        }, function(err) {
            return Q();
        }), done);
    });
});
