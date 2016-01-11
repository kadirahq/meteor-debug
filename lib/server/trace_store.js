var LRUCache = Npm.require('lru-cache');

TraceStore = function(args) {
  this.kdData = args.kdData;

  this._sessionMapper = {};
  this._registeredSessions = {};

  this._onMethodTrace = this._onMethodTrace.bind(this);
  this._onSubTrace = this._onSubTrace.bind(this);

  // This is an measurement to make sure, we won't have a 
  // memory leak in case of something goes wrong.
  this._timeEventsCache = new LRUCache({max: 1000});
};

TraceStore.prototype.registerSession = function(sessionId, browserId, clientId) {
  var key = this._getClientKey(browserId, clientId);
  this._sessionMapper[key] = sessionId;
  // we store registered sessions in a map
  // to keep track for futher uses
  this._registeredSessions[sessionId] = true;
};

TraceStore.prototype.unregisterSession = function(browserId, clientId) {
  var key = this._getClientKey(browserId, clientId);
  var sessionId = this._sessionMapper[key];
  delete this._sessionMapper[key];
  delete this._registeredSessions[sessionId];
};

TraceStore.prototype.start = function() {
  // It's okay call `Kadira._startInstrumenting` multiple times
  Kadira._startInstrumenting(function() {});

  Kadira.EventBus.on('method', 'methodCompleted', this._onMethodTrace);
  Kadira.EventBus.on('pubsub', 'subCompleted', this._onSubTrace);
};

TraceStore.prototype.stop = function() {
  Kadira.EventBus.removeListener('method', 'methodCompleted', this._onMethodTrace);
  Kadira.EventBus.removeListener('pubsub', 'subCompleted', this._onSubTrace);
};

TraceStore.prototype.getTrace = function(browserId, clientId, type, id) {
  var key = this._getClientKey(browserId, clientId);
  var sessionId = this._sessionMapper[key];
  if(!sessionId) {
    return;
  }

  if(type === 'method' || type === 'pubsub') {
    var traceKey = this._getTraceKey(sessionId, id);
    var trace = this.kdData.getTrace(traceKey, type);
    return trace;
  } else {
    throw new Meteor.Error(400, "Invalid trace type: " + type);
  }
};

// Pick all the timevents collection for this client
// Once picked, those data will be removed from the cache
TraceStore.prototype.pickTimeEvents = function(browserId, clientId) {
  var key = this._getClientKey(browserId, clientId);
  var sessionId = this._sessionMapper[key];

  if(!this._timeEventsCache.has(sessionId)) {
    return [];
  }

  var cacheItem = this._timeEventsCache.get(sessionId);
  this._timeEventsCache.del(sessionId);

  return cacheItem.times;
};

TraceStore.prototype.reset = function() {
  this._sessionMapper = {};
  this._registeredSessions = {};
  
  this._timeEventsCache.reset();
};

/*
  Tracks time related metrics for DDP messages 
  (but possible for others as well)

  @param type - type of the message (pubsub, method)
  @param id - sessionId of the message
  @param id - id of the message
  @param event - event we are tracking the time (eg:- start, end)
  @timestamp [optional] - timestamp of the event in milliseconds
  @info [optional] - an object containing some special information
*/
TraceStore.prototype._trackTime = function(type, sessionId, id, event, timestamp, info) {
  if(typeof timestamp === "object") {
    info = timestamp;
    timestamp = null;
  }

  timestamp = timestamp || Date.now();
  if(!this._timeEventsCache.has(sessionId)) {
    this._timeEventsCache.set(sessionId, {times: []});
  }

  var item = {
    type: type,
    id: id,
    event: event,
    timestamp: timestamp
  };

  if(info) {
    item.info = info;
  }

  this._timeEventsCache.get(sessionId).times.push(item);
};

TraceStore.prototype._onMethodTrace = function(trace, session) {
  if(!this._registeredSessions[session.id]) {
    // not a valid session,
    // return without building a trace
    return;    
  }

  // We don't need to track Kadira Debug ping method
  if(trace && trace.name === "kadira.debug.client.updateTimeline") {
    return;
  }
  this._buildTrace(trace);

  var key = this._getTraceKey(session.id, trace.id);
  this.kdData.setTrace(key, 'method', trace);

  this._trackTraceTimes('method', session.id, trace);
};

TraceStore.prototype._onSubTrace = function(trace, session) {
  if(!this._registeredSessions[session.id]) {
    // not a valid session,
    // return without building a trace
    return;    
  }

  // here, trace can be empty
  if(trace) {
    this._buildTrace(trace);

    var key = this._getTraceKey(session.id, trace.id);
    this.kdData.setTrace(key, 'pubsub', trace);

    this._trackTraceTimes('pubsub', session.id, trace);
  }
};

TraceStore.prototype._getTraceKey = function(session, traceId) {
  return session + traceId;
};

TraceStore.prototype._getClientKey = function(browserId, clientId) {
  return browserId + clientId;
};

// We need alter the tracer to make it compatible with the format
// tracer viewer accepts.
TraceStore.prototype._buildTrace = function(trace) {
  trace.startTime = new Date(trace.at);
  if(trace && trace.metrics && trace.metrics.total) {
    trace.totalValue = trace.metrics.total;
  }

  return trace;
};

TraceStore.prototype._trackTraceTimes = function(type, sessionId, trace) {
  var info = {name: trace.name};
  this._trackTime(type, sessionId, trace.id, 'server-received', trace.at, info);
  this._trackTime(type, sessionId, trace.id, 'server-waitend', trace.at + trace.metrics.wait);
  this._trackTime(type, sessionId, trace.id, 'server-processed', trace.at + trace.metrics.total);
};
