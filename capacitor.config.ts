import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.dhbw.gruppe4.dateimanager',
  appName: 'Dateimanager',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
