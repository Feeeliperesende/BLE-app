import BLEService from './BLEService';
import {
  BleManager,
  Device,
  Characteristic,
  BleError,
} from 'react-native-ble-plx';
import {PermissionsAndroid, Platform} from 'react-native';
import {Buffer} from 'buffer';

jest.mock('react-native-ble-plx', () => {
  const mockBleManagerInstance = {
    onStateChange: jest.fn(),
    startDeviceScan: jest.fn(),
    stopDeviceScan: jest.fn(),
    connectToDevice: jest.fn(),
    destroy: jest.fn(),
  };
  class MockBleError extends Error {
    errorCode: number;
    constructor(message: string, code: number) {
      super(message);
      this.name = 'BleError';
      this.errorCode = code;
    }
  }
  return {
    BleManager: jest.fn(() => mockBleManagerInstance),
    Device: jest.fn(),
    Characteristic: jest.fn(),
    BleError: MockBleError,
    BleErrorCode: {
      NoError: 0,
      UnknownError: 1,
      BluetoothUnauthorized: 100,
      BluetoothPoweredOff: 101,
      DeviceNotFound: 203,
      DeviceDisconnected: 205,
      ServiceNotFound: 300,
      CharacteristicNotFound: 303,
    },
    State: {
      Unknown: 'Unknown',
      Resetting: 'Resetting',
      Unsupported: 'Unsupported',
      Unauthorized: 'Unauthorized',
      PoweredOff: 'PoweredOff',
      PoweredOn: 'PoweredOn',
    },
  };
});

// Mock react-native
jest.mock('react-native', () => {
  const mockPermissionsAndroid = {
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
      BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
      BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    requestMultiple: jest.fn(),
  };

  const mockPlatform: {
    OS: string;
    Version: number;
    select: (implementation: {[key: string]: any}) => any;
  } = {
    OS: 'android',
    Version: 31,
    select: jest.fn(implementation => {
      if (implementation[mockPlatform.OS]) {
        return implementation[mockPlatform.OS];
      }
      return implementation.default;
    }),
  };

  return {
    PermissionsAndroid: mockPermissionsAndroid,
    Platform: mockPlatform,
  };
});

const mockBleManager = new BleManager() as jest.Mocked<BleManager>;

