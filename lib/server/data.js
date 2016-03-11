KdDataLayer = function(args) {
  this._serverId = args.serverId;
  this._docID = {
    'client': 'clientAuthorizedSessions',
    'remote': 'remoteAuthorizedSessions',
  };

  this.configColl = new Mongo.Collection('__kdconfig');
  this.timeEventsColl = new Mongo.Collection('__kdtimeevents');
  this.timeEventsColl._createCappedCollection(52428800); // 50 MB
  this.tracesColl = new Mongo.Collection('__kdtraces');
  this.tracesColl._createCappedCollection(52428800); // 50 MB

  // set TTL Index for expire accessTokens and authSessions
  this.configColl._ensureIndex({expires: 1}, {expireAfterSeconds: 3600});
};

KdDataLayer.prototype.registerAccessToken = function(accessToken) {
  var expiryDate = new Date(Date.now() + 1000 * 3600 * 24);

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
  var expiryDate = new Date(Date.now() + 1000 * 3600 * 24);

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

KdDataLayer.prototype.increaseListenersCount = function(val) {
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
  this.timeEventsColl.rawCollection().insert(data, function(err) {
    if(err) {
      console.error(err.stack);
    }
  });
};

KdDataLayer.prototype.setTrace = function(key, type, trace) {
  this.tracesColl.rawCollection().update(
    { _id: key},
    {
      type: type,
      data: JSON.stringify(trace)
    },
    { upsert: true},
    function(err) {
      if(err) {
        console.error(err.stack);
      }
    }
  );
};

KdDataLayer.prototype.getTrace = function(key, type) {
  var traceData = this.tracesColl.findOne({
    _id: key,
    type: type
  });
  var trace = (traceData) ? JSON.parse(traceData.data) : undefined;
  return trace;
};

KdDataLayer.prototype.reset = function() {
  this.configColl.remove({});
  // XXX need a way to clear below collections too
  // this.timeEventsColl.remove({});
  // this.tracesColl.remove({});

  // ### it's getting some error when try to user rawCollection().drop

  // 1:
  // // this.timeEventsColl._dropCollection();

  // 2:
  // var self = this;
  // this.timeEventsColl.rawCollection().drop(function(err) {
  //   if(!err) {
  //     self.timeEventsColl = new Mongo.Collection('__kdtimeevents');
  //     self.timeEventsColl._createCappedCollection(1024 * 1024 * 50);
  //   }
  // });

  // this.tracesColl.rawCollection().drop(function(err) {
  //   if(!err) {
  //     self.tracesColl = new Mongo.Collection('__kdtraces');
  //     self.tracesColl._createCappedCollection(1024 * 1024 * 50);
  //   }
  // });

  // 3:
  // ###: An alternative way to do above
  // getting error message by saying invalid command `emptycapped`
  // // this.timeEventsColl.rawDatabase().command({emptycapped: '__kdtimeevents'}, function(err, resp) {
  // //   console.log(err, resp);
  // // });
};
