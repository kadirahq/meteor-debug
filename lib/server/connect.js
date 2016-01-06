KadiraDebug = KadiraDebug || {};
var UAParser = Npm.require('ua-parser-js');

// This keep number of appConfigs
// such as; accessTokens, clientAuthorizedSessions, remoteAuthorizedSessions etc.
// as documents in a local colletion for authentication purposes  

// accessTokens:
// This is a set of token passed from the client, these token will be used to 
// authorize a browser session in the production mode.
// It's possible for a single accessToken to be used in multiple times.

// clientAuthorizedSessions, remoteAuthorizedSessions:
// These are hold authorized Kadira Debug DDP sessionIds
KdConfig = new Mongo.Collection('kDebugConfig');

AppConfig = {
  // app environment. Either `production` or `development`.
  env: Utils.getAppEnv(),

  // auth key taken from enviornment variables
  authKey: Utils.getDebugAuthKey(),
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

// Observers: listenersCount
KdConfig.find({_id: 'listenersCount'}).observeChanges({
  added: function(id, doc) {
    var timelineCount = doc.count;
    console.log("added: ", id, doc);

    SubHandlers.listeners.forEach(function(sub) {
      sub.added('kdInfo', 'listeners-count', {count: timelineCount});
    });
  },

  changed: function(id, doc) {
     console.log("changed: ", id, doc, doc.count);
    var timelineCount = doc.count;
    SubHandlers.listeners.forEach(function(sub) {
      // ##: here, sub.changed fails sometimes because 
      // not having a subscription added before that
      // need to find a proper way to deal with this.
      try {
        sub.changed('kdInfo', 'listeners-count', {count: timelineCount});
      } catch(err) {
        sub.added('kdInfo', 'listeners-count', {count: timelineCount});
      }
    });
  }
});

// publications

Meteor.publish('kadira.debug.remote.auth', function(authKey) {
  check(authKey, Match.Any);

  // We need to check authentication of a production app only.
  // For other development apps, we can use KD without any authentication
  if(AppConfig.env === 'production') {
    if(authKey !== AppConfig.authKey) {
      throw new Meteor.Error('401', 'Unauthorized.');
    }

    // authorize the remote session
    var kadiraInfo = Kadira._getInfo();
    var sessionId = kadiraInfo.session;

    var authObj = {};
    authObj[sessionId] = true;

    KdConfig.update(
      { _id: 'remoteAuthorizedSessions' }, 
      { $set: authObj },
      { upsert: true }
    );
  }

  this.onStop(function() {
    KdConfig.update(
      {_id: 'remoteAuthorizedSessions'}, 
      {$unset: authObj}
    );
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
    
    // authenticate accessToken
    var query = {};
    query._id = 'accessTokens';
    query[accessToken] = true;

    if(!KdConfig.findOne(query)) {
      throw new Meteor.Error('401', 'Unauthorized.');
    }

    // authorize client session
    var kadiraInfo = Kadira._getInfo();
    var sessionId = kadiraInfo.session;

    var authObj = {};
    authObj[sessionId] = true;

    KdConfig.update(
      {_id: 'clientAuthorizedSessions'}, 
      {$set: authObj},
      { upsert: true }
    );
  }

  this.onStop(function() {
    KdConfig.update(
      {_id: 'remoteAuthorizedSessions'}, 
      {$unset: authObj}
    );
  });

  this.ready();
});

Meteor.publish('kadira.debug.client.listeners', function() {
  KadiraDebug._authorize('client');

  var sub = this;
  var timelineCount = SubHandlers.timeline.length;

  // update listenersCount to the DB
  KdConfig.update(
    { _id: 'listenersCount' },
    { $set: {count: timelineCount}},
    { upsert: true }
  );

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
    // XXX: We need to update these to the DB.
    var serverTimeEvents = traceStore.pickTimeEvents(browserId, clientId);
    serverTimeEvents.forEach(function(ev) {
      data.times.push(ev);
    });

    // set unique id for each server sessions
    data.serverId = serverId;

    // update timeline
    // XXX: Try to send these to timeline which monitor the given access token
    // XXX: We need to get these from the DB
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

    // XXX: We need to get traces from the DB
    return traceStore.getTrace(browserId, clientId, type, id);
  },

  'kadira.debug.remote.getAppEnv': function() {
    return AppConfig.env;
  },

  'kadira.debug.remote.createAccessToken': function() {
    KadiraDebug._authorize('remote');
    
    var kadiraInfo = Kadira._getInfo();
  
    // authorize accessToken
    var accessToken = Random.id(4);

    var tokenObj = {};
    tokenObj[accessToken] = true;

    KdConfig.update(
      { _id: 'accessTokens' }, 
      { $set: tokenObj },
      { upsert: true }
    );

    return accessToken;
  },

  'kadira.debug.remote.reset': function() {
    KadiraDebug._authorize('remote');
    resetKdDbConfig();
  }
});

function updateListenersCount() {
  SubHandlers.listeners.forEach(function(sub) {
    var timelineCount = SubHandlers.timeline.length;

    // update listenersCount to the DB
    KdConfig.update(
      { _id: 'listenersCount' },
      { $set: {count: timelineCount}},
      { upsert: true }
    );
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

  // authenticate the current session
  var query = {};
  query._id = type + 'AuthorizedSessions';
  query[sessionId] = true;

  if(KdConfig.findOne(query)) {
    return true;
  } else {
    throw new Meteor.Error('401', 'Unauthorized.');
  }
};

function resetKdDbConfig() {
  KdConfig.remove({_id: 'accessTokens'});
  KdConfig.remove({_id: 'clientAuthorizedSessions'});
  KdConfig.remove({_id: 'remoteAuthorizedSessions'});
  KdConfig.remove({_id: 'listenersCount'});
}