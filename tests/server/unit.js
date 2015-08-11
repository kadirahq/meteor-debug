var traceStore = new TraceStore();
traceStore.start();

Tinytest.add(
'Server - Unit - TraceStore - registerSession / unregisterSession',
function(test) {
  var sessionId = 'sid';
  var browserId = 'bid';
  var clientId = 'cid';

  var expectedSessionMapper = {bidcid: 'sid'};
  traceStore.registerSession(sessionId, browserId, clientId);
  test.equal(traceStore._sessionMapper, expectedSessionMapper);
});

Tinytest.add(
'Server - Unit - TraceStore - getTrace (Method)',
function(test) {
  // build trace first
  // sample data
  var session = {id: 'bidcid'};
  var sampleTrace = {
    _id: "HvnxHFEBb3YzCT5Tg::sid",
    _lastEventId: null,
    at: 1439281811540,
    errored: false,
    events: [{0: "start", 1: 0}],
    id: "sid",
    isEventsProcessed: true,
    metrics: {
      compute: 2,
      db: 3,
      total: 5,
      wait: 0
    },
    name: "aaa",
    session: "HvnxHFEBb3YzCT5Tg",
    startTime: "Tue Aug 11 2015 14:00:11 GMT+0530 (IST)",
    totalValue: 5,
    type: "method",
    userId: null
  };

  traceStore._onMethodTrace(session, sampleTrace);

  // get traces
  var browserId = 'bid';
  var clientId = 'cid';
  var type = 'method';
  var id = 'bidcid';

  var trace = traceStore.getTrace(browserId, clientId, type, id);
  test.isNotUndefined(trace);
});

Tinytest.add(
'Server - Unit - TraceStore - getTrace (PubSub)',
function(test) {
  // build trace first
  // sample data
  var session = {id: 'bidcid'};

  var sampleTrace = {
    _id: "HvnxHFEBb3YzCT5Tg::sid",
    _lastEventId: null,
    at: 1439281811540,
    errored: false,
    events: [{0: "start", 1: 0}],
    id: "sid",
    isEventsProcessed: true,
    metrics: {
      compute: 2,
      db: 3,
      total: 5,
      wait: 0
    },
    name: "aaa",
    session: "HvnxHFEBb3YzCT5Tg",
    startTime: "Tue Aug 11 2015 14:00:11 GMT+0530 (IST)",
    totalValue: 5,
    type: "pubsub",
    userId: null
  };

  traceStore._onSubTrace(session, sampleTrace);

  // get trace
  var browserId = 'bid';
  var clientId = 'cid';
  var type = 'pubsub';
  var id = 'bidcid';

  var trace = traceStore.getTrace(browserId, clientId, type, id);
  test.isNotUndefined(trace);
});

Tinytest.add(
'Server - Unit - TraceStore - unregisterSession',
function(test) {
  var browserId = 'bid';
  var clientId = 'cid';

  traceStore.unregisterSession(browserId, clientId);
  test.equal(traceStore._sessionMapper, {});
});
