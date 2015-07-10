if(Package['meteorhacks:kadira-debug']) {
  console.log("\n");
  console.log("You have an older version of Kadira Debug");
  console.log("You need to remove `meteorhacks:kadira-debug`");
  console.log("Run: `meteor remove meteorhacks:kadira-debug`");
  console.log("\n");
  process.kill(process.pid);
}