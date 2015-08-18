var LRUCache = Npm.require('lru-cache');

TraceStore = function() {
  this._sessionMapper = {};

  this._onMethodTrace = this._onMethodTrace.bind(this);
  this._onSubTrace = this._onSubTrace.bind(this);

  this._methodTraces = new LRUCache({max: 1000});
  this._subTraces = new LRUCache({max: 1000});
};

TraceStore.prototype.registerSession = function(sessionId, browserId, clientId) {
  var key = this._getClientKey(browserId, clientId);
  this._sessionMapper[key] = sessionId;
};

TraceStore.prototype.unregisterSession = function(browserId, clientId) {
  var key = this._getClientKey(browserId, clientId);
  delete this._sessionMapper[key];
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

  var traceKey = this._getTraceKey(sessionId, id);
  if(type === "method") {
    return this._methodTraces.get(traceKey);
  } else if(type === "pubsub") {
    return this._subTraces.get(traceKey);
  } else {
    throw new Meteor.Error(400, "Invalid trace type: " + type);
  }
};

TraceStore.prototype._onMethodTrace = function(trace, session) {
  // We don't need to track Kadira Debug ping method
  if(trace && trace.name === "kadira.debug.updateTimeline") {
    return;
  }
  this._buildTrace(trace);

  var key = this._getTraceKey(session.id, trace.id);
  this._methodTraces.set(key, trace);
};

TraceStore.prototype._onSubTrace = function(trace, session) {
  // here, trace can be empty
  if(trace) {
    this._buildTrace(trace);
    var key = this._getTraceKey(session.id, trace.id);
    this._subTraces.set(key, trace);
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