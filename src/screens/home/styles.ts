import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
    backgroundColor: '#1E53DC',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
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
  sectionContainer: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    marginRight: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    padding: 15,
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
  buttonMin: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1E53DC',
    padding: 5,
    borderRadius: 8,
    minHeight: 45,
    minWidth: 45,
    alignItems: 'center',
    margin: 5,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1E53DC',
    padding: 5,
    borderRadius: 8,
    minHeight: 45,
    minWidth: 130,
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
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',

    gap: 10,
  },
  messageItem: {
    flexDirection: 'column',
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
    width: '100%',
  },
  sentMessage: {
    backgroundColor: '#81e2bb',
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
  },
  messageText: {},
  messageTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  receivedMessage: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    backgroundColor: '#e0f7fa',
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
  },
  messageInput: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  sendButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1E53DC',
    padding: 5,
    borderRadius: 8,
    minHeight: 45,
    minWidth: 130,
    alignItems: 'center',
    margin: 5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  messagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  clearButton: {},
  clearButtonText: {
    color: '#1E53DC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messagesList: {
    maxHeight: 200,
  },
  deviceRssiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  noDevicesText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 10,
  },
  devicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});
