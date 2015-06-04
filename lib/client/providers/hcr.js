// Hot Code Reload Detection

Reload._onMigrate('kadiraDebug', function() {
  Meteor._localStorage.setItem('hcrAt', Date.now());
  return [true];
});

var hcrAt = Meteor._localStorage.getItem('hcrAt');
if(hcrAt) {
  hcrAt = parseInt(hcrAt);
  var elasedTime = Date.now() - hcrAt;
  var info = {
    elasedTime: elasedTime
  };
  Meteor._localStorage.removeItem('hcrAt');
  // store manager is not started yet. 
  // It's started when the `connect.js` has been loaded
  // So we need to defer it.
  
  Meteor.defer(function() {
    StoreManager.trackEvent('hcr', info, hcrAt);
  });
}