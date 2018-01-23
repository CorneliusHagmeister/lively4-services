var Dropbox = require('dropbox');
var dbx = new Dropbox({ accessToken: 'op5m2s3ZXDAAAAAAAAAALJIoDP8_313ZzvWQCMFH4Tf8qdg6b9WlFdyOvmgF42mc' });
// var dbx = new Dropbox({ accessToken: dropboxKey });

const PATH = '/PhD/papers';
const ENDING = '.pdf';
const POLLING_INTERVAL = parseFloat(process.argv[2]) || 1; // minute

function poll() {
    console.log("polling right now")
    dbx.filesListFolder({path: PATH})
        .then(function(response) {
            // console.log(response);
            var somethingNew = false;
            var curr = Date.now();
            for (entry of response.entries) {
                if (entry.name.endsWith(ENDING) ) { // also check if timestamp works
                    var modified = new Date(entry.client_modified);
                    var old = (curr - modified) / 1000 / 60; // in minutes
                    if (old < POLLING_INTERVAL) {
                        console.log("NEW PDF!");
                        somethingNew = true;
                        runActions(entry.name.substring(0, entry.name.length - 4))
                    }
                }
            }
            console.log("Nothing new this run");
        })
        .catch(function(error) {
            console.log(error);
        });
}

setInterval(poll, POLLING_INTERVAL * 1000 * 60);