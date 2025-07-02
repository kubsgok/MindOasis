import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  const [isLoading, setIsLoading]   = useState(true);
  const [loggedIn,  setLoggedIn]    = useState(false);

  useEffect(() => {
    // on mount, check AsyncStorage for your login flag
    AsyncStorage.getItem('logged_in')
      .then(val => setLoggedIn(val === 'true'))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    // spinner while we determine login state
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!loggedIn ? (
        // if not logged in, mount Login + SignUp from `app/login.tsx` & `app/signup.tsx`
        <>
          <Stack.Screen name="login"  />
          <Stack.Screen name="signup" />
        </>
      ) : (
        // once logged in, mount your entire TabLayout (in app/(tabs)/_layout.tsx)
        <Stack.Screen name="(tabs)" />
      )}
    </Stack>
  );
}

const styles = StyleSheet.create({
  loader: { flex:1, justifyContent:'center', alignItems:'center' }
});
