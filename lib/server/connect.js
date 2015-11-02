var LRUCache = Npm.require('lru-cache');

AppConfig = {
  env: getAppEnv(),
  authKey: getDebugAuthKey(),
  accessToken: new LRUCache({max: 1000}),
  _authorizedSessions: {}
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
      var tokenKey = AppConfig.authKey + '_' + accessToken;
      if(AppConfig.accessToken.get(tokenKey) !== accessToken) {
        // If the subcription request with an invalid accessToken
        // return without subscribe
        return;
      }

      AppConfig._authorizedSessions[sessionId] = true;
    }

    traceStore.registerSession(sessionId, browserId, clientId);

    this.onStop(function() {
      delete AppConfig._authorizedSessions[sessionId];
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

      if(!AppConfig._authorizedSessions[sessionId]) {
        // not a valid session
        // return without proceed
        return;
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

  'kadira.debug.createAccessToken': function(authKey) {
    // when invalid auth key
    // return without proceed
    if(authKey !== AppConfig.authKey) {
      throw new Meteor.Error("Unauthorized");
      return;
    }

    var accessToken = generateToken(4);
    var tokenKey = authKey + '_' + accessToken;
    AppConfig.accessToken.set(tokenKey, accessToken);

    return accessToken;
  },

  'kadira.debug.reset': function() {
    AppConfig.accessToken.reset();
    AppConfig._authorizedSessions = {};
  }
});

Meteor.publish('kadira.debug.timeline', function(authKey) {
  // check authKey only for production apps
  if(AppConfig.env === 'production') {
    if(authKey === AppConfig.authKey) {
      // authorize the session (timeline)
      var kadiraInfo = Kadira._getInfo();
      var sessionId = kadiraInfo.session;

      AppConfig._authorizedSessions[sessionId] = true;
    } else {
      // return when invalid authKey
      return;
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

function getAppEnv() {
  var env = 'development';
  if(!Package['kadira:runtime-dev']) {
    env = 'production';
  }
  return env;
}

function getDebugAuthKey() {
  var authKey = process.env.KADIRA_DEBUG_AUTH_KEY || null;
  return authKey;
}

function generateToken(length) {
  var str = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for( var i=0; i < length; i++ )
    str += possible.charAt(Math.floor(Math.random() * possible.length));
  
  return str;  
}

function updateListenersCount() {
  SubHandlers.listeners.forEach(function(sub) {
    var timelineCount = SubHandlers.timeline.length;
    sub.changed('kdInfo', 'listeners-count', {count: timelineCount});
  });
}