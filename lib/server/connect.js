KadiraDebug = KadiraDebug || {};
var UAParser = Npm.require('ua-parser-js');

// This keep number of appConfigs
// such as; accessTokens, clientAuthorizedSessions, remoteAuthorizedSessions etc.
// as documents in a localCollection for authentication purposes
var KdConfig = new Mongo.Collection('kDebugConfig');

// This keep serverTimeEvents
var KdData = new Mongo.Collection('kdData');

AppConfig = {
  // app environment. Either `production` or `development`.
  env: Utils.getAppEnv(),

  // auth key taken from enviornment variables
  authKey: Utils.getDebugAuthKey()
};

SubHandlers = {
  // Keep DDP sessions of the remote admin's subscription for timeline
  timeline: [],
  // Keep DDP sessions of the client app's subscription for sending the 
  // count of remote admins
  listeners: []
};

var uniqueId = 0;
var serverId = Random.id();
var startTime = new Date();

var traceStore = new TraceStore({serverId: serverId});
traceStore.start();

// Observers: KdConfig/listenersCount
KdConfig.find({_id: 'listenersCount'}).observeChanges({
  added: function(id, doc) {
    SubHandlers.listeners.forEach(function(sub) {
      sub.added('kdInfo', 'listeners-count', {count: doc.count});
    });
  },

  changed: function(id, doc) {
    SubHandlers.listeners.forEach(function(sub) {
      sub.changed('kdInfo', 'listeners-count', {count: doc.count});
    });
  }
});

// Observers: KdData/serverTimeEvents
KdData.find().observeChanges({
  added: function(docId, doc) {
    if(doc && doc.data) {
      var timeNow = new Date(doc.timestamp);

      if(startTime <= timeNow) {
        var info = JSON.parse(doc.data);
        var browserId = doc.browserId;
        var clientId = doc.clientId;

        SubHandlers.timeline.forEach(function(sub) {
          var id = 'id' + ++uniqueId;
          sub.added('kdTimeline', id, {
            browserId: browserId,
            clientId: clientId,
            data: info
          });
          sub.removed('kdTimeline', id);
        });
      }
    }
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

    // authorize remote session
    var kadiraInfo = Kadira._getInfo();
    var sessionId = kadiraInfo.session;

    KdConfig.update(
      {_id: 'remoteAuthorizedSessions'},
      { $addToSet: {sessions: sessionId} },
      { upsert: true }
    );
  }

  this.onStop(function() {
    if(AppConfig.env === 'production') {
      KdConfig.update(
        {_id: 'remoteAuthorizedSessions'},
        { $pull: {sessions: sessionId} }
      );
    }
  });

  this.ready();
});

Meteor.publish('kadira.debug.remote.timeline', function() {
  KadiraDebug._authorize('remote');

  this.ready();

  var sub = this;
  SubHandlers.timeline.push(sub);

  // increment listenersCount in DB
  KdConfig.update(
    { _id: 'listenersCount' },
    { $inc: {count: 1}},
    { upsert: true }
  );

  sub.onStop(function() {
    var index = SubHandlers.timeline.indexOf(sub);
    SubHandlers.timeline.splice(index, 1);

    // decrement listenersCount in DB
    KdConfig.update(
      { _id: 'listenersCount' },
      { $inc: {count: -1}},
      { upsert: true }
    );
  });
});

Meteor.publish('kadira.debug.client.auth', function(accessToken) {
  check(accessToken, Match.Any);

  // We need to check the accessToken in the production mode only.
  // On development mode we don't need these checks.
  if(AppConfig.env === 'production') {

    var validToken = !!KdConfig.findOne({_id: 'accessTokens', tokens: {$in: [accessToken]}});
    if(!validToken) {
      throw new Meteor.Error('401', 'Unauthorized.');
    }

    // authorize client session
    var kadiraInfo = Kadira._getInfo();
    var sessionId = kadiraInfo.session;

    KdConfig.update(
      {_id: 'clientAuthorizedSessions'},
      { $addToSet: {sessions: sessionId} },
      { upsert: true }
    );
  }

  this.onStop(function() {
    if(AppConfig.env === 'production') {
      KdConfig.update(
        {_id: 'clientAuthorizedSessions'},
        { $pull: {sessions: sessionId} }
      );
    }
  });

  this.ready();
});

Meteor.publish('kadira.debug.client.listeners', function() {
  KadiraDebug._authorize('client');

  var sub = this;

  var config = KdConfig.findOne({_id: 'listenersCount'});
  var timelineCount = (config && config.count) ? config.count : 0;

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

    var dataObj = {
      browserId: browserId,
      clientId: clientId,
      type: 'timeEvents',
      timestamp: new Date(),
      data: JSON.stringify(data)
    };

    if(browserId && clientId) {
      // update data to DB
      KdData.insert(dataObj);
    }
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

    var accessToken = Random.id(4);
    KdConfig.update(
      { _id: 'accessTokens' },
      { $addToSet: {tokens: accessToken} },
      { upsert: true }
    );

    return accessToken;
  },

  'kadira.debug.remote.reset': function() {
    KadiraDebug._authorize('remote');
    resetKdDbConfig();
    traceStore.reset();
  }
});

KadiraDebug._authorize = function(type, sessionId) {
  if(AppConfig.env === 'development') {
    return true;
  }

  if(!sessionId) {
    var kadiraInfo = Kadira._getInfo();
    var sessionId = kadiraInfo.session;
  }

  var docId = type + 'AuthorizedSessions';
  var validSession = !!KdConfig.findOne({_id: docId, sessions: {$in: [sessionId]}});
  
  if(validSession) {
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
  KdData.remove({});
}
