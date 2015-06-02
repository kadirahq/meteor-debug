// Life cycle events
var ignoringTemplates = {
  "Template.__dynamicWithDataContext": true,
  "Template.__dynamic": true
};
var originalConstructView = Template.prototype.constructView;
Template.prototype.constructView = function(contentFunc, elseFunc) {
  var self = this;
  
  if(!ignoringTemplates[self.viewName]) {
    _.each(['onRendered', 'onDestroyed'], function(funcName) {
      self[funcName](function() {
        var info = {
          name: self.viewName
        };
        StoreManager.track('activity', 'Template.' + funcName, info);
      });
    });
  }

  return originalConstructView.call(this, contentFunc, elseFunc);
};

// Autoruns
var originalAutorun = Blaze.TemplateInstance.prototype.autorun;
Blaze.TemplateInstance.prototype.autorun = function(cb) {
  var self = this;
  var wrapper = function() {
    var info = {
      template: self.view.name
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