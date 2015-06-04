if(Package['meteorhacks:flow-router']) {
  var FlowRouter = Package['meteorhacks:flow-router'].FlowRouter;
  var info = {
    provider: 'flow-router'
  };

  if(FlowRouter.triggers) {
    FlowRouter.triggers.enter([function(context) {
      info.path = FlowRouter._page.current;
      StoreManager.trackEvent('route', info);
    }]);
  } else {
    FlowRouter.middleware(function(url, next) {
      info.path = FlowRouter._page.current;
      StoreManager.trackEvent('route', info);
      next();
    });
  }
}