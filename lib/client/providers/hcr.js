// Hot Code Reload Detection

Reload._onMigrate('kadiraDebug', function() {
  Meteor._localStorage.setItem('hcrAt', Date.now());
  return [true];
});

var hcrAt = Meteor._localStorage.getItem('hcrAt');
if(hcrAt) {
  hcrAt = parseInt(hcrAt);
  var elapsedTime = Date.now() - hcrAt;
  var info = {
    elapsedTime: elapsedTime
  };
  Meteor._localStorage.removeItem('hcrAt');

  // store manager is not started yet. 
  // So we need to run register it to run when it started.
  StoreManager.startup(function() {
    StoreManager.trackEvent('hcr', info, hcrAt);
  });
}