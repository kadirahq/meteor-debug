Tinytest.addAsync(
'Client - IronRouterProvider - track', 
function(test, done) {
  var url = 'the-url';
  var that = {next: finalize};
  var stub = StartStubbing(StoreManager, 'trackEvent');
  var Router = {
    current: function() {
      return {url: url}
    },
    onBeforeAction: function(cb) {
      cb.call(that);
    }
  };

  IronRouterProvider.track(Router);

  function finalize() {
    test.equal(stub.callCount, 1);
    test.equal(stub.args[0], ['route', {path: url, provider: 'iron-router'}]);
    stub.stop();
    done();
  }
});