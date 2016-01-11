var LRUCache = Npm.require('lru-cache');

Tinytest.addAsync(
'Server - Integration - connect and receive timeline updates', 
function(test, done) {
  resetAppConfig();

  var receiver = GetConn();
  var sender = GetConn();
  var coll = new Mongo.Collection('kdTimeline', {connection: receiver});

  var serverId = null;

  var checkData = _.once(function(doc) {
    test.equal(typeof doc.browserId, 'string');
    test.equal(typeof doc.clientId, 'string');
    test.isTrue(doc.data.timestamp <= Date.now());
    test.isTrue(doc.data.times.length > 0);

    serverId = doc.data.serverId;
    test.equal(typeof serverId, 'string');

    // checking whether we tracked time related errors on the server side
    var trackedMethodTimes = false;
    var trackInfo = false;

    doc.data.times.forEach(function(item) {
      if(item.type === 'pubsub' && item.event === 'server-processed') {
        trackedMethodTimes = true;
      }

      if(item.event === 'server-received') {
        trackInfo = typeof item.info.name === 'string';
      }
    });
    
    test.isTrue(trackedMethodTimes);
    test.isTrue(trackInfo);

    sender.disconnect();
    receiver.disconnect();
    done();
  });

  var observeHandle = coll.find().observe({
    added: checkData
  });

  Meteor.wrapAsync(receiver.subscribe, receiver)('kadira.debug.remote.timeline');
  // This is a just a dummy call to make sure we get everything
  sender.call('kadira.debug.remote.getTrace', "bid", "cid", "pubsub", "not-existing-id");
});

Tinytest.addAsync(
'Server - Integration - remove timeline sub handle after disconnected', 
function(test, done) {
  var receiver = GetConn();
  Meteor.wrapAsync(receiver.subscribe, receiver)('kadira.debug.remote.timeline');

  var startTimelineCount = SubHandlers.timeline.length;
  receiver.disconnect();

  Meteor._sleepForMs(300);

  Meteor.setTimeout(function() {
    var diffCount =  startTimelineCount - SubHandlers.timeline.length;
    test.equal(diffCount, 1);
    receiver.disconnect();
    done();
  });
});

Tinytest.addAsync(
'Server - Integration - get timeline listner count initially', 
function(test, done) {
  var timelineReceiver = GetConn();
  var listersCountReceiver = GetConn();
  Meteor.wrapAsync(timelineReceiver.subscribe, timelineReceiver)('kadira.debug.remote.timeline');

  var coll = new Mongo.Collection('kdInfo', {connection: listersCountReceiver});
  Meteor.wrapAsync(listersCountReceiver.subscribe, listersCountReceiver)('kadira.debug.client.listeners');

  test.isTrue(coll.findOne({_id: 'listeners-count'}).count > 0);
  timelineReceiver.disconnect();
  listersCountReceiver.disconnect();
  done();
});

Tinytest.addAsync(
'Server - Integration - get timeline listner count when add/remove timelines', 
function(test, done) {
  var timelineReceiver = GetConn();
  var listersCountReceiver = GetConn();
  Meteor.wrapAsync(timelineReceiver.subscribe, timelineReceiver)('kadira.debug.remote.timeline');

  var coll = new Mongo.Collection('kdInfo', {connection: listersCountReceiver});
  Meteor.wrapAsync(listersCountReceiver.subscribe, listersCountReceiver)('kadira.debug.client.listeners');

  var firstCount = coll.findOne({_id: 'listeners-count'}).count;

  // disconnect and count again
  timelineReceiver.disconnect();
  Meteor.setTimeout(function() {
    var diffCount = firstCount - coll.findOne({_id: 'listeners-count'}).count;
    test.equal(diffCount, 1);
    listersCountReceiver.disconnect();
    done();
  }, 200);
});

Tinytest.addAsync(
  'Server - Integration - getTrace',
  function(test, done) {
    var browserId = 'bid';
    var clientId = 'cid';

    var sender = GetConn();
    Meteor.wrapAsync(sender.subscribe, sender)('kadira.debug.client.init', browserId, clientId);
    sender.call('kadira.debug.remote.getTrace', browserId, clientId, 'method', '0');
    var trace = sender.call('kadira.debug.remote.getTrace', browserId, clientId, 'method', '1');

    test.isNotUndefined(trace);
    test.equal(trace.id, "1");
    done();
  }
);

