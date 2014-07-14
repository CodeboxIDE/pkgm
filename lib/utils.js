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

var exec = simpleExecBuilder(cp.exec);
var execFile = simpleExecBuilder(cp.execFile);

module.exports = {
    exec: exec,
    execFile: execFile
};
