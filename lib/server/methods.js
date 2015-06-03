Meteor.methods({
  "kadira.debug.updateTimeline": function(browserId, clientId, data) {
    check(browserId, String);
    check(clientId, String);
    check(data, Object);
  }
});