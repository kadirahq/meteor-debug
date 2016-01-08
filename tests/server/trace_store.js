var traceStore = new TraceStore({serverId: 1});
traceStore.start();

Tinytest.add(
'Server - TraceStore - registerSession',
function(test) {
  var sessionId = 'sid';
  var browserId = 'bid';
  var clientId = 'cid';

  var expectedSessionMapper = {bidcid: 'sid'};
  traceStore.registerSession(sessionId, browserId, clientId);
  test.equal(traceStore._sessionMapper, expectedSessionMapper);
});

Tinytest.add(
'Server - TraceStore - getTrace (Methods)',
function(test) {
  var sessionId = 'sid';
  var browserId = 'bid';
  var clientId = 'cid';

  traceStore.registerSession(sessionId, browserId, clientId);

  // build trace first
  // sample data
  var session = {id: 'sid'}; // aready registered in the previous test
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
  var type = 'method';
  var id = 'bidcid';

  // expected trace
  var expectedTrace = sampleTrace;
  expectedTrace.startTime = new Date(1439281811540);
  expectedTrace.totalValue = 5;

  var trace = traceStore.getTrace(browserId, clientId, type, id);

  var trace = JSON.stringify(trace);
  var expectedTrace = JSON.stringify(expectedTrace);

  test.equal(trace, expectedTrace);
});

Tinytest.add(
'Server - TraceStore - do not track method traces coming from not registered sessions',
function(test) {
  var sessionId = 'xid';
  var browserId = 'did';
  var clientId = 'eid';

  // build trace first
  // sample data
  var session = {id: 'xid'}; // aready registered in the previous test
  var sampleTrace = {
    _id: "HvnxHFEBb3YzCT5Tg::xid",
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
  var type = 'method';
  var id = 'dideid';

  var trace = traceStore.getTrace(browserId, clientId, type, id);
  test.equal(trace, undefined);
});

Tinytest.add(
'Server - TraceStore - getTrace (PubSub)',
function(test) {
  var sessionId = 'yid';
  var browserId = 'bid';
  var clientId = 'cid';

  traceStore.registerSession(sessionId, browserId, clientId);

  // build trace first
  // sample data
  var session = {id: 'yid'};

  var sampleTrace = {
    _id: "HvnxHFEBb3YzCT5Tg::yid",
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
  var type = 'pubsub';
  var id = 'bidcid';

  // expected trace
  var expectedTrace = sampleTrace;
  expectedTrace.startTime = new Date(1439281811540);
  expectedTrace.totalValue = 5;

  var trace = traceStore.getTrace(browserId, clientId, type, id);
  
  var trace = JSON.stringify(trace);
  var expectedTrace = JSON.stringify(expectedTrace);

  test.equal(trace, expectedTrace);
});

Tinytest.add(
'Server - TraceStore - do not track pubsub traces coming from not registered sessions',
function(test) {
  var sessionId = 'zid';
  var browserId = 'rid';
  var clientId = 'sid';

  // build trace first
  // sample data
  var session = {id: 'zid'};

  var sampleTrace = {
    _id: "HvnxHFEBb3YzCT5Tg::zid",
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
  var type = 'pubsub';
  var id = 'ridsid';

  var trace = traceStore.getTrace(browserId, clientId, type, id);
  test.equal(trace, undefined);
});

Tinytest.add(
  'Server - TraceStore - _buildTrace',
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
'Server - TraceStore - _trackTime',
function(test) {
  var type = "pubsub";
  var sessionId = "sid";
  var id = Random.id();
  var event = "server-received";

  var s = new TraceStore({serverId: 1});
  s._trackTime(type, sessionId, id, event);
  
  var savedItems = s._timeEventsCache.get(sessionId);
  var savedItem = savedItems.times[0];
  var expectedItem = {
    type: type,
    id: id, 
    event: event
  };
  test.equal(_.omit(savedItem, 'timestamp'), expectedItem);
});

Tinytest.add(
'Server - TraceStore - _trackTime with info',
function(test) {
  var type = "pubsub";
  var sessionId = "sid";
  var id = Random.id();
  var event = "server-received";
  var info = {name: "aa-10"};

  var s = new TraceStore({serverId: 1});
  s._trackTime(type, sessionId, id, event, info);
  
  var savedItems = s._timeEventsCache.get(sessionId);
  var savedItem = savedItems.times[0];
  var expectedItem = {
    type: type,
    id: id, 
    event: event,
    info: info
  };
  test.equal(_.omit(savedItem, 'timestamp'), expectedItem);
});

Tinytest.add(
'Server - TraceStore - _trackTime twice',
function(test) {
  var type = "pubsub";
  var sessionId = "sid";
  var id = Random.id();
  var event = "server-received";

  var s = new TraceStore({serverId: 1});
  s._trackTime(type, sessionId, id, event);
  s._trackTime(type, sessionId, id, event);
  
  var expectedItem = {
    type: type,
    id: id, 
    event: event
  };
  var savedItems = s._timeEventsCache.get(sessionId);
  var savedItem1 = savedItems.times[0];
  var savedItem2 = savedItems.times[1];

  test.equal(_.omit(savedItem1, 'timestamp'), expectedItem);
  test.equal(_.omit(savedItem2, 'timestamp'), expectedItem);
});

Tinytest.add(
'Server - TraceStore - pickTimeEvents',
function(test) {
  var clientId = "clientId";
  var browserId = "browserId";

  var type = "pubsub";
  var sessionId = "sid";
  var id = Random.id();
  var event = "server-received";

  var s = new TraceStore({serverId: 1});
  s.registerSession(sessionId, browserId, clientId);

  var expectedItem = {
    type: type,
    id: id, 
    event: event
  };

  s._trackTime(type, sessionId, id, event);
  s._trackTime(type, sessionId, id, event);
  
  var savedItems = s.pickTimeEvents(browserId, clientId);
  var savedItem1 = savedItems[0];
  var savedItem2 = savedItems[1];

  test.equal(_.omit(savedItem1, 'timestamp'), expectedItem);
  test.equal(_.omit(savedItem2, 'timestamp'), expectedItem);
  test.isFalse(s._timeEventsCache.has(sessionId));
});

Tinytest.add(
'Server - TraceStore - unregisterSession',
function(test) {
  var browserId = 'bid';
  var clientId = 'cid';

  traceStore.unregisterSession(browserId, clientId);
  test.equal(traceStore._sessionMapper, {});
});