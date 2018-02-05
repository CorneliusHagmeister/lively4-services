const PATH = config[path];
const ENDING = config[type];
var dbx = new Dropbox({ accessToken: credentials[dropbox] });


const POLLING_INTERVAL = parseFloat(process.argv[2]) || 1; // minute
var Dropbox = require('dropbox');

function poll() {
    console.log("polling right now")
    dbx.filesListFolder({path: PATH})
        .then(function(response) {
            var somethingNew = false;
            var curr = Date.now();
            for (entry of response.entries) {
                if (entry.name.endsWith(ENDING) ) {
                    var modified = new Date(entry.client_modified);
                    var old = (curr - modified) / 1000 / 60; // in minutes
                    if (old < POLLING_INTERVAL) {
                        console.log("NEW PDF!");
                        somethingNew = true;
                        runActions(entry.name.substring(0, entry.name.length - 4))
                    }
                }
            }
            if (!somethingNew) {
                console.log("Nothing new this run");
            }
        })
        .catch(function(error) {
            console.log(error);
        });
}

setInterval(poll, POLLING_INTERVAL * 1000 * 60);
