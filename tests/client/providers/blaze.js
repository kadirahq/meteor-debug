Tinytest.add(
'Client - BlazeProvider - findBlazeViewName - direct template',
function(test) {
  var view = {name: 'aa', template: {}};
  var name = Utils.findBlazeViewName(view);
  test.equal(name, 'aa');
});

Tinytest.add(
'Client - BlazeProvider - findBlazeViewName - parent is a template',
function(test) {
  var view = {name: 'aa', parentView: {name: 'p', template: {}}};
  var name = Utils.findBlazeViewName(view);
  test.equal(name, 'p.aa');
});

Tinytest.add(
'Client - BlazeProvider - findBlazeViewName - parent is too long',
function(test) {
  var view = {name: 'aa', parentView: {}};
  var currView = view.parentView;
  for(var lc=0; lc<10; lc++) {
    currView.name = lc;
    currView.parentView = {};
    currView = currView.parentView;
  }

  var name = Utils.findBlazeViewName(view);
  test.equal(name, '4.3.2.1.0.aa');
});

Tinytest.addAsync(
'Client - BlazeProvider - _fireCallbacks',
function(test, done) {
  var view = {name: "hello"};
  var which = "created";
  var that = {};

  var stub = StartStubbing(StoreManager, 'trackActivity');
  stub.returns(function() {
    test.equal(stub.callCount, 1);
    test.equal(stub.args[0][0], 'view.' + which);
    test.equal(stub.args[0][1], view.name);
    stub.stop();
    done();
  });

  var caller = BlazeProvider._fireCallbacks(function(v, w) {
    test.equal(this, that);
    test.equal(v, view);
    test.equal(w, which);
  });
  caller(view, which);
});

Tinytest.addAsync(
'Client - BlazeProvider - autorun for first time',
function(test, done) {
  var stub = StartStubbing(StoreManager, 'trackActivity');
  var caller = BlazeProvider.autorun(function(cb) {
    var computation = {firstRun: true};
    cb(computation);
  });

  caller(function() {
    test.equal(stub.callCount, 0);
    stub.stop();
    done();
  });
});

Tinytest.addAsync(
'Client - BlazeProvider - autorun for second time',
function(test, done) {
  var stub = StartStubbing(StoreManager, 'trackActivity');
  stub.returns(function() {});
  var that = {view: {name: 'aa'}};

  var caller = BlazeProvider.autorun(function(cb) {
    var computation = {firstRun: false};
    cb(computation);
  });

  caller.call(that, function() {
    test.equal(stub.callCount, 1);
    stub.stop();
    done();
  });
});

Tinytest.addAsync(
'Client - BlazeProvider - helpers with functions',
function(test, done) {
  var stub = StartStubbing(StoreManager, 'trackActivity');
  stub.returns(function() {});

  var caller = BlazeProvider.helpers(function(helpers) {
    var res = helpers.hello("arunoda");
    test.equal(res, "arunoda");
    test.equal(stub.callCount, 1);
    stub.stop();
    done();
  });

  var that = {viewName: "aa"};
  var helpers = {
    hello: function(name) {
      return name;
    }
  };
  caller.call(that, helpers);
});

Tinytest.addAsync(
'Client - BlazeProvider - helpers with simple field',
function(test, done) {
  var stub = StartStubbing(StoreManager, 'trackActivity');
  stub.returns(function() {});

  var caller = BlazeProvider.helpers(function(helpers) {
    test.equal(helpers.hello, 'susiripala');
    test.equal(stub.callCount, 0);
    stub.stop();
    done();
  });

  var that = {viewName: "aa"};
  var helpers = {
    hello: "susiripala"
  };
  caller.call(that, helpers);
});

Tinytest.addAsync(
'Client - BlazeProvider - events',
function(test, done) {
  var eventRef = {};
  var stub = StartStubbing(StoreManager, 'trackActivity');
  stub.returns(function() {});
  var stub2 = StartStubbing(StoreManager, 'trackEvent');

  var caller = BlazeProvider.events(function(eventMap) {
    eventMap.click(eventRef);
  });

  var that = {viewName: "aa"};
  var eventMap = {
    "click": function(e) {
      test.equal(e, eventRef);
      test.equal(stub.callCount, 1);
      test.equal(stub2.callCount, 1);
      stub.stop();
      stub2.stop();
      done();
    }
  };
  caller.call(that, eventMap);
});

