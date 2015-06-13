Tinytest.addAsync(
'Store - trackEvent', 
function(test, done) {
  var s = GetStore();
  var type = '__type';
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
  var type = '__type';
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
  var s = GetStore();
  var type = '__type';
  var name = '__name';
  var key = type + "::" + name;
  var completed = s.trackActivity(type, name);
  setTimeout(function() {
    completed();
    var activity = s.currentDataBlock.activities[key];
    test.equal(_.pick(activity, 'type', 'name', 'count'), {
      type: type,
      name: name,
      count: 1
    });;

    test.isTrue(activity.elapsedTime >= 100);
    done();
  }, 100);

});

Tinytest.addAsync(
'Store - trackActivity with multiple occurences', 
function(test, done) {
  var s = GetStore();
  var type = '__type';
  var name = '__name';
  var key = type + "::" + name;
  var completed = s.trackActivity(type, name);
  setTimeout(function() {
    completed();
    completed = s.trackActivity(type, name);
    setTimeout(function() {
      completed();
      var activity = s.currentDataBlock.activities[key];
      test.equal(_.pick(activity, 'type', 'name', 'count'), {
        type: type,
        name: name,
        count: 2
      });;

      test.isTrue(activity.elapsedTime >= 200);
      done();
    }, 100);
  }, 100);

});

Tinytest.addAsync(
'Store - startup - before start', 
function(test, done) {
  var s = GetStore();
  s.startup(done);
  s.start('bid', 'cid');
  s.stop();
});

Tinytest.addAsync(
'Store - startup - after start', 
function(test, done) {
  var s = GetStore();
  s.start('bid', 'cid');
  s.startup(done);
  s.stop();
});

Tinytest.addAsync(
'Store - send data to server - track and stop', 
function(test, done) {
  var s = new Store({serverPushInterval: 10});
  var clientId = 'cid';
  var browserId = 'bid';
  s.start(browserId, clientId);

  var originalCall = Meteor.call;
  Meteor.call = sinon.stub();

  s.trackEvent('type', {info: true});

  setTimeout(function() {
    test.equal(Meteor.call.callCount, 1);
    var args = Meteor.call.args[0];
    var block = args[3];
    test.equal(args[0], 'kadira.debug.updateTimeline');
    test.equal(args[1], browserId);
    test.equal(args[2], clientId);
    test.equal(block.events[0][1], 'type');
    test.equal(block.events[0][2], {info: true});
    s.stop();
    Meteor.call = originalCall;
    done();
  }, 100);
});

Tinytest.addAsync(
'Store - send data to server - without data', 
function(test, done) {
  var s = new Store({serverPushInterval: 10});
  var clientId = 'cid';
  var browserId = 'bid';
  s.start(browserId, clientId);

  var originalCall = Meteor.call;
  Meteor.call = sinon.stub();

  setTimeout(function() {
    test.equal(Meteor.call.callCount, 0);
    s.stop();
    Meteor.call = originalCall;
    done();
  }, 100);
});

function GetStore() {
  var s = new Store();

  // this is to identify we've started 
  // this is just for testing
  s._clientId = 'some-id';
  s.currentDataBlock = s._buildDataBlock();

  return s;
}