Tinytest.addAsync(
  'Server - Integration - Access Token Management - create and success',
  function(test, done) {
    resetAppConfig();

    AppConfig.authKey = 'authKeyXX';
    AppConfig.env = 'production';

    var receiver = GetConn();

    Meteor.setTimeout(function() {
      receiver.subscribe('kadira.debug.remote.auth', AppConfig.authKey, {
        onReady: function () {
          var token = receiver.call('kadira.debug.remote.createAccessToken');
          token = (token) ? true : false;
          test.equal(token, true);

          var doc = KdData.configColl.findOne({_id: 'accessTokens'});
          test.equal(doc.tokens.length, 1);

          receiver.disconnect();
          done();
        }
      });
    }, 200);
  }
);

Tinytest.addAsync(
  'Server - Integration - Access Token Management - create and failed when invalid auth key',
  function(test, done) {
    resetAppConfig();

    AppConfig.authKey = 'authKey';
    AppConfig.env = 'production';

    var receiver = GetConn();
    
    try {
      var token = receiver.call('kadira.debug.remote.createAccessToken');
    } catch(err) {
      var token = false;
    }

    test.equal(token, false);

    var count = KdData.configColl.find({_id: 'accessTokens'}).count();
    test.equal(count, 0);

    receiver.disconnect();
    done();
  }
);

Tinytest.addAsync(
  'Server - Integration - Authentication based on authKey - success',
  function(test, done) {
    resetAppConfig();

    AppConfig.authKey = 'authKey';
    AppConfig.env = 'production';

    var receiver = GetConn();

    var count = KdData.configColl.find({_id: 'remoteAuthorizedSessions'}).count();
    test.equal(count, 0);

    Meteor.setTimeout(function() {
      var handler = receiver.subscribe('kadira.debug.remote.auth', AppConfig.authKey, {
        onReady: function () {
          var authSessionsDoc = KdData.configColl.findOne({_id: 'remoteAuthorizedSessions'});
          test.equal(authSessionsDoc.sessions.length, 1);

          // delete the code when the publication stops
          handler.stop();
          Meteor._sleepForMs(100);

          var authSessionsDoc = KdData.configColl.findOne({_id: 'remoteAuthorizedSessions'});
          test.equal(authSessionsDoc.sessions.length, 0);

          receiver.disconnect();
          done();
        }
      });
    }, 200);
  }
);

Tinytest.addAsync(
  'Server - Integration - Authentication based on authKey - failed',
  function(test, done) {
    resetAppConfig();

    AppConfig.authKey = 'authKey';
    AppConfig.env = 'production';

    var receiver = GetConn();
    var sender = GetConn();

    var count = KdData.configColl.find({_id: 'remoteAuthorizedSessions'}).count();
    test.equal(count, 0);

    Meteor.setTimeout(function() {
      receiver.subscribe('kadira.debug.remote.auth', 'fakeKey', {
        onError: function () { 
          var count = KdData.configColl.find({_id: 'remoteAuthorizedSessions'}).count();
          test.equal(count, 0);
          
          sender.disconnect();
          receiver.disconnect();
          done();
        }
      });
    }, 200);
  }
);

Tinytest.addAsync(
  'Server - Integration - Authorize based on the auth key - on development',
  function(test, done) {
    resetAppConfig();

    AppConfig.env = 'development';
    var authorized = KadiraDebug._authorize('client');
    test.equal(authorized, true);

    done();
  }
);

Tinytest.addAsync(
  'Server - Integration - Authorize based on the auth key - if the session authorize',
  function(test, done) {
    resetAppConfig();

    AppConfig.authKey = 'authKey';
    AppConfig.env = 'production';

    var receiver = GetConn();
    var sender = GetConn();

    var count = KdData.configColl.find({_id: 'remoteAuthorizedSessions'}).count();
    test.equal(count, 0);

    Meteor.setTimeout(function() {
      receiver.subscribe('kadira.debug.remote.auth', AppConfig.authKey, {
        onReady: function () {
          var authSessionsDoc = KdData.configColl.findOne({_id: 'remoteAuthorizedSessions'});
          test.equal(authSessionsDoc.sessions.length, 1);

          var authSessionsDoc = KdData.configColl.findOne({_id: 'remoteAuthorizedSessions'});
          var sessionId = authSessionsDoc.sessions[0];
          var authorized = KadiraDebug._authorize('remote', sessionId);
          test.equal(authorized, true);

          sender.disconnect();
          receiver.disconnect();
          done();
        }
      });
    }, 200);
  }
);

