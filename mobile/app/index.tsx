// ============================================================
// ClimaTrak Mobile - Root Index (Initial Route)
// ============================================================

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store';
import { theme } from '@/theme';

/**
 * Root index route that handles initial navigation
 * Redirects to login or home based on auth state
 */
export default function Index() {
  const { isAuthenticated, isRestoring, restoreSession } = useAuthStore();

  // Restore session on mount
  useEffect(() => {
    restoreSession();
  }, []);

  // Show loading while restoring session
  if (isRestoring) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  // Redirect based on auth state
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/login-email" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
});
