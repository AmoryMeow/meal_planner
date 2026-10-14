import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        React: "readonly",
        HTMLElement: "readonly",
        Element: "readonly",
        Node: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      import: importPlugin,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-console": "warn",

      // Import sorting and grouping rules
      "import/order": [
        "error",
        {
          groups: [
            "builtin", // Node.js built-in modules
            "external", // External libraries (react, axios, etc.)
            "internal", // Internal modules (@package/*)
            ["parent", "sibling"], // Relative imports (../, ./)
            "index", // Index imports
          ],
          pathGroups: [
            {
              pattern: "@package/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
    },
  },
  {
    ignores: ["node_modules/**", "dist/**", "build/**"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // TypeScript already reports undefined identifiers, including type-only names.
      "no-undef": "off",
    },
  },
];
