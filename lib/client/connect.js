KadiraDebug = window.KadiraDebug = {};
KadiraInfo = new Mongo.Collection('kdInfo');
Meteor.subscribe('kadira.debug.listeners');

// Watch listeners for this app.
// If there are one or more listeners, then we start the StoreManager
// and send data
KadiraDebug._init = function() {
  Tracker.autorun(function(c) {
    var docListeners = KadiraInfo.findOne({_id: "listeners-count"});
    if(docListeners && docListeners.count > 0) {
      StoreManager.start(KadiraDebug.browserId, KadiraDebug.clientId);
    } else {
      StoreManager.stop();
    }
  });
};

// create a unique Id for the browser
var browserId = Meteor._localStorage.getItem('kdBrowserId');
if(!browserId) {
  browserId = Random.id();
  Meteor._localStorage.setItem('kdBrowserId', browserId);
}
KadiraDebug.browserId = browserId;

// create a unique client for this client
// works accross hot code reloads as well
var clientId = Session.get('kdClientId');
if(!clientId) {
  clientId = Random.id();
  Session.set('kdClientId', clientId);
}
KadiraDebug.clientId = clientId;

// invoke the starting process
KadiraDebug._init();