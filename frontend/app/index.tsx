// app/index.tsx
// Login screen - entry point of the app

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authApi } from '@/lib/api';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingStoredUser, setCheckingStoredUser] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On mount: check if user is already logged in
  useEffect(() => {
    let isMounted = true;

    const checkStoredUser = async () => {
      try {
        const user = await authApi.getCurrentUser();
        if (user) {
          // If user exists, skip login and go to dashboard
          router.replace('/(tabs)');
          return;
        }
      } catch (e) {
        console.log('Error reading stored user', e);
      }

      if (isMounted) {
        setCheckingStoredUser(false);
      }
    };

    checkStoredUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogin = async () => {
    let didNavigate = false;

    if (!email || !password) {
      setError('Please fill out all fields.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const { user } = await authApi.login(email, password);
      // User and token are automatically stored by authApi.login
      router.replace('/(tabs)');
      didNavigate = true;
    } catch (e) {
      console.error(e);
      setError('Invalid email or password. Please try again.');
    } finally {
      if (!didNavigate) {
        setIsSubmitting(false);
      }
    }
  };

  const handleSignUpPress = () => {
    router.push('/signup');
  };

  const isButtonDisabled = isSubmitting || !email || !password;

  if (checkingStoredUser) {
    // Small loading state while we check AsyncStorage
    return (
      <View style={styles.root}>
        <ActivityIndicator color="#F9FAFB" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.logo}>DISCO</Text>
          <Text style={styles.title}>Log in to Disco</Text>
        </View>

        {/* Email Input */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email address"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Password Input */}
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
        />

        {/* Error Message */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isButtonDisabled}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#F9FAFB" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Sign Up Button */}
        <TouchableOpacity
          style={styles.signUpButton}
          onPress={handleSignUpPress}
        >
          <Text style={styles.signUpText}>
            Don't have an account? <Text style={styles.signUpTextBold}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '85%',
    maxWidth: 420,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#4C1D95',
    marginBottom: 8,
    letterSpacing: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 4,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#4C1D95',
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#F9FAFB',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    marginTop: 8,
    color: '#DC2626',
    fontSize: 13,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D1D5DB',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  signUpButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  signUpText: {
    color: '#374151',
    fontSize: 14,
  },
  signUpTextBold: {
    color: '#4C1D95',
    fontWeight: '700',
  },
});

