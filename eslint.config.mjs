import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "src/generated/**",
      "src/types/payload-types.ts"
    ]
  }
];

export default eslintConfig;
