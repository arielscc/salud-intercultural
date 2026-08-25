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
      "src/types/payload-types.ts",
      // Datos locales que no son código: adjuntos clínicos y respaldos. ESLint 9
      // recorre los directorios que empiezan con punto, y `.data/` llega a pesar
      // decenas de megas, con lo que `pnpm lint` se queda sin memoria.
      ".data/**",
      ".gstack/**",
      ".claude/**",
      "docker/**"
    ]
  }
];

export default eslintConfig;
