import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AirtableService from '../airtable';

const avatars = [
  { name: 'cat', src: require('../assets/avatars/cat.png') },
  { name: 'dog', src: require('../assets/avatars/dog.png') },
  { name: 'bunny', src: require('../assets/avatars/bunny.png') },
  { name: 'dog2', src: require('../assets/avatars/dog2.png') },
  { name: 'hamster', src: require('../assets/avatars/hamster.png') },
  { name: 'bird', src: require('../assets/avatars/bird.png') },
  { name: 'hamster2', src: require('../assets/avatars/hamster2.png') },
  { name: 'dog3', src: require('../assets/avatars/dog3.png') },
  { name: 'cat2', src: require('../assets/avatars/cat2.png') },
];

export default function ChooseAvatarPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [petName, setPetName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleContinue = async () => {
    if (!selected) {
      setError('Please select an avatar.');
      return;
    }
    if (!petName.trim()) {
      setError('Please enter a name for your pet.');
      return;
    }
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (userId) {
        await AirtableService.updateRecord(userId, { 
          avatar: selected,
          name: petName.trim()
        });
      }
      router.replace('/(tabs)/home');
    } catch (e) {
      setError('Failed to save avatar and pet name.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Choose your avatar!</Text>
      
      {/* Pet Name Input */}
      <View style={styles.nameInputContainer}>
        <Text style={styles.nameLabel}>What's your pet's name?</Text>
        <TextInput
          style={styles.nameInput}
          value={petName}
          onChangeText={setPetName}
          placeholder="Enter pet name..."
          placeholderTextColor="#999"
          maxLength={20}
        />
      </View>
      
      <View style={styles.grid}>
        {avatars.map((avatar, idx) => (
          <TouchableOpacity
            key={avatar.name}
            style={[styles.avatarBox, selected === avatar.name && styles.selected]}
            onPress={() => setSelected(avatar.name)}
            activeOpacity={0.7}
          >
            <Image source={avatar.src} style={styles.avatarImg} />
          </TouchableOpacity>
        ))}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Let's go!</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EA6F1D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    marginBottom: 32,
    marginTop: 24,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 32,
    width: '100%',
  },
  avatarBox: {
    width: 80,
    height: 80,
    margin: 8,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: '#08004d',
    borderWidth: 3,
  },
  avatarImg: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  button: {
    backgroundColor: '#08004d',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    width: '80%',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    color: '#ffdddd',
    textAlign: 'center',
    marginBottom: 12,
  },
  nameInputContainer: {
    width: '100%',
    marginBottom: 32,
  },
  nameLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
    textAlign: 'left',
    width: '100%',
  },
  nameInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ccc',
  },
}); 