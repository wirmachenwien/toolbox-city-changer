// Shared failure counter for the scripts/bin/ checkers (import-only).
//
// Every checker prints `FAIL: <message>` per problem and the process exits
// non-zero when any failure was recorded. Success messaging stays with the
// caller (each check reports its own summary on success).
export function createReporter() {
  let failures = 0;
  return {
    fail(message) {
      failures += 1;
      console.error(`FAIL: ${message}`);
    },
    get failures() {
      return failures;
    },
    hasFailures() {
      return failures > 0;
    },
  };
}
