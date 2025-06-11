import {useState, useEffect, useCallback} from 'react';
import BLEService from '../services/BLEService';
import {BLEDevice, BLEMessage, ConnectionStatus} from '../types/ble';

interface UseBLEReturn {
  devices: BLEDevice[];
  messages: BLEMessage[];
  connectionStatus: ConnectionStatus;
  isScanning: boolean;
  isInitialized: boolean;
  error: string | null;
  startScan: () => Promise<void>;
  stopScan: () => Promise<void>;
  connectToDevice: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

export const useBLE = (): UseBLEReturn => {
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [messages, setMessages] = useState<BLEMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
  });
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeBLE = async () => {
      try {
        await BLEService.initialize();
        setIsInitialized(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro ao inicializar BLE',
        );
      }
    };

    initializeBLE();

    const onDeviceDiscovered = (device: BLEDevice) => {
      setDevices(prev => {
        const exists = prev.find(d => d.id === device.id);
        if (exists) {
          return prev;
        }
        return [...prev, device];
      });
    };

    const onScanStart = () => setIsScanning(true);
    const onScanStop = () => setIsScanning(false);

    const onConnectionStatusChanged = (status: ConnectionStatus) => {
      setConnectionStatus(status);
    };

    const onMessageReceived = (message: BLEMessage) => {
      setMessages(prev => [...prev, message]);
    };

    const onMessageSent = (message: BLEMessage) => {
      setMessages(prev => [...prev, message]);
    };

    BLEService.on('deviceDiscovered', onDeviceDiscovered);
    BLEService.on('scanStart', onScanStart);
    BLEService.on('scanStop', onScanStop);
    BLEService.on('connectionStatusChanged', onConnectionStatusChanged);
    BLEService.on('messageReceived', onMessageReceived);
    BLEService.on('messageSent', onMessageSent);

    return () => {
      BLEService.removeAllListeners();
    };
  }, []);

  const startScan = useCallback(async () => {
    try {
      setError(null);
      setDevices([]);
      await BLEService.startScan();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error start scan');
    }
  }, []);

  const stopScan = useCallback(async () => {
    try {
      await BLEService.stopScan();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error stop scan');
    }
  }, []);

  const connectToDevice = useCallback(async (deviceId: string) => {
    try {
      setError(null);
      await BLEService.connectToDevice(deviceId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro to connect to device',
      );
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await BLEService.disconnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error disconnecting');
    }
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    try {
      setError(null);
      await BLEService.sendMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sending message');
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    devices,
    messages,
    connectionStatus,
    isScanning,
    isInitialized,
    error,
    startScan,
    stopScan,
    connectToDevice,
    disconnect,
    sendMessage,
    clearMessages,
    clearError,
  };
};
