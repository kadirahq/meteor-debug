Tinytest.addAsync(
'Server - Integration - connect and receive timeline updates', 
function(test, done) {
  var browserId = "bid";
  var clientId = "cid";
  var data = {aa: 10};

  var receiver = GetConn();
  var sender = GetConn();
  var coll = new Mongo.Collection('kdTimeline', {connection: receiver});

  var observeHandle = coll.find().observe({
    added: function(doc) {
      test.equal(_.omit(doc, '_id'), {
        browserId: browserId,
        clientId: clientId,
        data: data
      });
      sender.disconnect();
      receiver.disconnect();
      done();
    }
  });

  Meteor.wrapAsync(receiver.subscribe, receiver)('kadira.debug.timeline');
  sender.call('kadira.debug.updateTimeline', browserId, clientId, data);
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
    var sessionId = 'sid';
    var browserId = 'bid';
    var clientId = 'cid';

    var sender = GetConn();
    var receiver = GetConn();

    Meteor.wrapAsync(receiver.subscribe, receiver)('kadira.debug.init', clientId, browserId);

    // build the trace
    // var session = {id: 'sid'};
    // var sampleTrace = {
    //   _id: "HvnxHFEBb3YzCT5Tg::sid",
    //   _lastEventId: null,
    //   at: 1439281811540,
    //   errored: false,
    //   events: [{0: "start", 1: 0}],
    //   id: "bidcid",
    //   isEventsProcessed: true,
    //   metrics: {
    //     compute: 2,
    //     db: 3,
    //     total: 5,
    //     wait: 0
    //   },
    //   name: "aaa",
    //   session: "HvnxHFEBb3YzCT5Tg",
    //   type: "pubsub",
    //   userId: null
    // };

    // receiver.traceStore._onSubTrace(sampleTrace, session);

    // get trace
    var type = 'pubsub';
    var id = 'bidcid';

    // Unless the method check is failed, this test will not fail.
    var trace = sender.call('kadira.debug.getTrace', browserId, clientId, type, id);
    done();
  }
);

function GetConn() {
  return DDP.connect(process.env.ROOT_URL);
}

