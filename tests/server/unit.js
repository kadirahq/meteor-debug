var traceStore = new TraceStore();
traceStore.start();

Tinytest.add(
'Server - Unit - TraceStore - registerSession',
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
  var session = {id: 'sid'};
  var sampleTrace = {
    _id: "HvnxHFEBb3YzCT5Tg::sid",
    _lastEventId: null,
    at: 1439281811540,
    errored: false,
    events: [{0: "start", 1: 0}],
    id: "bidcid",
    isEventsProcessed: true,
    metrics: {
      compute: 2,
      db: 3,
      total: 5,
      wait: 0
    },
    name: "aaa",
    session: "HvnxHFEBb3YzCT5Tg",
    type: "method",
    userId: null
  };

  traceStore._onMethodTrace(sampleTrace, session);

  // get traces
  var browserId = 'bid';
  var clientId = 'cid';
  var type = 'method';
  var id = 'bidcid';

  // expected trace
  var expectedTrace = sampleTrace;
  expectedTrace.startTime = new Date();
  expectedTrace.totalValue = 5;

  var trace = traceStore.getTrace(browserId, clientId, type, id);

  var trace = JSON.stringify(trace);
  var expectedTrace = JSON.stringify(expectedTrace);

  test.equal(trace, expectedTrace);
});

Tinytest.add(
'Server - Unit - TraceStore - getTrace (PubSub)',
function(test) {
  // build trace first
  // sample data
  var session = {id: 'sid'};

  var sampleTrace = {
    _id: "HvnxHFEBb3YzCT5Tg::sid",
    _lastEventId: null,
    at: 1439281811540,
    errored: false,
    events: [{0: "start", 1: 0}],
    id: "bidcid",
    isEventsProcessed: true,
    metrics: {
      compute: 2,
      db: 3,
      total: 5,
      wait: 0
    },
    name: "aaa",
    session: "HvnxHFEBb3YzCT5Tg",
    type: "pubsub",
    userId: null
  };

  traceStore._onSubTrace(sampleTrace, session);

  // get trace
  var browserId = 'bid';
  var clientId = 'cid';
  var type = 'pubsub';
  var id = 'bidcid';

  // expected trace
  var expectedTrace = sampleTrace;
  expectedTrace.startTime = new Date();
  expectedTrace.totalValue = 5;

  var trace = traceStore.getTrace(browserId, clientId, type, id);
  
  var trace = JSON.stringify(trace);
  var expectedTrace = JSON.stringify(expectedTrace);

  test.equal(trace, expectedTrace);
});

Tinytest.add(
  'Server - Unit - TraceStore - _buildTrace',
  function(test) {

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
      type: "pubsub",
      userId: null
    };

    var expectedTrace = {
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
      type: "pubsub",
      userId: null,
      startTime: "2015-08-11T08:30:11.540Z",
      totalValue: 5
    };

    var trace = traceStore._buildTrace(sampleTrace);
    
    var trace = JSON.stringify(trace);
    var expectedTrace = JSON.stringify(expectedTrace);

    test.equal(trace, expectedTrace);
  }
);

Tinytest.add(
'Server - Unit - TraceStore - unregisterSession',
function(test) {
  var browserId = 'bid';
  var clientId = 'cid';

  traceStore.unregisterSession(browserId, clientId);
  test.equal(traceStore._sessionMapper, {});
});