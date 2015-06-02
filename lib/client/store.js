var blob = new Blob([GetCode(WorkerCode)], {type: 'text/javascript'});
var worker = new Worker(window.URL.createObjectURL(blob));

var isPerformanceExists = typeof window.performance === 'undefined';
var performance = (isPerformanceExists)? Date : window.performance;

function Store() {
  var self = this;
  this.timeline = [];
}

Store.prototype.now = function() {
  return performance.now();
};

Store.prototype.track = function(kind, type, data) {
  var self = this;
  var item = [kind, type, data, Date.now()];

  var start = this.now();
  function done() {
    var end = self.now();
    item.push(end - start);
    self.timeline.push(item);
  }

  return done;
};

StoreManager = window.StoreManager = new Store();


// function pushToServer() {
//   var data = StoreManager.timeline;
//   StoreManager.timeline = [];
//   if(data.length > 0) {
//     // worker.postMessage({request: "updateTimeline", payload: data});
//     // Meteor.call('kadira.debug.updateTimeline', data);
//   }
//   setTimeout(pushToServer, 500);
// }
// pushToServer();

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