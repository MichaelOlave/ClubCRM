import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Import direction: lib/ and components/ must not import from features/ or app/.
  // Enforces: app → features → components → lib
  {
    files: ["src/lib/**", "src/components/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/features/**", "**/app/**"],
              message: "lib/ and components/ must not import from features/ or app/.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
