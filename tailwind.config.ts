import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        "primary-dark": "rgb(var(--color-primary-dark) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        background: "rgb(var(--color-background) / <alpha-value>)",
        foreground: "hsl(var(--foreground))",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-soft": "rgb(var(--color-surface-soft) / <alpha-value>)",
        text: "rgb(var(--color-text) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "rgb(var(--color-border) / <alpha-value>)",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        success: "rgb(var(--color-success) / <alpha-value>)",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        }
      },
      boxShadow: {
        soft: "0 18px 70px rgb(var(--shadow-brand) / 0.14)",
        lift: "0 20px 44px rgb(var(--shadow-strong) / 0.18)"
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(circle at 16% 18%, rgb(var(--color-primary) / 0.18), transparent 32%), radial-gradient(circle at 86% 10%, rgb(var(--color-secondary) / 0.13), transparent 30%), linear-gradient(135deg, rgb(var(--color-background)) 0%, rgb(var(--color-surface-soft)) 48%, rgb(var(--hero-end)) 100%)"
      }
    }
  },
  plugins: []
};

export default config;
