BlazeProvider = {};

// Life cycle events
BlazeProvider._fireCallbacks = function(original) {
  return function(view, which) {
    var name = Utils.findBlazeViewName(view);
    var done = StoreManager.trackActivity('view.' + which, name);
    var response = original.call(this, view, which);
    done();
    return response;
  };
};
Utils.override(Blaze, '_fireCallbacks', BlazeProvider._fireCallbacks);

// Autoruns
BlazeProvider.autorun = function(original) {
  return function(cb) {
    var self = this;
    var wrapper = function(c) {
      // in the firstrun, we don't need to track it
      // it's time also mentioned in the Template lifecycle events
      if(c.firstRun) {
        cb(c);
      } else {
        var done = StoreManager.trackActivity('autorun', self.view.name);
        cb(c);
        done();
      }
    };

    return original.call(this, wrapper);
  };
};
Utils.override(Blaze.TemplateInstance.prototype, 'autorun', BlazeProvider.autorun);

// Template helpers
BlazeProvider.helpers = function(original) {
  return function(dict) {
    var self = this;
    _.each(dict, function(fn, name) {
      // helpers could be either a function or a field
      // that's why we need this check
      if(typeof fn === 'function') {
        dict[name] = function() {
          var trackingName = self.viewName + '::' + name;
          var done = StoreManager.trackActivity('helper', trackingName);
          var response = fn.apply(this, arguments);
          done();
          return response;
        }
      } else {
        dict[name] = fn;
      }
    });

    return original.call(this, dict);
  };
};
Utils.override(Template.prototype, 'helpers', BlazeProvider.helpers);

// Events
BlazeProvider.events = function(original) {
  return function(dict) {
    var self = this;
    _.each(dict, function(fn, name) {
      dict[name] = function() {
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
      };
    });

    return original.call(this, dict);
  };
};
Utils.override(Template.prototype, 'events', BlazeProvider.events);

// DOM Creation
BlazeProvider._materializeDOM = function(original) {
  return function(htmljs, intoArray, view) {
    var name = Utils.findBlazeViewName(view);
    var done = StoreManager.trackActivity('dom.create', name)
    var response = original.call(this, htmljs, intoArray, view);
    done();
    return response;
  };
};
Utils.override(Blaze, '_materializeDOM', BlazeProvider._materializeDOM);

// DOM Destruction
BlazeProvider._destroyNode = function(original) {
  return function(node) {
    var viewName = "no-view-available";
    if(Blaze.currentView) {
      viewName = Utils.findBlazeViewName(Blaze.currentView);
    }

    var done = StoreManager.trackActivity('dom.destroy', viewName);
    var response = original.call(this, node);
    done();
    return response; 
  }
};
Utils.override(Blaze, '_destroyNode', BlazeProvider._destroyNode);