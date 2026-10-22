import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        banana: { DEFAULT: "#FFD400", dark: "#E6B800" }
      }
    }
  },
  plugins: []
};
export default config;
