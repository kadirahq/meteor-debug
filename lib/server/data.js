KdDataLayer = function(args) {
  this._serverId = args.serverId;
  this._docID = {
    'client': 'clientAuthorizedSessions',
    'remote': 'remoteAuthorizedSessions',
  }

  this.configColl = new Mongo.Collection('__kdconfig');
  this.timeEventsColl = new Mongo.Collection('__kdtimeevents');
  this.timeEventsColl._createCappedCollection(52428800); // 50 MB
  this.tracesColl = new Mongo.Collection('__kdtraces');
  this.tracesColl._createCappedCollection(52428800); // 50 MB
};

KdDataLayer.prototype.registerAccessToken = function(accessToken) {
  this.configColl.update(
    { _id: 'accessTokens' },
    { $addToSet: {tokens: accessToken} },
    { upsert: true }
  );
};

KdDataLayer.prototype.isValidToken = function(accessToken) {
  return !!this.configColl.findOne({
    _id: 'accessTokens', 
    tokens: { $in: [accessToken] }
  });
};

KdDataLayer.prototype.registerSession = function(type, sessionId) {
  this.configColl.update(
    {_id: this._docID[type]},
    { $addToSet: {sessions: sessionId} },
    { upsert: true }
  );
};

KdDataLayer.prototype.isValidSession = function(type, sessionId) {
  return !!this.configColl.findOne({
    _id: this._docID[type], 
    sessions: {$in: [sessionId]}
  });
};

KdDataLayer.prototype.unregisterSession = function(type, sessionId) {
  var docID = {
    'client': 'clientAuthorizedSessions',
    'remote': 'remoteAuthorizedSessions',
  }

  this.configColl.update(
    {_id: docID[type]},
    { $pull: {sessions: sessionId} }
  );
};

KdDataLayer.prototype.setListenersCount = function(val) {
  this.configColl.update(
    { _id: 'listenersCount' },
    { $inc: {count: val}},
    { upsert: true }
  );
};

KdDataLayer.prototype.getListenersCount = function() {
  var config = this.configColl.findOne({_id: 'listenersCount'});
  var timelineCount = (config && config.count) ? config.count : 0;
  return timelineCount;
};

KdDataLayer.prototype.setTimeEvent = function(data) {
  this.timeEventsColl.insert(data);
}

KdDataLayer.prototype.setTrace = function(key, type, trace) {
  this.tracesColl.update(
    { _id: key},
    { 
      serverId: this._serverId, 
      type: type, 
      data: JSON.stringify(trace) 
    },
    { upsert: true}
  );
};

KdDataLayer.prototype.getTrace = function(key, type) {
  var traceData = this.tracesColl.findOne({
    _id: key,
    serverId: this._serverId, 
    type: type 
  });
  var trace = (traceData) ? JSON.parse(traceData.data) : undefined;
  return trace;
};

KdDataLayer.prototype.reset = function() {
  this.configColl.remove({_id: 'accessTokens'});
  this.configColl.remove({_id: 'clientAuthorizedSessions'});
  this.configColl.remove({_id: 'remoteAuthorizedSessions'});
  this.configColl.remove({_id: 'listenersCount'});
  this.timeEventsColl.remove({});
  this.tracesColl.remove({});
};