Tinytest.addAsync(
'Store - trackEvent', 
function(test, done) {
  var s = GetStore();
  var type = "__type";
  var info = {aa: 10};
  s.trackEvent(type, info);

  var event = s.currentDataBlock.events[0];
  test.equal(event[1], type);
  test.equal(event[2], info);
  test.isTrue(event[0] <= Date.now());
  done();
});

Tinytest.addAsync(
'Store - trackEvent with custom startTime', 
function(test, done) {
  var s = GetStore();
  var type = "__type";
  var info = {aa: 10};
  var time = 10;
  s.trackEvent(type, info, time);

  var event = s.currentDataBlock.events[0];
  test.equal(event[1], type);
  test.equal(event[2], info);
  test.equal(event[0], time);
  done();
});

Tinytest.addAsync(
'Store - trackActivity', 
function(test, done) {

});

Tinytest.addAsync(
'Store - startup - before start', 
function(test, done) {

});

Tinytest.addAsync(
'Store - startup - after start', 
function(test, done) {

});

Tinytest.addAsync(
'Store - _pushToServer - track and stop', 
function(test, done) {

});

Tinytest.addAsync(
'Store - _pushToServer - without data', 
function(test, done) {

});

Tinytest.addAsync(
'Store - Integration - start and track', 
function(test, done) {

});

function GetStore() {
  var s = new Store();

  // this is to identify we've started 
  // this is just for testing
  s._clientId = "some-id";
  s.currentDataBlock = s._buildDataBlock();

  return s;
}