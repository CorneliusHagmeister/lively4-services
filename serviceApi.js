var dataVault = require('./dataVault.json')
const {exec} = require('child_process');
const spawn = require('child_process').spawn;
var actionsPath = "./services/actions/"
var triggerPath = "./services/"
var mongodb = require('mongodb');
const fs = require('fs');

module.exports = {
  setCredentials: function(req, res, data, db) {
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (err) {
        res.write("The given username does not exist")
        res.end()
      } else {
        var credentials = result["credentials"]
        credentials[data.type] = data.key
        db.collection("users").updateOne({
          user: data.user
        }, {
          $set: {
            "credentials": credentials
          }
        }, function(errUpdate, resultUpdate) {
          if (errUpdate) {
            res.write("The credential update didnt work")
            res.end()
          } else {
            res.write("Succeful update")
            res.end()
          }
        });
      }
    })
  },
  addUser: function(req, res, data, db) {
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (err) {
        res.write("Something went wrong")
        res.end()
      } else {
        if (!result) {
          newUser = {}
          newUser["user"] = data.user
          newUser["triggers"] = {}
          newUser["credentials"] = {}
          db.collection("users").insertOne(newUser, function(err, result) {
            if (err) {
              res.write("The user update didnt work: " + err)
              res.end()
            } else {
              res.write("Succeful update")
              res.end()
            }
          });
        } else {
          res.write("The given username already exists")
          res.end()
        }
      }
    })
  },
  removeUser: function(req, res, data, db) {
    db.collection("users").deleteOne({
      user: data.user
    }, function(err, obj) {
      if (err) {
        res.write("deletion error: " + err)
        res.end()
      } else {
        res.write("Succesful deletion")
        res.end()
      }
    })
  },
  getUserTriggers: function(req, res, data, db) {
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (err) {
        res.write("Cant get user Triggers: " + err)
        res.end()
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
          res.writeHead(400, {'Content-Type': 'application/json'});
          res.end("Cant find the given username")
        }
      }
    })
  },
  assignTrigger: function(req, res, data, db) {
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (err || !result) {
        res.write("Cant find User")
        res.end()
      } else {
        var triggers = result["triggers"]
        triggers[replaceDots(data.triggerId)] = {
          running: false
        }
        db.collection("users").updateOne({
          user: data.user
        }, {
          $set: {
            "triggers": triggers
          }
        }, function(errUpdate, resultUpdate) {
          if (errUpdate) {
            res.write("The Trigger update didnt work: " + errUpdate)
            res.end()
          } else {
            res.write("resultUpdate")
            res.end()
          }
        });
      }
    })
  },
  removeTrigger: function(req, res, data, db) {
    stopTriggerScript(data.user, data.triggerId, db)
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (err) {
        res.write("Cant find User: " + err)
        res.end()
      } else {
        var triggers = result["triggers"]
        delete triggers[replaceDots(data.triggerId)]
        db.collection("users").updateOne({
          user: data.user
        }, {
          $set: {
            "triggers": triggers
          }
        }, function(errUpdate, resultUpdate) {
          if (errUpdate) {
            res.write("The Trigger update didnt work")
            res.end()
          } else {
            res.write("Sucessful Trigger update")
            res.end()
          }
        })
      }
    })
  },
  assignAction: function(req, res, data, db) {
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (err) {
        res.write("Cant find User")
        res.end()
      } else {
        var triggers = result["triggers"]
        if (!triggers[replaceDots(data.triggerId)]["actions"]) {
          triggers[replaceDots(data.triggerId)]["actions"] = []
        }
        triggers[replaceDots(data.triggerId)]["actions"].push(data.actionId)
        db.collection("users").updateOne({
          user: data.user
        }, {
          $set: {
            "triggers": triggers
          }
        }, function(err, result) {
          if (err) {
            res.write("The Action update didnt work")
            res.end()
          } else {
            res.write("Sucessful update")
            res.end()
          }
        });
      }
    })
  },
  removeAction: function(req, res, data, db) {
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (err) {
        res.write("Cant find User")
        res.end()
      } else {
        var triggers = result["triggers"]
        var index = triggers[replaceDots(data.triggerId)]["actions"].indexOf(data.actionId)
        if (index > -1) {
          triggers[replaceDots(data.triggerId)]["actions"].splice(index, 1)
        }
        db.collection("users").update({
          user: data.user
        }, {
          $set: {
            "triggers": triggers
          }
        }, function(err, result) {
          if (err) {
            res.write("The Action deletion didnt work")
            res.end()
          } else {
            res.write("Sucessful deletion")
            res.end()
          }
        });
      }
    })
  },
  runUserTrigger: function(req, res, data, db) {
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (err) {
        res.write("Cant find User")
        res.end()
      } else {
        var triggers = result["triggers"]
        triggers[replaceDots(data.triggerId)]["running"] = true
        db.collection("users").update({
          user: data.user
        }, {
          $set: {
            "triggers": triggers
          }
        }, function(err, result) {
          if (err) {
            res.write("The Action deletion didnt work")
            res.end()
          } else {
            startTriggerScript(data.user, data.triggerId, db, res);
            res.write("Sucessfully ran Trigger")
            res.end()
          }
        });
      }
    })
  },
  stopUserTrigger: function(req, res, data, db) {
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (result["triggers"][replaceDots(data.triggerId)]) {
        result["triggers"][replaceDots(data.triggerId)]['running'] = false
        stopTriggerScript(data.user, data.triggerId, db);
        res.end()
      } else {
        console.error("The given triggerId could not be found");
        res.write("The given triggerId could not be found")
        res.end()
      }
    })
  },
  getTriggerLogs: function(req, res, data, db) {
    console.log("inside  get logs");
    var trigger=replaceDots(data.triggerId)
    db.collection("logs").find({
      trigger: trigger
    }).sort({date:1}).toArray(function(err, result) {
      if(!err){
        if(result){
          var resultString=""
          for(var i =0;i<result.length;i++){
            date = new Date(result[i]["date"] * 1000)
            resultString+="["+date.getHours()+":"+date.getMinutes()+":"+date.getSeconds()+"] "+result[i]["message"]
          }
          console.log(result);
          res.write(resultString)
          res.end()
        }
        res.end()
      } else {
        console.error("The given triggerId could not be found");
        res.status(200)
        res.write("The given triggerId could not be found")
        res.end()
      }
    })
  }
}
function create_log(triggerId,user, log, db) {
  var new_doc = {
    trigger: replaceDots(triggerId),
    message: log,
    user:user,
    date: Date.now()
  }
  db.collection("logs").insertOne(new_doc, function(err, result) {
    if (err)
      throw err;

    }
  )
}
function remove_logs(triggerId,user, db) {
  db.collection("logs").remove({
    trigger: replaceDots(triggerId),
    user:user
  }, function(err, numberRemoved) {
    if (err)
      throw err
  });
}

