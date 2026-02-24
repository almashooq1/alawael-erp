/**
 * Splash Screen - React Native
 * شاشة البداية تحميل التطبيق
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Image, Animated } from 'react-native';

const SplashScreen = () => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🚗</Text>
        </View>

        <Text style={styles.title}>تتبع السائقين</Text>
        <Text style={styles.subtitle}>نظام إدارة الأسطول الذكي</Text>

        <View style={styles.loaderContainer}>
          <View style={[styles.loaderDot, styles.loaderDot1]} />
          <View style={[styles.loaderDot, styles.loaderDot2]} />
          <View style={[styles.loaderDot, styles.loaderDot3]} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    fontSize: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 40,
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
    marginHorizontal: 4,
  },
  loaderDot1: {
    opacity: 1,
  },
  loaderDot2: {
    opacity: 0.7,
  },
  loaderDot3: {
    opacity: 0.4,
  },
});

export default SplashScreen;
