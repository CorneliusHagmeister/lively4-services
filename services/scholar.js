var scholar = require('google-scholar')
var Dropbox = require('dropbox');
var dbx = new Dropbox({ accessToken: 'op5m2s3ZXDAAAAAAAAAALJIoDP8_313ZzvWQCMFH4Tf8qdg6b9WlFdyOvmgF42mc' });
const PATH = '/PhD/papers';

var paper_title=process.argv[2];
console.log(paper_title);
console.log(scholar);
scholar.search(paper_title)
    .then(function(resultsObj) {
        console.log(resultsObj);
        dbx.filesUpload({ path: PATH + '/test.js', contents: JSON.stringify(resultsObj) })
            .then(function (response) {
                console.log(response);
            })
            .catch(function (err) {
                console.log(err);
            });
    })
    .catch(function(err) {
        console.log(err);
        dbx.filesUpload({ path: PATH + '/test.js', contents: "If google scholar would be working from Heroku, we would upload an updated version of your bibtex" })
        })