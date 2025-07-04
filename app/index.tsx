import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from "expo-router";
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Import auth forms from the same folder
import LoginPage from './login';
import SignUpPage from './SignUpPage';

export default function HomeScreen() {
  const [loggedIn, setLoggedIn]       = useState<string>('');
  const [userId, setUserId]           = useState<string>('');
  const [initialized, setInitialized] = useState<boolean>(false);
  const [activeTab, setActiveTab]     = useState<'login' | 'signup'>('login');

  // // Uncomment to clear login state
  // useEffect(() => {
  //   AsyncStorage.clear().then(() => {
  //     console.log("AsyncStorage cleared!");
  //   });
  // }, []);

  useEffect(() => {
    AsyncStorage.multiGet(['logged_in', 'user_id'])
      .then(results => {
        const flag = results.find(r => r[0] === 'logged_in')?.[1] ?? '';
        const id   = results.find(r => r[0] === 'user_id')?.[1] ?? '';
        setLoggedIn(flag);
        setUserId(id);
      })
      .catch(console.error)
      .finally(() => setInitialized(true));
  }, []);

  if (!initialized) return null;

  if (loggedIn !== 'true') {
    return (
      <SafeAreaView style={styles.authContainer}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity onPress={() => setActiveTab('login')}>
            <Text style={[styles.toggleText, activeTab === 'login' && styles.toggleActive]}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('signup')}>
            <Text style={[styles.toggleText, activeTab === 'signup' && styles.toggleActive]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
        {activeTab === 'login' ? (
          <LoginPage
            setLoggedIn={setLoggedIn}
            setUserId={setUserId}
            onShowSignUp={() => setActiveTab('signup')}
          />
        ) : (
          <SignUpPage
            setLoggedIn={setLoggedIn}
            setUserId={setUserId}
            onShowLogin={() => setActiveTab('login')}
          />
        )}
      </SafeAreaView>
    );
  }

return (
    <View style={styles.container}>
      <Redirect href={"./(tabs)/home"} />
    </View>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: '#d96922' },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#d96922',
  },
  toggleText: {
    fontSize: 18,
    color: '#888',
    marginHorizontal: 24,
  },
  toggleActive: {
    color: '#08004d',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});