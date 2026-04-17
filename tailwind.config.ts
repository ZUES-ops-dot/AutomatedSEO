import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "rgb(var(--bg) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-muted": "rgba(139, 92, 246, 0.15)",
        aqua: "rgb(var(--cyan) / <alpha-value>)",
        line: "rgba(255, 255, 255, 0.07)"
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem"
      },
      boxShadow: {
        glow: "0 0 20px -4px rgba(139, 92, 246, 0.25), 0 0 0 1px rgba(139, 92, 246, 0.12)",
        "glow-cyan": "0 0 20px -4px rgba(34, 211, 238, 0.2), 0 0 0 1px rgba(34, 211, 238, 0.1)",
        card: "0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25)"
      },
      backgroundImage: {
        "mesh": "radial-gradient(ellipse at 20% 0%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(34,211,238,0.06) 0%, transparent 50%)"
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
