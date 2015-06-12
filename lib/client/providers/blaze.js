// Life cycle events
var originalFireCallbacks = Blaze._fireCallbacks
Blaze._fireCallbacks = function(view, which) {
  var name = findName(view);
  var done = StoreManager.trackActivity('view.' + which, name);
  var response = originalFireCallbacks.call(this, view, which);
  done();
  return response;
};

// Autoruns
var originalAutorun = Blaze.TemplateInstance.prototype.autorun;
Blaze.TemplateInstance.prototype.autorun = function(cb) {
  var self = this;
  var wrapper = function(c) {
    // in the firstrun, we don't need to track it
    // it's time also mentioned in the Template lifecycle events
    if(Tracker.currentComputation.firstRun) {
      cb(c);
    } else {
      var done = StoreManager.trackActivity('autorun', self.view.name);
      cb(c);
      done();
    }
  };

  return originalAutorun.call(this, wrapper);
};

// Helpers
var originalHelpers = Template.prototype.helpers;
Template.prototype.helpers = function(dict) {
  var self = this;
  _.each(dict, function(fn, name) {
    dict[name] = function() {
      if(typeof fn === 'function') {
        var trackingName = self.viewName + '::' + name;
        var done = StoreManager.trackActivity('helper', trackingName);
        var response = fn.apply(this, arguments);
        done();
        return response;
      } else {
        // return the helper directly, if it isn't a function
        return fn;
      }
    };
  });

  return originalHelpers.call(this, dict);
};

// Events
var originalEvents = Template.prototype.events;
Template.prototype.events = function(dict) {
  var self = this;
  _.each(dict, function(fn, name) {
    dict[name] = function() {
      if(typeof fn === 'function' ) {
        var info = {
          name: name,
          view: self.viewName
        };
        StoreManager.trackEvent('event', info);
        
        var trackingName = self.viewName + '::' + name;
        var done = StoreManager.trackActivity('event', trackingName);
        var response = fn.apply(this, arguments);
        done();
        return response;
      }
    };
  });

  return originalEvents.call(this, dict);
};

// Dom Creation time
var originalMetrialize = Blaze._materializeDOM;
Blaze._materializeDOM = function(htmljs, intoArray, view) {
  var name = findName(view);
  var done = StoreManager.trackActivity('dom.create', name)
  var response = originalMetrialize.call(this, htmljs, intoArray, view);
  done();
  return response;
};

// Dom Destroy time
var originalDestroyNode = Blaze._destroyNode;
Blaze._destroyNode = function(node) {
  var done = StoreManager.trackActivity('dom.destroy', '')
  var response = originalDestroyNode.call(this, node);
  done();
  return response; 
};

function findName(view) {
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
}