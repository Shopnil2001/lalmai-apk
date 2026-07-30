import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Pressable,
  StyleProp,
  Platform,
} from 'react-native';
import { Colors, Shadows, Spacing } from '../constants/theme';

type CardVariant = 'default' | 'elevated' | 'outline' | 'flat';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  elevation?: 'sm' | 'md' | 'lg';
  variant?: CardVariant;
}

export default function Card({
  children,
  style,
  onPress,
  elevation = 'sm',
  variant = 'default',
}: CardProps) {

  const variantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          ...Platform.select({
            ios: {
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.14,
              shadowRadius: 20,
            },
            android: { elevation: 6 },
            default: {},
          }),
        } as ViewStyle;
      case 'outline':
        return {
          borderWidth: 1,
          borderColor: Colors.light.border,
          ...Platform.select({
            ios: {
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
            },
            android: { elevation: 2 },
            default: {},
          }),
        } as ViewStyle;
      case 'flat':
        return {
          backgroundColor: Colors.light.surfaceDarker,
          // no shadow
        } as ViewStyle;
      default:
        return Shadows[elevation] as ViewStyle;
    }
  };

  const cardStyles = [styles.card, variantStyle(), style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyles, pressed && { opacity: 0.92 }]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignSelf: 'stretch',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
});
