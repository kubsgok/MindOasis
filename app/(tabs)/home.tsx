import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AirtableService from '../../airtable';

const avatars = [
  { name: 'cat', src: require('../../assets/avatars/cat.png') },
  { name: 'dog', src: require('../../assets/avatars/dog.png') },
  { name: 'bunny', src: require('../../assets/avatars/bunny.png') },
  { name: 'dog2', src: require('../../assets/avatars/dog2.png') },
  { name: 'hamster', src: require('../../assets/avatars/hamster.png') },
  { name: 'bird', src: require('../../assets/avatars/bird.png') },
  { name: 'hamster2', src: require('../../assets/avatars/hamster2.png') },
  { name: 'dog3', src: require('../../assets/avatars/dog3.png') },
  { name: 'cat2', src: require('../../assets/avatars/cat2.png') },
];

// Types
interface UserFields {
  name?: string;
  avatar?: string;
  health?: number;
  [key: string]: any;
}
interface Medication {
  id: string;
  name: string;
  [key: string]: any;
}

export default function HomeTab() {
  const router = useRouter();
  const [user, setUser] = useState<UserFields | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<any>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [health, setHealth] = useState<number>(80); // Default, will update from user record if present
  const [loading, setLoading] = useState(true);
  const [medStatus, setMedStatus] = useState<{ [medName: string]: { done: boolean; timestamp: string } }>({});

  // Helper to get today's date string
  const todayStr = dayjs().format('YYYY-MM-DD');
  const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  // Load medication status and check for yesterday's completion
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userId = await AsyncStorage.getItem('user_id');
        if (!userId) return;
        // Fetch all users and find the current user by ID
        const users: { id: string; fields: UserFields }[] = await AirtableService.getAllUsers();
        const userRecord = users.find((u: { id: string; fields: UserFields }) => u.id === userId);
        let currentHealth = 80;
        if (userRecord) {
          setUser(userRecord.fields);
          currentHealth = userRecord.fields.health || 80;
          const avatarObj = avatars.find((a: { name: string; src: any }) => a.name === userRecord.fields.avatar);
          setAvatarSrc(avatarObj ? avatarObj.src : avatars[0].src);
        }
        // Fetch medications
        const meds: Medication[] = await AirtableService.getMedicationsForUser(userId);
        setMedications(meds);
        // Load medication status from AsyncStorage
        const medStatusObj: { [medName: string]: { done: boolean; timestamp: string } } = {};
        for (const med of meds) {
          const doneKey = `${med.name}:done`;
          const tsKey = `${med.name}:timestamp`;
          const doneVal = await AsyncStorage.getItem(doneKey);
          const tsVal = await AsyncStorage.getItem(tsKey);
          medStatusObj[med.name] = {
            done: doneVal === todayStr,
            timestamp: tsVal || '',
          };
        }
        setMedStatus(medStatusObj);
        // Check yesterday's completion for all meds
        let allDoneYesterday = true;
        for (const med of meds) {
          const tsKey = `${med.name}:timestamp`;
          const tsVal = await AsyncStorage.getItem(tsKey);
          if (tsVal !== yesterdayStr) {
            allDoneYesterday = false;
            break;
          }
        }
        // Update health if needed
        let newHealth = currentHealth;
        let healthChanged = false;
        if (userRecord) {
          if (allDoneYesterday) {
            if (currentHealth < 100) {
              newHealth = Math.min(currentHealth + 10, 100);
              healthChanged = true;
            }
          } else {
            if (currentHealth > 0) {
              newHealth = Math.max(currentHealth - 10, 0);
              healthChanged = true;
            }
          }
          if (healthChanged) {
            setHealth(newHealth);
            await AirtableService.updateRecord(userId, { pethealth: newHealth });
          }
        }
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handler for marking medication as done
  const handleMedDone = async (medName: string) => {
    const doneKey = `${medName}:done`;
    const tsKey = `${medName}:timestamp`;
    await AsyncStorage.setItem(doneKey, todayStr);
    await AsyncStorage.setItem(tsKey, todayStr);
    setMedStatus((prev) => ({
      ...prev,
      [medName]: { done: true, timestamp: todayStr },
    }));
  };

  // Health bar width calculation
  const healthPercent = Math.min(Math.max(health, 0), 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Top section: health bar only (no menu icon) */}
        <View style={styles.topSection}>
          {/* Removed Ionicons menu icon */}
          <View style={styles.healthBarContainer}>
            <View style={styles.healthBarBg}>
              <View style={[styles.healthBarFill, { width: `${healthPercent}%` }]} />
            </View>
            <Text style={styles.healthText}>{health}/100</Text>
          </View>
        </View>

        {/* Pet avatar and name */}
        <View style={styles.petSection}>
          {avatarSrc && (
            <Image source={avatarSrc} style={styles.avatarImg} />
          )}
          <TouchableOpacity onPress={() => router.push('../chat')} style={styles.chatIcon}>
            <Ionicons name="chatbubble-ellipses" size={40} color="#060256" />
          </TouchableOpacity>
          <Text style={styles.petNameBelow}>{user?.name || 'Tommy'}</Text>
        </View>

        {/* Medications section */}
        <View style={styles.medsSection}>
          <View style={styles.medsHeaderRow}>
            <Text style={styles.medsHeader}>Medications</Text>
            {/* Removed add-circle icon */}
          </View>
          {medications.map((med: Medication) => {
            const isDone = medStatus[med.name]?.done;
            return (
              <View key={med.id} style={styles.medRow}>
                <Text style={styles.medText}>Eat {med.name}</Text>
                <TouchableOpacity onPress={() => handleMedDone(med.name)}>
                  <Ionicons name="checkmark-done-circle" size={28} color={isDone ? '#4CAF50' : '#E6E6E6'} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Bottom nav is handled by the tab navigator */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EA6F1D',
  },
  container: {
    flex: 1,
    backgroundColor: '#EA6F1D',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 0,
    margin: 0,
    minHeight: '100%',
    backgroundColor: 'transparent',
  },
  topSection: {
    backgroundColor: '#EA6F1D',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 12,
    alignItems: 'flex-start',
  },
  menuIcon: {
    marginBottom: 16,
  },
  healthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthBarBg: {
    width: 160,
    height: 20,
    backgroundColor: '#E6E6E6',
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#A63D3D',
    position: 'relative',
  },
  healthBarFill: {
    height: '100%',
    backgroundColor: '#A63D3D',
    borderRadius: 8,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  healthText: {
    color: '#A63D3D',
    fontWeight: 'bold',
    fontSize: 16,
  },
  petSection: {
    alignItems: 'center',
    backgroundColor: '#EA6F1D',
    paddingTop: 8,
    paddingBottom: 24,
    position: 'relative',
  },
  avatarImg: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  petName: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  petNameBelow: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  chatIcon: {
    position: 'absolute',
    right: 32,
    top: 40,
  },
  medsSection: {
    backgroundColor: '#7B8DF2',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 32,
    paddingHorizontal: 24,
    flex: 1,
    minHeight: 320,
  },
  medsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  medsHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: 'black',
    marginRight: 8,
  },
  medRow: {
    backgroundColor: '#FFF7D6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
});