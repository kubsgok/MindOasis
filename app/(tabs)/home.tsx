import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  dosage?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
  reminderDays?: string[];
  reminderTimes?: string[];
  [key: string]: any;
}

export default function HomeTab() {
  const router = useRouter();
  const [user, setUser] = useState<UserFields | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<any>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [overdueMedications, setOverdueMedications] = useState<Medication[]>([]);
  const [allMedications, setAllMedications] = useState<Medication[]>([]); // Store all medications
  const [health, setHealth] = useState<number>(80); // Default, will update from user record if present
  const [loading, setLoading] = useState(true);
  const [medStatus, setMedStatus] = useState<{ [medName: string]: { done: boolean; timestamp: string } }>({});
  const [currentDay, setCurrentDay] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);
  
  // Modal state
  const [showMedDetailsModal, setShowMedDetailsModal] = useState<boolean>(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);

  // Helper to get today's date string
  const todayStr = dayjs().format('YYYY-MM-DD');
  const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  // Helper to get current day of week for medication filtering
  const getCurrentDayOfWeek = () => {
    const day = dayjs().day(); // 0 = Sunday, 1 = Monday, etc.
    const dayMap = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    return dayMap[day];
  };

  // Filter medications for today
  const getTodayMedications = (meds: Medication[]) => {
    const currentDay = getCurrentDayOfWeek();
    return meds.filter(med => {
      // If no reminder days are set, show the medication every day
      if (!med.reminderDays || med.reminderDays.length === 0) {
        return true;
      }
      // Otherwise, only show if today is in the reminder days
      return med.reminderDays.includes(currentDay);
    });
  };

  // Get overdue medications for today only (with 15-minute grace period)
  const getOverdueMedications = (meds: Medication[]) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes for comparison
    const currentDay = getCurrentDayOfWeek();
    const gracePeriod = 15; // 15 minutes grace period
    
    return meds.filter(med => {
      // Only check medications that have reminder times
      if (!med.reminderTimes || med.reminderTimes.length === 0) {
        return false;
      }
      
      // Only check medications scheduled for today
      if (med.reminderDays && med.reminderDays.length > 0) {
        if (!med.reminderDays.includes(currentDay)) {
          return false; // Not scheduled for today
        }
      }
      
      // Check if any reminder time has passed the grace period
      return med.reminderTimes.some(timeStr => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const reminderTime = hours * 60 + minutes;
        const overdueTime = reminderTime + gracePeriod; // Add 15 minutes to reminder time
        return currentTime > overdueTime;
      });
    });
  };

  // Refresh function to update all data
  const refreshData = async () => {
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
      
      // Store all medications and set current day
      setAllMedications(meds);
      const today = getCurrentDayOfWeek();
      setCurrentDay(today);
      
      // Filter medications for today
      const todayMeds = getTodayMedications(meds);
      setMedications(todayMeds);
      
      // Get overdue medications
      const overdueMeds = getOverdueMedications(meds);
      setOverdueMedications(overdueMeds);
      
      // Load medication status from AsyncStorage for today's medications
      const medStatusObj: { [medName: string]: { done: boolean; timestamp: string } } = {};
      for (const med of todayMeds) {
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
      
      // Check yesterday's completion for all meds (not just today's)
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
      console.error('Failed to refresh home data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load medication status and check for yesterday's completion
  useEffect(() => {
    refreshData();
  }, []);

  // Refresh data every time the home tab is focused
  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [])
  );

  // Update medications when day changes
  useEffect(() => {
    if (allMedications.length > 0) {
      const today = getCurrentDayOfWeek();
      if (today !== currentDay) {
        setCurrentDay(today);
        const todayMeds = getTodayMedications(allMedications);
        setMedications(todayMeds);
        
        // Update overdue medications
        const overdueMeds = getOverdueMedications(allMedications);
        setOverdueMedications(overdueMeds);
        
        // Reset medication status for new day
        const newMedStatus: { [medName: string]: { done: boolean; timestamp: string } } = {};
        for (const med of todayMeds) {
          newMedStatus[med.name] = { done: false, timestamp: '' };
        }
        setMedStatus(newMedStatus);
      }
    }
  }, [allMedications, currentDay]);

  // Handler for toggling medication status
  const handleMedToggle = async (medName: string) => {
    const doneKey = `${medName}:done`;
    const tsKey = `${medName}:timestamp`;
    const currentStatus = medStatus[medName]?.done;
    
    if (currentStatus) {
      // Uncheck the medication
      await AsyncStorage.removeItem(doneKey);
      await AsyncStorage.removeItem(tsKey);
      setMedStatus((prev) => ({
        ...prev,
        [medName]: { done: false, timestamp: '' },
      }));
    } else {
      // Check the medication
      await AsyncStorage.setItem(doneKey, todayStr);
      await AsyncStorage.setItem(tsKey, todayStr);
      setMedStatus((prev) => ({
        ...prev,
        [medName]: { done: true, timestamp: todayStr },
      }));
    }
  };

  // Handler for opening medication details modal
  const openMedDetailsModal = (medication: Medication) => {
    setSelectedMedication(medication);
    setShowMedDetailsModal(true);
  };

  // Handler for closing medication details modal
  const closeMedDetailsModal = () => {
    setShowMedDetailsModal(false);
    setSelectedMedication(null);
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
            <Text style={styles.medsSubHeader}>({medications.length} scheduled)</Text>
          </View>
          {medications.map((med: Medication) => {
            const isDone = medStatus[med.name]?.done;
            return (
              <TouchableOpacity key={med.id} style={styles.medRow} onPress={() => openMedDetailsModal(med)}>
                <Text style={styles.medText}>Take {med.name}</Text>
                <TouchableOpacity onPress={(e) => {
                  e.stopPropagation();
                  handleMedToggle(med.name);
                }}>
                  <Ionicons name="checkmark-done-circle" size={28} color={isDone ? '#4CAF50' : '#E6E6E6'} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
          
          {/* Overdue Medications section */}
          {overdueMedications.length > 0 && (
            <>
              <View style={styles.overdueHeaderRow}>
                <Text style={styles.overdueHeader}>⚠️ Overdue Medications</Text>
                <Text style={styles.overdueSubHeader}>({overdueMedications.length} overdue)</Text>
              </View>
              {overdueMedications.map((med: Medication) => {
                const isDone = medStatus[med.name]?.done;
                return (
                  <TouchableOpacity key={med.id} style={[styles.medRow, styles.overdueRow]} onPress={() => openMedDetailsModal(med)}>
                    <Text style={styles.overdueText}>Take {med.name}</Text>
                                      <TouchableOpacity onPress={(e) => {
                    e.stopPropagation();
                    handleMedToggle(med.name);
                  }}>
                      <Ionicons name="checkmark-done-circle" size={28} color={isDone ? '#4CAF50' : '#E6E6E6'} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>

        {/* Bottom nav is handled by the tab navigator */}
      </ScrollView>

      {/* Medication Details Modal */}
      <Modal
        visible={showMedDetailsModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContentContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeaderContainer}>
              <Text style={styles.modalTitle}>Medication Details</Text>
            </View>

            {/* Modal Body */}
            {selectedMedication && (
              <>
                <Text style={styles.medicationName}>{selectedMedication.name}</Text>
                
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Dosage:</Text>
                  <Text style={styles.modalDetailValue}>{selectedMedication.dosage || 'Not specified'}</Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Frequency:</Text>
                  <Text style={styles.modalDetailValue}>{selectedMedication.frequency || 'Not specified'}</Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Duration:</Text>
                  <Text style={styles.modalDetailValue}>{selectedMedication.duration || 'Not specified'}</Text>
                </View>

                {selectedMedication.notes && (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Notes:</Text>
                    <Text style={styles.modalDetailValue}>{selectedMedication.notes}</Text>
                  </View>
                )}

                {selectedMedication.reminderDays && selectedMedication.reminderDays.length > 0 && (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Reminder Days:</Text>
                    <Text style={styles.modalDetailValue}>{selectedMedication.reminderDays.join(', ')}</Text>
                  </View>
                )}

                {selectedMedication.reminderTimes && selectedMedication.reminderTimes.length > 0 && (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Reminder Times:</Text>
                    <Text style={styles.modalDetailValue}>{selectedMedication.reminderTimes.join(', ')}</Text>
                  </View>
                )}

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Status:</Text>
                  <Text style={[styles.modalDetailValue, { color: medStatus[selectedMedication.name]?.done ? '#4CAF50' : '#FF9800' }]}>
                    {medStatus[selectedMedication.name]?.done ? 'Taken' : 'Not taken'}
                  </Text>
                </View>

                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity 
                    style={[styles.modalButton, { backgroundColor: medStatus[selectedMedication.name]?.done ? '#4CAF50' : '#d96922' }]} 
                    onPress={() => {
                      handleMedToggle(selectedMedication.name);
                      closeMedDetailsModal();
                    }}
                  >
                    <Text style={styles.modalButtonText}>
                      {medStatus[selectedMedication.name]?.done ? 'Already Taken' : 'Mark as Taken'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={closeMedDetailsModal}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    minHeight: 500,
    paddingBottom: 100,
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
  medsSubHeader: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeaderContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d96922',
    textAlign: 'center',
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalDetailLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
  },
  modalDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalButton: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalButtonContainer: {
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  closeButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 8,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  overdueHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#d32f2f',
    marginRight: 8,
  },
  overdueSubHeader: {
    fontSize: 14,
    color: '#d32f2f',
    fontStyle: 'italic',
  },
  overdueRow: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  overdueText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '500',
  },
  overdueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
});