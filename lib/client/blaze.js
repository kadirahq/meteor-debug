// Life cycle events
var ignoringTemplates = {
  "Template.__dynamicWithDataContext": true,
  "Template.__dynamic": true
};
var originalFireCallbacks = Blaze._fireCallbacks
Blaze._fireCallbacks = function(view, which) {
  var done = StoreManager.trackActivity('veiw.' + which, view.name)
  var response = originalFireCallbacks.call(this, view, which);
  done();
  return response;
};

// Autoruns
var originalAutorun = Blaze.TemplateInstance.prototype.autorun;
Blaze.TemplateInstance.prototype.autorun = function(cb) {
  var self = this;
  var wrapper = function() {
    // in the firstrun, we don't need to track it
    // it's time also mentioned in the Template lifecycle events
    if(Tracker.currentComputation.firstRun) {
      cb();
    } else {
      var done = StoreManager.trackActivity('autorun', self.view.name);
      cb();
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
      if(fn) {
        var name2 = self.viewName + "." + name;
        var done = StoreManager.trackActivity('helper', name2);
        var response = fn.apply(this, arguments);
        done();
        return response;
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
      if(fn) {
        var name = self.viewName + "." + name;
        var done = StoreManager.trackActivity('event', name);
        var response = fn.apply(this, arguments);
        done();
        StoreManager.trackEvent('event', name);
        return response;
      }
    };
  });

  return originalEvents.call(this, dict);
};

// Dom Creation time
var originalMetrialize = Blaze._materializeDOM;
Blaze._materializeDOM = function(htmljs, intoArray, view) {
  var done = StoreManager.trackActivity('domCreate', view.name)
  var response = originalMetrialize.call(this, htmljs, intoArray, view);
  done();
  return response;
};

// Dom Destroy time
var originalDestroyNode = Blaze._destroyNode;
Blaze._destroyNode = function(node) {
  var done = StoreManager.trackActivity('domDestroy', '')
  var response = originalDestroyNode.call(this, node);
  done();
  return response; 
};