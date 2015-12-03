KadiraDebug = KadiraDebug || {};
var LRUCache = Npm.require('lru-cache');
var UAParser = Npm.require('ua-parser-js');

AppConfig = {
  // app environment. Either `production` or `development`.
  env: Utils.getAppEnv(),

  // auth key taken from enviornment variables
  authKey: Utils.getDebugAuthKey(),

  // This is a set of token passed from the client, these token will be used to 
  // authorize a browser session in the production mode.
  // It's possible for a single accessToken to be used in multiple times.
  accessTokens: new LRUCache({max: 1000}),

  // These maps hold authorized Kadira Debug DDP sessionIds
  authorizedSessions: {
    // sessions made from the app's client
    client: {},
    // sessions made from the Kadira Debug UI 
    remote: {}
  }
};

var traceStore = new TraceStore();
traceStore.start();

SubHandlers = {
  // Keep DDP sessions of the remote admin's subscription for timeline
  timeline: [],
  // Keep DDP sessions of the client app's subscription for sending the 
  // count of remote admins
  listeners: []
};
var uniqueId = 0;
var serverId = Random.id();

// publications

Meteor.publish('kadira.debug.remote.auth', function(authKey) {
  check(authKey, Match.Any);

  // We need to check authentication of a production app only.
  // For other development apps, we can use KD without any authentication
  if(AppConfig.env === 'production') {
    if(authKey !== AppConfig.authKey) {
      throw new Meteor.Error('401', 'Unauthorized.');
    }

    var kadiraInfo = Kadira._getInfo();
    var sessionId = kadiraInfo.session;
    AppConfig.authorizedSessions.remote[sessionId] = true;
  }

  this.onStop(function() {
    delete AppConfig.authorizedSessions.remote[sessionId];
  });

  this.ready();
});

Meteor.publish('kadira.debug.remote.timeline', function() {
  KadiraDebug._authorize('remote');

  this.ready();
  var sub = this;

  SubHandlers.timeline.push(sub);
  updateListenersCount();

  sub.onStop(function() {
    var index = SubHandlers.timeline.indexOf(sub);
    SubHandlers.timeline.splice(index, 1);
    updateListenersCount();
  });
});

Meteor.publish('kadira.debug.client.auth', function(accessToken) {
  check(accessToken, Match.Any);

  // We need to check the accessToken in the production mode only.
  // On development mode we don't need these checks.
  if(AppConfig.env === 'production') {
    if(!AppConfig.accessTokens.has(accessToken)) {
      throw new Meteor.Error('401', 'Unauthorized.');
    }

    var kadiraInfo = Kadira._getInfo();
    var sessionId = kadiraInfo.session;

    AppConfig.authorizedSessions.client[sessionId] = true;
  }

  this.onStop(function() {
    delete AppConfig.authorizedSessions.client[sessionId];
  });

  this.ready();
});

Meteor.publish('kadira.debug.client.listeners', function() {
  KadiraDebug._authorize('client');

  var sub = this;
  var timelineCount = SubHandlers.timeline.length;

  sub.added('kdInfo', 'listeners-count', {count: timelineCount});
  sub.ready();

  SubHandlers.listeners.push(sub);
  sub.onStop(function() {
    var index = SubHandlers.listeners.indexOf(sub);
    SubHandlers.listeners.splice(index, 1);
  });
});

Meteor.publish('kadira.debug.client.init', function(browserId, clientId) {
  check(browserId, String);
  check(clientId, String);

  KadiraDebug._authorize('client');

  var kadiraInfo = Kadira._getInfo();
  if(kadiraInfo) {
    var sessionId = kadiraInfo.session;

    traceStore.registerSession(sessionId, browserId, clientId);

    this.onStop(function() {
      traceStore.unregisterSession(browserId, clientId);
    });
  }

  this.ready();
});

// methods
Meteor.methods({
  'kadira.debug.client.updateTimeline': function(browserId, clientId, data) {
    check(browserId, String);
    check(clientId, String);
    check(data, Object);

    KadiraDebug._authorize('client');

    // Pick tracked server time events and push them to the
    // client's payload
    // So, we can send them back to the server
    var serverTimeEvents = traceStore.pickTimeEvents(browserId, clientId);
    serverTimeEvents.forEach(function(ev) {
      data.times.push(ev);
    });

    // set unique id for each server sessions
    data.serverId = serverId;

    // update timeline
    // XXX: Try to send these to timeline which monitor the given access token
    SubHandlers.timeline.forEach(function(sub) {
      var id = 'id' + ++uniqueId;
      sub.added('kdTimeline', id, {
        browserId: browserId,
        clientId: clientId,
        data: data
      });
      sub.removed('kdTimeline', id);
    });
  },

  'kadira.debug.client.getBrowserName': function(userAgent) {
    check(userAgent, String);

    KadiraDebug._authorize('client');

    var parser = new UAParser(userAgent);
    return parser.getResult().browser.name;
  },

  'kadira.debug.remote.getTrace': function(browserId, clientId, type, id) {
    check(browserId, String);
    check(clientId, String);
    check(type, String);
    check(id, String);

    KadiraDebug._authorize('remote');

    return traceStore.getTrace(browserId, clientId, type, id);
  },

  'kadira.debug.remote.getAppEnv': function() {
    return AppConfig.env;
  },

  'kadira.debug.remote.createAccessToken': function() {
    KadiraDebug._authorize('remote');
    
    var kadiraInfo = Kadira._getInfo();
  
    var accessToken = Random.id(4);
    AppConfig.accessTokens.set(accessToken, kadiraInfo.session);

    return accessToken;
  },

  'kadira.debug.remote.reset': function() {
    KadiraDebug._authorize('remote');
  
    AppConfig.accessTokens.reset();
    AppConfig.authorizedSessions = {
      client: {},
      remote: {}
    };
  }
});

function updateListenersCount() {
  SubHandlers.listeners.forEach(function(sub) {
    var timelineCount = SubHandlers.timeline.length;
    sub.changed('kdInfo', 'listeners-count', {count: timelineCount});
  });
}

KadiraDebug._authorize = function(type, sessionId) {
  if(AppConfig.env === 'development') {
    return true;
  }

  if(!sessionId) {
    var kadiraInfo = Kadira._getInfo();
    var sessionId = kadiraInfo.session;
  }

  if(AppConfig.authorizedSessions[type][sessionId]) {
    return true;
  } else {
    throw new Meteor.Error('401', 'Unauthorized.');
  }
};