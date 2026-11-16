import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'executing' | 'error';
  size?: number;
  onPress?: () => void;
}

export const MobileLunaOrb: React.FC<Props> = ({ state, size = 200, onPress }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Continuous Rotation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: state === 'thinking' ? 3000 : 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Breathing pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: state === 'listening' ? 1.15 : 1.05,
          duration: state === 'speaking' ? 800 : 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: state === 'speaking' ? 800 : 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [state]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getThemeColor = () => {
    switch (state) {
      case 'listening':
        return '#00CFFF';
      case 'thinking':
        return '#FFB020';
      case 'speaking':
        return '#C04BF7';
      case 'executing':
        return '#00E676';
      case 'error':
        return '#FF3366';
      case 'idle':
      default:
        return '#00CFFF';
    }
  };

  const themeColor = getThemeColor();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, { width: size, height: size }]}
    >
      {/* Outer SVG Orbit Ring */}
      <Animated.View
        style={[
          styles.absoluteCenter,
          {
            transform: [{ rotate: spin }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Circle
            cx="100"
            cy="100"
            r="90"
            stroke={themeColor}
            strokeWidth="1.5"
            strokeDasharray="6, 12, 18, 6"
            strokeOpacity="0.4"
            fill="none"
          />
          <Circle
            cx="100"
            cy="100"
            r="75"
            stroke="#367BFF"
            strokeWidth="2"
            strokeDasharray="14, 28"
            strokeOpacity="0.6"
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* Central Pulsing Glowing Core */}
      <Animated.View
        style={[
          styles.core,
          {
            width: size * 0.55,
            height: size * 0.55,
            borderRadius: (size * 0.55) / 2,
            borderColor: themeColor,
            transform: [{ scale: pulseAnim }],
            shadowColor: themeColor,
          },
        ]}
      >
        <Text style={styles.titleText}>LUNA</Text>
        <Text style={[styles.statusText, { color: themeColor }]}>
          {state.toUpperCase()}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  absoluteCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  core: {
    backgroundColor: '#0D1422',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  titleText: {
    color: '#F4F8FF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
  },
});
