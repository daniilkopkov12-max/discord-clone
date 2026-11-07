/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        discord: {
          blurple: '#5865F2',
          green: '#57F287',
          yellow: '#FEE75C',
          fuchsia: '#EB459E',
          red: '#ED4245',
          bgPrimary: '#313338',
          bgSecondary: '#2B2D31',
          bgTertiary: '#1E1F22',
          bgFloating: '#232428',
          bgChannel: '#35373C',
          channelHover: '#35373C',
          channelActive: '#404249',
          textNormal: '#DBDEE1',
          textMuted: '#949BA4',
          textHeader: '#F2F3F5',
          divider: '#35363C',
          border: '#3F4147'
        }
      }
    },
  },
  plugins: [],
}
