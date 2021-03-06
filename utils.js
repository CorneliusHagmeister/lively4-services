var tmpPath = "./"
var config = require('./config');
const spawn = require('child_process').spawn;
const fs = require('fs');
var mongodb = require('mongodb');

module.exports = {
    /**
     * Executes an action after it replaces all keywords.
     * @param actionsPath The path the the action script
     * @param actionId Name of the action script
     * @param configContent Config of the specific user for the action
     * @param credentials Credentials of the user
     * @param process The parent process which is used to pipe the stdin
     * @param actionParameters Parameters for the action
     */
    runAction: function (actionsPath, actionId,configContent,credentials, process, actionParameters) {
        fs.readFile(actionsPath + actionId, 'utf8', function (err, content) {
            console.log(config.actionConfigsDir + '/' + actionId.replace(".js", ".json"))
                require('crypto').randomBytes(48, function (err, buffer) {
                    for (var key in configContent) {
                        if( configContent.hasOwnProperty(key) ) {
                            content = content.replace("config[" + key + "]", "\""+configContent[key]+"\"")
                        }
                    }
                    for(var key in credentials){
                        if(credentials.hasOwnProperty(key)){
                            content = content.replace("credentials[" + key + "]", "\""+credentials[key]+"\"")
                        }
                    }
                    var token = buffer.toString('hex');
                    fs.writeFile(tmpPath + token + '.js', content, function (writeErr) {
                        actionParameters.unshift(tmpPath + token + '.js')
                        try {
                            var child = spawn('node', actionParameters)
                            child.on('close', function (code) {
                                //    remove file
                                fs.unlink(tmpPath + token + ".js", (err) => {
                                    if (err) {
                                        console.log(err)
                                    }
                                })
                            });
                            process.stdin.pipe(child.stdin)
                            child.stdout.on('data', (data) => {
                                console.log("[" + actionId + "]" + data.toString());
                            });
                        } catch (err) {
                            console.log(err)
                        }

                    })
                })
            })
    }
}