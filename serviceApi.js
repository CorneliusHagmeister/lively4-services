var dataVault = require('./dataVault.json')
const {exec} = require('child_process');
const spawn = require('child_process').spawn;
var actionsPath = "./services/actions/"
var triggerPath = "./services/trigger/"
var mongodb = require('mongodb');
const fs = require('fs');

module.exports = {
  setCredentials: function(req, res, db) {
    db.collection("users").findOne({
      user: req.body.user
    }, function(err, result) {
      if (err) {
        res.status(400).send("The given username does not exist")
      } else {
        result["credentials"][req.body.type] = req.body.key
        db.collection("users").update({
          user: req.body.user
        }, result, function(err, result) {
          if (err) {
            res.status(400).send("The credential update didnt work")
          } else {
            res.status(200).send("Succeful update")
          }
        });
      }
    })
  },
  addUser: function(req, res, data, db) {
    db.collection("users").find({
      user: data.user
    }, function(err, result) {
      if (err) {
        res.write("Something went wrong")
        res.end()
      } else {
        if (!result[data.user]) {
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
        var triggers = result["triggers"]
        jsonResponse(res, triggers)
      }
    })
  },
  assignTrigger: function(req, res, data, db) {
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (err||result.length<1) {
        res.write("Cant find User")
        res.end()
      } else {
        result["triggers"][data.triggerId] = {
          running: false
        }
        db.collection("users").update({
          user: data.user
        }, result, function(errUpdate, resultUpdate) {
          if (err) {
            res.write("The Trigger update didnt work: "+errUpdate)
            res.end()
          } else {
            res.write("Sucessful update")
            res.end()
          }
        });
      }
    })
  },
  removeTrigger: function(user, triggerId, data, db) {
    stopTriggerScript()
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (err) {
        res.write("Cant find User: " + err)
        res.end()
      } else {
        delete result["triggers"][data.triggerId]
        db.collection("users").update({
          user: data.user
        }, result, function(err, result) {
          if (err) {
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
  assignAction: function(req, res, data) {
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (err) {
        res.write("Cant find User")
        res.end()
      } else {
        result["triggers"][data.triggerId][data.actionId] = data.actionId
        db.collection("users").update({
          user: data.user
        }, result, function(err, result) {
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
  removeAction: function(req, res, data) {
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (err) {
        res.write("Cant find User")
        res.end()
      } else {
        delete result["triggers"][data.triggerId][data.actionId]
        db.collection("users").update({
          user: data.user
        }, result, function(err, result) {
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
  runUserTrigger: function(req, res, data) {
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (err) {
        res.write("Cant find User")
        res.end()
      } else {
        result["triggers"][data.triggerId]["running"] = true
        db.collection("users").update({
          user: data.user
        }, result, function(err, result) {
          if (err) {
            res.write("The Action deletion didnt work")
            res.end()
          } else {
            startTriggerScript(data.user, data.triggerId);
            res.write("Sucessful deletion")
            res.end()
          }
        });
      }
    })
  },
  startTriggerScript: function(user, triggerId) {
    fs.readFile(triggerPath + "" + triggerId, "utf8", function(err, data) {
      if (err)
        return -1
      data = data.replace("dropboxKey", "utils.getKey('" + user + "','dropbox')")
      data = "const utils = require('./utils');\n" + data
      fs.writeFile("./tmpScript.js", data, function(writeErr) {
        if (writeErr)
          return -1
        var child = spawn("node", ["./tmpScript.js"])
        child.stdout.on('data', (data1) => {
          console.log(`Number of files ${data1}`);
        });
        db.collection("users").findOne({
          user: data.user
        }, function(err, result) {
          result["triggers"][triggerId]["pid"] = child.pid
          db.collection("users").update({
            user: data.user
          }, result, function(err, result) {})
        })
      })
    });
  },
  stopTriggerScript: function(user, triggerId) {
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      //for linux prob =>
      // exec("kill -9 " + dataVault[user]["trigger"][triggerId]["pid"])
      exec("taskkill /pid " + result["triggers"][triggerId]["pid"] + " /f")
      console.log("kill -9 " + result["triggers"][triggerId]["pid"]);
      delete result["triggers"][triggerId]["pid"]
      result["triggers"][triggerId]["running"] = false
      db.collection("users").update({
        user: data.user
      }, result, function(err, result) {
        if (err) {
          console.log("The trigger could not be updated");
        }
      })
    })
  },
  stopUserTrigger: function(req, res, data) {
    db.collection("users").findOne({
      user: data.user
    }, function(err, result) {
      if (result["triggers"][data.triggerId]) {
        result["triggers"][data.triggerId]['running'] = false
        stopTriggerScript(data.user, data.triggerId);
        res.end()
      } else {
        console.error("The given triggerId could not be found");
        res.write("The given triggerId could not be found")
        res.end()
      }
    })
  }
}
function jsonResponse(res, obj) {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(obj));
}
