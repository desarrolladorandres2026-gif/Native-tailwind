import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: W, height: H } = Dimensions.get('window');

const HEART_COUNT = 15;

const FloatingHeart = ({ delay }: { delay: number }) => {
  const translateY = useRef(new Animated.Value(H)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  
  const randomX = useRef(Math.random() * W).current;
  const randomSize = useRef(15 + Math.random() * 20).current;
  const duration = useRef(4000 + Math.random() * 4000).current;
  const wiggleDuration = useRef(1000 + Math.random() * 1000).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    const startAnimation = () => {
      if (!isMounted) return;
      translateY.setValue(H + 50);
      opacity.setValue(0);
      scale.setValue(0.5);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.5,
            duration: duration * 0.2,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.5,
            duration: duration * 0.6,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: duration * 0.2,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(scale, {
          toValue: 1 + Math.random() * 0.5,
          duration: duration,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && isMounted) {
          startAnimation();
        }
      });
    };

    // Efecto de balanceo lateral (wiggle)
    const wiggle = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 15,
          duration: wiggleDuration,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -15,
          duration: wiggleDuration,
          useNativeDriver: true,
        }),
      ])
    );

    const timeout = setTimeout(() => {
      if (isMounted) {
        wiggle.start();
        startAnimation();
      }
    }, delay);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      wiggle.stop();
    };
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: randomX,
        transform: [{ translateY }, { translateX }, { scale }],
        opacity,
      }}
    >
      <Ionicons name="heart" size={randomSize} color="#FF655B" />
    </Animated.View>
  );
};

export default function FloatingHearts() {
  const hearts = Array.from({ length: HEART_COUNT }).map((_, i) => (
    <FloatingHeart key={i} delay={i * 300} />
  ));

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {hearts}
    </View>
  );
}
