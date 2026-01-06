// ============================================================
// ClimaTrak Mobile - Login Email Screen (Step 1)
// ============================================================

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store';
import { theme } from '@/theme';
import { Loader2 } from 'lucide-react-native';

export default function LoginEmailScreen() {
  const router = useRouter();
  const { discoverTenant, isLoading, error, clearError } = useAuthStore();
  
  const [email, setEmail] = useState('');

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleContinue = async () => {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Digite seu email');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Atenção', 'Digite um email válido');
      return;
    }

    try {
      clearError();
      const tenant = await discoverTenant(email.trim().toLowerCase());
      
      // Navigate to password screen with email and tenant
      router.push({
        pathname: '/(auth)/login-password',
        params: { 
          email: email.trim().toLowerCase(),
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
        },
      });
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível encontrar sua organização');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>CT</Text>
            </View>
            <Text style={styles.appName}>ClimaTrak</Text>
            <Text style={styles.appTagline}>Manutenção em Campo</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.title}>Entrar</Text>
            <Text style={styles.subtitle}>
              Digite seu email para encontrar sua organização
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="seu.email@empresa.com"
                placeholderTextColor={theme.colors.neutral[400]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                (!email.trim() || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!email.trim() || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <Loader2 
                  size={20} 
                  color={theme.colors.white} 
                  style={styles.spinner}
                />
              ) : (
                <Text style={styles.buttonText}>Continuar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Problemas para acessar?{' '}
              <Text style={styles.footerLink}>Fale com o suporte</Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[6],
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing[10],
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.white,
  },
  appName: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: '700',
    color: theme.colors.neutral[900],
  },
  appTagline: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    marginTop: theme.spacing[1],
  },
  form: {
    marginBottom: theme.spacing[8],
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing[6],
  },
  inputContainer: {
    marginBottom: theme.spacing[4],
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing[2],
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing[4],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[900],
    backgroundColor: theme.colors.white,
  },
  button: {
    height: 48,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing[2],
  },
  buttonDisabled: {
    backgroundColor: theme.colors.neutral[300],
  },
  buttonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.white,
  },
  spinner: {
    // Lucide icons don't have native animation, would need Animated
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
  },
  footerLink: {
    color: theme.colors.primary[600],
    fontWeight: '500',
  },
});
