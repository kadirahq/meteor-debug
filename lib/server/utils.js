Utils = Utils || {};

Utils.getDebugAuthKey = function () {
  var authKey = process.env.KADIRA_DEBUG_AUTH_KEY || null;
  return authKey;
};