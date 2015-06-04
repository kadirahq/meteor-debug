if(Package['iron:router']) {
  var Router = Package['iron:router'].Router;
  
  Router.onBeforeAction(function() {
    var url = Tracker.nonreactive(function() {
      return Router.current().url;
    });
    var info = {
      path: url,
      provider: 'iron-router'
    };
    StoreManager.trackEvent('route', info);
    this.next();
  });
}