Tinytest.addAsync(
  'Server - Integration - Authorize based on the auth key - if not the authorized session',
  function(test, done) {
    resetAppConfig();

    AppConfig.authKey = 'authKey';
    AppConfig.env = 'production';

    var receiver = GetConn();
    var sender = GetConn();

    Meteor.setTimeout(function() {
      receiver.subscribe('kadira.debug.remote.auth', AppConfig.authKey, {
        onReady: function () {
          var authSessionsDoc = KdData.configColl.findOne({_id: 'remoteAuthorizedSessions'});
          test.equal(authSessionsDoc.sessions.length, 1);

          var authSessionsDoc = KdData.configColl.findOne({_id: 'remoteAuthorizedSessions'});
          var sessionId = authSessionsDoc.sessions[0];

          try {
            var authorized = KadiraDebug._authorize('remote', 'fakeId');
          } catch(err) {
            var authorized = false;
          }
          test.equal(authorized, false);

          sender.disconnect();
          receiver.disconnect();
          done();
        }
      });
    }, 200);
  }
);

Tinytest.addAsync(
  'Server - Integration - Authentication based on access token - on development',
  function(test, done) {
    resetAppConfig();

    AppConfig.env = 'development';

    var receiver = GetConn();

    Meteor.setTimeout(function() {
      receiver.subscribe('kadira.debug.client.auth', null, {
        onReady: function () {
          // here, just checking the subscription happens without occuring any error 
          // no authorizedSessions stores because
          // all the development app authorized without checking any credentilas
          var count = KdData.configColl.find({_id: 'clientAuthorizedSessions'}).count();
          test.equal(count, 0);

          receiver.disconnect();
          done();
        }
      });
    }, 200);
  }
);

Tinytest.addAsync(
  'Server - Integration - Authentication based on access token - success',
  function(test, done) {
    resetAppConfig();

    AppConfig.env = 'production';
    KdData.configColl.update(
      { _id: 'accessTokens' }, 
      { $addToSet: {tokens: 'aTaT'} },
      { upsert: true }
    );

    var receiver = GetConn();

    var tokensDoc = KdData.configColl.findOne({_id: 'accessTokens'});
    test.equal(tokensDoc.tokens.length, 1);

    var count = KdData.configColl.find({_id: 'clientAuthorizedSessions'}).count();
    test.equal(count, 0);

    Meteor.setTimeout(function() {
      var handler = receiver.subscribe('kadira.debug.client.auth', 'aTaT', {
        onReady: function () {
          var authSessionsDoc = KdData.configColl.findOne({_id: 'clientAuthorizedSessions'});
          test.equal(authSessionsDoc.sessions.length, 1);

          // delete the code when the publication stops
          handler.stop();
          Meteor._sleepForMs(100);

          var authSessionsDoc = KdData.configColl.findOne({_id: 'clientAuthorizedSessions'});
          test.equal(authSessionsDoc.sessions.length, 0);

          receiver.disconnect();
          done();
        }
      });
    }, 200);
  }
);

Tinytest.addAsync(
  'Server - Integration - Authentication based on access token - failed',
  function(test, done) {
    resetAppConfig();

    AppConfig.env = 'production';
    KdData.configColl.update(
      { _id: 'accessTokens' }, 
      { $addToSet: {tokens: 'aTaT'} },
      { upsert: true }
    );

    var tokensDoc = KdData.configColl.findOne({_id: 'accessTokens'});
    test.equal(tokensDoc.tokens.length, 1);

    var count = KdData.configColl.find({_id: 'clientAuthorizedSessions'}).count();
    test.equal(count, 0);

    var receiver = GetConn();
    var sender = GetConn();

    Meteor.setTimeout(function() {
      receiver.subscribe('kadira.debug.client.auth', 'fakeToken', {
        onError: function () {
          var count = KdData.configColl.find({_id: 'clientAuthorizedSessions'}).count();
          test.equal(count, 0);

          sender.disconnect();
          receiver.disconnect();
          done();
        }
      });
    }, 200);
  }
);

function GetConn() {
  return DDP.connect(process.env.ROOT_URL);
}

function resetAppConfig() {
  AppConfig = {
    env: 'development',
    authKey: null
  };

  KdData.configColl.remove({_id: 'accessTokens'});
  KdData.configColl.remove({_id: 'remoteAuthorizedSessions'});
  KdData.configColl.remove({_id: 'clientAuthorizedSessions'});
}
