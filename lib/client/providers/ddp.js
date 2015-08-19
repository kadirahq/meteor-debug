DDPProvider = {
  ignoringMethods: {
    "kadira.debug.updateTimeline": true
  },
  ignoringMethodIds: {}
};

var conn = Meteor.connection;

// watch incoming messages
DDPProvider._livedata_data = function(original) {
  var currentLiveUpdateMessageBlock = null;
  var flushScheduleHandler = null;

  // flush live updates just before sending data to the server
  StoreManager.beforePush(flushLiveUpdates);

  return function(msg) {
    var info = {};
    var eventName = null;

    trackLiveUpdates(msg);

    switch(msg.msg) {
      case "ready": 
        eventName = "ddp-ready";
        info.subs = msg.subs;
        _.each(info.subs, function(sub) {
          StoreManager.trackTime('pubsub', sub, 'ready');
        });
        break;
      case "updated":
        var methods = [];
        // removing ignoring methods
        _.each(msg.methods, function(id) {
          if(DDPProvider.ignoringMethodIds[id]) {
            if(--DDPProvider.ignoringMethodIds[id] === 0) {
              delete DDPProvider.ignoringMethodIds[id];
            }
          } else {
            methods.push(id);
            StoreManager.trackTime('method', id, 'updated');
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

  function trackLiveUpdates(msg) {
    if(msg.msg == "added" || msg.msg == "removed" || msg.msg == "changed") {
      // decide whether to flush or not
      // we don't need to flush if we are getting same type of message
      // fortunately, DDP send similar messages together.
      // so we can group them easily
      var canFlush = 
        !currentLiveUpdateMessageBlock ||
        currentLiveUpdateMessageBlock.type != msg.msg ||
        currentLiveUpdateMessageBlock.collection != msg.collection;
      if(canFlush) {
        flushLiveUpdates();
      }

      // add the block for first time after reset when flushing
      if(!currentLiveUpdateMessageBlock) {
        currentLiveUpdateMessageBlock = {
          type: msg.msg,
          collection: msg.collection,
          startTime: Date.now(),
          count: 0,
          lastUpdatedAt: Date.now(),
          sampleMessages: [],
        };
      }

      currentLiveUpdateMessageBlock.sampleMessages.push(msg);
      // Only keep upto 5 ddp messages.
      // This is to avoid sending too many data
      // XXX: We may also need to check for the size of the individual
      // message also
      if(currentLiveUpdateMessageBlock.sampleMessages.length > 5) {
        currentLiveUpdateMessageBlock.sampleMessages.shift();
      }

      // increment the block
      currentLiveUpdateMessageBlock.count++;
      currentLiveUpdateMessageBlock.lastUpdatedAt = Date.now();
      // scheduleForFlush();
    } else {
      // flush tracking directly for other messages
      flushLiveUpdates();
    }
  }

  function flushLiveUpdates() {
    if(!currentLiveUpdateMessageBlock) {
      return;
    }

    var info = currentLiveUpdateMessageBlock;
    var startAt = info.startTime;
    StoreManager.trackEvent('live-updates', info, startAt);

    // reset the current block
    currentLiveUpdateMessageBlock = null;
  }
};
Utils.override(conn, '_livedata_data', DDPProvider._livedata_data);

DDPProvider._livedata_result = function(original) {
  // XXX: Track result as an event
  // It has the whether this message is an error or not
  return function(msg) {
    if(DDPProvider.ignoringMethodIds[msg.id]) {
      if(--DDPProvider.ignoringMethodIds[msg.id] === 0) {
        delete DDPProvider.ignoringMethodIds[msg.id];
      }
    } else {
      StoreManager.trackTime('method', msg.id, 'result');
    }

    original.call(conn, msg);
  };
};
Utils.override(conn, '_livedata_result', DDPProvider._livedata_result);

DDPProvider._livedata_nosub = function(original) {
  return function(msg) {
    var eventName = "ddp-nosub";
    var info = _.pick(msg, 'id', 'error');
    StoreManager.trackTime('pubsub', msg.id, 'nosub');
    StoreManager.trackEvent(eventName, info);

    original.call(conn, msg);
  };
};
Utils.override(conn, '_livedata_nosub', DDPProvider._livedata_nosub);

// watch outgoing messages
DDPProvider._send = function(original) {
  return function(msg) {
    var info = {};
    var eventName = null;
    switch(msg.msg) {
      case "method":
        if(DDPProvider.ignoringMethods[msg.method]) {
          DDPProvider.ignoringMethodIds["" + msg.id] = 2;
          break;
        }
        info.name = msg.method;
        info.id = msg.id;
        eventName = "ddp-method";
        var timeInfo = {name: msg.method};
        StoreManager.trackTime('method', msg.id, 'start', timeInfo);
        break;
      case "sub":
        info.name = msg.name;
        info.id = msg.id;
        eventName = "ddp-sub";
        var timeInfo = {name: msg.name};
        StoreManager.trackTime('pubsub', msg.id, 'start', timeInfo);
        break;
      case "unsub":
        info.id = msg.id;
        eventName = "ddp-unsub";
        StoreManager.trackTime('pubsub', msg.id, 'unsub');
        break;
    }

    if(eventName) {
      StoreManager.trackEvent(eventName, info);
    }
    return original.call(conn, msg);
  };
};
Utils.override(conn, '_send', DDPProvider._send);