import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.atelier.app',
  appName: 'Atelier',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: { launchAutoHide: false },
  },
}

export default config
