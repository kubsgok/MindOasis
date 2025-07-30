import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Dimensions, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AirtableService from '../../airtable';

// Import constants from airtable.js
const BASE_ID = "applqO7LmDa1HLTEs";
const PROMPT_TABLE_ID = "tblMoSlXmwjBqICGV";
const API_TOKEN = "patI8m8TdxXWzYg4Y.458904d2c40c330ec243a55e51a3439cd9983fe73ad66111f08ed10cb567e5b6";
const PROMPT_TABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${PROMPT_TABLE_ID}`;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CELL_SIZE = Math.floor((Dimensions.get('window').width - 16) / 7); // 16 for padding

function getColorForMood(mood: number | undefined) {
  if (mood === undefined || mood === null) return 'transparent';
  if (mood < 3.3) return '#e74c3c'; // red
  if (mood <= 6.6) return '#f7ca18'; // yellow
  return '#27ae60'; // green
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DashboardTab() {
  const [userId, setUserId] = useState('');
  const [journalData, setJournalData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [adherenceData, setAdherenceData] = useState<{ total: number; taken: number; percentage: number }>({ total: 0, taken: 0, percentage: 0 });
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [promptText, setPromptText] = useState<string>('');

  useEffect(() => {
    AsyncStorage.getItem('user_id').then(id => {
      if (id) setUserId(id);
    });
  }, []);

  // Map: { 'YYYY-MM-DD': { mood, entry } }
  const [entryMap, setEntryMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!userId) return;
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const records = await AirtableService.getAllJournalEntriesForUser(userId);
        const map: Record<string, number> = {};
        const entryMap: Record<string, any> = {};

        records.forEach((rec: any) => {
          let date = rec.fields.Date;
          const mood = rec.fields.Scale || rec.fields['# Scale'];
          if (date && mood !== undefined) {
            // Normalize date to YYYY-MM-DD
            const d = new Date(date);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const normalizedDate = `${y}-${m}-${day}`;

            if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
              map[normalizedDate] = mood;
              entryMap[normalizedDate] = rec.fields;
            }
          }
        });

        setJournalData(map);
        setEntryMap(entryMap);
        
        // Calculate adherence
        await calculateAdherence();
      } catch (e) {
        setJournalData({});
        setEntryMap({});
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [userId, selectedMonth, selectedYear]);

  // Calendar grid logic
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const calendarCells = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null); // empty cells before 1st
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }
  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null); // fill last week
  }

  // Year range for dropdown
  const yearRange: number[] = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) {
    yearRange.push(y);
  }
  if (!yearRange.includes(selectedYear)) {
    setSelectedYear(now.getFullYear());
  }

  // iOS ActionSheet handlers
  const showMonthActionSheet = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...MONTHS, 'Cancel'],
        cancelButtonIndex: MONTHS.length,
        userInterfaceStyle: 'light',
      },
      (buttonIndex) => {
        if (buttonIndex !== undefined && buttonIndex < MONTHS.length) {
          setSelectedMonth(buttonIndex);
        }
      }
    );
  };
  const showYearActionSheet = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...yearRange.map(String), 'Cancel'],
        cancelButtonIndex: yearRange.length,
        userInterfaceStyle: 'light',
      },
      (buttonIndex) => {
        if (buttonIndex !== undefined && buttonIndex < yearRange.length) {
          setSelectedYear(yearRange[buttonIndex]);
        }
      }
    );
  };

  // Function to calculate medication adherence
  const calculateAdherence = async () => {
    if (!userId) return;
    
    try {
      const medications = await AirtableService.getMedicationsForUser(userId);
      const today = new Date();
      const currentDay = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'][today.getDay()];
      const todayStr = today.toISOString().split('T')[0];
      
      // Get today's medications
      const todayMeds = medications.filter((med: any) => {
        if (!med.reminderDays || med.reminderDays.length === 0) {
          return true; // Show every day if no specific days set
        }
        return med.reminderDays.includes(currentDay);
      });
      
      // Count taken medications
      let takenCount = 0;
      for (const med of todayMeds) {
        const doneKey = `${med.name}:done`;
        const doneVal = await AsyncStorage.getItem(doneKey);
        if (doneVal === todayStr) {
          takenCount++;
        }
      }
      
      const total = todayMeds.length;
      const percentage = total > 0 ? Math.round((takenCount / total) * 100) : 0;
      
      setAdherenceData({ total, taken: takenCount, percentage });
    } catch (error) {
      console.error('Error calculating adherence:', error);
      setAdherenceData({ total: 0, taken: 0, percentage: 0 });
    }
  };

  // Function to fetch prompt text by ID
  const fetchPromptText = async (promptId: string) => {
    try {
      const url = `${PROMPT_TABLE_URL}?filterByFormula=RECORD_ID()='${promptId}'`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.data.records.length > 0) {
        return response.data.records[0].fields.Prompt || 'Prompt not found';
      }
      return 'Prompt not found';
    } catch (error) {
      console.error('Error fetching prompt:', error);
      return 'Error loading prompt';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mood Calendar</Text>
      
      <View style={styles.pickerRow}>
        {/* Month Picker */}
        {Platform.OS === 'ios' ? (
          <TouchableOpacity style={styles.iosPickerButton} onPress={showMonthActionSheet}>
            <Text style={styles.iosPickerButtonText}>{MONTHS[selectedMonth]}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedMonth}
              style={styles.picker}
              onValueChange={(itemValue: number) => setSelectedMonth(itemValue)}
              mode="dropdown"
              dropdownIconColor="#EA6F1D"
              itemStyle={{ color: '#EA6F1D', fontWeight: 'bold' }}
            >
              {MONTHS.map((m, idx) => (
                <Picker.Item key={m} label={m} value={idx} color="#EA6F1D" />
              ))}
            </Picker>
          </View>
        )}
        {/* Year Picker */}
        {Platform.OS === 'ios' ? (
          <TouchableOpacity style={styles.iosPickerButton} onPress={showYearActionSheet}>
            <Text style={styles.iosPickerButtonText}>{selectedYear}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedYear}
              style={styles.picker}
              onValueChange={(itemValue: number) => setSelectedYear(itemValue)}
              mode="dropdown"
              dropdownIconColor="#EA6F1D"
              itemStyle={{ color: '#EA6F1D', fontWeight: 'bold' }}
            >
              {yearRange.map((y) => (
                <Picker.Item key={y} label={y.toString()} value={y} color="#EA6F1D" />
              ))}
            </Picker>
          </View>
        )}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#08004d" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.calendarContainer}>
          <View style={styles.daysRow}>
            {DAYS.map(day => (
              <Text key={day} style={styles.dayLabel}>{day}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {calendarCells.map((cell, idx) => {
              if (cell === null) {
                return <View key={idx} style={[styles.cell, { backgroundColor: 'transparent' }]} />;
              }
              const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(cell).padStart(2, '0')}`;
              const mood = journalData[dateStr];
              const entry = entryMap[dateStr];
              const color = getColorForMood(mood);

              return (
                <Pressable
                  key={idx}
                  style={[styles.cell, { backgroundColor: color, borderColor: color !== 'transparent' ? color : '#eee', borderWidth: color !== 'transparent' ? 2 : 1 }]}
                  onPress={() => {
                    if (entry) {
                      setSelectedEntry({ ...entry, mood });
                      setModalVisible(true);
                      // Fetch prompt text if there's a prompt ID
                      if (entry['Prompt Used']) {
                        fetchPromptText(entry['Prompt Used']).then(text => {
                          setPromptText(text);
                        });
                      } else {
                        setPromptText('');
                      }
                    }
                  }}
                >
                  <Text style={[styles.cellText, color !== 'transparent' && { color: 'white', fontWeight: 'bold' }]}>{cell}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      
      {/* Medication Adherence Bar - Below Calendar */}
      <View style={styles.adherenceContainer}>
        <Text style={styles.adherenceTitle}>Today's Medication Adherence</Text>
        <View style={styles.adherenceBarContainer}>
          <View style={styles.adherenceBarBg}>
            <View style={[styles.adherenceBarFill, { width: `${adherenceData.percentage}%` }]} />
          </View>
          <Text style={styles.adherenceText}>{adherenceData.percentage}%</Text>
        </View>
        <Text style={styles.adherenceSubtext}>
          {adherenceData.taken} of {adherenceData.total} medications taken
        </Text>
      </View>
      
      {/* Modal for journal entry */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedEntry && (
              <>
                <Text style={styles.modalTitle}>Journal Entry</Text>
                <Text style={styles.modalLabel}>Mood:</Text>
                <Text style={styles.modalValue}>{selectedEntry.mood.toFixed(1)}</Text>
                {selectedEntry['Prompt Used'] && (
                  <>
                    <Text style={styles.modalLabel}>Prompt:</Text>
                    <Text style={styles.modalValue}>{promptText || 'Loading prompt...'}</Text>
                  </>
                )}
                <Text style={styles.modalLabel}>Response:</Text>
                <Text style={styles.modalValue}>{selectedEntry.Response}</Text>
                <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EA6F1D',
    paddingTop: 60,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 28,
    color: 'white',
    textAlign: 'center',
    marginVertical: 24,
    fontWeight: '600',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    marginHorizontal: 4,
    ...Platform.select({
      ios: { overflow: 'hidden' },
    }),
  },
  picker: {
    width: '100%',
    height: 40,
  },
  iosPickerButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    marginHorizontal: 4,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EA6F1D',
  },
  iosPickerButtonText: {
    color: '#EA6F1D',
    fontWeight: 'bold',
    fontSize: 16,
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#EA6F1D',
    fontWeight: '700',
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  cellText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#EA6F1D',
  },
  modalLabel: {
    fontWeight: '600',
    marginTop: 8,
    color: '#EA6F1D',
    alignSelf: 'flex-start',
  },
  modalValue: {
    fontSize: 16,
    marginBottom: 4,
    alignSelf: 'flex-start',
    color: '#333',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#EA6F1D',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  adherenceContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    marginTop: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  adherenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EA6F1D',
    textAlign: 'center',
    marginBottom: 12,
  },
  adherenceBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  adherenceBarBg: {
    flex: 1,
    height: 20,
    backgroundColor: '#E6E6E6',
    borderRadius: 10,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  adherenceBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 9,
  },
  adherenceText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
    minWidth: 40,
    textAlign: 'right',
  },
  adherenceSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});