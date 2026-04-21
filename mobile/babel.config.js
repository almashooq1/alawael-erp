/**
 * babel.config.js — required by Expo 49 + React Native 0.72 + Jest.
 *
 * Without this file, `babel-jest` has no preset chain and fails to
 * strip Flow syntax out of react-native's internal files (notably
 * `@react-native/js-polyfills/error-guard.js` which uses `type`
 * annotations), and `jest-expo` cannot run any suite.
 *
 * `babel-preset-expo` is the upstream canonical preset — it bundles
 * the right mix of `@babel/preset-env` + TypeScript + JSX + Flow
 * + the RN-specific transforms. No custom plugins needed.
 */

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
