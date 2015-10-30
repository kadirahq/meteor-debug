Package.describe({
  summary: 'Full Stack Debugging Solution for Meteor',
  version: '2.2.4',
  git: 'https://github.com/kadirahq/meteor-debug',
  name: "kadira:debug"
});

Npm.depends({
  'ua-parser-js': '0.7.7',
  'lru-cache': '2.6.5'
});

Package.onUse(function (api) {
  configure(api);
});

Package.onTest(function(api) {
  configure(api);
  api.use('tinytest');
  api.use('ddp');
  api.use('practicalmeteor:sinon@1.14.1_1');
  
  api.addFiles('tests/utils.js', ['server', 'client']);
  
  api.addFiles('tests/client/store.js', 'client');
  api.addFiles('tests/client/providers/blaze.js', 'client');
  api.addFiles('tests/client/providers/ddp.js', 'client');
  api.addFiles('tests/client/providers/iron_router.js', 'client');
  api.addFiles('tests/client/providers/flow_router.js', 'client');
  api.addFiles('tests/server/integration.js', 'server');
  api.addFiles('tests/server/trace_store.js', 'server');
});

function configure(api) {
  api.export(['KadiraDebug']);

  api.versionsFrom('1.0');
  api.use('blaze');
  api.use('templating');
  api.use('underscore');
  api.use('random');
  api.use('check');
  api.use('session');
  api.use('reload');
  api.use('mongo');
  api.use('tracker');
  api.use('localstorage');
  api.use('cosmos:browserify@0.4.0');
  api.use('meteorhacks:kadira@2.23.2', 'server');
  api.use('meteorhacks:flow-router@0.0.16 || 1.0.0', {weak:true});
  api.use('iron:router@1.0.0', {weak:true});
  api.use('meteorhacks:kadira-debug@1.3.3', {weak: true});
  api.use('kadira:runtime-dev');

  api.addFiles('lib/server/old_version_removal.js', 'server');

  api.addFiles('lib/client/utils.js', 'client');
  api.addFiles('lib/client/store.js', 'client');

  api.addFiles('lib/client/providers/blaze.js', 'client');
  api.addFiles('lib/client/providers/flow_router.js', 'client');
  api.addFiles('lib/client/providers/iron_router.js', 'client');
  api.addFiles('lib/client/providers/ddp.js', 'client');
  api.addFiles('lib/client/providers/hcr.js', 'client');
  api.addFiles('lib/client/providers/system.js', 'client');

  api.addFiles('lib/client/connect.js', 'client');

  api.addFiles('lib/server/trace_store.js', 'server');
  api.addFiles('lib/server/connect.js', 'server');
}
