// ============================================================
// ClimaTrak Mobile - Auth Layout
// ============================================================

import { Stack } from 'expo-router';
import { theme } from '@/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.white },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login-email" />
      <Stack.Screen name="login-password" />
    </Stack>
  );
}
