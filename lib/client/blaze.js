// Life cycle events
var ignoringTemplates = {
  "Template.__dynamicWithDataContext": true,
  "Template.__dynamic": true
};
var originalFireCallbacks = Blaze._fireCallbacks
Blaze._fireCallbacks = function(view, which) {
  var info = {name: view.name};
  var done = StoreManager.track('activity', 'veiw.' + which, info)
  var response = originalFireCallbacks.call(this, view, which);
  done();
  return response;
};

// Autoruns
var originalAutorun = Blaze.TemplateInstance.prototype.autorun;
Blaze.TemplateInstance.prototype.autorun = function(cb) {
  var self = this;
  var wrapper = function() {
    var info = {
      template: self.view.name,
      // Note: If this is the first time, do not include this time into 
      // the total CPU cost
      firstRun: Tracker.currentComputation.firstRun
    };
    var done = StoreManager.track('activity', 'autorun', info);
    cb();
    done();
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
        var info = {
          template: self.viewName,
          name: name
        };
        var done = StoreManager.track('activity', 'helper', info);
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
        var info = {
          template: self.viewName,
          name: name
        };
        var done = StoreManager.track('event', 'event', info);
        var response = fn.apply(this, arguments);
        done();
        return response;
      }
    };
  });

  return originalEvents.call(this, dict);
};

// Dom time
var originalMetrialize = Blaze._materializeDOM;
Blaze._materializeDOM = function(htmljs, intoArray, view) {
  var info = {};
  if(view) {
    info.view = view.name;
  }
  var done = StoreManager.track('activity', 'dom', info)
  var response = originalMetrialize.call(this, htmljs, intoArray, view);
  done();
  return response;
};