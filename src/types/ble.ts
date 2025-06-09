export interface BLEDevice {
  id: string;
  name?: string;
  rssi?: number;
  advertising?: {
    localName?: string;
    manufacturerData?: any;
    serviceUUIDs?: string[];
  };
}

export interface BLEService {
  uuid: string;
  characteristics: BLECharacteristic[];
}

export interface BLECharacteristic {
  service: string;
  characteristic: string;
  properties: string[];
}

export interface ConnectionStatus {
  isConnected: boolean;
  deviceId?: string;
  deviceName?: string;
}

export interface BLEMessage {
  id: string;
  message: string;
  timestamp: Date;
  direction: 'sent' | 'received';
}

export interface HeatmapDataPoint {
  x: number;
  y: number;
  value: number;
}
