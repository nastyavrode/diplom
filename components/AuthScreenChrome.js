import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAuthLayoutMetrics } from '../hooks/useAuthLayoutMetrics';

export default function AuthScreenChrome({ children, subtitle, showMascot = true }) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const metrics = useAuthLayoutMetrics();
  const { form: fm, chrome: ch } = metrics;

  const cloud1 = useRef(new Animated.Value(-270)).current;
  const cloud2 = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const CLOUD2_WIDTH = SCREEN_WIDTH * 0.6;
  const CLOUD2_HEIGHT = CLOUD2_WIDTH * (200 / 262);

  useEffect(() => {
    Animated.loop(
      Animated.timing(cloud1, {
        toValue: SCREEN_WIDTH,
        duration: 18000,
        useNativeDriver: false,
      })
    ).start();
    Animated.loop(
      Animated.timing(cloud2, {
        toValue: -CLOUD2_WIDTH,
        duration: 20000,
        useNativeDriver: false,
      })
    ).start();
  }, [cloud1, cloud2, SCREEN_WIDTH]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <ScrollView
          style={styles.scrollFill}
          contentContainerStyle={[
            styles.scrollInner,
            {
              justifyContent: 'center',
              paddingTop: ch.scrollPaddingTop,
              paddingBottom: ch.scrollPaddingBottom,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.container,
              {
                paddingHorizontal: fm.padX,
                paddingVertical: ch.containerPaddingVertical,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.cloud,
                { top: 100, left: 0, opacity: 0.3, transform: [{ translateX: cloud1 }] },
              ]}
            >
              <Svg width={270} height={218} viewBox="0 0 270 218">
                <Path
                  opacity={0.2}
                  d="M215.238 91.1967C211.571 75.7343 201.566 61.8108 186.931 51.8045C172.297 41.7982 153.942 36.3298 135 36.3333C103.451 36.3333 76.05 51.23 62.4042 73.03C46.3592 74.4727 31.521 80.7982 20.7406 90.7908C9.96018 100.784 3.99813 113.739 4 127.167C4 157.233 33.3658 181.667 69.5 181.667H211.417C241.547 181.667 266 161.32 266 136.25C266 112.27 243.621 92.8317 215.238 91.1967Z"
                  fill="#fff"
                />
              </Svg>
            </Animated.View>
            <Animated.View
              style={[
                styles.cloud,
                {
                  top: 300,
                  left: 0,
                  opacity: 0.25,
                  width: CLOUD2_WIDTH,
                  height: CLOUD2_HEIGHT,
                  transform: [{ translateX: cloud2 }],
                },
              ]}
            >
              <Svg width="100%" height="100%" viewBox="0 0 262 200">
                <Path
                  opacity={0.15}
                  d="M262 128.425C262.001 120.796 258.648 113.388 252.478 107.387C246.309 101.386 237.68 97.1384 227.973 95.325C227.571 83.2037 220.984 71.6815 209.614 63.2146C198.244 54.7477 182.991 50.0059 167.107 50C157.898 49.995 148.809 51.588 140.525 54.6587C132.242 57.7294 124.981 62.1974 119.292 67.725C114.662 63.1859 108.199 59.9403 100.906 58.4917C93.6127 57.0432 85.8971 57.4727 78.9563 59.7137C72.0156 61.9547 66.2379 65.8818 62.5198 70.8856C58.8017 75.8894 57.3512 81.6901 58.3933 87.3875C51.2498 86.4011 43.9098 86.6241 36.8916 88.0407C29.8735 89.4573 23.3484 92.0331 17.7774 95.5859C12.2063 99.1388 7.7252 103.582 4.65056 108.602C1.57593 113.622 -0.017232 119.096 -0.0163723 124.638C-0.0120396 134.674 5.21054 144.299 14.5043 151.398C23.7981 158.497 36.4031 162.49 49.5508 162.5H217.46C229.28 162.48 240.607 158.881 248.955 152.492C257.302 146.104 262.004 137.448 262 128.425Z"
                  fill="#fff"
                />
              </Svg>
            </Animated.View>

            <Text
              style={[
                styles.title,
                {
                  fontSize: ch.titleSize,
                  lineHeight: ch.titleLineHeight,
                  maxWidth: fm.maxContentWidth,
                },
              ]}
            >
              CODEQUEST{'\n'}KIDS
            </Text>
            {subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  {
                    fontSize: ch.subtitleSize,
                    marginBottom: ch.subtitleMarginBottom,
                    maxWidth: fm.maxContentWidth,
                  },
                ]}
              >
                {subtitle}
              </Text>
            ) : null}
            {showMascot ? (
              <Image
                source={require('../assets/icon.png')}
                style={[
                  styles.mascot,
                  { height: ch.mascotPct, marginBottom: ch.mascotMarginBottom },
                ]}
              />
            ) : null}
            <View style={[styles.formColumn, { maxWidth: fm.maxContentWidth }]}>
              {children}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#4F8CFF',
  },
  safe: {
    flex: 1,
    backgroundColor: '#4F8CFF',
  },
  scrollFill: {
    flex: 1,
  },
  scrollInner: {
    flexGrow: 1,
  },
  container: {
    width: '100%',
    backgroundColor: '#4F8CFF',
    alignItems: 'center',
  },
  formColumn: {
    width: '100%',
    alignItems: 'stretch',
  },
  title: {
    color: '#FFD600',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.1,
    textShadowColor: '#2d5db3',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 2,
    fontFamily: 'aMavickFont',
    alignSelf: 'center',
    flexShrink: 1,
  },
  subtitle: {
    color: '#fff',
    fontFamily: 'aMavickFont',
    textAlign: 'center',
    alignSelf: 'center',
    opacity: 0.95,
    flexShrink: 1,
  },
  mascot: {
    width: '100%',
    alignSelf: 'center',
    resizeMode: 'contain',
  },
  cloud: {
    position: 'absolute',
    zIndex: 0,
  },
});
