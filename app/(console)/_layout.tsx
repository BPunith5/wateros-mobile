import { Slot } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import ConsoleFloatingDock from '@/src/components/navigation/ConsoleFloatingDock';

export default function ConsoleLayout() {
  return (
    <View style={styles.container}>
      <Slot />
      <ConsoleFloatingDock />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
