Utils = Utils || {};

Utils.getAppEnv = function() {
  var env = 'development';
  if(!Package['kadira:runtime-dev']) {
    env = 'production';
  }
  return env;  
};