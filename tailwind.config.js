/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
      colors: {
        hotel: {
          navy: "#0F172A",
          blue: "#1E3A8A",
          gold: "#D4A017",
          light: "#F8FAFC",
        },
      },
    },
  },
  plugins: [],
};