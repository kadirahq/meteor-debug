console.log("dsdsd");
Meteor.methods({
  "kadira.debug.updateTimeline": function(data) {
    check(data, Object);
  }
});