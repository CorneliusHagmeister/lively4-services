console.log("Dropbox started");
const PATH = config[path];
const ENDING = config[type];
var Dropbox = require('dropbox');
var dbx = new Dropbox({ accessToken: credentials[dropbox] });


const POLLING_INTERVAL = parseFloat(process.argv[2]) || 0.1; // minute

function poll() {
   console.log("polling right now")
   console.log(PATH);
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
                       var name = entry.name.substring(0, entry.name.length - 4);
                       runActions(name);
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
