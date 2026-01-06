// ============================================================
// ClimaTrak Mobile - Root Layout
// ============================================================

import { useEffect } from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore, useSyncStore } from '@/store';
import { theme } from '@/theme';
import { configureNetInfo } from '@/config';

// Configure NetInfo early (before any network checks)
configureNetInfo();

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  
  const { isAuthenticated, isRestoring, restoreSession } = useAuthStore();
  const { initialize: initSync } = useSyncStore();

  // Restore session on app start
  useEffect(() => {
    restoreSession();
    initSync();
  }, []);

  // Handle auth state changes
  useEffect(() => {
    if (isRestoring) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login
      router.replace('/(auth)/login-email');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to app
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isRestoring, segments]);

  // Show loading while restoring session
  if (isRestoring) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: theme.colors.neutral[50] },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="work-order/[id]" 
        options={{ 
          headerShown: true,
          headerTitle: 'Ordem de Serviço',
          headerBackTitle: 'Voltar',
          headerTintColor: theme.colors.primary[600],
        }} 
      />
      <Stack.Screen 
        name="asset/[id]" 
        options={{ 
          headerShown: true,
          headerTitle: 'Ativo',
          headerBackTitle: 'Voltar',
          headerTintColor: theme.colors.primary[600],
        }} 
      />
      <Stack.Screen 
        name="alert/[id]" 
        options={{ 
          headerShown: true,
          headerTitle: 'Alerta',
          headerBackTitle: 'Voltar',
          headerTintColor: theme.colors.primary[600],
        }} 
      />
      <Stack.Screen 
        name="scanner" 
        options={{ 
          presentation: 'modal',
          headerShown: true,
          headerTitle: 'Scanner',
          headerTintColor: theme.colors.primary[600],
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar 
            barStyle="dark-content" 
            backgroundColor={theme.colors.white} 
          />
          <RootLayoutNav />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
});
