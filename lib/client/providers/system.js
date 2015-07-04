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

EventLoopLag(100, function(lag) {
  StoreManager.trackGuage('eventloop-lag', lag, {sum: true});
});

StoreManager.beforePush(function() {
  recentLag = 0;
  if(typeof performance !== 'undefined') {
    StoreManager.trackGuage('memory', performance.memory.usedJSHeapSize);
  }
});