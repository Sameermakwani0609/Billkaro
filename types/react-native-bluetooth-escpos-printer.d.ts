declare module 'react-native-bluetooth-escpos-printer' {
  interface BluetoothDevice {
    name: string;
    address: string;
  }

  interface PrintTextOptions {
    encoding?: string;
    widthtimes?: number;
    heigthtimes?: number;
  }

  export const ALIGN: {
    LEFT: number;
    CENTER: number;
    RIGHT: number;
  };

  export default class BluetoothEscposPrinter {
    static isBluetoothEnabled(): Promise<boolean>;
    static enableBluetooth(): Promise<void>;
    static getBluetoothDeviceList(): Promise<BluetoothDevice[]>;
    static connectPrinter(address: string): Promise<void>;
    static disconnectPrinter(): Promise<void>;
    static setAlignment(align: number): Promise<void>;
    static printText(text: string, options?: PrintTextOptions): Promise<void>;
    static cutPaper(): Promise<void>;
  }
}