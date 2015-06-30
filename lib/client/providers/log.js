KadiraDebug.log = function(message) {
  // has to modify this to handle
  // KadiraDebug.log("Log 1", "Log 1") like inputs
  var info = {
    message: message
  };
  StoreManager.trackEvent('log', info);
};