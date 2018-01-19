let scholar = require('google-scholar')
var Dropbox = require('dropbox');
var dbx = new Dropbox({ accessToken: 'R0OA10_0QoMAAAAAAAAQThs5uOU5UFcJjc0g9RlBGJwjvpD8PTdkCAwoOw-hGnvF' });
const PATH = '/PhD/papers';

var paper_title=process.argv[2];
console.log(paper_title);

scholar.search(paper_title)
    .then(resultsObj => {
        console.log(resultsObj);
        dbx.filesUpload({ path: PATH + '/test.js', contents: JSON.stringify(resultsObj) })
            .then(function (response) {
                console.log(response);
            })
            .catch(function (err) {
                console.log(err);
            });
    })
