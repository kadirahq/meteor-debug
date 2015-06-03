KadiraDebug = window.KadiraDebug = {};

KadiraDebug.start = function() {
  Meteor._localStorage.setItem('kdStarted', true);
  KadiraDebug._startIfNeeded();
};

KadiraDebug.stop = function() {
  Meteor._localStorage.removeItem('kdStarted');
  StoreManager.stop();
};

KadiraDebug._startIfNeeded = function() {
  if(Meteor._localStorage.getItem('kdStarted')) {
    StoreManager.start(KadiraDebug.browserId, KadiraDebug.clientId);
  }
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
KadiraDebug._startIfNeeded();