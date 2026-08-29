import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` lo provee el empaquetador de Next, no un paquete: sin
      // este alias, cualquier prueba que alcance un módulo de servidor falla al
      // resolver el import. Ver `tests/stubs/server-only.ts`.
      "server-only": new URL("./tests/stubs/server-only.ts", import.meta.url).pathname
    }
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    restoreMocks: true
  }
});
