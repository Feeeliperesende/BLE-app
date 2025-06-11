import {BleManager, Device, Characteristic} from 'react-native-ble-plx';
import {EventEmitter} from 'events';
import {PermissionsAndroid, Platform} from 'react-native';
import {BLEDevice, BLEMessage, ConnectionStatus} from '../types/ble';
import {Buffer} from 'buffer';
class BLEService extends EventEmitter {
  private readonly bleManager: BleManager;
  private isScanning: boolean = false;
  private connectedDevice: Device | null = null;

  private readonly SERVICE_UUID = '9800';
  private readonly TX_CHARACTERISTIC_UUID = '9801';
  private readonly RX_CHARACTERISTIC_UUID = '9801';

  constructor() {
    super();
    this.bleManager = new BleManager();
    this.setupEventListeners();
  }

  async initialize(): Promise<void> {
    try {
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
    this.bleManager.onStateChange(state => {
      console.log('BLE state changed:', state);
    }, true);
  }

  async startScan(timeoutSeconds: number = 10): Promise<void> {
    if (this.isScanning) {
      return;
    }
    try {
      this.isScanning = true;
      this.emit('scanStart');

      this.bleManager.stopDeviceScan();
      this.bleManager.startDeviceScan(
        [this.SERVICE_UUID],
        {allowDuplicates: false},
        (error, device) => {
          if (error) {
            console.error('Erro na varredura:', error);
            this.isScanning = false;
            this.emit('scanStop');
            return;
          }

          if (device) {
            this.onDeviceDiscovered(device);
          }
        },
      );

      setTimeout(() => {
        this.stopScan();
      }, timeoutSeconds * 1000);
    } catch (error) {
      this.isScanning = false;
      console.error('Erro ao iniciar scan:', error);
      this.emit('scanStop');
      throw error;
    }
  }

  private readonly onDeviceDiscovered = (device: Device): void => {
    console.log('Peripheral Discovered:', JSON.stringify(device, null, 2));
    const bleDevice: BLEDevice = {
      id: device.id,
      name: device.name ?? 'unknown device',
      rssi: device.rssi as number | undefined,
    };
    this.emit('deviceDiscovered', bleDevice);
  };

  async stopScan(): Promise<void> {
    console.log('Parando scan...');
    try {
      this.bleManager.stopDeviceScan();
      this.isScanning = false;
      this.emit('scanStop');
    } catch (error) {
      console.error('Erro ao parar scan:', error);
      throw error;
    }
  }

  async connectToDevice(deviceId: string): Promise<void> {
    try {
      if (this.connectedDevice) {
        await this.disconnect();
      }

      const device = await this.bleManager.connectToDevice(deviceId);
      this.connectedDevice = device;
      await device.discoverAllServicesAndCharacteristics();
      device.onDisconnected(error => {
        if (error) {
          console.error('Erro na desconexão:', error);
        }
        this.onDeviceDisconnected();
      });
      await this.setupNotifications(device);

      const status: ConnectionStatus = {
        isConnected: true,
        deviceId,
        deviceName: device.name ?? 'unknown device',
      };

      this.emit('connectionStatusChanged', status);
    } catch (error) {
      console.error('Erro ao conectar:', error);
      throw error;
    }
  }

  private async setupNotifications(device: Device): Promise<void> {
    try {
      device.monitorCharacteristicForService(
        this.SERVICE_UUID,
        this.RX_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('Erro na notificação:', error);
            return;
          }
          if (characteristic?.value) {
            this.onDataReceived(characteristic);
          }
        },
      );
    } catch (error) {
      console.error('Erro ao configurar notificações:', error);
      throw error;
    }
  }

  private readonly onDeviceDisconnected = (): void => {
    this.connectedDevice = null;
    const status: ConnectionStatus = {
      isConnected: false,
    };
    this.emit('connectionStatusChanged', status);
  };

  private readonly onDataReceived = (characteristic: Characteristic): void => {
    if (!characteristic.value) {
      return;
    }

    const message = this.base64ToString(characteristic.value);
    const bleMessage: BLEMessage = {
      id: Date.now().toString(),
      message,
      timestamp: new Date(),
      direction: 'received',
    };
    this.emit('messageReceived', bleMessage);
  };

  async disconnect(): Promise<void> {
    if (!this.connectedDevice) {
      return;
    }

    try {
      await this.connectedDevice.cancelConnection();
      this.connectedDevice = null;
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
      const data = this.stringToBase64(message);
      await this.connectedDevice.writeCharacteristicWithResponseForService(
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

  private stringToBase64(str: string): string {
    return Buffer.from(str, 'utf8').toString('base64');
  }

  private base64ToString(base64: string): string {
    return Buffer.from(base64, 'base64').toString('utf8');
  }

  getConnectionStatus(): ConnectionStatus {
    return {
      isConnected: !!this.connectedDevice,
      deviceId: this.connectedDevice?.id ?? undefined,
      deviceName: this.connectedDevice?.name ?? undefined,
    };
  }

  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }

  destroy() {
    this.bleManager.destroy();
  }
}

export default new BLEService();
