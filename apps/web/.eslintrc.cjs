module.exports = {
  root: false,
  extends: ["../../packages/config/eslint/base.cjs"],
  ignorePatterns: ["scripts/codemods/**"],
  rules: {
    "no-irregular-whitespace": "error",
    "no-useless-escape": "warn",
    "react/no-unescaped-entities": ["warn", { forbid: [">", "}", '"', "'"] }],
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      rules: {
        "react/prop-types": "off",
      },
    },
  ],
};
