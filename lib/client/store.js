var isPerformanceExists = typeof window.performance === 'undefined';
var performance = (isPerformanceExists)? Date : window.performance;

Store = function(options) {
  var self = this;
  options = options || {};

  this._serverPushInterval = options.serverPushInterval || 1000;
  this.currentDataBlocks = {};
  this._browserId = null;
  this._clientId = null;
  this._startFns = [];
  this._beforePushFns = [];

  this._timeline = [];
  this._yesTracking = new Meteor.EnvironmentVariable();
}

Store.prototype.onTracking = function(fn) {
  return this._yesTracking.withValue(true, fn);
};

Store.prototype.start = function(browserId, clientId) {
  if(!browserId || !clientId) {
    throw new Error("browserId or clientId can't be empty.");
  }

  this.stop();
  this._browserId = browserId;
  this._clientId = clientId;
  this._pushToServer();

  // trigger startfns
  this._runCallbacks(this._startFns);
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

Store.prototype._getCurrentDataBlock = function(timestamp) {
  var startTimeInSec = this._normalizeDateToSec(timestamp);
  var block = this.currentDataBlocks[startTimeInSec];
  if(!block) {
    block = this.currentDataBlocks[startTimeInSec] = this._buildDataBlock(startTimeInSec);
  }

  return block;
};

Store.prototype.trackEvent = function(type, data, startTime) {
  if(!this._clientId) {
    return function() {};
  }

  startTime = startTime || Date.now();
  var currentDataBlock = this._getCurrentDataBlock(startTime);
  
  var item = [startTime, type, data];
  currentDataBlock.events.push(item);
};

Store.prototype.trackActivity = function(type, name) {
  var self = this;
  if(!self._clientId) {
    return function() {};
  }

  var alreadyTracking = false;
  if(self._yesTracking.get()) {
    alreadyTracking = true;
  }

  var start = self.now();
  var marked = false;
  function done() {
    if(marked) {
      return;
    }
    var elapsedTime = (alreadyTracking)? 0 : self.now() - start;
    self._updateActivity(type, name, elapsedTime);
    marked = true;
  }

  return done;
};

Store.prototype.trackGuage = function(key, value, options) {
  options = options || {};
  startTime = options.startTime || Date.now();
  var currentDataBlock = this._getCurrentDataBlock(startTime);
  
  currentDataBlock.gauges[key] = currentDataBlock.gauges[key] || 0;
  if(options.sum) {
    currentDataBlock.gauges[key] += value;
  } else {
    currentDataBlock.gauges[key] = value;
  }
};

Store.prototype._buildDataBlock = function(timestamp) {
  var block = {
    timestamp: timestamp,
    events: [],
    activities: {},
    gauges: {}
  };

  return block;
};

Store.prototype._updateActivity = function(type, name, elapsedTime) {
  var key = type + "::" + name;
  var currentDataBlock = this._getCurrentDataBlock(Date.now());

  var activity = currentDataBlock.activities[key];
  if(!activity) {
    activity = currentDataBlock.activities[key] = {
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
  if(!self._clientId) {
    return;
  }

  // running flush callbacks
  this._runCallbacks(this._beforePushFns);

  var blocks = this.currentDataBlocks;
  this.currentDataBlocks = {};
  
  _.each(blocks, function(block) {
    self._timeline.push(block);
    Meteor.call(
      'kadira.debug.updateTimeline', self._browserId,
      self._clientId, block
    );
  });

  function runAgain() {
    self._pushToServer();
  }

  this._pushToServerHandler = setTimeout(runAgain, this._serverPushInterval);
};

Store.prototype.beforePush = function(fn) {
  this._beforePushFns.push(fn);
};

Store.prototype.startup = function(fn) {
  if(this._browserId) {
    fn();
  } else {
    this._startFns.push(fn);
  }
};

Store.prototype._normalizeDateToSec = function(timestamp) {
  var diff = timestamp % 1000;
  return timestamp - diff;
};

Store.prototype._runCallbacks = function(callbacks) {
  _.each(callbacks, function(fn) {
    fn();
  });
};

StoreManager = window.StoreManager = new Store();