import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      keyframes: { flicker: { '0%,100%':{opacity:'1'}, '50%':{opacity:'0.6'} } },
      animation: { flicker: 'flicker 2s ease-in-out infinite' }
    },
  },
  plugins: [],
};
export default config;
