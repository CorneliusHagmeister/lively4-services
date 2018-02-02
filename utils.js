var tmpPath = "./"
var config = require('./config');
const spawn = require('child_process').spawn;
const fs = require('fs');
var mongodb = require('mongodb');

module.exports = {
    runAction: function (actionsPath, actionId,configContent, process, actionParameters) {
        fs.readFile(actionsPath + actionId, 'utf8', function (err, content) {
            console.log(config.actionConfigsDir + '/' + actionId.replace(".js", ".json"))
                require('crypto').randomBytes(48, function (err, buffer) {
                    configContent=JSON.parse(configContent)
                    for (var key in configContent) {
                        if( configContent.hasOwnProperty(key) ) {

                            content = content.replace("config[" + key + "]", "\""+configContent[key]+"\"")
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