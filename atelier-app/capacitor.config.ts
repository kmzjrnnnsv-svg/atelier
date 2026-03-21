import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.atelier.app',
  appName: 'Atelier',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#ffffff',
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: { launchAutoHide: false },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#ffffff',
    },
  },
}

export default config
