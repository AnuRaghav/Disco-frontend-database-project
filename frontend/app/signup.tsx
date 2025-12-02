// app/signup.tsx

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

export default function SignUpScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingStoredUser, setCheckingStoredUser] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On mount: check if user is already stored
  useEffect(() => {
    let isMounted = true;

    const checkStoredUser = async () => {
      try {
        const user = await authApi.getCurrentUser();
        if (user) {
          setName(user.name ?? '');
          setUsername(user.username ?? '');
          setEmail(user.email ?? '');

          // If user exists, skip signup and go to dashboard
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

  const handleSignUp = async () => {
    let didNavigate = false;

    if (!name || !username || !email || !password) {
      setError('Please fill out all fields.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const { user } = await authApi.signup(name, username, email, password);
      // User and token are automatically stored by authApi.signup
      router.replace('/(tabs)');
      didNavigate = true;
    } catch (e: any) {
      console.error(e);
      // Show the error message from the API if available
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      if (!didNavigate) {
        setIsSubmitting(false);
      }
    }
  };

  const isButtonDisabled = isSubmitting || !name || !username || !email || !password;

  if (checkingStoredUser) {
    // small loading state while we check AsyncStorage
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
          <Text style={styles.title}>Sign up for Disco</Text>
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Patro Schiano"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="@username"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email address"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={isButtonDisabled}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#F9FAFB" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Back to Login Button */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.back()}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginTextBold}>Log in</Text>
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
    marginTop: 8,
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
  loginButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  loginText: {
    color: '#374151',
    fontSize: 14,
  },
  loginTextBold: {
    color: '#4C1D95',
    fontWeight: '700',
  },
});