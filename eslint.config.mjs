import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "dist/**"],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    // [Note] Circular Ref Fix: Explicit rule-only block separate from plugin loading logic
    rules: {
      "react/react-in-jsx-scope": "off",
    },
  },
];

export default eslintConfig;
