import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  progress: Animated.Value;
  activeColor: string;
  inactiveColor: string;
}

export default function StepIndicator({
  currentStep,
  totalSteps,
  progress,
  activeColor,
  inactiveColor
}: StepIndicatorProps) {
  const width = progress.interpolate({
    inputRange: [0, totalSteps - 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.background, { backgroundColor: inactiveColor }]} />
      <Animated.View 
        style={[
          styles.fill, 
          { 
            backgroundColor: activeColor,
            width: width
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
