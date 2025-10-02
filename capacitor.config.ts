import { CapacitorConfig } from '@capacitor/cli';

const allowNavigationHosts = [
  'ambers-affirmations.web.app',
  'ambers-affirmations.firebaseapp.com',
  'localhost',
  '127.0.0.1',
  '10.0.2.2',
  '*.ngrok-free.app',
  '*.ngrok-free.dev',
];

const defaultServerUrl = process.env.CAP_SERVER_URL || 'https://ambers-affirmations.web.app';

const serverConfig = {
  url: defaultServerUrl,
  cleartext: defaultServerUrl.startsWith('http://'),
  allowNavigation: allowNavigationHosts,
};

const config: CapacitorConfig = {
  appId: 'com.honeydo.byamber',
  appName: 'HoneyDo by Amber',
  webDir: 'out',
  bundledWebRuntime: false,
  server: serverConfig,
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#fff8e1',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#fff8e1',
  },
};

export default config;
