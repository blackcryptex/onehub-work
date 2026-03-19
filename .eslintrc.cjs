module.exports = {
  root: true,
  extends: ["./packages/config/eslint/base.cjs"],
  ignorePatterns: ["**/dist/**", "**/.next/**", "**/coverage/**"],
};
