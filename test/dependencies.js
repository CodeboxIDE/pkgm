var Q = require("q");
var _ = require('lodash');
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

    it('can order using dependencies', function(done) {
        qdone(
            packager.loadAll(path.join(__dirname, "fixtures/order"))
            .then(function(pkgs) {
                _.each(pkgs, packager.add, packager);

                var sorted = _.pluck(_.pluck(packager.orderedPackages(), "pkg"), "name");

                if (sorted.indexOf("p0") < sorted.indexOf("p2")) {
                    throw "Wrong order";
                }
            })
        , done);
    });
});
