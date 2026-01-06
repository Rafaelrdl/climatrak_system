// ============================================================
// ClimaTrak Mobile - NetInfo Configuration
// ============================================================

import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

/**
 * Configure NetInfo for web platform
 * Disables reachability checks that cause 404 errors
 */
export function configureNetInfo() {
  if (Platform.OS === 'web') {
    // On web, configure NetInfo to not make reachability requests
    NetInfo.configure({
      reachabilityUrl: '', // Disable reachability URL
      reachabilityTest: async () => true, // Always assume reachable on web
      reachabilityLongTimeout: 0, // Disable long timeout
      reachabilityShortTimeout: 0, // Disable short timeout
      reachabilityRequestTimeout: 0, // Disable request timeout
      useNativeReachability: false, // Don't use native reachability
    });
  }
}
