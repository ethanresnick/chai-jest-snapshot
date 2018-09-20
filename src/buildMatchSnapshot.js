import path from "path";
import values from "lodash.values";
import { SnapshotState } from "jest-snapshot";

const buildMatchSnapshot = (utils, parseArgs) => {
  if (thisRunsInJest()) {
    const jestExpect = safeRequireJestExpect();
    if (jestExpect) {
      return function matchSnapshot(...args) {
        return jestExpect(this._obj).toMatchSnapshot(...args);
      }
    }
  }

  return function matchSnapshot(...args) {
    // support passing a property matcher object as first argument.
    // This is backwards compatible, as all the prior args were strings or bools.
    const propertyMatchers = (typeof args[0] === 'object') ? args.shift() : undefined;
    const { snapshotFilename, snapshotName, update, ci } = parseArgs(args);

    if (utils.flag(this, 'negate')) {
      throw new Error("`matchSnapshot` cannot be used with `.not`.");
    }

    const obj = this._obj;
    const absolutePathToSnapshot = path.resolve(snapshotFilename);
    const snapshotState = new SnapshotState(undefined, {
      updateSnapshot: ci ? "none" : (update ? "all" : "new"),
      snapshotPath: absolutePathToSnapshot,
    });

    const match = snapshotState.match({
      testName: snapshotName,
      received: Object.assign({}, obj, propertyMatchers),
      key: snapshotName
    });

    const actual = match.actual || "";
    const expected = match.expected || "";
    snapshotState.save();

    this.assert(
      match.pass,
      `expected value to match snapshot ${snapshotName}`,
      `expected value to not match snapshot ${snapshotName}`,
      expected.trim(),
      actual.trim(),
      true
    );
  };
};

const safeRequireJestExpect = () => {
  // Jest might rename its "jest-matchers" module to "expect", so let's
  // avoid an actual require and bank on the global expect here.
  // (see https://github.com/facebook/jest/issues/1679#issuecomment-282478002)
  return (typeof expect === 'undefined') ? null : expect;
};

const JEST_MARKERS = ["enableAutomock", "genMockFromModule", "clearAllMocks", "runAllTicks"];

const thisRunsInJest = () => (
  typeof jest === "object" &&
  JEST_MARKERS.every((marker) => typeof jest[marker] === "function")
);

export default buildMatchSnapshot;
