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

      if(item.type === "method" && item.id === "1" && item.event === "server-processed") {
        trackedMethodTimes = true;
      }

      if(item.event === "server-received") {
        trackInfo = typeof item.info.name === "string";
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

  Meteor.wrapAsync(receiver.subscribe, receiver)('kadira.debug.timeline');
  // This is a just a dummy call to make sure we get everything
  sender.call('kadira.debug.getTrace', "bid", "cid", "pubsub", "not-existing-id");
});

Tinytest.addAsync(
'Server - Integration - remove timeline sub handle after disconnected', 
function(test, done) {
  var receiver = GetConn();
  Meteor.wrapAsync(receiver.subscribe, receiver)('kadira.debug.timeline');

  var startTimelineCount = SubHandlers.timeline.length;
  receiver.disconnect();

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
  Meteor.wrapAsync(timelineReceiver.subscribe, timelineReceiver)('kadira.debug.timeline');

  var coll = new Mongo.Collection('kdInfo', {connection: listersCountReceiver});
  Meteor.wrapAsync(listersCountReceiver.subscribe, listersCountReceiver)('kadira.debug.listeners');

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
  Meteor.wrapAsync(timelineReceiver.subscribe, timelineReceiver)('kadira.debug.timeline');

  var coll = new Mongo.Collection('kdInfo', {connection: listersCountReceiver});
  Meteor.wrapAsync(listersCountReceiver.subscribe, listersCountReceiver)('kadira.debug.listeners');

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
    Meteor.wrapAsync(sender.subscribe, sender)('kadira.debug.init', browserId, clientId);
    sender.call('kadira.debug.getTrace', browserId, clientId, "method", "0");
    var trace = sender.call('kadira.debug.getTrace', browserId, clientId, "method", "1");

    test.isNotUndefined(trace);
    test.equal(trace.id, "1");
    done();
  }
);

Tinytest.addAsync(
  'Server - Integration - createAccessToken',
  function(test, done) {
    var browserId = 'bid';
    var clientId = 'cid';

    var authKey = "tempAuthKey";
    AppConfig.authKey = authKey;
    AppConfig.env = "production"

    var receiver = GetConn();
    Meteor.wrapAsync(receiver.subscribe, receiver)('kadira.debug.timeline', authKey);
    
    var token = receiver.call('kadira.debug.createAccessToken', authKey);
    test.isNotUndefined(token);
    var tokenKey = authKey + '_' + token;
    test.equal(token, AppConfig.accessToken.get(tokenKey));
    done();
  }
);

function GetConn() {
  return DDP.connect(process.env.ROOT_URL);
}

function resetAppConfig() {
  var LRUCache = Npm.require('lru-cache');
  
  AppConfig = {
    env: "development",
    authKey: null,
    accessToken: new LRUCache({max: 1000}),
    _authorizedClientSessions: {},
    _authorizedServerSessions: {}
  };
}