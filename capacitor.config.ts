import { CapacitorConfig } from '@capacitor/cli';

const allowNavigationHosts = [
  'honeydobyamber500.vercel.app',
  '*.vercel.app',
  'honeydo-by-amber.web.app',
  'honeydo-by-amber.firebaseapp.com',
  'localhost',
  '127.0.0.1',
  '10.0.2.2',
  '*.ngrok-free.app',
  '*.ngrok-free.dev',
];

const serverUrl = process.env.CAP_SERVER_URL;

const serverConfig = serverUrl
  ? {
      url: serverUrl,
      cleartext: serverUrl.startsWith('http://'),
      allowNavigation: allowNavigationHosts,
    }
  : { allowNavigation: allowNavigationHosts };

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
