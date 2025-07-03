import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AirtableService from '../airtable';
import { useRouter } from 'expo-router';

interface LoginProps {
  setLoggedIn: (val: string) => void;
  setUserId: (id: string) => void;
  onShowSignUp: () => void;   // now required
}

const LoginScreen: React.FC<LoginProps> = ({ setLoggedIn, setUserId, onShowSignUp }) => {
  const router = useRouter();
  const [email, setEmail]       = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError]       = useState<string>('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    try {
      const records = await AirtableService.getUserByEmail(email.trim());
      if (records.length && records[0].fields.password === password) {
        const id = records[0].id;
        await AsyncStorage.setItem('logged_in', 'true');
        await AsyncStorage.setItem('user_id', id);
        // inform parent gating
        setUserId(id);
        setLoggedIn('true');
        // navigate into app if needed
        router.replace('/');
      } else {
        setError('Incorrect email or password.');
      }
    } catch (e) {
      console.error('Login error:', e);
      setError('Login failed. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>
      <Image source={require('../assets/images/cat.png')} style={styles.avatar} />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.label}>Email:</Text>
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="email-outline" size={20} color="#999" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="enter your email"
          placeholderTextColor="#777"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <Text style={styles.label}>Password:</Text>
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="lock-outline" size={20} color="#999" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="enter your password"
          placeholderTextColor="#777"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <TouchableOpacity onPress={() => {/* TODO: navigate to Forgot Password */}}>
        <Text style={styles.forgot}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don’t have an account? </Text>
        <TouchableOpacity onPress={onShowSignUp}>
          <Text style={styles.link}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d96922',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    color: 'white',
    marginBottom: 24,
    textAlign: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 24,
  },
  error: {
    color: '#ffdddd',
    textAlign: 'center',
    marginBottom: 12,
  },
  label: {
    color: 'white',
    fontSize: 16,
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  forgot: {
    color: 'white',
    fontSize: 14,
    marginBottom: 24,
    alignSelf: 'flex-end',
  },
  button: {
    backgroundColor: '#08004d',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: 'white',
    fontSize: 14,
  },
  link: {
    color: '#08004d',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;