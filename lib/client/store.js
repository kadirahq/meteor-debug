var isPerformanceExists = typeof window.performance === 'undefined';
var performance = (isPerformanceExists)? Date : window.performance;

Store = function(options) {
  var self = this;
  options = options || {};

  this._serverPushInterval = options.serverPushInterval || 1000;
  this.currentDataBlock = null;
  this._browserId = null;
  this._clientId = null;
  this._startFns = [];
}

Store.prototype.start = function(browserId, clientId) {
  if(!browserId || !clientId) {
    throw new Error("browserId or clientId can't be empty.");
  }

  this.stop();
  this._browserId = browserId;
  this._clientId = clientId;
  this._pushToServer();

  // trigger startfns
  _.each(this._startFns, function(fn) {
    fn();
  });
  this._startFns = [];
};

Store.prototype.stop = function() {
  this._browserId = null;
  this._clientId = null;
  clearTimeout(this._pushToServerHandler);
  this._pushToServerHandler = null;
};

Store.prototype.now = function() {
  return performance.now();
};

Store.prototype.trackEvent = function(type, data, startTime) {
  if(!this._clientId) {
    return function() {};
  }

  startTime = startTime || Date.now();
  
  var item = [startTime, type, data];
  this.currentDataBlock.events.push(item);
};

Store.prototype.trackActivity = function(type, name) {
  if(!this._clientId) {
    return function() {};
  }

  var self = this;
  var start = this.now();
  var marked = false;
  function done() {
    if(marked) {
      return;
    }
    var elapsedTime = self.now() - start;
    self._updateActivity(type, name, elapsedTime);
    marked = true;
  }

  return done;
};

Store.prototype._buildDataBlock = function() {
  var block = {
    timestamp: Date.now(),
    events: [],
    activities: {}
  };

  return block;
};

Store.prototype._updateActivity = function(type, name, elapsedTime) {
  var key = type + "::" + name;
  var activity = this.currentDataBlock.activities[key];
  if(!activity) {
    activity = this.currentDataBlock.activities[key] = {
      type: type,
      name: name,
      count: 0,
      elapsedTime: 0
    }
  }

  activity.count++;
  activity.elapsedTime += elapsedTime;
};

Store.prototype._pushToServer = function pushToServer() {
  var self = this;
  var block = this.currentDataBlock;
  this.currentDataBlock = this._buildDataBlock();
  var canTrack = 
    block &&  
    (block.events.length > 0 || _.keys(block.activities).length > 0);

  if(canTrack) {
    Meteor.call(
      'kadira.debug.updateTimeline', this._browserId,
      this._clientId, block
    );
  }

  function runAgain() {
    self._pushToServer();
  }

  this._pushToServerHandler = setTimeout(runAgain, this._serverPushInterval);
};

Store.prototype.startup = function(fn) {
  if(this._browserId) {
    fn();
  } else {
    this._startFns.push(fn);
  }
};

StoreManager = new Store();