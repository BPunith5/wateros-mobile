import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BubbleField from './BubbleField';

export default function OceanBackground() {
  return (
    <>
      <LinearGradient
        colors={['#01040F', '#03142E', '#06294D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <BubbleField count={12} opacity={0.12} />
    </>
  );
}
