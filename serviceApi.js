var dataVault = require('./dataVault.json')
const {exec} = require('child_process');
const spawn = require('child_process').spawn;
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var actionsPath = "./services/actions/"
var triggerPath = "./services/trigger/"
const fs = require('fs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;
var router = express.Router();

router.post('/createUser', function(req, res) {
  addUser(req,res)
});

router.delete('/removeUser', function(req, res) {
  removeUser(req,res)
});

router.get('/getTriggers',function(req,res){
  getUserTriggers(req,res)
})

router.post('/assignTrigger', function(req, res) {
  assignTrigger(req,res)
});

router.delete('/removeTrigger', function(req, res) {
  removeUser(req,res)
});

router.post('/assignAction', function(req, res) {
  assignAction(req,res)
});

router.delete('/removeAction', function(req, res) {
  removeAction(req,res)
});

router.post('/runTrigger', function(req, res) {
  runUserTrigger(req,res)
});

router.post('/stopTrigger', function(req, res) {
  stopUserTrigger(req,res)
});

router.post('/setCredentials', function(req, res) {
  setCredentials(req,res)
});

app.use('/api', router);

app.listen(port);

console.log("listening on port "+port);

function setCredentials(req,res){
  if(dataVault[req.body.user]){
    dataVault[req.body.user]["credentials"][req.body.type]=req.body.key
    fs.writeFile('./dataVault.json',JSON.stringify(dataVault))
    res.status(200).send()
  }else{
    res.status(400).send("The given username does not exist")
  }
}

function addUser(req,res) {
  if (dataVault[req.body.user] == null) {
    dataVault[req.body.user] = {
      trigger: {},
      credentials: {}
    }
    fs.writeFile('./dataVault.json',JSON.stringify(dataVault))
    res.status(200).send()
  } else {
    res.status(400).send("The username already exists")
    console.error("The username already exists");
  }
}

function removeUser(req,res) {
  if (dataVault[req.body.user] != null) {
    delete  dataVault[req.body.user]
    fs.writeFile('./dataVault.json',JSON.stringify(dataVault))
    res.status(200).send()
  } else {
    res.status(400).send("The given username does not exist");
    console.error("The given username does not exist");
  }
}

function getUserTriggers(req,res) {
  if (dataVault[req.query.user]) {
    res.status(200).send(JSON.stringify(dataVault[req.query.user]['trigger']))
  } else {
    res.status(400).send("The given username does not exist")
    console.error("The given username does not exist");
  }
}

function assignTrigger(req,res) {
  if (dataVault[req.body.user]) {
    dataVault[req.body.user]["trigger"][req.body.triggerId] = {
      running: false,
      actions: []
    }
    fs.writeFile('./dataVault.json',JSON.stringify(dataVault))
    res.status(200).send()
  } else {
    console.error("The given username does not exist");
    res.status(400).send("The given username does not exist")
  }
}

function removeTrigger(user, triggerId) {
  stopTriggerScript()
  if (dataVault[req.body.user]["trigger"][req.body.triggerId]) {
    delete dataVault[req.body.user]["trigger"][req.body.triggerId]
    fs.writeFile('./dataVault.json',JSON.stringify(dataVault))
    res.status(200).send()
  } else {
    console.error("Given trigger wasn't not attached to given user");
    res.status(400).send("Given trigger wasn't not attached to given user")
  }
}

function assignAction(req, res) {
  if (dataVault[req.body.user]) {
    if (dataVault[req.body.user]['trigger'][req.body.triggerId]) {
      dataVault[req.body.user]['trigger'][req.body.triggerId]["actions"].push(req.body.actionId)
      fs.writeFile('./dataVault.json',JSON.stringify(dataVault))
      res.status(200).send()
    } else {
      console.error("The given triggerId does not exist");
      res.status(400).send("The given triggerId does not exist")
    }
  } else {
    console.error("The given username does not exist");
    res.status(400).send("The given username does not exist")
  }
}

function removeAction(req,res) {
  if (dataVault[req.body.user]) {
    if (dataVault[req.body.user]['trigger'][req.body.triggerId]) {
      var index = dataVault[req.body.user]['trigger'][req.body.triggerId]["actions"].indexOf(actionId);
      if (index > -1) {
        dataVault[req.body.user]['trigger'][req.body.triggerId]["actions"].splice(index, 1)
        fs.writeFile('./dataVault.json',JSON.stringify(dataVault))
        res.status(200).send()
      }
    } else {
      console.error("The given triggerId does not exist");
      res.status(400).send("The given triggerId does not exist")
    }
  } else {
    console.error("The given username does not exist");
    res.status(400).send("The given username does not exist")
  }
}

function runUserTrigger(req,res) {
  if (dataVault[req.body.user]) {
    if (dataVault[req.body.user]["trigger"][req.body.triggerId]) {
      dataVault[req.body.user]["trigger"][req.body.triggerId]["running"] = true
      fs.writeFile('./dataVault.json',JSON.stringify(dataVault))
      console.log("something");
      startTriggerScript(req.body.user, req.body.triggerId);
      res.status(200).send()
      return
    }
    console.error("The given trigerId could not be found");
    res.status(400).send("The given trigerId could not be found")
  } else {
    console.error("The given username does not exist");
    res.status(400).send("The given username does not exist")
  }
}

function startTriggerScript(user, triggerId) {
  console.log(triggerPath+""+triggerId);
  fs.readFile(triggerPath+""+triggerId, "utf8", function(err, data) {
    if(err)return -1
    data=data.replace("dropboxKey","utils.getKey('"+user+"','dropbox')")
    data="const utils = require('./utils');\n"+data
    fs.writeFile("./tmpScript.js",data , function(writeErr) {
      if(writeErr)return -1
      var child = spawn("node",["./tmpScript.js"])
      child.stdout.on('data', (data1) => {
        console.log(`Number of files ${data1}`);
      });
      dataVault[user]["trigger"][triggerId]["pid"] = child.pid
      fs.writeFile('./dataVault.json',JSON.stringify(dataVault))
    })
  });
}

function stopTriggerScript(user, triggerId) {
  if (dataVault[user]["trigger"][triggerId]) {
    //for linux prob =>
    // exec("kill -9 " + dataVault[user]["trigger"][triggerId]["pid"])
    exec("taskkill /pid "+dataVault[user]["trigger"][triggerId]["pid"]+" /f")
    console.log("kill -9 " + dataVault[user]["trigger"][triggerId]["pid"]);
    delete dataVault[user]["trigger"][triggerId]["pid"]
    dataVault[user]["trigger"][triggerId]["running"]=false
    fs.writeFile('./dataVault.json',JSON.stringify(dataVault))
  } else {
    console.error("Script wasnt found");
  }
}

function stopUserTrigger(req,res) {
  if (dataVault[req.body.user]) {
    if (dataVault[req.body.user]["trigger"][req.body.triggerId]) {
      dataVault[req.body.user]["trigger"][req.body.triggerId]['running'] = false
      stopTriggerScript(req.body.user, req.body.triggerId);
      fs.writeFile('./dataVault.json',JSON.stringify(dataVault))
      res.status(200).send()
      return
    }
    console.error("The given triggerId could not be found");
    res.status(400).send("The given triggerId could not be found")
  } else {
    console.error("The given username does not exist");
    res.status(400).send("The given username does not exist")
  }
}
