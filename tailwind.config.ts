import type { Config } from "tailwindcss";
import defaultColors from "tailwindcss/colors";
import plugin from "tailwindcss/plugin";

/**
 * Dark mode for the raw palette classes used across the app (bg-rose-50, text-amber-700, ...).
 * Each shade is a CSS variable: light mode keeps Tailwind's own values, dark mode swaps in the
 * mirrored shade (light tints become dark tints, dark text becomes light text). `.keep-light`
 * opts a subtree out, e.g. the brand gradients that already look right on any background.
 */
const PALETTES = [
  "slate", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal",
  "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
] as const;
const SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;
type Shade = (typeof SHADES)[number];
const DARK_SHADE: Record<Shade, Shade> = {
  "50": "950", "100": "900", "200": "800", "300": "700", "400": "500", "500": "500",
  "600": "500", "700": "400", "800": "300", "900": "200", "950": "950",
};
// The dark card colour; the faintest tints are blended toward it so they read as soft tints.
const DARK_BASE = [17, 24, 39];
const TINT_BLEND: Partial<Record<Shade, number>> = { "50": 0.45, "100": 0.6 };

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const triplet = ([r, g, b]: number[]) => `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;
const palette = (name: string) => (defaultColors as unknown as Record<string, Record<Shade, string>>)[name];

const lightVars: Record<string, string> = {};
const darkVars: Record<string, string> = {};
const paletteColors: Record<string, Record<string, string>> = {};
for (const name of PALETTES) {
  paletteColors[name] = {};
  for (const shade of SHADES) {
    const key = `--c-${name}-${shade}`;
    lightVars[key] = triplet(rgb(palette(name)[shade]));
    const target = rgb(palette(name)[DARK_SHADE[shade]]);
    const blend = TINT_BLEND[shade];
    darkVars[key] = triplet(blend ? target.map((c, i) => c * blend + DARK_BASE[i] * (1 - blend)) : target);
    paletteColors[name][shade] = `rgb(var(${key}) / <alpha-value>)`;
  }
}

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      // Thai glyphs read small at Tailwind's defaults; bump the small end of the scale.
      fontSize: {
        xs: ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],
        sm: ["0.96875rem", { lineHeight: "1.5rem" }],
        base: ["1.0625rem", { lineHeight: "1.75rem" }],
      },
      colors: {
        ...paletteColors,
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      borderRadius: {
        xl: "1rem",
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        card: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)",
        popover: "0 10px 15px -3px rgb(15 23 42 / 0.08), 0 4px 6px -4px rgb(15 23 42 / 0.08)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "bar-grow": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        "ring-fill": {
          from: { strokeDashoffset: "var(--ring-circumference)" },
          to: { strokeDashoffset: "var(--ring-offset)" },
        },
        "column-grow": {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.2", transform: "scale(0.7)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(40px, -50px) scale(1.12)" },
          "66%": { transform: "translate(-30px, 30px) scale(0.92)" },
        },
        "dot-pan": {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "28px 28px" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.15)" },
        },
      },
      animation: {
        "column-grow": "column-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        twinkle: "twinkle 2.4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        drift: "drift 18s ease-in-out infinite",
        "dot-pan": "dot-pan 6s linear infinite",
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "rise-in": "rise-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "bar-grow": "bar-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        "ring-fill": "ring-fill 1.2s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ":root, .dark .keep-light": lightVars,
        ".dark": darkVars,
      });
    }),
  ],
};
export default config;
