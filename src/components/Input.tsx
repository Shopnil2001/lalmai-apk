import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInputProps, 
  ViewStyle, 
  TextStyle,
  Platform
} from 'react-native';
import { Colors, Spacing, Typography } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  type?: string;
}

export default function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const isPassword = secureTextEntry;
  const showSecureText = isPassword && !isPasswordVisible;

  const isMultiline = props.multiline;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[
          styles.label,
          isFocused && styles.focusedLabel,
          !!error && styles.errorLabel
        ]}>
          {label}
        </Text>
      )}
      
      <View style={[
        styles.inputWrapper,
        isMultiline && styles.multilineWrapper,
        isFocused && styles.focusedWrapper,
        !!error && styles.errorWrapper
      ]}>
        {leftIcon && (
          <Ionicons 
            name={leftIcon} 
            size={20} 
            color={error ? Colors.light.error : isFocused ? Colors.light.accent : Colors.light.textLight} 
            style={[styles.leftIcon, isMultiline && styles.multilineLeftIcon]}
          />
        )}
        
        <TextInput
          style={[
            styles.input, 
            isMultiline && styles.multilineInput,
            inputStyle
          ]}
          placeholderTextColor={Colors.light.textLight}
          secureTextEntry={showSecureText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize="none"
          {...props}
        />

        {isPassword && (
          <TouchableOpacity 
            activeOpacity={0.7} 
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.rightIcon}
          >
            <Ionicons 
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} 
              size={20} 
              color={Colors.light.textSecondary} 
            />
          </TouchableOpacity>
        )}

        {!isPassword && rightIcon && (
          <TouchableOpacity 
            activeOpacity={0.7} 
            onPress={onRightIconPress}
            style={styles.rightIcon}
          >
            <Ionicons 
              name={rightIcon} 
              size={20} 
              color={Colors.light.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.label,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    paddingLeft: 2,
  },
  focusedLabel: {
    color: Colors.light.accent,
  },
  errorLabel: {
    color: Colors.light.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: Spacing.md,
  },
  multilineWrapper: {
    height: undefined,
    minHeight: 120,
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  focusedWrapper: {
    borderColor: Colors.light.accent,
  },
  errorWrapper: {
    borderColor: Colors.light.error,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  multilineLeftIcon: {
    marginTop: Platform.OS === 'ios' ? 2 : 4,
  },
  input: {
    flex: 1,
    height: '100%',
    color: Colors.light.text,
    ...Typography.bodyMedium,
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
      default: {},
    }),
  },
  multilineInput: {
    height: undefined,
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 0,
    paddingBottom: 0,
  },
  rightIcon: {
    padding: Spacing.xs,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.light.error,
    marginTop: Spacing.xs,
    paddingLeft: 2,
  },
  helperText: {
    ...Typography.bodySmall,
    color: Colors.light.textLight,
    marginTop: Spacing.xs,
    paddingLeft: 2,
  },
});
