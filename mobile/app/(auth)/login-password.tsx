// ============================================================
// ClimaTrak Mobile - Login Password Screen (Step 2)
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
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store';
import { theme } from '@/theme';
import { ArrowLeft, Eye, EyeOff, Building2, Loader2 } from 'lucide-react-native';

export default function LoginPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email: string;
    tenantSlug: string;
    tenantName: string;
  }>();
  
  const { login, isLoading, clearError } = useAuthStore();
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) {
      Alert.alert('Atenção', 'Digite sua senha');
      return;
    }

    if (!params.email || !params.tenantSlug) {
      Alert.alert('Erro', 'Dados de login inválidos');
      router.back();
      return;
    }

    try {
      clearError();
      await login(params.email, password, params.tenantSlug);
      // Navigation happens automatically via auth state change in _layout
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Email ou senha incorretos');
    }
  };

  const handleBack = () => {
    clearError();
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleBack} 
            style={styles.backButton}
            disabled={isLoading}
          >
            <ArrowLeft size={24} color={theme.colors.neutral[700]} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Tenant Info */}
          <View style={styles.tenantCard}>
            <View style={styles.tenantIcon}>
              <Building2 size={24} color={theme.colors.primary[500]} />
            </View>
            <View style={styles.tenantInfo}>
              <Text style={styles.tenantName}>{params.tenantName}</Text>
              <Text style={styles.tenantEmail}>{params.email}</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.title}>Digite sua senha</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.neutral[400]}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  editable={!isLoading}
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={theme.colors.neutral[500]} />
                  ) : (
                    <Eye size={20} color={theme.colors.neutral[500]} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                (!password.trim() || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={!password.trim() || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <Loader2 size={20} color={theme.colors.white} />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Não é você?{' '}
              <Text style={styles.footerLink} onPress={handleBack}>
                Usar outro email
              </Text>
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
  header: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.full,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[6],
    justifyContent: 'center',
  },
  tenantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[8],
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  tenantIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.neutral[900],
  },
  tenantEmail: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  form: {
    marginBottom: theme.spacing[8],
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing[6],
  },
  inputContainer: {
    marginBottom: theme.spacing[2],
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing[2],
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.white,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: theme.spacing[4],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[900],
  },
  eyeButton: {
    padding: theme.spacing[3],
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing[4],
  },
  forgotPasswordText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[600],
    fontWeight: '500',
  },
  button: {
    height: 48,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.neutral[300],
  },
  buttonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.white,
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
