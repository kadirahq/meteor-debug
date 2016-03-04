Tinytest.addAsync(
'Client - BlazeProvider - events',
function(test, done) {
  var eventRef = {};
  var stub = StartStubbing(StoreManager, 'trackEvent');

  var caller = BlazeProvider.events(function(eventMap) {
    eventMap.click(eventRef);
  });

  var that = {viewName: "aa"};
  var eventMap = {
    "click": function(e) {
      test.equal(e, eventRef);
      test.equal(stub.callCount, 1);
      stub.stop();
      done();
    }
  };
  caller.call(that, eventMap);
});
