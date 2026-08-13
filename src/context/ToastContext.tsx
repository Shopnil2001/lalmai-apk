import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../constants/theme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastContextData {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-40)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    // Clear any active timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setToast({ message, type });

    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(-40);

    // Fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide
    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToast(null);
      });
    }, duration);
  }, [fadeAnim, slideAnim]);

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setToast(null);
    });
  };

  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: Colors.light.successLight,
          border: Colors.light.success,
          text: Colors.light.success,
          icon: 'checkmark-circle' as const,
        };
      case 'error':
        return {
          bg: Colors.light.errorLight,
          border: Colors.light.error,
          text: Colors.light.error,
          icon: 'alert-circle' as const,
        };
      case 'warning':
        return {
          bg: Colors.light.warningLight,
          border: Colors.light.warning,
          text: Colors.light.warning,
          icon: 'warning' as const,
        };
      case 'info':
      default:
        return {
          bg: Colors.light.infoLight,
          border: Colors.light.info,
          text: Colors.light.info,
          icon: 'information-circle' as const,
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              backgroundColor: getToastStyle(toast.type).bg,
              borderColor: getToastStyle(toast.type).border,
            },
          ]}
        >
          <Ionicons
            name={getToastStyle(toast.type).icon}
            size={22}
            color={getToastStyle(toast.type).text}
            style={styles.icon}
          />
          <Text style={[styles.message, { color: getToastStyle(toast.type).text }]}>
            {toast.message}
          </Text>
          <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn}>
            <Ionicons name="close" size={16} color={getToastStyle(toast.type).text} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 9999,
    ...Shadows.md,
    maxWidth: Platform.OS === 'web' ? 500 : 'auto',
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  closeBtn: {
    marginLeft: 10,
    padding: 2,
  },
});
