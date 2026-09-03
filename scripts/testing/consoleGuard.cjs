function formatArguments(args) {
  return args
    .map((value) => {
      if (value instanceof Error) {
        return `${value.name}: ${value.message}`;
      }
      return typeof value === "string" ? JSON.stringify(value) : String(value);
    })
    .join(", ");
}

function callsAreEqual(actual, expected) {
  return (
    actual.length === expected.length &&
    actual.every((value, index) => Object.is(value, expected[index]))
  );
}

function createConsoleGuard() {
  const expectedCalls = [];
  let expectationRegistrationAllowed = true;

  function expectCall(method, args) {
    if (!expectationRegistrationAllowed) {
      const helperName = method === "error" ? "expectConsoleError" : "expectConsoleWarning";
      throw new Error(
        `${helperName} can only be registered during an active test, immediately before the expected call.`,
      );
    }
    expectedCalls.push({ args, method });
  }

  function handleCall(method, args) {
    const expected = expectedCalls[0];
    if (
      expected &&
      expected.method === method &&
      callsAreEqual(args, expected.args)
    ) {
      expectedCalls.shift();
      return;
    }

    throw new Error(
      `Unexpected console.${method} call: ${formatArguments(args)}`,
    );
  }

  return {
    error: (...args) => handleCall("error", args),
    expectError: (...args) => expectCall("error", args),
    expectWarning: (...args) => expectCall("warn", args),
    reset: () => {
      expectedCalls.length = 0;
    },
    setExpectationRegistrationAllowed: (allowed) => {
      expectationRegistrationAllowed = allowed;
    },
    verify: () => {
      const expected = expectedCalls[0];
      if (expected) {
        throw new Error(
          `Expected console.${expected.method} call was not observed: ${formatArguments(expected.args)}`,
        );
      }
    },
    warn: (...args) => handleCall("warn", args),
  };
}

const sharedGuard = createConsoleGuard();

function expectConsoleError(...args) {
  sharedGuard.expectError(...args);
}

function expectConsoleWarning(...args) {
  sharedGuard.expectWarning(...args);
}

function installConsoleGuard() {
  sharedGuard.reset();
  sharedGuard.setExpectationRegistrationAllowed(false);
  console.error = sharedGuard.error;
  console.warn = sharedGuard.warn;

  beforeEach(() => {
    sharedGuard.reset();
    sharedGuard.setExpectationRegistrationAllowed(true);
  });

  afterEach(() => {
    let verificationError;
    try {
      sharedGuard.verify();
    } catch (caught) {
      verificationError = caught;
    } finally {
      sharedGuard.setExpectationRegistrationAllowed(false);
      sharedGuard.reset();
    }

    if (verificationError) {
      throw verificationError;
    }
  });
}

module.exports = {
  createConsoleGuard,
  expectConsoleError,
  expectConsoleWarning,
  installConsoleGuard,
};
