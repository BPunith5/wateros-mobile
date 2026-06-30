import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/src/theme/tokens';
import LiquidTabBar from '@/src/components/navigation/FloatingDock';

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <Slot />
      <LiquidTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.abyss,
  },
});
