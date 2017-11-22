var actionsPath = "./services/actions/"
var triggerPath = "./services/trigger/"
var dataVault = require('./dataVault.json')

module.exports={
    getKey:function(user,type){
      return dataVault[user]["credentials"][type]
  }
}
