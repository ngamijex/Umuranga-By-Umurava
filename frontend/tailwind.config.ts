import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Design System Palette (exact from CSS guide) ──── */
        primary: {
          DEFAULT: "#2B72F0",
          dark:    "#1D4ED8",
          light:   "#6B9CF5",
          50:      "#EFF6FF",
          100:     "#DBEAFE",
          200:     "#BFDBFE",
          400:     "#60A5FA",
          500:     "#3B82F6",
          600:     "#2563EB",
          700:     "#1D4ED8",
          800:     "#1E40AF",
          900:     "#1E3A8A",
        },
        hero: {
          DEFAULT: "#0F3460",
          alt:     "#1A4A7A",
        },
        section: {
          blue:      "#EFF6FF",
          "blue-mid":"#DBEAFE",
          dark:      "#1E3A8A",
          "dark-alt":"#0F2D6B",
        },
        navy:  "#0F172A",
        brand: {
          /* Legacy aliases kept for any existing usage */
          primary:  "#3B82F6",
          dark:     "#0F3460",
          navy:     "#0F172A",
          light:    "#EFF6FF",
          hover:    "#2563EB",
          border:   "#E5E7EB",
        },

        /* ── shadcn/ui CSS-variable tokens ─────────────────── */
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input:  "hsl(var(--input))",
        ring:   "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },

      fontFamily: {
        sans: ["Work Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },

      fontSize: {
        "display-xl": ["3.75rem", { lineHeight: "1.1",  fontWeight: "800" }],
        "display-lg": ["3.5rem",  { lineHeight: "1.15", fontWeight: "800" }],
        "display-md": ["2.25rem", { lineHeight: "1.25", fontWeight: "700" }],
        "display-sm": ["1.875rem",{ lineHeight: "1.3",  fontWeight: "700" }],
      },

      borderRadius: {
        sm:    "0.25rem",
        md:    "0.5rem",
        lg:    "0.75rem",
        xl:    "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        full:  "9999px",
      },

      boxShadow: {
        card:         "0 2px 8px rgba(0,0,0,0.06)",
        "card-hover": "0 8px 24px rgba(59,130,246,0.12)",
        blue:         "0 4px 14px rgba(59,130,246,0.25)",
        "card-md":    "0 4px 16px rgba(59,130,246,0.10)",
        "card-lg":    "0 8px 32px rgba(59,130,246,0.12)",
      },

      backgroundImage: {
        "dot-pattern": "radial-gradient(circle, rgba(96,165,250,0.18) 1.5px, transparent 1.5px)",
        "dot-white":   "radial-gradient(circle, rgba(255,255,255,0.18) 1.5px, transparent 1.5px)",
      },

      spacing: {
        section:    "5rem",
        "section-lg": "6rem",
        "section-sm": "3rem",
        navbar:     "70px",
      },

      animation: {
        "pulse-dot": "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-in":   "fadeIn 0.4s ease forwards",
      },

      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
