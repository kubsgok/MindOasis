import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AirtableService from '../../airtable';

// Import constants from airtable.js
const BASE_ID = "applqO7LmDa1HLTEs";
const PROMPT_TABLE_ID = "tblMoSlXmwjBqICGV";
const API_TOKEN = "patI8m8TdxXWzYg4Y.458904d2c40c330ec243a55e51a3439cd9983fe73ad66111f08ed10cb567e5b6";
const PROMPT_TABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${PROMPT_TABLE_ID}`;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CELL_SIZE = Math.floor((Dimensions.get('window').width - 64) / 7); // 64 for padding, margins, and cell spacing

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
  const [todayMood, setTodayMood] = useState<{ score: number; color: string } | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<{ adherence: number; mood: number }>({ adherence: 0, mood: 0 });
  const [monthlyStats, setMonthlyStats] = useState<{ adherence: number; mood: number }>({ adherence: 0, mood: 0 });
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

  // Function to fetch entries (extracted for reuse)
  const fetchEntries = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const records = await AirtableService.getAllJournalEntriesForUser(userId);
      const map: Record<string, number> = {};
      const entryMap: Record<string, any> = {};

      records.forEach((rec: any) => {
        let date = rec.fields.Date;
        // Try multiple possible field names for mood
        const mood = rec.fields.Scale || rec.fields['# Scale'] || rec.fields['Scale'] || rec.fields.scale;
        
        // Debug: Log the first record to see available fields
        if (Object.keys(map).length === 0) {
          console.log('Sample record fields:', Object.keys(rec.fields));
          console.log('Sample record:', rec.fields);
          console.log('Mood value found:', mood);
          console.log('Date value found:', date);
        }
        
        if (date && mood !== undefined && mood !== null) {
          // Normalize date to YYYY-MM-DD
          const d = new Date(date);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const normalizedDate = `${y}-${m}-${day}`;

          console.log(`Processing entry: Date=${date}, Normalized=${normalizedDate}, Mood=${mood}`);

          // Store all entries for mood calculations (weekly/monthly)
          map[normalizedDate] = mood;
          
          // Only store selected month entries for calendar display
          if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
            entryMap[normalizedDate] = rec.fields;
          }
        }
      });

      setJournalData(map);
      setEntryMap(entryMap);
      
      console.log('All journal data loaded:', Object.keys(map).length, 'entries');
      console.log('Sample journal data:', Object.entries(map).slice(0, 5));
      console.log('All journal data keys:', Object.keys(map));
      
      // Calculate adherence and get today's mood
      await calculateAdherence();
      getTodayMood();
      
      // Calculate weekly and monthly averages
      await calculateWeeklyAverages();
      await calculateMonthlyAverages();
    } catch (e) {
      setJournalData({});
      setEntryMap({});
    } finally {
      setLoading(false);
    }
  }, [userId, selectedMonth, selectedYear]);

  // Refresh data when tab is focused
  useFocusEffect(
    useCallback(() => {
      console.log('Dashboard tab focused - refreshing data');
      fetchEntries();
    }, [fetchEntries])
  );

  // Initial data fetch
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

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
  
  // Debug: Log the number of cells and ensure it's divisible by 7
  console.log(`Calendar cells: ${calendarCells.length}, should be divisible by 7: ${calendarCells.length % 7 === 0}`);

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

  // Function to get today's mood
  const getTodayMood = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const mood = journalData[todayStr];
    
    console.log('=== Today Mood Debug ===');
    console.log('Today string:', todayStr);
    console.log('Journal data keys:', Object.keys(journalData));
    console.log('Journal data values:', Object.values(journalData));
    console.log('Today mood:', mood);
    console.log('Mood type:', typeof mood);
    console.log('Available dates in journal data:', Object.keys(journalData).sort());
    console.log('=======================');
    
    if (mood !== undefined && mood !== null) {
      let color = '#27ae60'; // green
      if (mood < 3.3) {
        color = '#e74c3c'; // red
      } else if (mood <= 6.6) {
        color = '#f7ca18'; // yellow
      }
      setTodayMood({ score: mood, color });
      console.log('Setting today mood:', { score: mood, color });
    } else {
      setTodayMood(null);
      console.log('No mood found for today, setting to null');
    }
  };

  // Function to calculate weekly averages
  const calculateWeeklyAverages = async () => {
    if (!userId) return;
    
    try {
      const medications = await AirtableService.getMedicationsForUser(userId);
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      
      let weeklyAdherenceTotal = 0;
      let weeklyAdherenceDays = 0;
      let weeklyMoodTotal = 0;
      let weeklyMoodDays = 0;
      
      // Calculate for the last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        // Check medication adherence for this day
        const currentDay = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'][date.getDay()];
        const dayMeds = medications.filter((med: any) => {
          if (!med.reminderDays || med.reminderDays.length === 0) {
            return true;
          }
          return med.reminderDays.includes(currentDay);
        });
        
        if (dayMeds.length > 0) {
          let takenCount = 0;
          for (const med of dayMeds) {
            const doneKey = `${med.name}:done`;
            const doneVal = await AsyncStorage.getItem(doneKey);
            if (doneVal === dateStr) {
              takenCount++;
            }
          }
          weeklyAdherenceTotal += (takenCount / dayMeds.length) * 100;
          weeklyAdherenceDays++;
        }
        
        // Check mood for this day
        const mood = journalData[dateStr];
        if (mood !== undefined && mood !== null) {
          weeklyMoodTotal += mood;
          weeklyMoodDays++;
        }
      }
      
      const weeklyAdherence = weeklyAdherenceDays > 0 ? Math.round(weeklyAdherenceTotal / weeklyAdherenceDays) : 0;
      const weeklyMood = weeklyMoodDays > 0 ? Math.round((weeklyMoodTotal / weeklyMoodDays) * 10) / 10 : 0;
      
      console.log('Weekly calculation:', { weeklyAdherence, weeklyMood, weeklyMoodDays, weeklyMoodTotal });
      setWeeklyStats({ adherence: weeklyAdherence, mood: weeklyMood });
    } catch (error) {
      console.error('Error calculating weekly averages:', error);
      setWeeklyStats({ adherence: 0, mood: 0 });
    }
  };

  // Function to calculate monthly averages
  const calculateMonthlyAverages = async () => {
    if (!userId) return;
    
    try {
      const medications = await AirtableService.getMedicationsForUser(userId);
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      
      let monthlyAdherenceTotal = 0;
      let monthlyAdherenceDays = 0;
      let monthlyMoodTotal = 0;
      let monthlyMoodDays = 0;
      
      // Calculate for the current month
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(today.getFullYear(), today.getMonth(), i);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        // Check medication adherence for this day
        const currentDay = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'][date.getDay()];
        const dayMeds = medications.filter((med: any) => {
          if (!med.reminderDays || med.reminderDays.length === 0) {
            return true;
          }
          return med.reminderDays.includes(currentDay);
        });
        
        if (dayMeds.length > 0) {
          let takenCount = 0;
          for (const med of dayMeds) {
            const doneKey = `${med.name}:done`;
            const doneVal = await AsyncStorage.getItem(doneKey);
            if (doneVal === dateStr) {
              takenCount++;
            }
          }
          monthlyAdherenceTotal += (takenCount / dayMeds.length) * 100;
          monthlyAdherenceDays++;
        }
        
        // Check mood for this day
        const mood = journalData[dateStr];
        if (mood !== undefined && mood !== null) {
          monthlyMoodTotal += mood;
          monthlyMoodDays++;
        }
      }
      
      const monthlyAdherence = monthlyAdherenceDays > 0 ? Math.round(monthlyAdherenceTotal / monthlyAdherenceDays) : 0;
      const monthlyMood = monthlyMoodDays > 0 ? Math.round((monthlyMoodTotal / monthlyMoodDays) * 10) / 10 : 0;
      
      console.log('Monthly calculation:', { monthlyAdherence, monthlyMood, monthlyMoodDays, monthlyMoodTotal });
      setMonthlyStats({ adherence: monthlyAdherence, mood: monthlyMood });
    } catch (error) {
      console.error('Error calculating monthly averages:', error);
      setMonthlyStats({ adherence: 0, mood: 0 });
    }
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
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
      
      {/* Today's Stats - Below Calendar */}
      <Text style={styles.statsHeading}>Today's Stats</Text>
      <View style={styles.statsContainer}>
        {/* Medication Adherence */}
        <View style={styles.adherenceSection}>
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

        {/* Today's Mood */}
        <View style={styles.moodSection}>
          <Text style={styles.moodTitle}>Today's Mood</Text>
          <View style={styles.moodCircleContainer}>
            <View style={[styles.moodCircle, { borderColor: todayMood?.color || '#ccc' }]}>
              <Text style={[styles.moodScore, { color: todayMood?.color || '#666' }]}>
                {todayMood ? todayMood.score.toFixed(1) : '--'}
              </Text>
            </View>
          </View>
          <Text style={styles.moodSubtext}>
            {todayMood ? 'Mood recorded' : 'No mood recorded'}
          </Text>
        </View>
      </View>
      
      {/* Weekly Stats */}
      <Text style={styles.statsHeading}>Weekly Averages</Text>
      <View style={styles.statsContainer}>
        {/* Weekly Medication Adherence */}
        <View style={styles.adherenceSection}>
          <Text style={styles.adherenceTitle}>Weekly Medication Adherence</Text>
          <View style={styles.adherenceBarContainer}>
            <View style={styles.adherenceBarBg}>
              <View style={[styles.adherenceBarFill, { width: `${weeklyStats.adherence}%` }]} />
            </View>
            <Text style={styles.adherenceText}>{weeklyStats.adherence}%</Text>
          </View>
          <Text style={styles.adherenceSubtext}>
            Average of last 7 days
          </Text>
        </View>

        {/* Weekly Mood */}
        <View style={styles.moodSection}>
          <Text style={styles.moodTitle}>Weekly Mood</Text>
          <View style={styles.moodCircleContainer}>
            <View style={[styles.moodCircle, { borderColor: getColorForMood(weeklyStats.mood) }]}>
              <Text style={[styles.moodScore, { color: getColorForMood(weeklyStats.mood) }]}>
                {weeklyStats.mood > 0 ? weeklyStats.mood.toFixed(1) : '--'}
              </Text>
            </View>
          </View>
          <Text style={styles.moodSubtext}>
            Average of last 7 days
          </Text>
        </View>
      </View>

      {/* Monthly Stats */}
      <Text style={styles.statsHeading}>Monthly Averages</Text>
      <View style={styles.statsContainer}>
        {/* Monthly Medication Adherence */}
        <View style={styles.adherenceSection}>
          <Text style={styles.adherenceTitle}>Monthly Medication Adherence</Text>
          <View style={styles.adherenceBarContainer}>
            <View style={styles.adherenceBarBg}>
              <View style={[styles.adherenceBarFill, { width: `${monthlyStats.adherence}%` }]} />
            </View>
            <Text style={styles.adherenceText}>{monthlyStats.adherence}%</Text>
          </View>
          <Text style={styles.adherenceSubtext}>
            Average of current month
          </Text>
        </View>

        {/* Monthly Mood */}
        <View style={styles.moodSection}>
          <Text style={styles.moodTitle}>Monthly Mood</Text>
          <View style={styles.moodCircleContainer}>
            <View style={[styles.moodCircle, { borderColor: getColorForMood(monthlyStats.mood) }]}>
              <Text style={[styles.moodScore, { color: getColorForMood(monthlyStats.mood) }]}>
                {monthlyStats.mood > 0 ? monthlyStats.mood.toFixed(1) : '--'}
              </Text>
            </View>
          </View>
          <Text style={styles.moodSubtext}>
            Average of current month
          </Text>
        </View>
      </View>
      
      {/* Healthcare Provider View Button */}
      <View style={styles.providerButtonContainer}>
        <TouchableOpacity 
          style={styles.providerButton}
          onPress={() => {
            console.log('Healthcare Provider View pressed - demo button');
            // TODO: Implement healthcare provider view functionality
          }}
        >
          <Text style={styles.providerButtonText}>Healthcare Provider View</Text>
        </TouchableOpacity>
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
    </ScrollView>
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
    paddingHorizontal: 4,
  },
  dayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    color: '#EA6F1D',
    fontWeight: '700',
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 1,
    borderRadius: 6,
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
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 8,
    marginTop: 20,
    marginBottom: 16,
    gap: 12,
  },
  adherenceSection: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  moodSection: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  moodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EA6F1D',
    textAlign: 'center',
    marginBottom: 12,
  },
  moodCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  moodCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  moodScore: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  moodSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statsHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  providerButtonContainer: {
    marginHorizontal: 8,
    marginTop: 20,
    marginBottom: 16,
  },
  providerButton: {
    backgroundColor: '#060256',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  providerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});