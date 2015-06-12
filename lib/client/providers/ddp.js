/*
  These are the things we need to track.

  * Method calls (send) - 
  * Subscriptions (send) - 
  * Subscriptions (nosub) - 
  * Ready message (receive) - 
  * Updated message (receive) - 
  * Data Events ("added, updated, removed") // we can track these as blocks
*/

var IgnoringMethods = {
  "kadira.debug.updateTimeline": true
};
var ignoringMethodIds = {};

var conn = Meteor.connection;

// watch for receiving messages
var originalLivedataData = conn._livedata_data;
conn._livedata_data = function(msg) {
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
        if(ignoringMethodIds[id]) {
          delete ignoringMethodIds[id];
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
  return originalLivedataData.call(conn, msg);
};

// watch sending messages
var originalSend = conn._send;
conn._send = function(msg) {
  var info = {};
  var eventName = null;
  switch(msg.msg) {
    case "method":
      if(IgnoringMethods[msg.method]) {
        ignoringMethodIds["" + msg.id] = true;
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
      info.name = msg.name;
      info.id = msg.id;
      eventName = "ddp-unsub";
      break;
  }

  if(eventName) {
    StoreManager.trackEvent(eventName, info);
  }
  return originalSend.call(conn, msg);
};