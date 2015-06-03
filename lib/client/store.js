var blob = new Blob([GetCode(WorkerCode)], {type: 'text/javascript'});
var worker = new Worker(window.URL.createObjectURL(blob));

var isPerformanceExists = typeof window.performance === 'undefined';
var performance = (isPerformanceExists)? Date : window.performance;

function Store() {
  var self = this;
  this.currentDataBlock = null;
  this._timeline = [];

  function pushToServer() {
    var block = self.currentDataBlock;
    self.currentDataBlock = self._buildDataBlock();
    var canTrack = 
      block &&
      (block.events.length > 0 || _.keys(block.activities).length > 0);

    if(canTrack) {
      self._timeline.push(block);
      // worker.postMessage({request: "updateTimeline", payload: data});
      Meteor.call('kadira.debug.updateTimeline', block);
    }
    setTimeout(pushToServer, 1000);
  }
  pushToServer();
}

Store.prototype.now = function() {
  return performance.now();
};

Store.prototype.trackEvent = function(type, data) {
  var item = [Date.now(), type, data];
  this.currentDataBlock.events.push(item);
};

Store.prototype.trackActivity = function(type, name) {
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

StoreManager = window.StoreManager = new Store();


function WorkerCode() {
  onmessage = function(m) {
    if(m.data && m.data.request == "updateTimeline") {
      // console.log("LOG", localStorage.getItem("aaa"));
      // console.log("send-data via worker", m.data.payload);
    }
  }
}

function GetCode(fn) {
  return "(" + WorkerCode.toString() + ")()";
}