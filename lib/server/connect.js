KadiraDebug = KadiraDebug || {};
var UAParser = Npm.require('ua-parser-js');

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

var KdData= new KdDataLayer({serverId: serverId});

var traceStore = new TraceStore({kdData: KdData});
traceStore.start();

// Observers: KdConfig/listenersCount
KdData.configColl.find({_id: 'listenersCount'}).observeChanges({
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

// Observers: KdTimeEvents/serverTimeEvents
KdData.timeEventsColl.find().observeChanges({
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

    KdData.registerSession('remote', sessionId);
  }

  this.onStop(function() {
    if(AppConfig.env === 'production') {
      KdData.unregisterSession('remote', sessionId);
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
  KdData.setListenersCount(1);

  sub.onStop(function() {
    var index = SubHandlers.timeline.indexOf(sub);
    SubHandlers.timeline.splice(index, 1);

    // decrement listenersCount in DB
    KdData.setListenersCount(-1);
  });
});

Meteor.publish('kadira.debug.client.auth', function(accessToken) {
  check(accessToken, Match.Any);

  // We need to check the accessToken in the production mode only.
  // On development mode we don't need these checks.
  if(AppConfig.env === 'production') {

    if(!KdData.isValidToken(accessToken)) {
      throw new Meteor.Error('401', 'Unauthorized.');
    }

    // authorize client session
    var kadiraInfo = Kadira._getInfo();
    var sessionId = kadiraInfo.session;

    KdData.registerSession('client', sessionId);
  }

  this.onStop(function() {
    if(AppConfig.env === 'production') {
      KdData.unregisterSession('client', sessionId);
    }
  });

  this.ready();
});

Meteor.publish('kadira.debug.client.listeners', function() {
  KadiraDebug._authorize('client');

  var sub = this;

  var timelineCount = KdData.getListenersCount();

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
      KdData.setTimeEvent(dataObj);
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

    var token = Random.id(4);
    KdData.registerAccessToken(token);

    return token;
  },

  'kadira.debug.remote.reset': function() {
    KadiraDebug._authorize('remote');
    KdData.reset();
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
  
  if(KdData.isValidSession(type, sessionId)) {
    return true;
  } else {
    throw new Meteor.Error('401', 'Unauthorized.');
  }
};