Tinytest.addAsync(
'Client - BlazeProvider - _materializeDOM',
function(test, done) {
  var htmljs = {};
  var intoArray = {};
  var view = {name: "hello"};
  var that = {};
  var dom = {};

  var stub = StartStubbing(StoreManager, 'trackActivity');
  stub.returns(function() {});

  var caller = BlazeProvider._materializeDOM(function(h, i, v) {
    test.equal(this, that);
    test.equal(h, htmljs);
    test.equal(i, intoArray);
    test.equal(v, view);
    return dom;
  });

  var res = caller.call(that, htmljs, intoArray, view);
  test.equal(res, dom);
  test.equal(stub.callCount, 1);
  stub.stop();
  done();
});

Tinytest.addAsync(
'Client - BlazeProvider - _destroyNode with no view',
function(test, done) {
  var node = {};
  var that = {};

  var stub = StartStubbing(StoreManager, 'trackActivity');
  stub.returns(function() {});

  var caller = BlazeProvider._destroyNode(function(n) {
    test.equal(this, that);
    test.equal(n, node);
  });

  var res = caller.call(that, node);
  test.equal(stub.callCount, 1);
  test.equal(stub.args[0][1], 'no-view-available');
  stub.stop();
  done();
});

Tinytest.addAsync(
'Client - BlazeProvider - _destroyNode with a view',
function(test, done) {
  var node = {};
  var that = {};
  var view = {name: 'super-name'};

  var stub = StartStubbing(StoreManager, 'trackActivity');
  stub.returns(function() {});

  var caller = BlazeProvider._destroyNode(function(n) {
    test.equal(this, that);
    test.equal(n, node);
  });

  WithNew(Blaze, {
    currentView: view
  }, function() {
    var res = caller.call(that, node);
    test.equal(stub.callCount, 1);
    test.equal(stub.args[0][1], view.name);
    stub.stop();
    done();
  });
});

Tinytest.addAsync(
'Client - BlazeProvider - withIgnoredKeywords - autorun',
function(test, done) {
  var stub = StartStubbing(StoreManager, 'trackActivity');
  stub.returns(function() {});
  var that = {view: {name: 'MeteorToys'}};

  var caller = BlazeProvider.autorun(function(cb) {
    var computation = {firstRun: false};
    cb(computation);
  });

  caller.call(that, function() {
    test.equal(stub.callCount, 0);
    stub.stop();
    done();
  });
});

Tinytest.addAsync(
'Client - BlazeProvider - withIgnoredKeywords - events / activity',
function(test, done) {
  var eventRef = {};
  var stub = StartStubbing(StoreManager, 'trackActivity');
  stub.returns(function() {});
  var stub2 = StartStubbing(StoreManager, 'trackEvent');

  var caller = BlazeProvider.events(function(eventMap) {
    eventMap.click(eventRef);
  });

  var that = {viewName: "MeteorToys"};
  var eventMap = {
    "click": function(e) {
      test.equal(e, eventRef);
      test.equal(stub.callCount, 0);
      test.equal(stub2.callCount, 0);
      stub.stop();
      stub2.stop();
      done();
    }
  };
  caller.call(that, eventMap);
});

Tinytest.addAsync(
'Client - BlazeProvider - withIgnoredKeywords - _materializeDOM',
function(test, done) {
  var htmljs = {};
  var intoArray = {};
  var view = {name: "JetSetter"};
  var that = {};
  var dom = {};

  var stub = StartStubbing(StoreManager, 'trackActivity');
  stub.returns(function() {});

  var caller = BlazeProvider._materializeDOM(function(h, i, v) {
    test.equal(this, that);
    test.equal(h, htmljs);
    test.equal(i, intoArray);
    test.equal(v, view);
    return dom;
  });

  var res = caller.call(that, htmljs, intoArray, view);
  test.equal(res, dom);
  test.equal(stub.callCount, 0);
  stub.stop();
  done();
});

Tinytest.addAsync(
'Client - BlazeProvider - withIgnoredKeywords - _destroyNode with a view',
function(test, done) {
  var node = {};
  var that = {};
  var view = {name: 'Mongol'};

  var stub = StartStubbing(StoreManager, 'trackActivity');
  stub.returns(function() {});

  var caller = BlazeProvider._destroyNode(function(n) {
    test.equal(this, that);
    test.equal(n, node);
  });

  WithNew(Blaze, {
    currentView: view
  }, function() {
    var res = caller.call(that, node);
    test.equal(stub.callCount, 0);
    stub.stop();
    done();
  });
});