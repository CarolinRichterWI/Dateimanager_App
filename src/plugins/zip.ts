import { Capacitor, registerPlugin } from '@capacitor/core';

interface ZipOptions {
  source: string;
  destination: string;
  password?: string;
}

interface ZipPlugin {
  zip(options: ZipOptions): Promise<void>;
  unzip(options: ZipOptions): Promise<void>;
}

export const Zip = registerPlugin<ZipPlugin>('Zip');

export const isNativeZipAvailable = (): boolean =>
  Capacitor.getPlatform() !== 'web' && Capacitor.isPluginAvailable('Zip');
