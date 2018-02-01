var request = require('request');

var webhook = config(webhook);

var payload={"text":"Hello from a lively action.\n(To show off how diligient some people are...)"};
payload = JSON.stringify(payload);

try {
    console.log(process.argv[2]));
} catch (e) {

} finally {

}

request.post({url: webhook, body: payload}, function(err, res){
    if(err){console.log(err)};
    if(res){console.log(res.body)};
})
