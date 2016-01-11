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
  var dateNow = new Date();
  var expiryDate = dateNow.setDate(dateNow.getDate() + 1);

  this.configColl.insert({
    type: 'accessTokens',
    token: accessToken,
    expires: expiryDate
  });
};

KdDataLayer.prototype.isValidToken = function(accessToken) {
  return !!this.configColl.findOne({
    type: 'accessTokens',
    token: accessToken
  });
};

KdDataLayer.prototype.registerSession = function(type, sessionId) {
  var dateNow = new Date();
  var expiryDate = dateNow.setDate(dateNow.getDate() + 1);

  this.configColl.insert({
    type: this._docID[type],
    session: sessionId,
    expires: expiryDate
  });
};

KdDataLayer.prototype.isValidSession = function(type, sessionId) {
  return !!this.configColl.findOne({
    type: this._docID[type], 
    session: sessionId
  });
};

KdDataLayer.prototype.unregisterSession = function(type, sessionId) {
  this.configColl.remove({
    type: this._docID[type],
    session: sessionId
  });
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
  this.configColl.remove({});
  this.timeEventsColl.remove({});
  this.tracesColl.remove({});
};