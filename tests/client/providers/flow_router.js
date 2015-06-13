Tinytest.addAsync(
'Client - FlowRouterProvider - track with middlewares', 
function(test, done) {
  var url = 'the-url';
  var that = {next: finalize};
  var stub = StartStubbing(StoreManager, 'trackEvent');
  var FlowRouter = {
    middleware: function(cb) {
      cb(url, finalize);
    }
  };

  FlowRouterProvider.track(FlowRouter);

  function finalize() {
    test.equal(stub.callCount, 1);
    test.equal(stub.args[0], ['route', {path: url, provider: 'flow-router'}]);
    stub.stop();
    done();
  }
});

Tinytest.addAsync(
'Client - FlowRouterProvider - track with triggers', 
function(test, done) {
  var url = 'the-url';
  var that = {next: finalize};
  var stub = StartStubbing(StoreManager, 'trackEvent');
  var FlowRouter = {
    triggers: {
      enter: function(callbacks) {
        var context = {path: url};
        callbacks[0](context);
        finalize();
      }
    }
  };

  FlowRouterProvider.track(FlowRouter);

  function finalize() {
    test.equal(stub.callCount, 1);
    test.equal(stub.args[0], ['route', {path: url, provider: 'flow-router'}]);
    stub.stop();
    done();
  }
});