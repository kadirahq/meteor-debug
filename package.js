Package.describe({
  summary: 'Full Stack Debugging Solution for Meteor',
  version: '1.0.1',
  git: 'https://github.com/meteorhacks/kadira-debug',
  name: "meteorhacks:kadira-debug",
  debugOnly: true
});

Package.onUse(function (api) {
  configure(api);
});

Package.onTest(function(api) {
  configure(api);
  api.use('tinytest');
});

function configure(api) {
  api.export(['KadiraDebug']);

  api.versionsFrom('1.0');
  api.use('blaze');
  api.use('templating');
  api.use('underscore');
  api.use('random');
  api.use('session');
  api.use('reload');
  api.use('mongo');
  api.use('tracker');
  api.use('meteorhacks:flow-router@0.0.16 || 1.0.0', {weak:true});
  api.use('iron:router@1.0.0', {weak:true});

  api.addFiles('lib/client/store.js', 'client');

  api.addFiles('lib/client/providers/blaze.js', 'client');
  api.addFiles('lib/client/providers/flow_router.js', 'client');
  api.addFiles('lib/client/providers/iron_router.js', 'client');
  api.addFiles('lib/client/providers/ddp.js', 'client');
  api.addFiles('lib/client/providers/hcr.js', 'client');

  api.addFiles('lib/client/connect.js', 'client');

  api.addFiles('lib/server/connect.js', 'server');
}
