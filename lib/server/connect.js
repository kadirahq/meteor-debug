var AppConfig = {
  appId: __meteor_runtime_config__.kadira.appId,
  env: getAppEnv(),
  authKey: getDebugAuthKey(),
  accessToken: generateAccessToken()
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

  if(AppConfig.env === "production") {
    if(accessToken !== AppConfig.accessToken) {
      // If the subcription request with invalid accessToken
      // return without initiate subscription
      return;
    }  
  }

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

Meteor.methods({
  'kadira.debug.updateTimeline': function(browserId, clientId, data) {
    check(browserId, String);
    check(clientId, String);
    check(data, Object);

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

  'kadira.debug.getAccessToken': function(authKey) {
    check(authKey, String);

    var appEnv = false;
    var accessToken = null;
    
    if(AppConfig.authKey === authKey) {
      appEnv = AppConfig.env;
      accessToken = AppConfig.accessToken;
    }

    var retObj = {
      env: appEnv,
      access_token: accessToken
    }

    return retObj;
  }
});

Meteor.publish('kadira.debug.timeline', function(appId, accessToken) {
  if(AppConfig.env === "production") {
    if(!appId || (appId !== AppConfig.appId) || 
      !accessToken || (accessToken !== AppConfig.accessToken)) {
        // if any of argument inavid or not set,
        // return without proceed.
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
  var processArgv = process.argv;

  var env = "development";
  var patt = new RegExp(/(.meteor\/packages\/meteor-tool)/g);
  if(!patt.test(processArgv)) {
    env = "production";
  }

  return env;
}

function getDebugAuthKey() {
  // var authKey = process.env.KADIRA_DEBUG_AUTH_KEY || null;
  var authKey = process.env.KADIRA_DEBUG_AUTH_KEY || "authKey";
  return authKey;
}

function generateAccessToken() {
  var str = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for( var i=0; i < 4; i++ )
    str += possible.charAt(Math.floor(Math.random() * possible.length));
  
  return str;
}

function updateListenersCount() {
  SubHandlers.listeners.forEach(function(sub) {
    var timelineCount = SubHandlers.timeline.length;
    sub.changed('kdInfo', 'listeners-count', {count: timelineCount});
  });
}