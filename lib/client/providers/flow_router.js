if(Package['meteorhacks:flow-router']) {
  var FlowRouter = Package['meteorhacks:flow-router'].FlowRouter;
  var info = {
    provider: 'flow-router'
  };

  if(FlowRouter.triggers) {
    FlowRouter.triggers.enter([function(context) {
      info.path = context.path;
      StoreManager.trackEvent('route', info);
    }]);
  } else {
    FlowRouter.middleware(function(url, next) {
      info.path = url;
      StoreManager.trackEvent('route', info);
      next();
    });
  }
}