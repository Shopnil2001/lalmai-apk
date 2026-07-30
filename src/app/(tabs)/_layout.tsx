import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { TabBarVisibilityProvider, useTabBarVisibility } from '../../context/TabBarVisibilityContext';

function TabBarBackground() {
  return <View style={StyleSheet.absoluteFill} />;
}

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { translateY } = useTabBarVisibility();

  const TAB_BAR_HEIGHT = 68;
  const BOTTOM_OFFSET = 1 + (insets.bottom > 0 ? insets.bottom : 0);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.accent,
        tabBarInactiveTintColor: '#64748B',
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: BOTTOM_OFFSET,
          left: 16,
          right: 16,
          height: TAB_BAR_HEIGHT,
          backgroundColor: '#1E293B',
          borderRadius: 28,
          borderTopWidth: 0,
          paddingBottom: 0,
          paddingTop: 0,
          ...Platform.select({
            ios: {
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 20,
            },
            android: {
              elevation: 16,
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
        tabBarBackground: () => <TabBarBackground />,
      }}
      tabBar={(props) => (
        <Animated.View
          style={[
            styles.animatedTabBar,
            { transform: [{ translateY }] }
          ]}
        >
          <BottomTabBar {...props} />
        </Animated.View>
      )}
    >

      <Tabs.Screen
        name="meetings"
        options={{
          title: 'Meetings',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrapper : styles.inactiveIconWrapper}>
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrapper : styles.inactiveIconWrapper}>
              <Ionicons
                name={focused ? 'flag' : 'flag-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="fees"
        options={{
          title: 'Fees',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrapper : styles.inactiveIconWrapper}>
              <Ionicons
                name={focused ? 'wallet' : 'wallet-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrapper : styles.inactiveIconWrapper}>
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <TabBarVisibilityProvider>
      <TabNavigator />
    </TabBarVisibilityProvider>
  );
}

const styles = StyleSheet.create({
  activeIconWrapper: {
    backgroundColor: 'rgba(79, 70, 229, 0.25)',
    borderRadius: 14,
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIconWrapper: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    elevation: 0,
  },
});
