import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefdf3",
          100: "#d6f9e0",
          300: "#7fe3a4",
          400: "#3ecf76", // verde grama bajo reflectores (para fondos oscuros)
          500: "#16a34a",
          600: "#15803d",
          700: "#166534",
          900: "#0b3d22",
        },
        // noche de estadio: negros entintados hacia el verde (nunca #000)
        night: {
          950: "#060f0a",
          900: "#0a1810",
          800: "#11241a",
          700: "#1a3526",
        },
        // dorado quetzal: el color del pozo y del dinero
        gold: {
          300: "#f8d999",
          400: "#f3bd55",
          500: "#e8a82e",
          600: "#c08312",
          700: "#8f5f0a",
        },
        cream: "#f7f4ea",
        ink: "#0a0f0d",
      },
      fontFamily: {
        sans: ["Archivo", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
