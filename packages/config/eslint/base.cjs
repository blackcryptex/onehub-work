module.exports = {
  root: false,
  env: { browser: true, node: true, es2022: true },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react/jsx-runtime",
    "prettier"
  ],
  settings: { react: { version: "detect" } },
  ignorePatterns: ["apps/web/next-env.d.ts"],
  rules: {
    "@typescript-eslint/explicit-function-return-type": ["off"],
    "@typescript-eslint/no-explicit-any": ["warn", { ignoreRestArgs: true }],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["warn", {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      ignoreRestSiblings: true
    }],
    "react/prop-types": "off",
    "react/no-unescaped-entities": "error"
  }
};
