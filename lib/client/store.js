var blob = new Blob([GetCode(WorkerCode)], {type: 'text/javascript'});
var worker = new Worker(window.URL.createObjectURL(blob));

if(typeof performance === 'undefined') {
  var performance = Date;
}

function Store() {
  var self = this;
  this.timeline = [];
}

Store.prototype.track = function(kind, type, data) {
  var item = [kind, type, data, Date.now()];
  this.timeline.push(item);

  var start = performance.now();
  function done() {
    var end = performance.now();
    item.push(end - start);
  }

  return done;
};

StoreManager = window.StoreManager = new Store();


function pushToServer() {
  var data = StoreManager.timeline;
  StoreManager.timeline = [];
  if(data.length > 0) {
    // worker.postMessage({request: "updateTimeline", payload: data});
    // Meteor.call('kadira.debug.updateTimeline', data);
  }
  setTimeout(pushToServer, 500);
}
pushToServer();

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