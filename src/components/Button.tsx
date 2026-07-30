import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
  View,
} from 'react-native';
import { Colors, Spacing, Typography } from '../constants/theme';

interface ButtonProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  onPress?: () => void;
  [key: string]: any;
}

export default function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  onPress,
  ...props
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const getButtonStyle = (): ViewStyle[] => {
    const btnStyles: ViewStyle[] = [styles.base];

    switch (variant) {
      case 'primary':
        btnStyles.push({ backgroundColor: Colors.light.primary });
        break;
      case 'secondary':
        btnStyles.push({ backgroundColor: Colors.light.accent });
        break;
      case 'gradient':
        // Layered view pseudo-gradient handled inside render
        btnStyles.push({ backgroundColor: '#3730A3', overflow: 'hidden' });
        break;
      case 'outline':
        btnStyles.push({
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: Colors.light.primary,
        });
        break;
      case 'text':
        btnStyles.push({
          backgroundColor: 'transparent',
          paddingHorizontal: Spacing.sm,
        });
        break;
      case 'danger':
        btnStyles.push({ backgroundColor: Colors.light.error });
        break;
    }

    switch (size) {
      case 'sm':
        btnStyles.push(styles.sizeSm);
        break;
      case 'md':
        btnStyles.push(styles.sizeMd);
        break;
      case 'lg':
        btnStyles.push(styles.sizeLg);
        break;
    }

    if (disabled || loading) {
      btnStyles.push({
        backgroundColor:
          variant === 'outline' || variant === 'text'
            ? 'transparent'
            : Colors.light.surfaceDarker,
        borderColor:
          variant === 'outline' ? Colors.light.border : undefined,
        opacity: 0.6,
      });
    }

    return btnStyles;
  };

  const getTextStyle = (): TextStyle[] => {
    const txtStyles: TextStyle[] = [styles.baseText];

    switch (variant) {
      case 'primary':
        txtStyles.push({ color: Colors.light.textOnPrimary });
        break;
      case 'secondary':
        txtStyles.push({ color: Colors.light.textOnAccent });
        break;
      case 'gradient':
        txtStyles.push({ color: '#FFFFFF' });
        break;
      case 'outline':
        txtStyles.push({ color: Colors.light.primary });
        break;
      case 'text':
        txtStyles.push({ color: Colors.light.accent, textDecorationLine: 'underline' });
        break;
      case 'danger':
        txtStyles.push({ color: Colors.light.textOnPrimary });
        break;
    }

    switch (size) {
      case 'sm':
        txtStyles.push(styles.textSm);
        break;
      case 'md':
        txtStyles.push(styles.textMd);
        break;
      case 'lg':
        txtStyles.push(styles.textLg);
        break;
    }

    if (disabled || loading) {
      txtStyles.push({ color: Colors.light.textLight });
    }

    return txtStyles;
  };

  const finalButtonStyle = getButtonStyle();
  const finalTextStyle = getTextStyle();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={finalButtonStyle}
        {...props}
      >
        {/* Pseudo-gradient top strip for gradient variant */}
        {variant === 'gradient' && (
          <View style={styles.gradientTopLayer} pointerEvents="none" />
        )}
        {loading ? (
          <ActivityIndicator
            size="small"
            color={
              variant === 'outline' || variant === 'text'
                ? Colors.light.primary
                : Colors.light.textOnPrimary
            }
          />
        ) : (
          <Text style={[finalTextStyle, textStyle]}>{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  baseText: {
    ...Typography.button,
    textAlign: 'center',
  },
  sizeSm: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 38,
  },
  sizeMd: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    height: 48,
  },
  sizeLg: {
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
    height: 56,
  },
  textSm: {
    fontSize: 13,
  },
  textMd: {
    fontSize: 15,
  },
  textLg: {
    fontSize: 16,
  },
  gradientTopLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
});
