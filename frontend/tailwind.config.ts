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
        // ─── Umuranga Brand Palette ───────────────────────────
        brand: {
          primary:   "#2b73f0",   // Main CTA blue
          secondary: "#2b71f0",   // Gradient / hover blue
          dark:      "#011b40",   // Dark navy — navbar, footer, headings
          light:     "#f6fcff",   // Light blue-white section backgrounds
          hover:     "#1a5fd4",   // Primary button hover
          border:    "#e2eaf6",   // Blue-tinted card borders
        },

        // ─── shadcn/ui CSS-variable tokens (required by shadcn components) ─
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
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
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

      borderRadius: {
        lg:   "var(--radius)",
        md:   "calc(var(--radius) - 2px)",
        sm:   "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },

      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      fontSize: {
        "display-xl": ["3.75rem", { lineHeight: "1.1", fontWeight: "800" }],
        "display-lg": ["3rem",    { lineHeight: "1.15", fontWeight: "700" }],
        "display-md": ["2.25rem", { lineHeight: "1.2",  fontWeight: "700" }],
        "display-sm": ["1.875rem",{ lineHeight: "1.25", fontWeight: "700" }],
      },

      backgroundImage: {
        "brand-gradient":      "linear-gradient(135deg, #2b73f0 0%, #011b40 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, #f6fcff 0%, #dbeafe 100%)",
        "hero-pattern":        "linear-gradient(135deg, #011b40 0%, #0d2d6b 60%, #2b73f0 100%)",
      },

      boxShadow: {
        card:    "0 1px 3px 0 rgba(43,115,240,0.08), 0 1px 2px -1px rgba(43,115,240,0.06)",
        "card-md":"0 4px 16px 0 rgba(43,115,240,0.10), 0 2px 4px -1px rgba(43,115,240,0.06)",
        "card-lg":"0 8px 32px 0 rgba(43,115,240,0.12), 0 4px 8px -2px rgba(43,115,240,0.08)",
      },

      spacing: {
        section: "6rem",
        "section-sm": "4rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
