import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.atelier.app',
  appName: 'Atelier',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#ffffff',
    preferredContentMode: 'mobile',
    // Allow WKWebView to send cookies cross-origin to the API server
    allowsLinkPreview: false,
  },
  server: {
    // Allow mixed content and cross-origin requests to the API
    allowNavigation: ['raza.work', '*.raza.work'],
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
