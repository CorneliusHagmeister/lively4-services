var dataVault = require('./dataVault.json')
const {exec} = require('child_process');
const spawn = require('child_process').spawn;
var actionsPath = "./services/"
var triggerPath = "./services/"
var config = require('./config');
var mongodb = require('mongodb');
const fs = require('fs');

module.exports = {
    setCredentials: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            if (err) {
                res.writeHead(400)
                res.end("The given username does not exist")
            } else {
                var credentials = result["credentials"]
                credentials[data.type] = data.key
                db.collection("users").updateOne({
                    user: data.user
                }, {
                    $set: {
                        "credentials": credentials
                    }
                }, function (errUpdate, resultUpdate) {
                    if (errUpdate) {
                        res.writeHead(400)
                        res.end("The credential update didnt work")
                    } else {
                        res.writeHead(200)
                        res.end("Succeful update")
                    }
                });
            }
        })
    },
    getCredentials: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            if (err) {
                res.writeHead(400)
                res.end("The given username does not exist")

            } else {
                var credentials = result["credentials"];
                res.writeHead(200);
                res.end(credentials);
            }
        })
    },
    getWatcherConfig: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            try {
                var config = result["triggers"][replaceDots(data.triggerId)]["config"]
                jsonResponse(res, config)
            } catch (err) {
                res.writeHead(400)
                res.end("Something  went  wrong: " + err)
            }
        })
    },
    updateWatcherConfig: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            try {
                var triggers = result["triggers"]
                triggers[replaceDots(data.triggerId)]["config"] = data.config
                db.collection("users").updateOne({
                    user: data.user
                }, {
                    $set: {
                        "triggers": triggers
                    }
                }, function (errUpdate, resultUpdate) {
                    if (errUpdate) {
                        res.writeHead(400)
                        res.end("Couldnt update config")
                    } else {
                        res.writeHead(200)
                        res.end("Successfully updated config")
                    }
                })
            } catch (err) {
                res.writeHead(400)
                res.end("Something  went  wrong: " + err)
            }
        })
    },
    getActionConfig: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            try {

                var actions = result["triggers"][replaceDots(data.triggerId)]["actions"]
                for(var i =0;i<actions.length;i++){
                    if(actions[i].name===data.actionId){
                        jsonResponse(res, actions[i]["config"])
                        return
                    }
                }
            } catch (err) {
                res.writeHead(400)
                res.end("Something  went  wrong: " + err)
            }
        })
    },
    updateActionConfig: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            try {
                var triggers = result["triggers"]
                triggers[replaceDots(data.triggerId)]["actions"][data.actionId]["config"] = data.config
                db.collection("users").updateOne({
                    user: data.user
                }, {
                    $set: {
                        "triggers": triggers
                    }
                }, function (errUpdate, resultUpdate) {
                    if (errUpdate) {
                        res.writeHead(400)
                        res.end("Couldnt update config")
                    } else {
                        res.writeHead(200)
                        res.end("Successfully updated config")
                    }
                })
            } catch (err) {
                res.writeHead(400)
                res.end("Something  went  wrong: " + err)
            }
        })
    },
    addUser: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            if (err) {
                res.writeHead(400)
                res.end("Something went wrong")
            } else {
                if (!result) {
                    newUser = {}
                    newUser["user"] = data.user
                    newUser["triggers"] = {}
                    newUser["credentials"] = {}
                    db.collection("users").insertOne(newUser, function (err, result) {
                        if (err) {
                            res.writeHead(400)
                            res.end("The user update didnt work: " + err)
                        } else {
                            res.writeHead(200)
                            res.end("Succeful update")
                        }
                    });
                } else {
                    res.writeHead(400)
                    res.end("The given username already exists")
                }
            }
        })
    },
    removeUser: function (req, res, data, db) {
        db.collection("users").deleteOne({
            user: data.user
        }, function (err, obj) {
            if (err) {
                res.writeHead(400)
                res.end("deletion error: " + err)
            } else {
                res.writeHead(200)
                res.end("Succesful deletion")
            }
        })
    },
    getUserTriggers: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            if (err) {
                res.writeHead(400)
                res.end("Cant get user Triggers: " + err)
            } else {
                if (result) {
                    var triggers = result["triggers"]
                    var endResult = {}
                    for (var key in triggers) {
                        if (!triggers.hasOwnProperty(key))
                            continue;
                        endResult[replaceUnderscore(key)] = triggers[key]
                    }
                    jsonResponse(res, endResult)
                } else {
                    db.collection("users").findOne({
                        user: data.user
                    }, function (err, result) {
                        if (err) {
                            res.writeHead(400)
                            res.end("Something went wrong")
                        } else {
                            if (!result) {
                                newUser = {}
                                newUser["user"] = data.user
                                newUser["triggers"] = {}
                                newUser["credentials"] = {}
                                db.collection("users").insertOne(newUser, function (err, result) {
                                    if (err) {
                                        res.writeHead(400)
                                        res.end("The user update didnt work: " + err)
                                    } else {
                                        res.writeHead(200)
                                        res.end("Succeful update")
                                    }
                                });
                            } else {
                                res.writeHead(400)
                                res.end("The given username already exists")
                            }
                        }
                    })
                    return;
                    // res.writeHead(400, {'Content-Type': 'application/json'});
                    // res.end("Cant find the given username")
                }
            }
        })
    },
    getWatcherDescription: function (req, res, data, db) {
        try {
            fs.readFile(config.watcherConfigsDir + "/" + (data.triggerId).replace(".js", ".json"), "utf8", function (err, content) {
                if (err) {
                    res.writeHead(400)
                    res.end("File not found")
                    return
                }
                if (content) {
                    content = JSON.parse(content.toString())
                } else {
                    res.writeHead(400)
                    res.end("No description found1.")
                    return
                }
                if (content["description"] != undefined) {
                    res.writeHead(200)
                    res.end(JSON.stringify(content["description"]))
                } else {
                    res.writeHead(400)
                    res.end("No description found.")
                }
            })
        } catch (err) {
            res.writeHead(400)
            res.end("Prob file not found :" + err)
        }
    },
    updateWatcherDescription: function (req, res, data, db) {
        try {
            fs.readFile(config.watcherConfigsDir + "/" + (data.triggerId).replace(".js", ".json"), "utf8", function (err, content) {
                if (err) {
                    res.writeHead(400)
                    res.end("File not found")
                    return
                }
                if (content) {
                    content = JSON.parse(content.toString())
                } else {
                    res.writeHead(400)
                    res.end("No description found.")
                    return
                }
                if (content["description"] != undefined) {
                    content["description"] = data.description
                    fs.writeFile(config.watcherConfigsDir + "/" + (data.triggerId).replace(".js", ".json"), JSON.stringify(content), function (writeErr) {
                        res.writeHead(200)
                        res.end(JSON.stringify(content["description"]))

                    })
                } else {
                    res.writeHead(400)
                    res.end("No description found.")
                }
            })
        } catch (err) {
            res.writeHead(400)
            res.end("Prob file not found :" + err)
        }
    },
    createTrigger: function (req, res, data, db) {
        fs.writeFile(config.watcherDir + "/" + data.name + ".js", "", {flag: 'wx'}, function (writeErr) {
            if (writeErr) {
                console.log(writeErr)
                res.writeHead(400)
                res.end("The file already exists")
                return
            }
            fs.writeFile(config.watcherConfigsDir + "/" + data.name + ".json", "{\"description\":\"\"}", {flag: 'wx'}, function (configErr) {
                if (configErr) {
                    console.log(configErr)
                    res.writeHead(400)
                    res.end("The file already exists")
                    return
                }
                res.writeHead(200)
                res.end("The file was created")
                return

            })
        })
    },
    assignTrigger: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            if (err || !result) {
                res.writeHead(400)
                res.end("Cant find User")
            } else {
                var triggers = result["triggers"]
                fs.readFile(config.watcherConfigsDir + "/" + (data.triggerId).replace(".js", ".json"), "utf8", function (err, content) {

                    triggers[replaceDots(data.triggerId)] = {
                        running: false,
                        config: JSON.parse(content)
                    }
                    db.collection("users").updateOne({
                        user: data.user
                    }, {
                        $set: {
                            "triggers": triggers
                        }
                    }, function (errUpdate, resultUpdate) {
                        if (errUpdate) {
                            res.writeHead(400)
                            res.end("The Trigger update didnt work: " + errUpdate)
                        } else {
                            res.writeHead(200)
                            res.end("resultUpdate")
                        }
                    });
                })
            }
        })
    }
    ,
    removeTrigger: function (req, res, data, db) {
        stopTriggerScript(data.user, data.triggerId, db)
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            if (err) {
                res.writeHead(400)
                res.end("Cant find User: " + err)
            } else {
                var triggers = result["triggers"]
                delete triggers[replaceDots(data.triggerId)]
                db.collection("users").updateOne({
                    user: data.user
                }, {
                    $set: {
                        "triggers": triggers
                    }
                }, function (errUpdate, resultUpdate) {
                    if (errUpdate) {
                        res.writeHead(400)
                        res.end("The Trigger update didnt work")
                    } else {
                        res.writeHead(200)
                        res.end("Sucessful Trigger update")
                    }
                })
            }
        })
    },
    getActionDescription: function (req, res, data, db) {
        try {
            fs.readFile(config.actionConfigsDir + "/" + (data.actionId).replace(".js", ".json"), "utf8", function (err, content) {
                if (err || !content) {
                    res.writeHead(400)
                    res.end("File not found")
                    return
                }
                if (content) {
                    content = JSON.parse(content.toString())
                } else {
                    res.writeHead(400)
                    res.end("No description found.")
                    return
                }
                if (content["description"] != undefined) {
                    res.writeHead(200)
                    res.end(JSON.stringify(content["description"]))
                } else {
                    res.writeHead(400)
                    res.end("No description found.")
                }
            })
        } catch (err) {
            res.writeHead(400)
            res.end("Prob file not found :" + err)
        }
    },
    updateActionDescription: function (req, res, data, db) {
        try {
            fs.readFile(config.actionConfigsDir + "/" + (data.actionId).replace(".js", ".json"), "utf8", function (err, content) {
                if (err) {
                    res.writeHead(400)
                    res.end("File not found")
                    return
                }
                if (content) {
                    content = JSON.parse(content.toString())

                } else {
                    res.writeHead(400)
                    res.end("No description found.")
                    return
                }
                if (content["description"] != undefined) {
                    content["description"] = data.description
                    fs.writeFile(config.actionConfigsDir + "/" + (data.actionId).replace(".js", ".json"), JSON.stringify(content), function (writeErr) {
                        res.writeHead(200)
                        res.end("Successful update")

                    })
                } else {
                    res.writeHead(400)
                    res.end("No description found.")
                }
            })
        } catch (err) {
            res.writeHead(400)
            res.end("Prob file not found :" + err)
        }
    },
    createAction: function (req, res, data, db) {
        fs.writeFile(config.actionsDir + "/" + data.name + ".js", "", {flag: 'wx'}, function (writeErr) {
            if (writeErr) {
                console.log(writeErr)
                res.writeHead(400)
                res.end("The file already exists")
                return
            }
            fs.writeFile(config.actionConfigsDir + "/" + data.name + ".json", "{\"description\":\"\"}", {flag: 'wx'}, function (configErr) {
                if (configErr) {
                    console.log(configErr)
                    res.writeHead(400)
                    res.end("The file already exists")
                    return
                }
                res.writeHead(200)
                res.end("The file was created")

            })

        })

    },
    assignAction: function (req, res, data, db) {
        try {
            db.collection("users").findOne({
                user: data.user
            }, function (err, result) {
                if (err||!result) {
                    res.writeHead(400)
                    res.end("Cant find User")
                } else {
                    var triggers = result["triggers"]
                    fs.readFile(config.actionConfigsDir + "/" + (data.actionId).replace(".js", ".json"), "utf8", function (err, content) {
                        if (!triggers[replaceDots(data.triggerId)]["actions"]) {
                            triggers[replaceDots(data.triggerId)]["actions"] = []
                        }
                        triggers[replaceDots(data.triggerId)]["actions"].push({
                            name: data.actionId,
                            config: JSON.parse(content)
                        })
                        db.collection("users").updateOne({
                            user: data.user
                        }, {
                            $set: {
                                "triggers": triggers
                            }
                        }, function (err, result) {
                            if (err) {
                                res.writeHead(400)
                                res.end("The Action update didnt work")
                            } else {
                                res.writeHead(200)
                                res.end("Sucessful update")
                            }
                        });
                    })
                }
            })
        } catch (err) {
            res.writeHead(400)
            res.end(err)
        }
    },
    removeAction: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            if (err) {
                res.writeHead(400)
                res.end("Cant find User")
            } else {
                var triggers = result["triggers"]
                for (var i = 0; i < triggers[replaceDots(data.triggerId)]["actions"].length; i++) {
                    if (triggers[replaceDots(data.triggerId)]["actions"][i].name == data.actionId) {
                        triggers[replaceDots(data.triggerId)]["actions"].splice(i, 1)
                    }
                }
                db.collection("users").update({
                    user: data.user
                }, {
                    $set: {
                        "triggers": triggers
                    }
                }, function (err, result) {
                    if (err) {
                        res.writeHead(400)
                        res.end("The Action deletion didnt work")
                    } else {
                        res.writeHead(200)
                        res.end("Sucessful deletion")
                    }
                });
            }
        })
    },
    runUserTrigger: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            if (err) {
                res.writeHead(400)
                res.end("Cant find User")
            } else {
                var triggers = result["triggers"]
                triggers[replaceDots(data.triggerId)]["running"] = true
                db.collection("users").update({
                    user: data.user
                }, {
                    $set: {
                        "triggers": triggers
                    }
                }, function (err, result) {
                    if (err) {
                        res.writeHead(400)
                        res.end("The Action deletion didnt work")
                    } else {
                        startTriggerScript(data.user, data.triggerId, db, res);
                        res.writeHead(400)
                        res.end("Sucessfully ran Trigger")

                    }
                });
            }
        })
    },
    stopUserTrigger: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            if (result["triggers"][replaceDots(data.triggerId)]) {
                result["triggers"][replaceDots(data.triggerId)]['running'] = false
                stopTriggerScript(data.user, data.triggerId, db);
                res.writeHead(200)
                res.end("Successfully stoped the trigger")
            } else {
                console.error("The given triggerId could not be found");
                res.writeHead(400)
                res.end("The given triggerId could not be found")
            }
        })
    },
    getTriggerLogs: function (req, res, data, db) {
        var trigger = replaceDots(data.triggerId)
        db.collection("logs").find({
            trigger: trigger
        }).sort({date: 1}).toArray(function (err, result) {
            if (!err) {
                if (result) {
                    var resultString = ""
                    for (var i = 0; i < result.length; i++) {
                        date = new Date(result[i]["date"])
                        resultString += "[" + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "] " + result[i]["message"]
                    }
                    console.log(result);
                    res.writeHead(200)
                    res.write(resultString)
                    res.end()
                }
                res.end()
            } else {
                console.error("The given triggerId could not be found");
                res.writeHead(400)
                res.write("The given triggerId could not be found")
                res.end()
            }
        })
    }
}

