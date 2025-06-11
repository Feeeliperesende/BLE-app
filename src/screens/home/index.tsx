import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';

import {BLEDevice, BLEMessage} from './../../types/ble';
import {styles} from './styles';
import {useBLE} from '../../hooks/useBLE';
import HeatmapChart from '../../components/heatmap';
import {
  Bluetooth,
  Play,
  SendHorizontal,
  SignalHigh,
  Smartphone,
  Square,
  X,
} from 'lucide-react-native';
import {PreLoad} from '../preLoad';

export function Home() {
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

  const [messageInput, setMessageInput] = React.useState<string>('');

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
      {item.rssi && (
        <View style={styles.deviceRssiContainer}>
          <SignalHigh size={15} color="#999" />
          <Text style={styles.deviceRssi}>RSSI: {item.rssi}</Text>
        </View>
      )}
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
    return <PreLoad />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Bluetooth size={24} color="#FFF" />
          <Text style={styles.title}>BLE Scanner app</Text>
        </View>

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
        <View style={styles.sectionContainer}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: connectionStatus.isConnected
                    ? '#4CAF50'
                    : '#F44336',
                },
              ]}
            />
            <Text style={styles.statusLabel}>Status:</Text>
            <Text
              style={[
                styles.statusText,
                connectionStatus.isConnected
                  ? styles.connected
                  : styles.disconnected,
              ]}>
              {connectionStatus.isConnected
                ? `Connected: ${connectionStatus.deviceName}`
                : 'Disconnected'}
            </Text>
          </View>

          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={[styles.button, isScanning && styles.buttonDisabled]}
              onPress={async () => {
                await startScan();
              }}
              disabled={isScanning}>
              <Play size={18} color="#FFF" />
              <Text style={styles.buttonText}>
                {isScanning ? 'Searching...' : 'Start Scan'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={async () => {
                await stopScan();
              }}>
              <Square size={18} color="#FFF" />
              <Text style={styles.buttonText}>Stop Scan</Text>
            </TouchableOpacity>

            {connectionStatus.isConnected && (
              <TouchableOpacity
                style={[styles.buttonMin, styles.disconnectButton]}
                onPress={disconnect}>
                <X size={18} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.devicesHeader}>
            <Smartphone size={18} color="#2196F3" />
            <Text style={styles.sectionTitle}>
              Devices found: {devices.length > 0 && devices.length}
            </Text>
          </View>

          {isScanning && <ActivityIndicator size="small" color="#2196F3" />}

          {devices.length === 0 && !isScanning && (
            <Text style={styles.noDevicesText}>No devices found</Text>
          )}
          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={item => item.id}
            style={styles.devicesList}
            scrollEnabled={false}
          />
        </View>

        {connectionStatus.isConnected && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send Message:</Text>
            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                value={messageInput}
                onChangeText={setMessageInput}
                placeholder="Enter your message..."
                placeholderTextColor="#999"
                textAlignVertical="top"
                multiline
                numberOfLines={4}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendMessage}>
                <Text style={styles.sendButtonText}>Send</Text>

                <SendHorizontal size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

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

        {devices.length > 0 && (
          <View style={styles.section}>
            <HeatmapChart data={devices} title="Heatmap" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
