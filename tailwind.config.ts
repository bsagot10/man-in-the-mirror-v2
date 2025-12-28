import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Studio Ghibli Green Theme (from original Flask app)
        primary: {
          green: '#4a7c59',
          soft: '#8fc4aa',
          forest: '#2d4a37',
        },
        warm: {
          50: '#fef6e4',
          100: '#f7e8d0',
          200: '#e8d5b5',
          300: '#d4bc94',
          400: '#c4a575',
          500: '#a68a5b',
          600: '#8b6f47',
          700: '#5a4a3a',
          800: '#4a3c2e',
          900: '#3a2f24',
          cream: '#fef6e4',
          beige: '#f7e8d0',
          amber: '#fff4e6',
        },
        // Functional colors
        positive: '#52c41a',
        negative: '#ff4d4f',
        warning: '#faad14',
        info: '#1890ff',
        // Chart Colors
        chart: {
          vix: '#F44336',
          tqqq: '#00BCD4',
          sqqq: '#E91E63',
          decay: '#4CAF50',
          threshold: '#FF9800',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      backgroundImage: {
        'warm-gradient': 'linear-gradient(135deg, #fef6e4 0%, #f7e8d0 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
