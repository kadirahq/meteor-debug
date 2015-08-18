var UAParser = Npm.require('ua-parser-js');
// Remove `Kadira.aa` once properly connected
var traceStore = Kadira.aa = new TraceStore();
traceStore.start();

SubHandlers = {
  timeline: [],
  listeners: [],
  timechart: []
};
var uniqueId = 0;

Meteor.publish('kadira.debug.init', function(browserId, clientId) {
  check(browserId, String);
  check(clientId, String);

  var kadiraInfo = Kadira._getInfo();
  if(kadiraInfo) {
    var sessionId = kadiraInfo.session;

    traceStore.registerSession(sessionId, browserId, clientId);

    this.onStop(function() {
      traceStore.unregisterSession(browserId, clientId);
    });
  }
  this.ready();
});

Meteor.methods({
  'kadira.debug.updateTimeline': function(browserId, clientId, data) {
    check(browserId, String);
    check(clientId, String);
    check(data, Object);

    // update timeline
    SubHandlers.timeline.forEach(function(sub) {
      var id = 'id' + ++uniqueId;
      sub.added('kdTimeline', id, {
        browserId: browserId,
        clientId: clientId,
        data: data
      });
      sub.removed('kdTimeline', id);
    });
  },

  'kadira.debug.updateTimechart': function(browserId, clientId, data) {
    check(browserId, String);
    check(clientId, String);
    check(data, Object);

    // update timechart
    SubHandlers.timeline.forEach(function(sub) {
      var id = 'id' + ++uniqueId;
      // var id = getTimeChartId(data.timechart);
      var type = data.timechart.type;

      var revisedData = {};
      revisedData.timestamp = data.timestamp;
      revisedData.timechart = data.timechart;

      var serverData = traceStore.getTimeChart(browserId, clientId, type, id); // ## id?
      
      sub.added('kdTimechart', id, {
        browserId: browserId,
        clientId: clientId,
        client: revisedData,
        server: serverData
      });
      sub.removed('kdTimechart', id);
    });
  },

  'kadira.debug.getBrowserName': function(userAgent) {
    check(userAgent, String);
    var parser = new UAParser(userAgent);
    return parser.getResult().browser.name;
  },

  'kadira.debug.getTrace': function(browserId, clientId, type, id) {
    check(browserId, String);
    check(clientId, String);
    check(type, String);
    check(id, String);

    return traceStore.getTrace(browserId, clientId, type, id);
  }
});

Meteor.publish('kadira.debug.timeline', function() {
  this.ready();
  var sub = this;

  SubHandlers.timeline.push(sub);
  updateListenersCount();
  sub.onStop(function() {
    var index = SubHandlers.timeline.indexOf(sub);
    SubHandlers.timeline.splice(index, 1);
    updateListenersCount();
  });
});

Meteor.publish('kadira.debug.timechart', function() {
  this.ready();
  var sub = this;

  SubHandlers.timechart.push(sub);
  updateListenersCount();
  sub.onStop(function() {
    var index = SubHandlers.timechart.indexOf(sub);
    SubHandlers.timechart.splice(index, 1);
    updateListenersCount();
  });
});

Meteor.publish('kadira.debug.listeners', function() {
  var sub = this;
  var timelineCount = SubHandlers.timeline.length;
  sub.added('kdInfo', 'listeners-count', {count: timelineCount});
  sub.ready();


  SubHandlers.listeners.push(sub);
  sub.onStop(function() {
    var index = SubHandlers.listeners.indexOf(sub);
    SubHandlers.listeners.splice(index, 1);
  });
});

function updateListenersCount() {
  SubHandlers.listeners.forEach(function(sub) {
    var timelineCount = SubHandlers.timeline.length;
    sub.changed('kdInfo', 'listeners-count', {count: timelineCount});
  });
}

// function getTimeChartId(data) {
//   if(data.info.id) {
//     return data.info.id;
//   }

//   if(data.info.subs) {
//     return data.info.subs[0];
//   }

//   if(data.info.methods) {
//     return data.info.methods[0];
//   }
// }