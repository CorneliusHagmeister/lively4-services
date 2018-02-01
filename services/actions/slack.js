var request = require('request');

var webhook = config(webhook);

var text = "Hello from a lively action.\n";
try {
    text += process.argv[2] + "\n";
    text += config(text);
} catch (e) {
    console.log(e);
}

var payload={"text":text};
payload = JSON.stringify(payload);

request.post({url: webhook, body: payload}, function(err, res){
    if(err){console.log(err)};
    if(res){console.log(res.body)};
})
