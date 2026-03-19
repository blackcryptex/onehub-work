import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#4f46e5", // indigo-600
          foreground: "#ffffff"
        },
        accent: {
          DEFAULT: "#6366f1", // indigo-500
          foreground: "#ffffff"
        },
        success: {
          DEFAULT: "#10b981", // emerald-500
          foreground: "#052e1e"
        },
        warning: {
          DEFAULT: "#f59e0b", // amber-500
          foreground: "#3a2a06"
        },
        danger: {
          DEFAULT: "#f43f5e", // rose-500
          foreground: "#4a0e18"
        }
      },
      borderRadius: {
        none: "0",
        sm: "0.25rem",
        DEFAULT: "1rem",
        lg: "1.25rem",
        xl: "1.5rem",
        "2xl": "1.75rem"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.02)"
      }
    }
  },
  plugins: []
};

export default config;