function create_log(triggerId, user, log, db) {
    var new_doc = {
        trigger: replaceDots(triggerId),
        message: log,
        user: user,
        date: Date.now()
    }
    db.collection("logs").insertOne(new_doc, function (err, result) {
            if (err)
                throw err;

        }
    )
}

function remove_logs(triggerId, user, db) {
    db.collection("logs").remove({
        trigger: replaceDots(triggerId),
        user: user
    }, function (err, numberRemoved) {
        if (err)
            throw err
    });
}

function startTriggerScript(user, triggerId, db) {
    fs.readFile(config.watcherDir + "/" + triggerId, "utf8", function (err, data) {
        if (err)
            return -1
        db.collection("users").findOne({
            user: user
        }, function (err, result) {
            data = data.replace("dropboxKey", "'" + result["credentials"]["dropbox"] + "'")
            for (var entry in result["triggers"][replaceDots(triggerId)]["config"]) {
                data = data.replace("config(" + entry + ")", result["triggers"][replaceDots(triggerId)]["config"][entry])
            }
            var actionString = "";
            var actionCall = data.match(/runActions\((.*)\)(\s*)(\;|\n)/);
            if (actionCall) {
                actionCall = actionCall[0]
                var actionParameters = actionCall.substring(actionCall.indexOf("(") + 1, actionCall.lastIndexOf(")")).split(',')

                var actionString = ""
                if (result["triggers"][replaceDots(triggerId)]["actions"]) {
                    for (var i = 0; i < result["triggers"][replaceDots(triggerId)]["actions"].length; i++) {
                        var action = result["triggers"][replaceDots(triggerId)]["actions"][i].name

                        var initParameters =
                            "var actualParameters = [] \n"
                        for (var j = 0; j < actionParameters.length; j++) {
                            if (actionParameters[j] === "") continue;
                            if (typeof actionParameters[j] === "string") {
                                initParameters = initParameters + "actualParameters.push('" + actionParameters[j] + "')\n"
                            } else {
                                initParameters = initParameters + "actualParameters.push(" + actionParameters[j] + ")\n"
                            }
                        }
                        var runAction = "util.runAction('" + config.actionsDir + "/" + '\',\'' + action + "',process, actualParameters) \n"
                        actionString = actionString + initParameters + runAction
                        console.log(actionString)
                    }
                }
                data = data.replace(actionCall, actionString);
                data = "var spawn = require('child_process').spawn;\n" + data;
            }
            console.log(data);
            fs.readFile(config.watcherConfigsDir + '/' + triggerId.replace(".js", ".json"), 'utf8', function (err, configContent) {
                configContent = JSON.parse(configContent)
                for (var key in configContent) {
                    if (configContent.hasOwnProperty(key)) {

                        data = data.replace("config(" + key + ")", "\"" + configContent[key] + "\"")
                    }
                }
                fs.writeFile("./tmpScript.js", data, function (writeErr) {
                    if (writeErr) {
                        return -1
                    }
                    var child = spawn("node", ["./tmpScript.js"])
                    child.stdout.on('data', (data) => {
                        //write log file
                        create_log(triggerId, user, data.toString(), db)
                        console.log(data.toString());
                    });
                    child.on('close', function (code) {
                        //remove log file
                        remove_logs(triggerId, user, db)
                        //Here you can get the exit code of the script
                    });
                    var triggers = result["triggers"]
                    triggers[replaceDots(triggerId)]["pid"] = child.pid
                    db.collection("users").updateOne({
                        user: user
                    }, {
                        $set: {
                            "triggers": triggers
                        }
                    }, function (err, result) {
                    })
                })
            })
        })
    });
}

