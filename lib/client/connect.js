KadiraDebug = window.KadiraDebug = {};
KadiraInfo = new Mongo.Collection('kdInfo');

var env = Utils.getAppEnv();
if(env === 'production') {
  var debug = getQueryParamFromURI('kadira_debug');
  var accessToken = (debug)? (getQueryParamFromURI('access_token') || null) : null;
  if(accessToken) {
    Meteor.subscribe('kadira.debug.client.auth', accessToken);
  } else {
    throw new Meteor.Error('401', 'Unauthorized.');
  }
}

KadiraDebug._init = function(browserId, clientId) {
  // Watch remopte admin listeners for this app.
  Meteor.subscribe('kadira.debug.client.listeners');

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