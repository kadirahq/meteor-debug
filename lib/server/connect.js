var SubHandlers = [];
var uniqueId = 0;

Meteor.methods({
  "kadira.debug.updateTimeline": function(browserId, clientId, data) {
    check(browserId, String);
    check(clientId, String);
    check(data, Object);

    SubHandlers.forEach(function(sub) {
      var id = "id" + ++uniqueId;
      sub.added('kdTimeline', id, {
        browserId: browserId,
        clientId: clientId,
        data: data
      });
      sub.removed('kdTimeline', id);
    });
  }
});

Meteor.publish('kadira.debug.timeline', function() {
  this.ready();
  var sub = this;

  SubHandlers.push(sub);
  sub.onStop(function() {
    var index = SubHandlers.indexOf(sub);
    SubHandlers.splice(index, 1);
  });
});