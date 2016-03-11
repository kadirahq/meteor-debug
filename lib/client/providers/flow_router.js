FlowRouterProvider = {};
FlowRouterProvider.track = function(flowRouter) {
  var info = {
    provider: 'flow-router'
  };

  flowRouter.triggers.enter([function(context) {
    info.path = context.path;
    StoreManager.trackEvent('route', info);
  }]);
};

if(Package['kadira:flow-router']) {
  var FlowRouter = Package['kadira:flow-router'].FlowRouter;
  FlowRouterProvider.track(FlowRouter);
}
