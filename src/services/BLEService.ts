import BleManager, {
  BleManagerDidUpdateValueForCharacteristicEvent,
  BleScanCallbackType,
  BleScanMatchMode,
  BleScanMode,
  Peripheral,
} from 'react-native-ble-manager';
import {EventEmitter} from 'events';
import {
  PermissionsAndroid,
  Platform,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import {BLEDevice, BLEMessage, ConnectionStatus} from '../types/ble';

class BLEService extends EventEmitter {
  private bleManagerEmitter: NativeEventEmitter;
  private isScanning: boolean = false;
  private connectedDevice: string | null = null;

  // UUIDs do Nordic UART Service
  private readonly SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
  private readonly TX_CHARACTERISTIC_UUID =
    '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
  private readonly RX_CHARACTERISTIC_UUID =
    '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';

  constructor() {
    super();
    this.bleManagerEmitter = new NativeEventEmitter(NativeModules.BleManager);
    this.setupEventListeners();
  }

  async initialize(): Promise<void> {
    try {
      await BleManager.start({showAlert: false});
      await this.requestPermissions();
      console.log('BLE Manager inicializado');
    } catch (error) {
      console.error('Erro ao inicializar BLE Manager:', error);
      throw error;
    }
  }

  private async requestPermissions(): Promise<void> {
    if (Platform.OS === 'android') {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ];

      if (Platform.Version >= 31) {
        permissions.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        );
      }

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      const allGranted = Object.values(granted).every(
        status => status === PermissionsAndroid.RESULTS.GRANTED,
      );

      if (!allGranted) {
        throw new Error('Permissões Bluetooth negadas');
      }
    }
  }

  private setupEventListeners(): void {
    this.bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      this.onDeviceDiscovered,
    );
    this.bleManagerEmitter.addListener('BleManagerStopScan', this.onScanStop);
    this.bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      this.onDeviceDisconnected,
    );
    this.bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      this.onDataReceived,
    );
  }

  private readonly onDeviceDiscovered = (peripheral: Peripheral): void => {
    const device: BLEDevice = {
      id: peripheral.id,
      name:
        peripheral.name ||
        peripheral.advertising?.localName ||
        'Dispositivo Desconhecido',
      rssi: peripheral.rssi,
      advertising: peripheral.advertising,
    };
    this.emit('deviceDiscovered', device);
  };

  private readonly onScanStop = (): void => {
    this.isScanning = false;
    this.emit('scanStop');
  };

  private readonly onDeviceDisconnected = (): void => {
    this.connectedDevice = null;
    const status: ConnectionStatus = {
      isConnected: false,
    };
    this.emit('connectionStatusChanged', status);
  };

  private readonly onDataReceived = (
    data: BleManagerDidUpdateValueForCharacteristicEvent,
  ): void => {
    const message = this.bytesToString(data.value);
    const bleMessage: BLEMessage = {
      id: Date.now().toString(),
      message,
      timestamp: new Date(),
      direction: 'received',
    };
    this.emit('messageReceived', bleMessage);
  };

  async startScan(timeoutSeconds: number = 10): Promise<void> {
    if (this.isScanning) {
      return;
    }

    try {
      this.isScanning = true;
      await BleManager.scan([], timeoutSeconds, false, {
        matchMode: BleScanMatchMode.Sticky,
        scanMode: BleScanMode.LowPower,
        callbackType: BleScanCallbackType.AllMatches,
      });
      this.emit('scanStart');
    } catch (error) {
      this.isScanning = false;
      console.error('Erro ao iniciar scan:', error);
      throw error;
    }
  }

  async stopScan(): Promise<void> {
    try {
      await BleManager.stopScan();
      this.isScanning = false;
    } catch (error) {
      console.error('Erro ao parar scan:', error);
      throw error;
    }
  }

  async connectToDevice(deviceId: string): Promise<void> {
    try {
      await BleManager.connect(deviceId);
      await BleManager.retrieveServices(deviceId);

      // Habilitar notificações
      await BleManager.startNotification(
        deviceId,
        this.SERVICE_UUID,
        this.RX_CHARACTERISTIC_UUID,
      );

      this.connectedDevice = deviceId;

      const peripheralInfo = await BleManager.getConnectedPeripherals([]);
      const device = peripheralInfo.find(p => p.id === deviceId);

      const status: ConnectionStatus = {
        isConnected: true,
        deviceId,
        deviceName: device?.name || 'Dispositivo Conectado',
      };

      this.emit('connectionStatusChanged', status);
    } catch (error) {
      console.error('Erro ao conectar:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connectedDevice) {
      return;
    }

    try {
      await BleManager.stopNotification(
        this.connectedDevice,
        this.SERVICE_UUID,
        this.RX_CHARACTERISTIC_UUID,
      );
      await BleManager.disconnect(this.connectedDevice);
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      throw error;
    }
  }

  async sendMessage(message: string): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('Nenhum dispositivo conectado');
    }

    try {
      const data = this.stringToBytes(message);
      await BleManager.write(
        this.connectedDevice,
        this.SERVICE_UUID,
        this.TX_CHARACTERISTIC_UUID,
        data,
      );

      const bleMessage: BLEMessage = {
        id: Date.now().toString(),
        message,
        timestamp: new Date(),
        direction: 'sent',
      };

      this.emit('messageSent', bleMessage);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  private stringToBytes(str: string): number[] {
    return Array.from(Buffer.from(str, 'utf8'));
  }

  private bytesToString(bytes: number[]): string {
    return Buffer.from(bytes).toString('utf8');
  }

  getConnectionStatus(): ConnectionStatus {
    return {
      isConnected: !!this.connectedDevice,
      deviceId: this.connectedDevice ?? undefined,
    };
  }

  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }
}

export default new BLEService();
