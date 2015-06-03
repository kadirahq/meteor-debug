if(Package['meteorhacks:flow-router']) {
  var FlowRouter = Package['meteorhacks:flow-router'].FlowRouter;
  FlowRouter.middleware(function(url, next) {
    var info = {
      path: FlowRouter._page.current,
      provider: 'flow-router'
    };
    StoreManager.trackEvent('route', info)
    next();
  });
}