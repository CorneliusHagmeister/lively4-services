var dataVault = require('./dataVault.json')
const {exec} = require('child_process');
const spawn = require('child_process').spawn;
var actionsPath = "./services/"
var triggerPath = "./services/"
var config = require('./config');
var mongodb = require('mongodb');
const fs = require('fs');

module.exports = {
    /**
     * Sets credentials for a specific user. If they do not exist the credentials are created.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user, type, key as attributes of data
     * @param db MongoDb connection
     */
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
    /**
     * Returns all credentials for a specific user.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user attribute of data
     * @param db MongoDb connection
     */
    getCredentials: function (req, res, data, db) {
        console.log("Inside getCredentials for ", data.user);
        if (!data.user) {
            res.writeHead(400);
            res.end("Please send user in payload");
            return;
        }
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            if (err) {
                res.writeHead(400)
                res.end("The given username does not exist")

            } else {
                var credentials = result["credentials"];
                // res.writeHead(200);
                // res.end(credentials);
                console.log("sending json response with: ", credentials);
                jsonResponse(res, credentials);
            }
        })
    },
    /**
     * Returns the user specific watcher-configuration for a given triggerId. The configuration is compared with the configuration template, so that missing keys are created and unnecessary keys removed.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user,triggerId attribute of data
     * @param db MongoDb connection
     */
    getWatcherConfig: function (req, res, data, db) {
        fs.readFile(config.watcherConfigsDir + "/" + (data.triggerId).replace(".js", ".json"), "utf8", function (fileErr, content) {
            db.collection("users").findOne({
                user: data.user
            }, function (err, result) {
                try {
                    var config = result["triggers"][replaceDots(data.triggerId)]["config"]
                    var newConfig = {}
                    content = JSON.parse(content)
                    for (var key in content) {
                        if (config[key]) {
                            newConfig[key] = config[key]
                        } else {
                            newConfig[key] = ""
                        }
                    }
                    var triggers = result["triggers"]
                    triggers[replaceDots(data.triggerId)]["config"] = newConfig
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
                            return
                        } else {
                            jsonResponse(res, newConfig)
                            return
                        }
                    })

                } catch (err) {
                    res.writeHead(400)
                    res.end("Something  went  wrong: " + err)
                }
            })
        })
    },
    /**
     * Replaces a watcher-configuration with the given replacement.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user, triggerId, config attribute of data
     * @param db MongoDb connection
     */
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
    /**
     * Returns the user specific action-configuration for a given triggerId. The configuration is compared with the configuration template, so that missing keys are created and unnecessary keys removed.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user, triggerId, actionId attribute of data
     * @param db MongoDb connection
     */
    getActionConfig: function (req, res, data, db) {
        fs.readFile(config.actionConfigsDir + "/" + (data.actionId).replace(".js", ".json"), "utf8", function (fileErr, content) {
            db.collection("users").findOne({
                user: data.user
            }, function (err, result) {
                try {
                    var actions = result["triggers"][replaceDots(data.triggerId)]["actions"]
                    var triggers = result["triggers"]
                    console.log(content)
                    content = JSON.parse(content)
                    for (var i = 0; i < actions.length; i++) {
                        if (actions[i].name === data.actionId) {
                            var newConfig = {}
                            for (var key in content) {
                                if (actions[i]["config"][key] !== undefined) {
                                    newConfig[key] = actions[i]["config"][key]
                                } else {
                                    newConfig[key] = ""
                                }
                            }
                            console.log(newConfig)
                            triggers[replaceDots(data.triggerId)]["actions"][i]["config"] = newConfig
                            db.collection("users").updateOne({
                                user: data.user
                            }, {
                                $set: {
                                    "triggers": triggers
                                }
                            }, function (errUpdate, resultUpdate) {
                                if (errUpdate) {
                                    res.writeHead(400)
                                    res.end("The new config could not be saved.")
                                } else {
                                    jsonResponse(res, newConfig)
                                    return
                                }
                            })
                        }
                    }
                } catch (err) {
                    res.writeHead(400)
                    res.end("Something  went  wrong: " + err)
                }
            })
        })
    },
    /**
     * Replaces a action-configuration with the given replacement.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user, triggerId, actionId, config attribute of data
     * @param db MongoDb connection
     */
    updateActionConfig: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            try {
                var triggers = result["triggers"]
                for (var i = 0; i < triggers[replaceDots(data.triggerId)]["actions"].length; i++) {
                    if (triggers[replaceDots(data.triggerId)]["actions"][i]["name"] == data.actionId) {
                        triggers[replaceDots(data.triggerId)]["actions"][i]["config"] = data.config
                    }
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
    /**
     * Creates a new User
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user attribute of data
     * @param db MongoDb connection
     */
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
    /**
     * Removes a User
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user attribute of data
     * @param db MongoDb connection
     */
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
    /**
     * Returns all triggers associated with a user and also creates a new user if he does'nt exist.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user attribute of data
     * @param db MongoDb connection
     */
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
    /**
     * Returns the description of a watcher.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user, triggerId attribute of data
     * @param db MongoDb connection
     */
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
    /**
     * Updates the description of a watcher.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user, triggerId, description attribute of data
     * @param db MongoDb connection
     */
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
    /**
     * Creates a new Triggertemplate.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires name attribute of data
     * @param db MongoDb connection
     */
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
    /**
     * Returns the config-template of a watcher.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires triggerId attribute of data
     * @param db MongoDb connection
     */
    getWatcherConfigTemplate: function (req, res, data, db) {
        fs.readFile(config.watcherConfigsDir + "/" + (data.triggerId).replace(".js", ".json"), "utf8", function (err, content) {
            if (err) {
                res.writeHead(400)
                res.end(err)
            } else {
                jsonResponse(res, content);
            }
        })
    },
    /**
     * Updates the config-template of a watcher.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires triggerId attribute of data
     * @param db MongoDb connection
     */
    updateWatcherConfigTemplate: function (req, res, data, db) {
        fs.writeFile(config.watcherConfigsDir + "/" + (data.triggerId).replace(".js", ".json"), data.data, function (err, content) {
            if (err) {
                res.writeHead(400)
                res.end(err)
            } else {
                res.writeHead(200)
                res.end("Successful template update");
            }
        })
    },
    /**
     * Returns the config-template of an action.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires actionId attribute of data
     * @param db MongoDb connection
     */
    getActionConfigTemplate: function (req, res, data, db) {
        fs.readFile(config.actionConfigsDir + "/" + (data.actionId).replace(".js", ".json"), "utf8", function (err, content) {
            if (err) {
                res.writeHead(400)
                res.end(err)
            } else {
                jsonResponse(res, content);
            }
        })
    },
    /**
     * Updates the config-template of a action.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires actionId attribute of data
     * @param db MongoDb connection
     */
    updateActionConfigTemplate: function (req, res, data, db) {
        fs.writeFile(config.actionConfigsDir + "/" + (data.actionId).replace(".js", ".json"), data.data, function (err, content) {
            if (err) {
                res.writeHead(400)
                res.end(err)
            } else {
                res.writeHead(200)
                res.end("Successful template update");
            }
        })
    },
    /**
     * Assigns a trigger to a user.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user, triggerId attribute of data
     * @param db MongoDb connection
     */
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
    },
    /**
     * Dissociates a trigger of a user.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user, triggerId attribute of data
     * @param db MongoDb connection
     */
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
    /**
     * Returns the description of an action.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires actionId attribute of data
     * @param db MongoDb connection
     */
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
    /**
     * Updates the description of an action.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires actionId, description attribute of data
     * @param db MongoDb connection
     */
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
    /**
     * Creates an empty action including a new config template.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires name attribute of data
     * @param db MongoDb connection
     */
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
    /**
     * Assigns an action to a user.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user, actionId, triggerId attribute of data
     * @param db MongoDb connection
     */
    assignAction: function (req, res, data, db) {
        try {
            db.collection("users").findOne({
                user: data.user
            }, function (err, result) {
                if (err || !result) {
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
    /**
     * Dissociates an action from a user.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user, actionId, triggerId attribute of data
     * @param db MongoDb connection
     */
    removeAction: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            if (err || !result) {
                res.writeHead(400)
                res.end("Cant find User")
            } else {
                try {
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
                } catch (err) {
                    res.writeHead(400)
                    res.end(err)
                }
            }
        })
    },
    /**
     * Executes the Trigger script, replacing the keywords and the actioncalls.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user, triggerId attribute of data
     * @param db MongoDb connection
     */
    runUserTrigger: function (req, res, data, db) {
        db.collection("users").findOne({
            user: data.user
        }, function (err, result) {
            if (err || !result) {
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
                        res.writeHead(200)
                        res.end("Sucessfully ran Trigger")

                    }
                });
            }
        })
    },
    /**
     * Stops a running trigger.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires user, triggerId attribute of data
     * @param db MongoDb connection
     */
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
    /**
     * Returns the logs for a running trigger.
     * @param req Request object
     * @param res Response object
     * @param data Parsed parameters of the request. Requires triggerId attribute of data
     * @param db MongoDb connection
     */
    // TODO: make the log returns user specific. Otherwise there cant be multiple users using the same trigger concurrently.
    getTriggerLogs: function (req, res, data, db) {
        var trigger = replaceDots(data.triggerId)
        db.collection("logs").find({
            trigger: trigger
        }).sort({date: 1}).toArray(function (err, result) {
            if (!err) {
                if (result) {
                    var resultString = ""
                    for (var i = 0; i < result.length; i++) {
                        var date = new Date(result[i]["date"])
                        resultString += "[" + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "] " + result[i]["message"]
                    }
                    console.log("result: " + result);
                    res.writeHead(200)
                    res.end(resultString)
                } else {
                    res.writeHead(400)
                    res.end("No logs available.")
                }
            } else {
                console.error("The given triggerId could not be found");
                res.writeHead(400)
                res.write("The given triggerId could not be found")
                res.end()
            }
        })
    }
}

