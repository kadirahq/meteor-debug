Package.describe({
  summary: 'Full Stack Debugging Solution for Meteor',
  version: '1.3.3',
  git: 'https://github.com/meteorhacks/kadira-debug',
  name: "meteorhacks:kadira-debug",
  debugOnly: true
});

Npm.depends({
  'ua-parser-js': '0.7.7'
});

Package.onUse(function (api) {
  configure(api);
});

Package.onTest(function(api) {
  configure(api);
  api.use('tinytest');
  api.use('practicalmeteor:sinon@1.14.1_1');
  
  api.addFiles('tests/utils.js', ['server', 'client']);
  
  api.addFiles('tests/client/store.js', 'client');
  api.addFiles('tests/client/providers/blaze.js', 'client');
  api.addFiles('tests/client/providers/ddp.js', 'client');
  api.addFiles('tests/client/providers/iron_router.js', 'client');
  api.addFiles('tests/client/providers/flow_router.js', 'client');
  api.addFiles('tests/server/integration.js', 'server');
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
  api.use('localstorage');
  api.use('cosmos:browserify@0.4.0');
  api.use('meteorhacks:flow-router@0.0.16 || 1.0.0', {weak:true});
  api.use('iron:router@1.0.0', {weak:true});


  api.addFiles('lib/client/utils.js', 'client');
  api.addFiles('lib/client/store.js', 'client');

  api.addFiles('lib/client/providers/blaze.js', 'client');
  api.addFiles('lib/client/providers/flow_router.js', 'client');
  api.addFiles('lib/client/providers/iron_router.js', 'client');
  api.addFiles('lib/client/providers/ddp.js', 'client');
  api.addFiles('lib/client/providers/hcr.js', 'client');
  api.addFiles('lib/client/providers/system.js', 'client');

  api.addFiles('lib/client/connect.js', 'client');

  api.addFiles('lib/server/connect.js', 'server');
}
