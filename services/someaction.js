var test = function() {
  console.log("Something from inside")
  setTimeout(test, 2000)
}


test()
