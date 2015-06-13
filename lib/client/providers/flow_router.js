FlowRouterProvider = {};
FlowRouterProvider.track = function(flowRouter) {
  var info = {
    provider: 'flow-router'
  };

  if(flowRouter.triggers) {
    flowRouter.triggers.enter([function(context) {
      info.path = context.path;
      StoreManager.trackEvent('route', info);
    }]);
  } else {
    flowRouter.middleware(function(url, next) {
      info.path = url;
      StoreManager.trackEvent('route', info);
      next();
    });
  }
};

if(Package['meteorhacks:flow-router']) {
  var FlowRouter = Package['meteorhacks:flow-router'].FlowRouter;
  FlowRouterProvider.track(FlowRouter);
}