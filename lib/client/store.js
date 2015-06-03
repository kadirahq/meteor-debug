var isPerformanceExists = typeof window.performance === 'undefined';
var performance = (isPerformanceExists)? Date : window.performance;

function Store() {
  var self = this;
  this.currentDataBlock = null;
  this._timeline = [];
  this._browserId = null;
  this._clientId = null;
}

Store.prototype.start = function(browserId, clientId) {
  if(!browserId || !clientId) {
    throw new Error("browserId or clientId can't be empty.");
  }

  this.stop();
  this._browserId = browserId;
  this._clientId = clientId;
  this._pushToServer();
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

Store.prototype.trackEvent = function(type, data) {
  if(!this._clientId) {
    return function() {};
  }

  var item = [Date.now(), type, data];
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
    var elasedTime = self.now() - start;
    self._updateActivity(type, name, elasedTime);
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

Store.prototype._updateActivity = function(type, name, elasedTime) {
  var key = type + "::" + name;
  var activity = this.currentDataBlock.activities[key];
  if(!activity) {
    activity = this.currentDataBlock.activities[key] = {
      type: type,
      name: name,
      count: 0,
      elasedTime: 0
    }
  }

  activity.count++;
  activity.elasedTime += elasedTime;
};

Store.prototype._pushToServer = function pushToServer() {
  var block = this.currentDataBlock;
  this.currentDataBlock = this._buildDataBlock();
  var canTrack = 
    block &&
    (block.events.length > 0 || _.keys(block.activities).length > 0);

  if(canTrack) {
    this._timeline.push(block);
    // worker.postMessage({request: "updateTimeline", payload: data});
    Meteor.call(
      'kadira.debug.updateTimeline', this._browserId,
      this._clientId, block
    );
  }

  this._pushToServerHandler = setTimeout(this._pushToServer.bind(this), 1000);
};

StoreManager = window.StoreManager = new Store();