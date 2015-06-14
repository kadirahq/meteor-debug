KadiraDebug = window.KadiraDebug = {};
KadiraInfo = new Mongo.Collection('kdInfo');
Meteor.subscribe('kadira.debug.listeners');

// Watch listeners for this app.
// If there are one or more listeners, then we start the StoreManager
// and send data
KadiraDebug._init = function(browserId, clientId) {
  Tracker.autorun(function(c) {
    var docListeners = KadiraInfo.findOne({_id: "listeners-count"});
    if(docListeners && docListeners.count > 0) {
      StoreManager.start(browserId, clientId);
    } else {
      StoreManager.stop();
    }
  });
};

// create a unique client for this client
// works accross hot code reloads as well
var clientId = Session.get('kdClientId');
if(!clientId) {
  clientId = Random.id(8);
  Session.set('kdClientId', clientId);
}
KadiraDebug.clientId = clientId;

// create a unique Id for the browser
var browserId = Meteor._localStorage.getItem('kdBrowserId');
if(!browserId) {
  Meteor.call('kadira.debug.getBrowserName', navigator.userAgent, setName);

  function setName(err, name) {
    if(err) {
      browserId = Random.id(8);
    } else {
      browserId = name;
    }
    Meteor._localStorage.setItem('kdBrowserId', browserId);
    // invoke the starting process
    KadiraDebug._init(browserId, clientId);
  }
} else {
  // invoke the starting process
  KadiraDebug._init(browserId, clientId);
}