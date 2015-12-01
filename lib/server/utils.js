Utils = {};

// XXX: move this to the client side as well
Utils.getAppEnv = function() {
  var env = 'development';
  if(!Package['kadira:runtime-dev']) {
    env = 'production';
  }
  return env;  
};

Utils.getDebugAuthKey = function () {
  var authKey = process.env.KADIRA_DEBUG_AUTH_KEY || null;
  return authKey;
};