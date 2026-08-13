import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: Colors.light.background,
        },
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="members/index" />
      <Stack.Screen name="members/[id]" />
      <Stack.Screen name="meetings/create" />
      <Stack.Screen name="meetings/[id]/attendance" />
      <Stack.Screen name="meetings/[id]/edit" />
      <Stack.Screen name="events/create" />
      <Stack.Screen name="events/[id]/edit" />
      <Stack.Screen name="events/[id]/attendance" />
      <Stack.Screen name="fees/index" />
      <Stack.Screen name="announcements/create" />
      <Stack.Screen name="activities/create" />
      <Stack.Screen name="landing-settings" />
    </Stack>
  );
}
