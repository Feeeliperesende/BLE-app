import React from 'react';
import {SafeAreaView, Text, View} from 'react-native';

import {styles} from './styles';
import {Radio} from 'lucide-react-native';

export function PreLoad() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContainer}>
        <Radio size={33} color="#FFF" />
        <Text style={styles.title}> BLE detector</Text>
      </View>
    </SafeAreaView>
  );
}
