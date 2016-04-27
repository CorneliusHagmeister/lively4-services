var childProcess = require('child_process');
var spawn = childProcess.spawn;
var fs = require('fs');

var scriptsDir = './scripts';

var childProcesses = {};
var debugServerChild = null;

var ServiceManager = {
  createScript: function(scriptName, fileContent, cb) {
    if (!fs.existsSync(scriptsDir)){
      fs.mkdirSync(scriptsDir);
    }

    fs.writeFile(scriptsDir + "/" + scriptName, fileContent, function(err) {
      if (err) {
        return console.error(err);
      }

      if (cb) {
        cb();
      }
    });
  },
  spawnProcess: function(scriptName) {
    console.log("spawn the shell");
    var scriptPath = scriptsDir + "/" + scriptName;
    var child = spawn("node --debug " + scriptPath + " > " + scriptPath + ".out", [], {shell: true});

    child.stdout.on('data', function (data) {
      console.log(child.pid, data.toString());
    });

    child.stderr.on('data', function (data) {
      console.log(child.pid, data.toString());
    });

    child.on('close', function(exit_code) {
      console.log('Closed before stop: Closing code: ', exit_code);
    });
    childProcesses[child.pid] = child;
    return child.pid;
  },
  killProcess: function(pid) {
    var child = childProcesses[pid];
    if (child) {
      console.log("kill process");
      child.kill('SIGKILL');
    }
  },
  startDebugServer: function() {
    if (debugServerChild) {
      console.log("Debug server was already started.");
      return;
    }
    console.log("run inspectorPath");
    var inspectorPath = "./node_modules/node-inspector/bin/inspector.js"
    debugServerChild = spawn("node", [inspectorPath]);
    var child = debugServerChild;
    child.stdout.on('data', function (data) {
      console.log(child.pid, data.toString());
    });

    child.stderr.on('data', function (data) {
      console.log(child.pid, data.toString());
    });

    child.on('close', function(exit_code) {
      console.log('Closed before stop: Closing code: ', exit_code);
    });
  },
  shutdownDebugServer: function() {
    if (debugServerChild) {
      console.log("kill debug server");
      debugServerChild.kill('SIGKILL');
      debugServerChild = null;
    }
  }
}

module.exports = ServiceManager;