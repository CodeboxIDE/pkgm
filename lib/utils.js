var Q = require('q');
var _ = require('lodash');
var cp = require('child_process');


// Generate callbacks for exec functions
function _execHandler(command, deffered) {
    return function(error, stdout, stderr) {
        if(error) {
            error.message += command + ' (exited with error code ' + error.code + ')';
            error.stdout = stdout;
            error.stderr = stderr;

            return deffered.reject(error);
        }
        return deffered.resolve({
            stdout: stdout,
            stderr: stderr,
        });
    };
}

// Execution stuff
function simpleExecBuilder(execFunction) {
    return function(command) {
        var deffered = Q.defer();

        var args = _.toArray(arguments).concat(_execHandler(command, deffered));

        // Call exec function
        execFunction.apply(null, args);

        return deffered.promise;
    };
}

// Transform {a: {b: 1}} -> {"a.b": 1}
function deepkeys(obj, all) {
    var keys= {};
    var getBase = function(base, key) {
        if (_.size(base) == 0) return key;
        return base+"."+key;
    };

    var addKeys = function(_obj, base) {
        var _base, _isObject;
        base = base || "";

        _.each(_obj, function(value, key) {
            _base = getBase(base, key);
            _isObject = _.isObject(value) && !_.isArray(value);

            if (_isObject) addKeys(value, _base);
            if (all == true || !_isObject) keys[_base] = value;
        });
    };

    addKeys(obj);

    return keys;
};

var exec = simpleExecBuilder(cp.exec);
var execFile = simpleExecBuilder(cp.execFile);

module.exports = {
    exec: exec,
    execFile: execFile,
    deepkeys: deepkeys
};