function startTriggerScript(user, triggerId, db) {
  fs.readFile(triggerPath + "" + triggerId, "utf8", function(err, data) {
    if (err)
      return -1
    db.collection("users").findOne({
      user: user
    }, function(err, result) {
      data = data.replace("dropboxKey", result["credentials"]["dropbox"])
      fs.writeFile("./tmpScript.js", data, function(writeErr) {
        if (writeErr) {
          return -1
        }
        var child = spawn("node", ["./tmpScript.js"])
        child.stdout.on('data', (data) => {
          //write log file
          create_log(triggerId,user, data.toString(), db)
          console.log(data.toString());
        });
        child.on('close', function(code) {
          //remove log file
          remove_logs(triggerId,user,db)
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
        }, function(err, result) {})
      })
    })
  });
}
function stopTriggerScript(user, triggerId, db) {
  db.collection("users").findOne({
    user: user
  }, function(err, result) {
    //for linux prob =>
    // exec("kill -9 " + dataVault[user]["trigger"][triggerId]["pid"])
    if (result) {
      if (result["triggers"][replaceDots(triggerId)] && result["triggers"][replaceDots(triggerId)]["pid"]) {
        //exec("taskkill /pid " + result["triggers"][replaceDots(triggerId)]["pid"] + " /f")
        exec("kill -9 " + result["triggers"][replaceDots(triggerId)]["pid"])
        remove_logs(triggerId,user,db)
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
      }, function(err, result) {
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
