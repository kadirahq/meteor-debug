var LRUCache = Npm.require('lru-cache');

AppConfig = {
  env: Utils.getAppEnv(),
  authKey: Utils.getDebugAuthKey(),
  accessTokens: new LRUCache({max: 1000}),
  _authorizedClientSessions: {},
  _authorizedAdminSessions: {}
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

Meteor.publish('kadira.debug.init', function(browserId, clientId, accessToken) {
  check(browserId, String);
  check(clientId, String);
  check(accessToken, Match.Any);

  var kadiraInfo = Kadira._getInfo();
  if(kadiraInfo) {
    var sessionId = kadiraInfo.session;

    if(AppConfig.env === 'production') {
      if(!AppConfig.accessTokens.has(accessToken)) {
        // If the subcription request with an invalid accessToken
        // throw error without proceed
        throw new Meteor.Error('401', 'Unauthorized.');
      }

      AppConfig._authorizedClientSessions[sessionId] = true;
    }

    traceStore.registerSession(sessionId, browserId, clientId);

    this.onStop(function() {
      delete AppConfig._authorizedClientSessions[sessionId];
      traceStore.unregisterSession(browserId, clientId);
    });
  }
  this.ready();
});

Meteor.methods({
  'kadira.debug.updateTimeline': function(browserId, clientId, data) {
    check(browserId, String);
    check(clientId, String);
    check(data, Object);
    
    if(AppConfig.env === 'production') {
      // get session id from kadiraInfo Object
      var kadiraInfo = Kadira._getInfo();
      var sessionId = kadiraInfo.session;

      if(!AppConfig._authorizedClientSessions[sessionId]) {
        // not a valid session
        // return without proceed
        throw new Meteor.Error('401', 'Unauthorized.');
      }
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

  'kadira.debug.getBrowserName': function(userAgent) {
    check(userAgent, String);
    var parser = new UAParser(userAgent);
    return parser.getResult().browser.name;
  },

  'kadira.debug.getTrace': function(browserId, clientId, type, id) {
    check(browserId, String);
    check(clientId, String);
    check(type, String);
    check(id, String);

    return traceStore.getTrace(browserId, clientId, type, id);
  },

  'kadira.debug.getAppEnv': function() {
    return AppConfig.env;
  },

  'kadira.debug.createAccessToken': function() {
    var kadiraInfo = Kadira._getInfo();
    var sessionId = kadiraInfo.session;

    // when invalid auth key
    // return without proceed
    if(!AppConfig._authorizedAdminSessions[sessionId]) {
      throw new Meteor.Error('401', 'Unauthorized.');
    }

    var accessToken = Random.id(4);
    AppConfig.accessTokens.set(accessToken, sessionId);

    return accessToken;
  },

  'kadira.debug.resetAccessToken': function() {
    var kadiraInfo = Kadira._getInfo();
    var sessionId = kadiraInfo.session;

    var accessToken = Random.id(4);
    AppConfig.accessTokens.set(accessToken, sessionId);

    return accessToken;
  },

  'kadira.debug.reset': function() {
    AppConfig.accessTokens.reset();
    AppConfig._authorizedClientSessions = {};
    AppConfig._authorizedAdminSessions = {};
  }
});

Meteor.publish('kadira.debug.timeline', function(authKey) {
  // check authKey only for production apps
  if(AppConfig.env === 'production') {
    if(authKey === AppConfig.authKey) {
      // authorize the session (timeline)
      var kadiraInfo = Kadira._getInfo();
      var sessionId = kadiraInfo.session;

      AppConfig._authorizedAdminSessions[sessionId] = true;
    } else {
      // return when invalid authKey
      throw new Meteor.Error('401', 'Unauthorized.');
    }
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


Meteor.publish('kadira.debug.listeners', function() {
  if(AppConfig.env === 'production') {
    var kadiraInfo = Kadira._getInfo();
    var sessionId = kadiraInfo.session;
    
    if(!AppConfig._authorizedClientSessions[sessionId]) {
      // not a valid session
      // return without proceed
      throw new Meteor.Error('401', 'Unauthorized.');
    }
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

function updateListenersCount() {
  SubHandlers.listeners.forEach(function(sub) {
    var timelineCount = SubHandlers.timeline.length;
    sub.changed('kdInfo', 'listeners-count', {count: timelineCount});
  });
}