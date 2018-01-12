
var spawn = require('child_process').spawn;
var test = function() {
  console.log("Hello from forked services")
  setTimeout(test, 2000)
}
var child = spawn("node", ["./services/someaction.js"])

process.stdin.pipe(child.stdin)
child.stdout.on('data', (data) => {
  console.log(data.toString());
})

test()
