StartStubbing = function(namespace, funcName) {
  var original = namespace[funcName];
  var stub = sinon.stub();
  namespace[funcName] = stub;

  var stopped = false;
  stub.stop = function() {
    if(stopped) {
      return false;
    }

    namespace[funcName] = original;
    stopped = true;
  };

  return stub;
};

WithNew = function(original, newMethods, fn) {
  var originalMethods = _.clone(original);
  var newKeys = _.difference(_.keys(newMethods), _.keys(original));
  _.extend(original, newMethods);
  fn();

  _.extend(original, originalMethods);
  newKeys.forEach(function(key) {
    delete original[key];
  });
}