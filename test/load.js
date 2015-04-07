var Q = require("q");
var path = require("path");

describe('Packages loading', function() {
    it('can load an empty package', function() {
        return packager.loadPackage(path.join(__dirname, "fixtures/empty"));
    });

    it("can't load invalid package", function() {
        return packager.loadPackage(path.join(__dirname, "fixtures/invalid"))
        .then(function() {
            return Q.reject("error!");
        }, function() {
            return Q();
        });
    });

    it('can load all packages from a folder', function() {
        return packager.loadAll(path.join(__dirname, "fixtures"));
    });
});
