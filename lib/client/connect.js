KadiraDebug = window.KadiraDebug = {};
KadiraInfo = new Mongo.Collection('kdInfo');

var debug = getQueryParamFromURI("kadira_debug");
var accessToken = (debug)? (getQueryParamFromURI("access_token") || null) : null;
Meteor.subscribe('kadira.debug.client.auth', accessToken);

// Watch listeners for this app.
// XXX: May be try to get the listeners count by the accessToken
// So, we don't need to track stuff when tracking other clients
Meteor.subscribe('kadira.debug.client.listeners');

KadiraDebug._init = function(browserId, clientId) {

  Meteor.subscribe('kadira.debug.client.init', browserId, clientId);
  
  // If there are one or more listeners, then we start the StoreManager
  // and send data
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
  
  Meteor.call('kadira.debug.client.getBrowserName', navigator.userAgent, setName);
} else {
  // invoke the starting process
  KadiraDebug._init(browserId, clientId);
}

function getQueryParamFromURI(q) {
  q = q.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + q + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}