/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Deep teal / dark green primary — communicates trust, cooperation,
        // public service (per brand direction: avoid a generic startup look).
        coop: {
          50: "#eff8f6",
          100: "#d7ede8",
          200: "#aedbd1",
          300: "#7cc2b4",
          400: "#4aa392",
          500: "#2f8676",
          600: "#22695d",
          700: "#1d554c",
          800: "#17423c",
          900: "#123530",
          950: "#0a1f1c",
        },
        // Warm gold secondary accent
        gold: {
          50: "#fdf7e9",
          100: "#f9ecc4",
          200: "#f2d78a",
          300: "#e9bd4c",
          400: "#dfa726",
          500: "#c68a17",
          600: "#a06d12",
        },        // Kept as an alias so any earlier saffron-* usages keep working
        saffron: {
          500: "#dfa726",
          600: "#a06d12",
        },
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
