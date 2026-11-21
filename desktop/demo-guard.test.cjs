// Run: node desktop/demo-guard.test.cjs
const assert = require("node:assert/strict");
const { decide, stripTenant, parseDemoRoot } = require("./demo-guard.cjs");

// reads pass
for (const m of ["GET", "get", "HEAD", "OPTIONS"]) assert.equal(decide(m, "/api/users/students"), "allow", m);

// every write is blocked
for (const m of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal(decide(m, "/api/users/students"), "block", m);
assert.equal(decide("POST", "/api/quiz-questions"), "block");
assert.equal(decide("POST", "/api/assignments"), "block");
assert.equal(decide("DELETE", "/t/readernest/api/users/abc"), "block");
assert.equal(decide("POST", "/hubs/classroom/negotiate"), "block");
assert.equal(decide("POST", "/api/chatbot/ask"), "block");

// only sign-in POSTs are allowed, with or without a tenant prefix or trailing slash
assert.equal(decide("POST", "/api/auth/login"), "allow");
assert.equal(decide("POST", "/api/auth/login/"), "allow");
assert.equal(decide("POST", "/t/readernest/api/auth/login"), "allow");
assert.equal(decide("POST", "/api/auth/login/two-factor"), "allow");
// ...and nothing that merely looks similar
assert.equal(decide("POST", "/api/auth/login-as"), "block");
assert.equal(decide("POST", "/api/auth/change-pin"), "block");
assert.equal(decide("POST", "/api/auth/forgot-pin"), "block");
assert.equal(decide("PUT", "/api/auth/login"), "block");
assert.equal(decide("POST", "/x/api/auth/login"), "block");

assert.equal(stripTenant("/t/readernest/api/users"), "/api/users");
assert.equal(stripTenant("/api/users"), "/api/users");

assert.equal(parseDemoRoot("https://api.thereadernest.in/api"), "https://api.thereadernest.in");
assert.equal(parseDemoRoot("https://api.thereadernest.in/api/"), "https://api.thereadernest.in");
assert.equal(parseDemoRoot("https://api.thereadernest.in"), "https://api.thereadernest.in");
assert.equal(parseDemoRoot("http://api.thereadernest.in"), "");
assert.equal(parseDemoRoot("https://evil.com/steal"), "");
assert.equal(parseDemoRoot("https://user:pw@api.thereadernest.in"), "");
assert.equal(parseDemoRoot("not a url"), "");
assert.equal(parseDemoRoot(""), "");

console.log("demo-guard: all checks passed");
