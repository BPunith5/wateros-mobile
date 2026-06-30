import { Slot } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import AdminFloatingDock from '@/src/components/navigation/AdminFloatingDock';

export default function AdminLayout() {
  return (
    <View style={styles.container}>
      <Slot />
      <AdminFloatingDock />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
