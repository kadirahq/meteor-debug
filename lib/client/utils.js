Utils = Utils || {};

Utils.findBlazeViewName = function(view) {
  var name = view.name;
  // if this is a template we can simply send the name
  if(view.template) {
    return name;
  }

  var parent = view.parentView;
  // if not, let's try to find out a name which is easy to debug
  for(var lc=0; lc<5; lc++) {
    if(!parent) {
      break;
    }

    name = parent.name + '.' + name;
    // if we found the parent, we are good to go
    if(parent.template) {
      break;
    }

    // try to get the next parent
    parent = parent.parentView;
  }

  return name;
};

// This is a simple helper to override namespaces in our code
// Buy using this way, it helps us to write unit test for our overriden code
// @param namespace - this is the Object used for overriding
// @param funcName - name of the function in this namespace
// @param generator - function which creates the overriding logic
// eg:-
//    var genFunction = function(original) {
//      return function(view, which) {
//        var name = Utils.findBlazeViewName(view);
//        var done = StoreManager.trackActivity('view.' + which, name);
//        var response = original.call(this, view, which);
//        done();
//        return response;
//      };
//    };
//    Utils.override(Blaze, '_fireCallbacks', genFunction);

Utils.override = function(namespace, funcName, generator) {
  var original = namespace[funcName];
  namespace[funcName] = generator(original);
};