function stopTriggerScript(user, triggerId, db) {
    db.collection("users").findOne({
        user: user
    }, function (err, result) {
        //for linux prob =>
        // exec("kill -9 " + dataVault[user]["trigger"][triggerId]["pid"])
        if (result) {
            if (result["triggers"][replaceDots(triggerId)] && result["triggers"][replaceDots(triggerId)]["pid"]) {
                // windows
                //exec("taskkill /pid " + result["triggers"][replaceDots(triggerId)]["pid"] + " /f")
                // linux
                exec("kill -9 " + result["triggers"][replaceDots(triggerId)]["pid"])
                remove_logs(triggerId, user, db)
            }
            var triggers = result["triggers"]
            if (!triggers || !triggers[replaceDots(triggerId)])
                return
            if (triggers[replaceDots(triggerId)]["pid"]) {
                delete triggers[replaceDots(triggerId)]["pid"]
            }
            triggers[replaceDots(triggerId)]["running"] = false
            db.collection("users").updateOne({
                user: user
            }, {
                $set: {
                    "triggers": triggers
                }
            }, function (err, result) {
                if (err) {
                    console.log("The trigger could not be updated");
                }
            })
        }
    })
}

function replaceDots(toBeReplaced) {
    return toBeReplaced.replace(/\./g, '1234')
}

function replaceUnderscore(toBeReplaced) {
    return toBeReplaced.replace(/1234/g, '.')
}

function jsonResponse(res, obj) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(obj));
}
