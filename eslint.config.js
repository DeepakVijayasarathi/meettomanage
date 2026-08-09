import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Deliberately NOT spreading reactHooks.configs.recommended: v7's "recommended"
      // bundles the full React Compiler rule suite (purity, set-state-in-effect,
      // immutability, ...) as errors, which assumes a React 19 + Compiler codebase.
      // This app is React 18 without the compiler, where those patterns (Date.now()
      // in a component body, setState in an effect syncing to a prop) are normal, not
      // bugs — only the two long-established hook rules apply here.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // The codebase relies on interface-based DTO/domain typing throughout
      // (see the readernest skill) with intentional unused-but-documented params
      // in a few adapter signatures — keep this a warning, not a build-breaking error.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  }
);