/**
 * Saves a log message to the db.
 * @param triggerId The triggerId to which the message belongs
 * @param user The user which created this message
 * @param log The actual message to be saved
 * @param db MongoDb connection
 */
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
/**
 * Removes all logs for trigger and user.
 * @param triggerId The triggerId to which the message belongs
 * @param user The user which created this message
 * @param db MongoDb connection
 */
function remove_logs(triggerId, user, db) {
    db.collection("logs").remove({
        trigger: replaceDots(triggerId),
        user: user
    }, function (err, numberRemoved) {
        if (err)
            throw err
    });
}

/**
 * Replaces all keywords and the runactions call with the actual values. The script is then spawned as a new process, which automatically creates logs in the db from the std-output
 * @param user The user which created this message
 * @param triggerId The triggerId to which the message belongs
 * @param db MongoDb connection
 */
function startTriggerScript(user, triggerId, db) {
    fs.readFile(config.watcherDir + "/" + triggerId, "utf8", function (err, data) {
        if (err)
            return -1
        db.collection("users").findOne({
            user: user
        }, function (err, result) {
            console.log("data before: " + data)
            data = "var utils = require('./utils'); \n" + data
            // data = data.replace("dropboxKey", "'" + result["credentials"]["dropbox"] + "'")
            for (var entry in result["triggers"][replaceDots(triggerId)]["config"]) {
                data = data.replace("config[" + entry + "]", "'" + result["triggers"][replaceDots(triggerId)]["config"][entry] + "'")
            }

            var credentials = data.match(/credentials\[.*\]/)
            if (credentials) {
                for (var i = 0; i < credentials.length; i++) {
                    data = data.replace(credentials[i], "\"" + result["credentials"][credentials[0].substring(credentials[0].indexOf("[") + 1, credentials[0].lastIndexOf("]"))] + "\"")
                }
            }

            var actionString = "";
            var actionCall = data.match(/runActions\((.*)\)(\s*)(\;|\n)/);
            if (actionCall) {
                actionCall = actionCall[0]
                var actionParameters = actionCall.substring(actionCall.indexOf("(") + 1, actionCall.lastIndexOf(")")).split(',')
                for (var i = 0; i < actionParameters.length; i++) {
                    if (actionParameters[i] === ',') {
                        actionParameters.splice(i, 1);
                    }
                }
                var actionString = ""
                if (result["triggers"][replaceDots(triggerId)]["actions"]) {
                    for (var i = 0; i < result["triggers"][replaceDots(triggerId)]["actions"].length; i++) {
                        var action = result["triggers"][replaceDots(triggerId)]["actions"][i]

                        var initParameters =
                            "var actualParameters = []; \n"
                        for (var j = 0; j < actionParameters.length; j++) {
                            if (actionParameters[j] === "") continue;
                            if (typeof actionParameters[j] === "string") {
                                initParameters = initParameters + "actualParameters.push(" + actionParameters[j] + ");\n"
                            } else {
                                initParameters = initParameters + "actualParameters.push(" + actionParameters[j] + ");\n"
                            }
                        }
                        var runAction = "utils.runAction('" + config.actionsDir + "/" + '\',\'' + action.name + "'," + JSON.stringify(action.config) + "," + JSON.stringify(result["credentials"]) + ",process, actualParameters); \n"
                        actionString = actionString + initParameters + runAction
                        console.log(actionString)
                    }
                }
                data = data.replace(actionCall, actionString);
                data = "var spawn = require('child_process').spawn;\n" + data;
            }
            console.log("data: " + data);
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
                    child.stderr.on('data', (data) => {
                        //write log file
                        // create_log(triggerId, user, data.toString(), db)
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
/**
 * Kills the process of triggerScript using the saved Pid from the db.
 * @param user The user which created this message
 * @param triggerId The triggerId to which the message belongs
 * @param db MongoDb connection
 */
function stopTriggerScript(user, triggerId, db) {
    db.collection("users").findOne({
        user: user
    }, function (err, result) {
        if (result) {
            if (result["triggers"][replaceDots(triggerId)] && result["triggers"][replaceDots(triggerId)]["pid"]) {
                // windows
                // exec("taskkill /pid " + result["triggers"][replaceDots(triggerId)]["pid"] + " /f")
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

/**
 * Since json does'nt support dots in a key, this key is replaced with a sequence of characters.
 * @param toBeReplaced The string of which the dots are to be replaced.
 * @returns {string} The resulting string without dots.
 */
function replaceDots(toBeReplaced) {
    return toBeReplaced.replace(/\./g, '1234')
}
/**
 * Since json does'nt support dots in a key, this key is replaced with a sequence of characters. This one works the other way around.
 * @param toBeReplaced The string of which the sequence is to be replaced.
 * @returns {string} The resulting string with dots.
 */
function replaceUnderscore(toBeReplaced) {
    return toBeReplaced.replace(/1234/g, '.')
}

/**
 * Sends a JSON response with the appropriate headers .
 * @param res The response object
 * @param obj The JSON which is to be sent.
 */
function jsonResponse(res, obj) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(obj));
}
