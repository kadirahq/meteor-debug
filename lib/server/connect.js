var LRUCache = Npm.require('lru-cache');

AppConfig = {
  env: Utils.getAppEnv(),
  authKey: Utils.getDebugAuthKey(),
  accessTokens: new LRUCache({max: 1000}),
  _authorizedSessions: {
    client: {},
    remote: {}
  }
};

var UAParser = Npm.require('ua-parser-js');
// Remove `Kadira.aa` once properly connected
var traceStore = Kadira.aa = new TraceStore();
traceStore.start();

SubHandlers = {
  timeline: [],
  listeners: []
};
var uniqueId = 0;
var serverId = Random.id();

// publications

Meteor.publish('kadira.debug.remote.auth', function(authKey) {
  check(authKey, Match.Any);

  if(AppConfig.env === 'production') {
    if(authKey !== AppConfig.authKey) {
      throw new Meteor.Error('401', 'Unauthorized.');
    }

    var kadiraInfo = Kadira._getInfo();
    var sessionId = kadiraInfo.session;

    AppConfig._authorizedSessions.remote[sessionId] = true;
  }

  this.onStop(function() {
    delete AppConfig._authorizedSessions.remote[sessionId];
  });

  this.ready();
});

Meteor.publish('kadira.debug.remote.timeline', function() {

  var kadiraInfo = Kadira._getInfo();

  var isAuthorized = isAuthorizedSession('remote', kadiraInfo);
  if(!isAuthorized) {
    throw new Meteor.Error('401', 'Unauthorized.');
  }

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

  if(AppConfig.env === 'production') {
    if(!AppConfig.accessTokens.has(accessToken)) {
      throw new Meteor.Error('401', 'Unauthorized.');
    }

    var kadiraInfo = Kadira._getInfo();
    var sessionId = kadiraInfo.session;

    AppConfig._authorizedSessions.client[sessionId] = true;
  }

  this.onStop(function() {
    delete AppConfig._authorizedSessions.client[sessionId];
  });

  this.ready();
});

Meteor.publish('kadira.debug.client.listeners', function() {
  var kadiraInfo = Kadira._getInfo();

  var isAuthorized = isAuthorizedSession('client', kadiraInfo);
  if(!isAuthorized) {
    throw new Meteor.Error('401', 'Unauthorized.');
  }

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

  var kadiraInfo = Kadira._getInfo();
  if(kadiraInfo) {
    var sessionId = kadiraInfo.session;

    var isAuthorized = isAuthorizedSession('client', kadiraInfo);
    if(!isAuthorized) {
      throw new Meteor.Error('401', 'Unauthorized.');
    }

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

    var kadiraInfo = Kadira._getInfo();

    var isAuthorized = isAuthorizedSession('client', kadiraInfo);
    if(!isAuthorized) {
      throw new Meteor.Error('401', 'Unauthorized.');
    }

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
    var parser = new UAParser(userAgent);
    return parser.getResult().browser.name;
  },

  'kadira.debug.remote.getTrace': function(browserId, clientId, type, id) {
    check(browserId, String);
    check(clientId, String);
    check(type, String);
    check(id, String);

    return traceStore.getTrace(browserId, clientId, type, id);
  },

  'kadira.debug.remote.getAppEnv': function() {
    return AppConfig.env;
  },

  'kadira.debug.remote.createAccessToken': function() {
    var kadiraInfo = Kadira._getInfo();

    var isAuthorized = isAuthorizedSession('remote', kadiraInfo);
    if(!isAuthorized) {
      throw new Meteor.Error('401', 'Unauthorized.');
    }

    var accessToken = Random.id(4);
    AppConfig.accessTokens.set(accessToken, kadiraInfo.session);

    return accessToken;
  },

  'kadira.debug.remote.reset': function() {
    AppConfig.accessTokens.reset();
    AppConfig._authorizedSessions = {
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

function isAuthorizedSession(type, kadiraInfo) {
  if(AppConfig.env === 'development') {
    return true;
  }

  var sessionId = kadiraInfo.session;
  return AppConfig._authorizedSessions[type][sessionId];
}