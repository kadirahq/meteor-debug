EventLoopLag = function(timeoutMillis, callback) {
  function startLoop () {
    var start = StoreManager.now();
    setTimeout(function() {
      var end = StoreManager.now();
      var lag  = Math.max(0, end - start - timeoutMillis);
      callback(lag);
      startLoop();
    }, timeoutMillis);
  }

  startLoop();
};

var intervalTime = 100;
var loopStartTime = Date.now();
var totalLag = 0;
EventLoopLag(intervalTime, function(lag) {
  totalLag += lag;
});

// this is a dummy guage tracking to send data
// to the server always
setInterval(function() {
  StoreManager.trackGuage('dummy', 100);
}, 500);

StoreManager.beforeBlockClose(function(block) {
  var now = Date.now();
  var loopTime = now - loopStartTime;
  var lagPct = (totalLag/loopTime) * 100;

  block.gauges['eventloop-blockness'] = lagPct;
  loopStartTime = now;
  totalLag = 0;

  if(typeof performance !== 'undefined' && performance.memory) {
    block.gauges['memory'] = performance.memory.usedJSHeapSize;
  }
});