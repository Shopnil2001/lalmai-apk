import React, { createContext, useContext, useState, useRef } from 'react';
import { Animated } from 'react-native';

interface TabBarVisibilityContextType {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  translateY: Animated.Value;
  handleScroll: (event: any) => void;
}

const TabBarVisibilityContext = createContext<TabBarVisibilityContextType | undefined>(undefined);

export function TabBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisibleState] = useState(true);
  const translateY = useRef(new Animated.Value(0)).current;
  const lastOffsetY = useRef(0);

  const setVisible = (isVisible: boolean) => {
    if (visible === isVisible) return;
    setVisibleState(isVisible);
    Animated.spring(translateY, {
      toValue: isVisible ? 0 : 130, // Move 130px off-screen
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  const handleScroll = (event: any) => {
    const currentOffsetY = event.nativeEvent.contentOffset.y;
    const diff = currentOffsetY - lastOffsetY.current;

    // Keep it visible at the very top (and ignore bounce scroll on iOS)
    if (currentOffsetY <= 10) {
      setVisible(true);
      lastOffsetY.current = currentOffsetY;
      return;
    }

    // Scroll Down (finger moves up, content moves up) -> Hide Tab Bar
    if (diff > 15 && currentOffsetY > 60) {
      setVisible(false);
    } 
    // Scroll Up (finger moves down, content moves down) -> Show Tab Bar
    else if (diff < -15) {
      setVisible(true);
    }

    lastOffsetY.current = currentOffsetY;
  };

  return (
    <TabBarVisibilityContext.Provider value={{ visible, setVisible, translateY, handleScroll }}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const context = useContext(TabBarVisibilityContext);
  if (!context) {
    throw new Error('useTabBarVisibility must be used within a TabBarVisibilityProvider');
  }
  return context;
}
