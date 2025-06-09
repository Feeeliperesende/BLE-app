import React, {useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  StyleSheet,
} from 'react-native';
import {useBLE} from './src/hooks/useBLE';
import HeatmapChart from './src/components/heatmap/index';
import {BLEDevice, BLEMessage, HeatmapDataPoint} from './src/types/ble';

const App: React.FC = () => {
  const {
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
  } = useBLE();

  const [messageInput, setMessageInput] = useState<string>('');

  const generateHeatmapData = (): HeatmapDataPoint[] => {
    const data: HeatmapDataPoint[] = [];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 8; y++) {
        data.push({
          x,
          y,
          value: Math.random() * 100,
        });
      }
    }
    return data;
  };

  const [heatmapData] = useState<HeatmapDataPoint[]>(generateHeatmapData());

  const handleSendMessage = async () => {
    if (!messageInput.trim()) {
      Alert.alert('Erro', 'Enter a message to send');
      return;
    }

    try {
      await sendMessage(messageInput);
      setMessageInput('');
    } catch (err) {
      Alert.alert('Error', 'Failed to send message: ' + (err as Error).message);
    }
  };

  const renderDevice = ({item}: {item: BLEDevice}) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => connectToDevice(item.id)}>
      <Text style={styles.deviceName}>{item.name}</Text>
      <Text style={styles.deviceId}>ID: {item.id}</Text>
      {item.rssi && <Text style={styles.deviceRssi}>RSSI: {item.rssi}</Text>}
    </TouchableOpacity>
  );

  const renderMessage = ({item}: {item: BLEMessage}) => (
    <View
      style={[
        styles.messageItem,
        item.direction === 'sent' ? styles.sentMessage : styles.receivedMessage,
      ]}>
      <Text style={styles.messageText}>{item.message}</Text>
      <Text style={styles.messageTime}>
        {item.timestamp.toLocaleTimeString()}
      </Text>
    </View>
  );

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text>Start BLE...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>BLE Scanner app</Text>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={clearError}
              style={styles.clearErrorButton}>
              <Text style={styles.clearErrorText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Connection Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text
            style={[
              styles.statusText,
              connectionStatus.isConnected
                ? styles.connected
                : styles.disconnected,
            ]}>
            {connectionStatus.isConnected
              ? `Conectado: ${connectionStatus.deviceName}`
              : 'Desconectado'}
          </Text>
        </View>

        {/* Scan Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.button, isScanning && styles.buttonDisabled]}
            onPress={startScan}
            disabled={isScanning}>
            <Text style={styles.buttonText}>
              {isScanning ? 'Searching...' : 'Start Scan'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stopScan}>
            <Text style={styles.buttonText}>Stop Scan</Text>
          </TouchableOpacity>

          {connectionStatus.isConnected && (
            <TouchableOpacity
              style={[styles.button, styles.disconnectButton]}
              onPress={disconnect}>
              <Text style={styles.buttonText}>Desconectar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Devices List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Devices Found:</Text>
          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={item => item.id}
            style={styles.devicesList}
            scrollEnabled={false}
          />
        </View>

        {/* Message Input */}
        {connectionStatus.isConnected && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send Message:</Text>
            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                value={messageInput}
                onChangeText={setMessageInput}
                placeholder="Enter your message..."
                multiline
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendMessage}>
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <View style={styles.section}>
            <View style={styles.messagesHeader}>
              <Text style={styles.sectionTitle}>Messages:</Text>
              <TouchableOpacity
                onPress={clearMessages}
                style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              style={styles.messagesList}
              scrollEnabled={false}
            />
          </View>
        )}

        <View style={styles.section}>
          <HeatmapChart data={heatmapData} title="Example of Heatmap" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffebee',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    color: '#c62828',
    fontSize: 14,
  },
  clearErrorButton: {
    padding: 5,
  },
  clearErrorText: {
    color: '#c62828',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
  },
  connected: {
    color: '#4CAF50',
  },
  disconnected: {
    color: '#f44336',
  },
  controlsContainer: {
    flexDirection: 'row',
    padding: 10,
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    margin: 5,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  stopButton: {
    backgroundColor: '#ff9800',
  },
  disconnectButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    margin: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  devicesList: {
    maxHeight: 200,
  },
  deviceItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deviceRssi: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageItem: {},
  sentMessage: {},
  messageText: {},
  messageTime: {},
  receivedMessage: {},
  messageInput: {},
  sendButton: {},
  sendButtonText: {},
  messagesHeader: {},
  clearButton: {
    alignSelf: 'flex-end',
    padding: 5,
  },
  clearButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messagesList: {
    maxHeight: 200,
  },
});
export default App;
