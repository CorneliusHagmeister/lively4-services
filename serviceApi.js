var dataVault = require('./dataVault.json')
const {exec} = require('child_process');
const spawn = require('child_process').spawn;
var actionsPath = "./services/actions/"
var triggerPath = "./services/trigger/"
const fs = require('fs');

module.exports = {
  setCredentials: function(req, res) {
    if (dataVault[req.body.user]) {
      dataVault[req.body.user]["credentials"][req.body.type] = req.body.key
      fs.writeFile('./dataVault.json', JSON.stringify(dataVault))
      res.status(200).send()
    } else {
      res.status(400).send("The given username does not exist")
    }
  },
  addUser: function(req, res, data) {
    if (!dataVault[data.user]) {
      dataVault[data.user] = {
        trigger: {},
        credentials: {}
      }
      fs.writeFile('./dataVault.json', JSON.stringify(dataVault))
      res.end()
    } else {
      res.write("The username already exists")
      res.end()
      console.error("The username already exists");
    }
  },

  removeUser: function(req, res, data) {
    if (dataVault[data.user] != null) {
      delete dataVault[data.user]
      fs.writeFile('./dataVault.json', JSON.stringify(dataVault))
      res.end()
    } else {
      res.write("The given username does not exist")
      res.end();
      console.error("The given username does not exist");
    }
  },

  getUserTriggers: function(req, res, data) {
    if (dataVault[data.user]) {
      return JSON.stringify(dataVault[data.user]['trigger'])
    } else {
      return "The given username does not exist1"
      console.error("The given username does not exist");
    }
  },

  assignTrigger: function(req, res, data) {
    if (dataVault[data.user]) {
      dataVault[data.user]["trigger"][data.triggerId] = {
        running: false,
        actions: []
      }
      fs.writeFile('./dataVault.json', JSON.stringify(dataVault))
      res.end()
    } else {
      console.error("The given username does not exist");
      res.write("The given username does not exist")
      res.end()
    }
  },

  removeTrigger: function(user, triggerId, data) {
    stopTriggerScript()
    if (dataVault[data.user]["trigger"][data.triggerId]) {
      delete dataVault[data.user]["trigger"][data.triggerId]
      fs.writeFile('./dataVault.json', JSON.stringify(dataVault))
      res.end()
    } else {
      console.error("Given trigger wasn't not attached to given user");
      res.write("Given trigger wasn't not attached to given user")
      res.end()
    }
  },

  assignAction: function(req, res, data) {
    if (dataVault[data.user]) {
      if (dataVault[data.user]['trigger'][data.triggerId]) {
        dataVault[data.user]['trigger'][data.triggerId]["actions"].push(data.actionId)
        fs.writeFile('./dataVault.json', JSON.stringify(dataVault))
        res.end()
      } else {
        console.error("The given triggerId does not exist");
        res.write("The given triggerId does not exist")
        res.end()
      }
    } else {
      console.error("The given username does not exist");
      res.write("The given username does not exist")
      res.end()
    }
  },

  removeAction: function(req, res, data) {
    if (dataVault[data.user]) {
      if (dataVault[data.user]['trigger'][data.triggerId]) {
        var index = dataVault[data.user]['trigger'][data.triggerId]["actions"].indexOf(actionId);
        if (index > -1) {
          dataVault[data.user]['trigger'][data.triggerId]["actions"].splice(index, 1)
          fs.writeFile('./dataVault.json', JSON.stringify(dataVault))
          res.end()
        }
      } else {
        console.error("The given triggerId does not exist");
        res.write("The given triggerId does not exist")
        res.end()
      }
    } else {
      console.error("The given username does not exist");
      res.write("The given username does not exist")
      res.end()
    }
  },

  runUserTrigger: function(req, res, data) {
    if (dataVault[data.user]) {
      if (dataVault[data.user]["trigger"][data.triggerId]) {
        dataVault[data.user]["trigger"][data.triggerId]["running"] = true
        fs.writeFile('./dataVault.json', JSON.stringify(dataVault))
        startTriggerScript(data.user, data.triggerId);
        res.end()
      }
      console.error("The given trigerId could not be found");
      res.write("The given trigerId could not be found")
      res.end()
    } else {
      console.error("The given username does not exist");
      res.write("The given username does not exist")
      res.end()
    }
  },

  startTriggerScript: function(user, triggerId) {
    console.log(triggerPath + "" + triggerId);
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
        dataVault[user]["trigger"][triggerId]["pid"] = child.pid
        fs.writeFile('./dataVault.json', JSON.stringify(dataVault))
      })
    });
  },

  stopTriggerScript: function(user, triggerId) {
    if (dataVault[user]["trigger"][triggerId]) {
      //for linux prob =>
      // exec("kill -9 " + dataVault[user]["trigger"][triggerId]["pid"])
      exec("taskkill /pid " + dataVault[user]["trigger"][triggerId]["pid"] + " /f")
      console.log("kill -9 " + dataVault[user]["trigger"][triggerId]["pid"]);
      delete dataVault[user]["trigger"][triggerId]["pid"]
      dataVault[user]["trigger"][triggerId]["running"] = false
      fs.writeFile('./dataVault.json', JSON.stringify(dataVault))
    } else {
      console.error("Script wasnt found");
    }
  },

  stopUserTrigger: function(req, res, data) {
    if (dataVault[data.user]) {
      if (dataVault[data.user]["trigger"][data.triggerId]) {
        dataVault[data.user]["trigger"][data.triggerId]['running'] = false
        stopTriggerScript(data.user, data.triggerId);
        fs.writeFile('./dataVault.json', JSON.stringify(dataVault))
        res.end()
      }
      console.error("The given triggerId could not be found");
      res.write("The given triggerId could not be found")
      res.end()
    } else {
      console.error("The given username does not exist");
      res.write("The given username does not exist")
      res.end()
    }
  }
}
