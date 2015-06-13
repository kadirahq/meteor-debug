IronRouterProvider = {};
IronRouterProvider.track = function(ironRouter) {
  ironRouter.onBeforeAction(function() {
    var url = Tracker.nonreactive(function() {
      return ironRouter.current().url;
    });
    var info = {
      path: url,
      provider: 'iron-router'
    };
    StoreManager.trackEvent('route', info);
    this.next();
  })
};

if(Package['iron:router']) {
  IronRouterProvider.track(Package['iron:router'].Router);
}