DDPProvider = {
  ignoringMethods: {
    "kadira.debug.updateTimeline": true
  },
  ignoringMethodIds: {}
};

var conn = Meteor.connection;

// watch incoming messages
DDPProvider._livedata_data = function(original) {
  return function(msg) {
    var info = {};
    var eventName = null;

    switch(msg.msg) {
      case "ready": 
        eventName = "ddp-ready";
        info.subs = msg.subs;
        break;
      case "nosub":
        eventName = "ddp-nosub";
        info.id = msg.id
        info.error = msg.error;
        break;
      case "updated":
        var methods = [];
        // removing ignoring methods
        _.each(msg.methods, function(id) {
          if(DDPProvider.ignoringMethodIds[id]) {
            delete DDPProvider.ignoringMethodIds[id];
          } else {
            methods.push(id);
          }
        });

        if(methods.length === 0) {
          break;
        }

        eventName = "ddp-updated";
        info.methods = methods;
        break;
    }

    if(eventName) {
      StoreManager.trackEvent(eventName, info);
    }
    return original.call(conn, msg);
  };
};
Utils.override(conn, '_livedata_data', DDPProvider._livedata_data);

// watch outgoing messages
DDPProvider._send = function(original) {
  return function(msg) {
    var info = {};
    var eventName = null;
    switch(msg.msg) {
      case "method":
        if(DDPProvider.ignoringMethods[msg.method]) {
          DDPProvider.ignoringMethodIds["" + msg.id] = true;
          break;
        }
        info.name = msg.method;
        info.id = msg.id;
        eventName = "ddp-method";
        break;
      case "sub":
        info.name = msg.name;
        info.id = msg.id;
        eventName = "ddp-sub";
        break;
      case "unsub":
        info.id = msg.id;
        eventName = "ddp-unsub";
        break;
    }

    if(eventName) {
      StoreManager.trackEvent(eventName, info);
    }
    return original.call(conn, msg);
  };
};
Utils.override(conn, '_send', DDPProvider._send);