describe('BLEService', () => {
  let bleServiceInstance: typeof BLEService;
  let emitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    Platform.Version = 31;
    (PermissionsAndroid.requestMultiple as jest.Mock).mockResolvedValue({
      [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
        PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]:
        PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]:
        PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]:
        PermissionsAndroid.RESULTS.GRANTED,
    });

    bleServiceInstance = BLEService;
    emitSpy = jest.spyOn(bleServiceInstance, 'emit');

    (mockBleManager.startDeviceScan as jest.Mock).mockImplementation(
      (uuids, options, callback) => {
        (mockBleManager.startDeviceScan as any).lastCallback = callback;
      },
    );
    (mockBleManager.connectToDevice as jest.Mock).mockImplementation(
      async deviceId => {
        const mockDevice = {
          id: deviceId,
          name: 'TestDevice', // Default name
          discoverAllServicesAndCharacteristics: jest
            .fn()
            .mockResolvedValue(undefined),
          onDisconnected: jest.fn(),
          monitorCharacteristicForService: jest
            .fn()
            .mockImplementation((serviceUUID, charUUID, listener) => {
              (mockDevice.monitorCharacteristicForService as any).lastListener =
                listener;
              return {remove: jest.fn()};
            }),
          cancelConnection: jest.fn().mockResolvedValue(undefined),
          writeCharacteristicWithResponseForService: jest
            .fn()
            .mockResolvedValue(undefined),
        } as unknown as jest.Mocked<Device>;
        (mockBleManager.connectToDevice as any).mockDeviceInstance = mockDevice;
        return mockDevice;
      },
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Constructor and Initial Setup', () => {
    test('bleManager.onStateChange should be called from setupEventListeners', () => {});
  });

  describe('initialize()', () => {
    test('should request correct permissions for Android API >= 31', async () => {
      Platform.OS = 'android';
      Platform.Version = 31;
      await bleServiceInstance.initialize();
      expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
    });

    test('should request correct permissions for Android API < 31', async () => {
      Platform.OS = 'android';
      Platform.Version = 30;
      await bleServiceInstance.initialize();
      expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
    });

    test('should not request permissions for iOS', async () => {
      Platform.OS = 'ios';
      await bleServiceInstance.initialize();
      expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
    });

    test('should throw an error if permissions are denied on Android', async () => {
      Platform.OS = 'android';
      (PermissionsAndroid.requestMultiple as jest.Mock).mockResolvedValue({
        [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
          PermissionsAndroid.RESULTS.DENIED,
      });
      await expect(bleServiceInstance.initialize()).rejects.toThrow(
        'Permissões Bluetooth negadas',
      );
    });

    test('should log success message on successful initialization', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      await bleServiceInstance.initialize();
      expect(consoleSpy).toHaveBeenCalledWith('BLE Manager inicializado');
      consoleSpy.mockRestore();
    });

    test('should re-throw error if requestPermissions fails', async () => {
      Platform.OS = 'android';
      const permissionError = new Error('Permission error');
      (PermissionsAndroid.requestMultiple as jest.Mock).mockRejectedValue(
        permissionError,
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');
      await expect(bleServiceInstance.initialize()).rejects.toThrow(
        'Permission error',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao inicializar BLE Manager:',
        permissionError,
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('startScan()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers(); // Important to clear timers set by startScan
      jest.useRealTimers();
    });

    test('should emit scanStart, call stopDeviceScan, and call bleManager.startDeviceScan', async () => {
      await bleServiceInstance.startScan(5);
      expect(emitSpy).toHaveBeenCalledWith('scanStart');
      expect(mockBleManager.stopDeviceScan).toHaveBeenCalledTimes(1);
      expect(mockBleManager.startDeviceScan).toHaveBeenCalledWith(
        ['9800'],
        {allowDuplicates: false},
        expect.any(Function),
      );
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(true);
    });

    test('should emit scanStop and set isScanning to false after timeout', async () => {
      await bleServiceInstance.startScan(5);
      expect(emitSpy).toHaveBeenCalledWith('scanStart');
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(true);

      jest.advanceTimersByTime(5000);

      expect(mockBleManager.stopDeviceScan).toHaveBeenCalledTimes(2);
      expect(emitSpy).toHaveBeenCalledWith('scanStop');
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(false);
    });

    test('should call onDeviceDiscovered and emit deviceDiscovered when a device is found', async () => {
      await bleServiceInstance.startScan(5);
      const mockDiscoveredDevice: Device = {
        id: 'test-device-id',
        name: 'Test Device',
        rssi: -50,
      } as Device;

      const scanCallback = (mockBleManager.startDeviceScan as any).lastCallback;
      scanCallback(null, mockDiscoveredDevice);

      expect(emitSpy).toHaveBeenCalledWith('deviceDiscovered', {
        id: 'test-device-id',
        name: 'Test Device',
        rssi: -50,
      });
    });

    test('should emit deviceDiscovered with "unknown device" if device name is null', async () => {
      await bleServiceInstance.startScan(5);
      const mockDiscoveredDevice: Device = {
        id: 'test-device-id-null-name',
        name: null,
        rssi: -60,
      } as Device;

      const scanCallback = (mockBleManager.startDeviceScan as any).lastCallback;
      scanCallback(null, mockDiscoveredDevice);

      expect(emitSpy).toHaveBeenCalledWith('deviceDiscovered', {
        id: 'test-device-id-null-name',
        name: 'unknown device',
        rssi: -60,
      });
    });

    test('should handle errors in scan callback and emit scanStop', async () => {
      await bleServiceInstance.startScan(5);
      const scanError = new Error('Scan failed') as BleError;
      const consoleErrorSpy = jest.spyOn(console, 'error');

      const scanCallback = (mockBleManager.startDeviceScan as any).lastCallback;
      scanCallback(scanError, null);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro na varredura:',
        scanError,
      );
      expect(emitSpy).toHaveBeenCalledWith('scanStop');
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    test('should handle errors if bleManager.startDeviceScan throws and emit scanStop', async () => {
      const startScanError = new Error('Failed to start scan');
      (mockBleManager.startDeviceScan as jest.Mock).mockImplementationOnce(
        () => {
          throw startScanError;
        },
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(bleServiceInstance.startScan(5)).rejects.toThrow(
        startScanError,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao iniciar scan:',
        startScanError,
      );
      expect(emitSpy).toHaveBeenCalledWith('scanStop');
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    test('should not start scan if already scanning', async () => {
      await bleServiceInstance.startScan(5);
      expect(mockBleManager.startDeviceScan).toHaveBeenCalledTimes(1);

      await bleServiceInstance.startScan(5);
      expect(mockBleManager.startDeviceScan).toHaveBeenCalledTimes(1);
      expect(
        emitSpy.mock.calls.filter(call => call[0] === 'scanStart').length,
      ).toBe(1);
    });
  });

  describe('stopScan()', () => {
    test('should call bleManager.stopDeviceScan, set isScanning to false, and emit scanStop', async () => {
      jest.useFakeTimers();
      await bleServiceInstance.startScan(5);
      (mockBleManager.stopDeviceScan as jest.Mock).mockClear();
      emitSpy.mockClear();

      await bleServiceInstance.stopScan();

      expect(mockBleManager.stopDeviceScan).toHaveBeenCalledTimes(1);
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith('scanStop');
      jest.runOnlyPendingTimers(); // Clear any pending timers from startScan
      jest.useRealTimers();
    });

    test('should handle errors during stopScan', async () => {
      const stopScanError = new Error('Failed to stop scan');
      (mockBleManager.stopDeviceScan as jest.Mock).mockImplementationOnce(
        () => {
          throw stopScanError;
        },
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(bleServiceInstance.stopScan()).rejects.toThrow(
        stopScanError,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao parar scan:',
        stopScanError,
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('connectToDevice()', () => {
    const deviceId = 'test-device-id';
    let mockDeviceInstance: jest.Mocked<Device>;

    test('should connect, discover, setup notifications, and emit connectionStatusChanged', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;

      expect(mockBleManager.connectToDevice).toHaveBeenCalledWith(deviceId);
      expect(
        mockDeviceInstance.discoverAllServicesAndCharacteristics,
      ).toHaveBeenCalledTimes(1);
      expect(mockDeviceInstance.onDisconnected).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(
        mockDeviceInstance.monitorCharacteristicForService,
      ).toHaveBeenCalledWith('9800', '9801', expect.any(Function));
      expect(emitSpy).toHaveBeenCalledWith('connectionStatusChanged', {
        isConnected: true,
        deviceId: deviceId,
        deviceName: 'TestDevice',
      });
      expect(bleServiceInstance.getConnectionStatus().isConnected).toBe(true);
    });

    test('should emit connectionStatusChanged with "unknown device" if connected device name is null', async () => {
      const nullNameDeviceId = 'test-null-name-connect-id';
      (mockBleManager.connectToDevice as jest.Mock).mockImplementationOnce(
        async id => {
          const mockNullNameDevice = {
            id: id,
            name: null,
            discoverAllServicesAndCharacteristics: jest
              .fn()
              .mockResolvedValue(undefined),
            onDisconnected: jest.fn(),
            monitorCharacteristicForService: jest
              .fn()
              .mockImplementation((s, c, listener) => {
                (
                  mockNullNameDevice.monitorCharacteristicForService as any
                ).lastListener = listener;
                return {remove: jest.fn()};
              }),
            cancelConnection: jest.fn().mockResolvedValue(undefined),
          } as unknown as jest.Mocked<Device>;
          (mockBleManager.connectToDevice as any).mockDeviceInstance =
            mockNullNameDevice;
          return mockNullNameDevice;
        },
      );

      await bleServiceInstance.connectToDevice(nullNameDeviceId);

      expect(emitSpy).toHaveBeenCalledWith('connectionStatusChanged', {
        isConnected: true,
        deviceId: nullNameDeviceId,
        deviceName: 'unknown device',
      });
    });

    test('should call disconnect if already connected', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      const disconnectSpy = jest
        .spyOn(bleServiceInstance, 'disconnect')
        .mockResolvedValueOnce(undefined);
      await bleServiceInstance.connectToDevice('new-device-id');
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
      disconnectSpy.mockRestore();
    });

    test('should handle connection errors and re-throw', async () => {
      const connectionError = new Error('Connection failed');
      (mockBleManager.connectToDevice as jest.Mock).mockRejectedValueOnce(
        connectionError,
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(
        bleServiceInstance.connectToDevice(deviceId),
      ).rejects.toThrow(connectionError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao conectar:',
        connectionError,
      );
      expect(bleServiceInstance.getConnectionStatus().isConnected).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    test('should handle error if discoverAllServicesAndCharacteristics fails', async () => {
      const discoveryError = new Error('Discovery failed');
      (mockBleManager.connectToDevice as jest.Mock).mockImplementationOnce(
        async id => {
          const mockFailingDevice = {
            id: id,
            name: 'TestDeviceDiscoverFail',
            discoverAllServicesAndCharacteristics: jest
              .fn()
              .mockRejectedValue(discoveryError),
            onDisconnected: jest.fn(),
            monitorCharacteristicForService: jest.fn(),
            cancelConnection: jest.fn().mockResolvedValue(undefined),
          } as unknown as jest.Mocked<Device>;
          return mockFailingDevice;
        },
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(
        bleServiceInstance.connectToDevice(deviceId),
      ).rejects.toThrow(discoveryError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao conectar:',
        discoveryError,
      );

      consoleErrorSpy.mockRestore();
    });

    test('onDisconnected callback should emit connectionStatusChanged', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      const onDisconnectedCallback = (
        mockDeviceInstance.onDisconnected as jest.Mock
      ).mock.calls[0][0];

      emitSpy.mockClear();
      onDisconnectedCallback(null);

      expect(emitSpy).toHaveBeenCalledWith('connectionStatusChanged', {
        isConnected: false,
      });
      expect(bleServiceInstance.getConnectionStatus().isConnected).toBe(false);
    });

    test('onDisconnected callback should log error if present', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      const onDisconnectedCallback = (
        mockDeviceInstance.onDisconnected as jest.Mock
      ).mock.calls[0][0];
      const disconnectError = new Error('Disconnect error') as BleError;
      const consoleErrorSpy = jest.spyOn(console, 'error');

      onDisconnectedCallback(disconnectError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro na desconexão:',
        disconnectError,
      );
      expect(emitSpy).toHaveBeenCalledWith('connectionStatusChanged', {
        isConnected: false,
      });
      consoleErrorSpy.mockRestore();
    });

    test('setupNotifications should call onDataReceived when characteristic value changes', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      const notificationListener = (
        mockDeviceInstance.monitorCharacteristicForService as any
      ).lastListener;
      const mockCharacteristic = {
        value: Buffer.from('TestData').toString('base64'),
      } as Characteristic;

      emitSpy.mockClear();
      notificationListener(null, mockCharacteristic);

      expect(emitSpy).toHaveBeenCalledWith('messageReceived', {
        id: expect.any(String),
        message: 'TestData',
        timestamp: expect.any(Date),
        direction: 'received',
      });
    });

    test('onDataReceived should not emit messageReceived if characteristic value is null', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      const notificationListener = (
        mockDeviceInstance.monitorCharacteristicForService as any
      ).lastListener;
      const mockCharacteristicNullValue = {value: null} as Characteristic;

      emitSpy.mockClear();
      notificationListener(null, mockCharacteristicNullValue);

      expect(emitSpy).not.toHaveBeenCalledWith(
        'messageReceived',
        expect.anything(),
      );
    });

    test('onDataReceived should emit messageReceived with empty string for empty base64 value', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      const notificationListener = (
        mockDeviceInstance.monitorCharacteristicForService as any
      ).lastListener;
      const mockCharacteristicEmptyBase64 = {value: ''} as Characteristic;

      emitSpy.mockClear();
      notificationListener(null, mockCharacteristicEmptyBase64);
    });

    test('onDataReceived should handle potentially invalid base64 gracefully (Buffer behavior)', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      const notificationListener = (
        mockDeviceInstance.monitorCharacteristicForService as any
      ).lastListener;
      const invalidBase64 = 'ThisIsNotValidBase64!';
      const mockCharacteristicInvalidBase64 = {
        value: invalidBase64,
      } as Characteristic;
      const expectedDecodedString = Buffer.from(
        invalidBase64,
        'base64',
      ).toString('utf8');

      emitSpy.mockClear();
      notificationListener(null, mockCharacteristicInvalidBase64);

      expect(emitSpy).toHaveBeenCalledWith('messageReceived', {
        id: expect.any(String),
        message: expectedDecodedString,
        timestamp: expect.any(Date),
        direction: 'received',
      });
    });

    test('setupNotifications should log error if notification error occurs in listener', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      const notificationListener = (
        mockDeviceInstance.monitorCharacteristicForService as any
      ).lastListener;
      const notificationError = new Error('Notification error') as BleError;
      const consoleErrorSpy = jest.spyOn(console, 'error');

      notificationListener(notificationError, null);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro na notificação:',
        notificationError,
      );
      consoleErrorSpy.mockRestore();
    });

    test('error in setupNotifications during connectToDevice should cause connectToDevice to reject', async () => {
      const setupError = new Error('Setup notification failed');
      (mockBleManager.connectToDevice as jest.Mock).mockImplementationOnce(
        async (id: string) => {
          const mockFailingDevice = {
            id: id,
            name: 'TestDeviceFailingSetup',
            discoverAllServicesAndCharacteristics: jest
              .fn()
              .mockResolvedValue(undefined),
            onDisconnected: jest.fn(),
            monitorCharacteristicForService: jest
              .fn()
              .mockImplementation(() => {
                throw setupError;
              }),
            cancelConnection: jest.fn().mockResolvedValue(undefined),
          } as unknown as jest.Mocked<Device>;
          return mockFailingDevice;
        },
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(
        bleServiceInstance.connectToDevice(deviceId),
      ).rejects.toThrow(setupError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao configurar notificações:',
        setupError,
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao conectar:',
        setupError,
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('disconnect()', () => {
    const deviceId = 'test-device-id';
    let mockDeviceInstance: jest.Mocked<Device>;

    beforeEach(async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      emitSpy.mockClear();
    });

    test('should call cancelConnection and set connectedDevice to null', async () => {
      await bleServiceInstance.disconnect();
      expect(mockDeviceInstance.cancelConnection).toHaveBeenCalledTimes(1);
      expect(bleServiceInstance.getConnectionStatus().isConnected).toBe(false);
    });

    test('should do nothing if no device is connected', async () => {
      await bleServiceInstance.disconnect();
      (mockDeviceInstance.cancelConnection as jest.Mock).mockClear();

      // @ts-ignore
      bleServiceInstance.connectedDevice = null;

      await bleServiceInstance.disconnect(); // Call again
      expect(mockDeviceInstance.cancelConnection).not.toHaveBeenCalled();
    });

    test('should handle errors during disconnection and re-throw', async () => {
      const disconnectError = new Error('Disconnection failed');
      (mockDeviceInstance.cancelConnection as jest.Mock).mockRejectedValueOnce(
        disconnectError,
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(bleServiceInstance.disconnect()).rejects.toThrow(
        disconnectError,
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao desconectar:',
        disconnectError,
      );

      expect(bleServiceInstance.getConnectionStatus().isConnected).toBe(true);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('sendMessage()', () => {
    const deviceId = 'test-device-id';
    const message = 'Hello BLE';
    const base64Message = Buffer.from(message).toString('base64');
    let mockDeviceInstance: jest.Mocked<Device>;

    beforeEach(async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      emitSpy.mockClear();
    });

    test('should send a message and emit messageSent', async () => {
      await bleServiceInstance.sendMessage(message);
      expect(
        mockDeviceInstance.writeCharacteristicWithResponseForService,
      ).toHaveBeenCalledWith('9800', '9801', base64Message);
      expect(emitSpy).toHaveBeenCalledWith('messageSent', {
        id: expect.any(String),
        message: message,
        timestamp: expect.any(Date),
        direction: 'sent',
      });
    });

    test('should send an empty message and emit messageSent', async () => {
      const emptyMessage = '';
      const base64EmptyMessage = Buffer.from(emptyMessage).toString('base64');

      await bleServiceInstance.sendMessage(emptyMessage);

      expect(
        mockDeviceInstance.writeCharacteristicWithResponseForService,
      ).toHaveBeenCalledWith('9800', '9801', base64EmptyMessage);
      expect(emitSpy).toHaveBeenCalledWith('messageSent', {
        id: expect.any(String),
        message: emptyMessage,
        timestamp: expect.any(Date),
        direction: 'sent',
      });
    });

    test('should throw error if no device is connected', async () => {
      await bleServiceInstance.disconnect();
      const onDisconnectedCallback = (
        mockDeviceInstance.onDisconnected as jest.Mock
      ).mock.calls[0][0];
      onDisconnectedCallback(null);

      await expect(bleServiceInstance.sendMessage(message)).rejects.toThrow(
        'Nenhum dispositivo conectado',
      );
    });

    test('should handle errors during sending message and re-throw', async () => {
      const sendMessageError = new Error('Send failed');
      (
        mockDeviceInstance.writeCharacteristicWithResponseForService as jest.Mock
      ).mockRejectedValueOnce(sendMessageError);
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(bleServiceInstance.sendMessage(message)).rejects.toThrow(
        sendMessageError,
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao enviar mensagem:',
        sendMessageError,
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getConnectionStatus()', () => {
    const deviceId = 'test-device-id';
    test('should return correct status when connected', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      const status = bleServiceInstance.getConnectionStatus();
      expect(status).toEqual({
        isConnected: true,
        deviceId: deviceId,
        deviceName: 'TestDevice',
      });
    });
  });

  describe('isCurrentlyScanning()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    test('should return true when scanning', async () => {
      bleServiceInstance.startScan(5);
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(true);
    });

    test('should return false when not scanning', () => {
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(false);
    });

    test('should return false after scan stops due to timeout', async () => {
      await bleServiceInstance.startScan(1);
      jest.advanceTimersByTime(1000);
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(false);
    });
  });

  describe('destroy()', () => {
    test('should call bleManager.destroy', () => {
      bleServiceInstance.destroy();
      expect(mockBleManager.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Helper Methods (Private)', () => {
    describe('stringToBase64()', () => {
      test('should correctly convert a simple string to base64', () => {
        // @ts-ignore
        const result = bleServiceInstance.stringToBase64('Hello');
        expect(result).toBe(Buffer.from('Hello').toString('base64'));
      });

      test('should correctly convert an empty string to an empty base64 string', () => {
        // @ts-ignore
        const result = bleServiceInstance.stringToBase64('');
        expect(result).toBe(Buffer.from('').toString('base64'));
      });
    });

    describe('base64ToString()', () => {
      test('should correctly convert a base64 string to simple string', () => {
        // @ts-ignore
        const result = bleServiceInstance.base64ToString(
          Buffer.from('World').toString('base64'),
        );
        expect(result).toBe('World');
      });

      test('should correctly convert an empty base64 string to empty string', () => {
        // @ts-ignore
        const result = bleServiceInstance.base64ToString('');
        expect(result).toBe('');
      });

      test('should handle invalid base64 input gracefully (Buffer behavior)', () => {
        const invalidBase64 = 'ThisIsNotValidBase64!';
        // @ts-ignore
        const result = bleServiceInstance.base64ToString(invalidBase64);
        expect(result).toBe(
          Buffer.from(invalidBase64, 'base64').toString('utf8'),
        );
      });
    });
  });
});

jest.mock('react-native', () => {
  const mockPermissionsAndroid = {
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
      BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
      BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    requestMultiple: jest.fn(),
  };

  const mockPlatform: {
    OS: string;
    Version: number;
    select: (implementation: {[key: string]: any}) => any;
  } = {
    OS: 'android',
    Version: 31,
    select: jest.fn(implementation => {
      if (implementation[mockPlatform.OS]) {
        return implementation[mockPlatform.OS];
      }
      return implementation.default;
    }),
  };

  return {
    PermissionsAndroid: mockPermissionsAndroid,
    Platform: mockPlatform,
  };
});

describe('BLEService', () => {
  let bleServiceInstance: typeof BLEService;
  let emitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    Platform.OS = 'android';
    Platform.Version = 31;

    (PermissionsAndroid.requestMultiple as jest.Mock).mockResolvedValue({
      [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
        PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]:
        PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]:
        PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]:
        PermissionsAndroid.RESULTS.GRANTED,
    });

    bleServiceInstance = BLEService;
    emitSpy = jest.spyOn(bleServiceInstance, 'emit');

    (mockBleManager.startDeviceScan as jest.Mock).mockImplementation(
      (uuids, options, callback) => {
        (mockBleManager.startDeviceScan as any).lastCallback = callback;
        return;
      },
    );
    (mockBleManager.connectToDevice as jest.Mock).mockImplementation(
      async deviceId => {
        const mockDevice = {
          id: deviceId,
          name: 'TestDevice',
          discoverAllServicesAndCharacteristics: jest
            .fn()
            .mockResolvedValue(undefined),
          onDisconnected: jest.fn(),
          monitorCharacteristicForService: jest
            .fn()
            .mockImplementation((serviceUUID, charUUID, listener) => {
              (mockDevice.monitorCharacteristicForService as any).lastListener =
                listener;
              return {remove: jest.fn()};
            }),
          cancelConnection: jest.fn().mockResolvedValue(undefined),
          writeCharacteristicWithResponseForService: jest
            .fn()
            .mockResolvedValue(undefined),
        } as unknown as jest.Mocked<Device>;
        (mockBleManager.connectToDevice as any).mockDeviceInstance = mockDevice;
        return mockDevice;
      },
    );
  });

  describe('initialize()', () => {
    test('should request correct permissions for Android API >= 31', async () => {
      Platform.OS = 'android';
      Platform.Version = 31;
      await bleServiceInstance.initialize();
      expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
    });

    test('should request correct permissions for Android API < 31', async () => {
      Platform.OS = 'android';
      Platform.Version = 30;
      await bleServiceInstance.initialize();
      expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
    });

    test('should not request permissions for iOS', async () => {
      Platform.OS = 'ios';
      await bleServiceInstance.initialize();
      expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
    });

    test('should throw an error if permissions are denied on Android', async () => {
      Platform.OS = 'android';
      (PermissionsAndroid.requestMultiple as jest.Mock).mockResolvedValue({
        [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
          PermissionsAndroid.RESULTS.DENIED,
      });
      await expect(bleServiceInstance.initialize()).rejects.toThrow(
        'Permissões Bluetooth negadas',
      );
    });

    test('should log success message on successful initialization', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      await bleServiceInstance.initialize();
      expect(consoleSpy).toHaveBeenCalledWith('BLE Manager inicializado');
      consoleSpy.mockRestore();
    });

    test('should re-throw error if requestPermissions fails', async () => {
      Platform.OS = 'android';
      const permissionError = new Error('Permission error');
      (PermissionsAndroid.requestMultiple as jest.Mock).mockRejectedValue(
        permissionError,
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');
      await expect(bleServiceInstance.initialize()).rejects.toThrow(
        'Permission error',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao inicializar BLE Manager:',
        permissionError,
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('startScan()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    test('should emit scanStart, call stopDeviceScan, and call bleManager.startDeviceScan', async () => {
      await bleServiceInstance.startScan(5);
      expect(emitSpy).toHaveBeenCalledWith('scanStart');
      expect(mockBleManager.stopDeviceScan).toHaveBeenCalledTimes(1);
      expect(mockBleManager.startDeviceScan).toHaveBeenCalledWith(
        ['9800'],
        {allowDuplicates: false},
        expect.any(Function),
      );
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(true);
    });

    test('should emit scanStop and set isScanning to false after timeout', async () => {
      await bleServiceInstance.startScan(5);
      expect(emitSpy).toHaveBeenCalledWith('scanStart');
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(true);

      jest.advanceTimersByTime(5000);

      expect(mockBleManager.stopDeviceScan).toHaveBeenCalledTimes(2);
      expect(emitSpy).toHaveBeenCalledWith('scanStop');
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(false);
    });

    test('should call onDeviceDiscovered and emit deviceDiscovered when a device is found', async () => {
      await bleServiceInstance.startScan(5);
      const mockDiscoveredDevice: Device = {
        id: 'test-device-id',
        name: 'Test Device',
        rssi: -50,
      } as Device;

      const scanCallback = (mockBleManager.startDeviceScan as any).lastCallback;
      scanCallback(null, mockDiscoveredDevice);

      expect(emitSpy).toHaveBeenCalledWith('deviceDiscovered', {
        id: 'test-device-id',
        name: 'Test Device',
        rssi: -50,
      });
    });

    test('should handle errors in scan callback and emit scanStop', async () => {
      await bleServiceInstance.startScan(5);
      const scanError = new Error('Scan failed') as BleError;
      const consoleErrorSpy = jest.spyOn(console, 'error');

      const scanCallback = (mockBleManager.startDeviceScan as any).lastCallback;
      scanCallback(scanError, null);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro na varredura:',
        scanError,
      );
      expect(emitSpy).toHaveBeenCalledWith('scanStop');
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    test('should handle errors if bleManager.startDeviceScan throws and emit scanStop', async () => {
      const startScanError = new Error('Failed to start scan');
      (mockBleManager.startDeviceScan as jest.Mock).mockImplementationOnce(
        () => {
          throw startScanError;
        },
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(bleServiceInstance.startScan(5)).rejects.toThrow(
        startScanError,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao iniciar scan:',
        startScanError,
      );
      expect(emitSpy).toHaveBeenCalledWith('scanStop');
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    test('should not start scan if already scanning', async () => {
      await bleServiceInstance.startScan(5);
      expect(mockBleManager.startDeviceScan).toHaveBeenCalledTimes(1);

      await bleServiceInstance.startScan(5);
      expect(mockBleManager.startDeviceScan).toHaveBeenCalledTimes(1);
      expect(
        emitSpy.mock.calls.filter(call => call[0] === 'scanStart').length,
      ).toBe(1);
    });
  });

  describe('stopScan()', () => {
    test('should call bleManager.stopDeviceScan, set isScanning to false, and emit scanStop', async () => {
      jest.useFakeTimers();
      await bleServiceInstance.startScan(5);
      (mockBleManager.stopDeviceScan as jest.Mock).mockClear();
      emitSpy.mockClear();

      await bleServiceInstance.stopScan();

      expect(mockBleManager.stopDeviceScan).toHaveBeenCalledTimes(1);
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith('scanStop');
      jest.useRealTimers();
    });

    test('should handle errors during stopScan', async () => {
      const stopScanError = new Error('Failed to stop scan');
      (mockBleManager.stopDeviceScan as jest.Mock).mockImplementationOnce(
        () => {
          throw stopScanError;
        },
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(bleServiceInstance.stopScan()).rejects.toThrow(
        stopScanError,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao parar scan:',
        stopScanError,
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('connectToDevice()', () => {
    const deviceId = 'test-device-id';
    let mockDeviceInstance: jest.Mocked<Device>;

    test('should connect, discover, setup notifications, and emit connectionStatusChanged', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;

      expect(mockBleManager.connectToDevice).toHaveBeenCalledWith(deviceId);
      expect(
        mockDeviceInstance.discoverAllServicesAndCharacteristics,
      ).toHaveBeenCalledTimes(1);
      expect(mockDeviceInstance.onDisconnected).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(
        mockDeviceInstance.monitorCharacteristicForService,
      ).toHaveBeenCalledWith('9800', '9801', expect.any(Function));
      expect(emitSpy).toHaveBeenCalledWith('connectionStatusChanged', {
        isConnected: true,
        deviceId: deviceId,
        deviceName: 'TestDevice',
      });
      expect(bleServiceInstance.getConnectionStatus().isConnected).toBe(true);
    });

    test('should call disconnect if already connected', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      const disconnectSpy = jest
        .spyOn(bleServiceInstance, 'disconnect')
        .mockResolvedValueOnce(undefined);
      await bleServiceInstance.connectToDevice('new-device-id');
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
      disconnectSpy.mockRestore();
    });

    test('should handle connection errors and re-throw', async () => {
      const connectionError = new Error('Connection failed');
      (mockBleManager.connectToDevice as jest.Mock).mockRejectedValueOnce(
        connectionError,
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(
        bleServiceInstance.connectToDevice(deviceId),
      ).rejects.toThrow(connectionError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao conectar:',
        connectionError,
      );
      expect(bleServiceInstance.getConnectionStatus().isConnected).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    test('onDisconnected callback should emit connectionStatusChanged', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      const onDisconnectedCallback = (
        mockDeviceInstance.onDisconnected as jest.Mock
      ).mock.calls[0][0];

      emitSpy.mockClear();
      onDisconnectedCallback(null);

      expect(emitSpy).toHaveBeenCalledWith('connectionStatusChanged', {
        isConnected: false,
      });
      expect(bleServiceInstance.getConnectionStatus().isConnected).toBe(false);
    });

    test('onDisconnected callback should log error if present', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      const onDisconnectedCallback = (
        mockDeviceInstance.onDisconnected as jest.Mock
      ).mock.calls[0][0];
      const disconnectError = new Error('Disconnect error') as BleError;
      const consoleErrorSpy = jest.spyOn(console, 'error');

      onDisconnectedCallback(disconnectError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro na desconexão:',
        disconnectError,
      );
      expect(emitSpy).toHaveBeenCalledWith('connectionStatusChanged', {
        isConnected: false,
      });
      consoleErrorSpy.mockRestore();
    });

    test('setupNotifications should call onDataReceived when characteristic value changes', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      const notificationListener = (
        mockDeviceInstance.monitorCharacteristicForService as any
      ).lastListener;
      const mockCharacteristic = {
        value: Buffer.from('TestData').toString('base64'),
      } as Characteristic;

      emitSpy.mockClear();
      notificationListener(null, mockCharacteristic);

      expect(emitSpy).toHaveBeenCalledWith('messageReceived', {
        id: expect.any(String),
        message: 'TestData',
        timestamp: expect.any(Date),
        direction: 'received',
      });
    });

    test('setupNotifications should log error if notification error occurs in listener', async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      const notificationListener = (
        mockDeviceInstance.monitorCharacteristicForService as any
      ).lastListener;
      const notificationError = new Error('Notification error') as BleError;
      const consoleErrorSpy = jest.spyOn(console, 'error');

      notificationListener(notificationError, null);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro na notificação:',
        notificationError,
      );
      consoleErrorSpy.mockRestore();
    });

    test('error in setupNotifications during connectToDevice should cause connectToDevice to reject', async () => {
      const setupError = new Error('Setup notification failed');
      (mockBleManager.connectToDevice as jest.Mock).mockImplementationOnce(
        async (id: string) => {
          const mockFailingDevice = {
            id: id,
            name: 'TestDeviceFailingSetup',
            discoverAllServicesAndCharacteristics: jest
              .fn()
              .mockResolvedValue(undefined),
            onDisconnected: jest.fn(),
            monitorCharacteristicForService: jest
              .fn()
              .mockImplementation(() => {
                throw setupError;
              }),
            cancelConnection: jest.fn().mockResolvedValue(undefined),
          } as unknown as jest.Mocked<Device>;
          return mockFailingDevice;
        },
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(
        bleServiceInstance.connectToDevice(deviceId),
      ).rejects.toThrow(setupError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao configurar notificações:',
        setupError,
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao conectar:',
        setupError,
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('disconnect()', () => {
    const deviceId = 'test-device-id';
    let mockDeviceInstance: jest.Mocked<Device>;

    beforeEach(async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      emitSpy.mockClear();
    });

    test('should call cancelConnection and set connectedDevice to null', async () => {
      await bleServiceInstance.disconnect();
      expect(mockDeviceInstance.cancelConnection).toHaveBeenCalledTimes(1);
      expect(bleServiceInstance.getConnectionStatus().isConnected).toBe(false);
    });

    test('should do nothing if no device is connected', async () => {
      await bleServiceInstance.disconnect();
      (mockDeviceInstance.cancelConnection as jest.Mock).mockClear();

      await bleServiceInstance.disconnect();
      expect(mockDeviceInstance.cancelConnection).not.toHaveBeenCalled();
    });

    test('should handle errors during disconnection and re-throw', async () => {
      const disconnectError = new Error('Disconnection failed');
      (mockDeviceInstance.cancelConnection as jest.Mock).mockRejectedValueOnce(
        disconnectError,
      );
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(bleServiceInstance.disconnect()).rejects.toThrow(
        disconnectError,
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao desconectar:',
        disconnectError,
      );

      expect(bleServiceInstance.getConnectionStatus().isConnected).toBe(true);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('sendMessage()', () => {
    const deviceId = 'test-device-id';
    const message = 'Hello BLE';
    const base64Message = Buffer.from(message).toString('base64');
    let mockDeviceInstance: jest.Mocked<Device>;

    beforeEach(async () => {
      await bleServiceInstance.connectToDevice(deviceId);
      mockDeviceInstance = (mockBleManager.connectToDevice as any)
        .mockDeviceInstance;
      emitSpy.mockClear();
    });

    test('should send a message and emit messageSent', async () => {
      await bleServiceInstance.sendMessage(message);
      expect(
        mockDeviceInstance.writeCharacteristicWithResponseForService,
      ).toHaveBeenCalledWith('9800', '9801', base64Message);
      expect(emitSpy).toHaveBeenCalledWith('messageSent', {
        id: expect.any(String),
        message: message,
        timestamp: expect.any(Date),
        direction: 'sent',
      });
    });

    test('should throw error if no device is connected', async () => {
      await bleServiceInstance.disconnect();

      const onDisconnectedCallback = (
        mockDeviceInstance.onDisconnected as jest.Mock
      ).mock.calls[0][0];
      onDisconnectedCallback(null);

      await expect(bleServiceInstance.sendMessage(message)).rejects.toThrow(
        'Nenhum dispositivo conectado',
      );
    });

    test('should handle errors during sending message and re-throw', async () => {
      const sendMessageError = new Error('Send failed');
      (
        mockDeviceInstance.writeCharacteristicWithResponseForService as jest.Mock
      ).mockRejectedValueOnce(sendMessageError);
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(bleServiceInstance.sendMessage(message)).rejects.toThrow(
        sendMessageError,
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Erro ao enviar mensagem:',
        sendMessageError,
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('isCurrentlyScanning()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    test('should return true when scanning', async () => {
      bleServiceInstance.startScan(5);
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(true);
      jest.runAllTimers();
    });

    test('should return false when not scanning', () => {
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(false);
    });

    test('should return false after scan stops due to timeout', async () => {
      await bleServiceInstance.startScan(1);
      jest.advanceTimersByTime(1000);
      expect(bleServiceInstance.isCurrentlyScanning()).toBe(false);
    });
  });

  describe('destroy()', () => {
    test('should call bleManager.destroy', () => {
      bleServiceInstance.destroy();
      expect(mockBleManager.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
