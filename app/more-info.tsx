import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import AirtableService from '../airtable';

export default function MoreInfoPage() {
  const router = useRouter();

  // Conditions state
  const [newCond, setNewCond] = useState<string>('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  // Medications state
  const [medications, setMedications] = useState<{ id: string; name: string; dosage: string; frequency: string; duration: string; notes: string; reminderDays: string[]; reminderTimes: string[]; }[]>([]);
  const [showMedModal, setShowMedModal] = useState<boolean>(false);
  const [showReminderModal, setShowReminderModal] = useState<boolean>(false);
  const [medName, setMedName] = useState<string>('');
  const [medDosage, setMedDosage] = useState<string>('');
  const [medFrequency, setMedFrequency] = useState<string>('');
  const [medDuration, setMedDuration] = useState<string>('');
  const [medNotes, setMedNotes] = useState<string>('');

  // Medications reminders state
  const [medReminderDays, setMedReminderDays] = useState<string[]>([]);
  const [medReminderTimes, setMedReminderTimes] = useState<string[]>([]);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [reminderTimeToEditId, setReminderTimeToEditId] = useState<number | null>(null);

  useEffect(() => {
    // Optionally fetch existing data
  }, []);

  const addCondition = () => {
    const trimmed = newCond.trim();
    if (trimmed && !conditions.includes(trimmed)) {
      setConditions([...conditions, trimmed]);
      setNewCond('');
      setError('');
    }
  };

  const removeCondition = (cond: string) => {
    setConditions(conditions.filter(c => c !== cond));
  };

  const openMedModal = () => {
    setMedName('');
    setMedDosage('');
    setMedFrequency('');
    setMedDuration('');
    setMedNotes('');
    setMedReminderDays([]);
    setMedReminderTimes([]);
    setTempTime(new Date());
    setShowMedModal(true);
  };

  // Setting reminders
  const daysOfWeek = ["M", "Tu", "W", "Th", "F", "Sa", "Su"];
  
  const toggleDay = (day: string) => {
    setMedReminderDays((prev) => 
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const onChangeTimePicker = (event: any, selectedTime?: Date) => {
    if (event.type == "set" && selectedTime) {
      setTempTime(selectedTime);

      if (Platform.OS === "android") {
        setShowTimePicker(false);
        const hours = selectedTime.getHours().toString().padStart(2, "0");
        const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
        const formattedTime = `${hours}:${minutes}`;
        
        if (reminderTimeToEditId !== null) {
          setMedReminderTimes((prevTimes) => {
            const newTimes = [...prevTimes];
            newTimes[reminderTimeToEditId] = formattedTime;
            return newTimes;
          });
          setReminderTimeToEditId(null);
        } else {
          setMedReminderTimes([...medReminderTimes, formattedTime]);
        }
      }
    } else if (Platform.OS === "android") {
      setShowTimePicker(false);
      setReminderTimeToEditId(null);
    }
  };

  const confirmReminderTimeIOS = () => {
    const hours = tempTime.getHours().toString().padStart(2, "0");
    const minutes = tempTime.getMinutes().toString().padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;

    if (reminderTimeToEditId !== null) {
      setMedReminderTimes((prevTimes) => {
        const newTimes = [...prevTimes];
        newTimes[reminderTimeToEditId] = formattedTime;
        return newTimes;
      });
      setReminderTimeToEditId(null);
    } else {
      setMedReminderTimes([...medReminderTimes, formattedTime]);
    }

    setShowTimePicker(false);
  };

  // Editing a reminder time
  const editReminderTime = async (time: string, index: number) => {
    const [hour, minute] = time.split(":").map(Number);
    const newTime = new Date();
    newTime.setHours(hour);
    newTime.setMinutes(minute);
    setTempTime(newTime);
    setReminderTimeToEditId(index);
    setShowTimePicker(true);
  };

  // Deleting a reminder time
  const deleteReminderTime = async (indexToDelete: number) => {
    Alert.alert(
      "Delete Reminder",
      "Are you sure you want to delete this reminder time?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const newTimes = [...medReminderTimes];
            newTimes.splice(indexToDelete, 1);
            setMedReminderTimes(newTimes);
          }
        }
      ]
    )
  };

  const addMedication = () => {
    const nameTrim = medName.trim();
    const dosageTrim = medDosage.trim();
    const frequencyTrim = medFrequency.trim();
    const durationTrim = medDuration.trim();
    const notesTrim = medNotes.trim();
    if (!nameTrim || !dosageTrim || !frequencyTrim) {
      return;
    }
    const id = Date.now().toString();
    setMedications([...medications, { 
      id, 
      name: nameTrim, 
      dosage: dosageTrim, 
      frequency: frequencyTrim,
      duration: durationTrim,
      notes: notesTrim,
      reminderDays: medReminderDays,
      reminderTimes: medReminderTimes
    }]);
    setShowMedModal(false);
    setShowReminderModal(false);
  };

  const handleContinue = async () => {
    if (conditions.length === 0) {
      setError('Please add at least one condition.');
      return;
    }
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (userId) {
        await AirtableService.updateConditions(userId, conditions);
        // Save medications to Airtable
        for (let med of medications) {
          await AirtableService.addMedication({
            Name: med.name,
            Dosage: med.dosage,
            Frequency: med.frequency,
            Duration: med.duration,
            "Additional Notes": med.notes,
            "Reminder Days": med.reminderDays,
            "Reminder Times": med.reminderTimes.join(","),
            User: [ userId ], 
          });
        }
      }
      router.replace('/choose-avatar');
    } catch (e) {
      console.error(e);
      setError('Failed to save conditions or medications.');
    }
  };

  return (
    <KeyboardAwareScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.header}>Medical Conditions</Text>
      <View style={styles.condRow}>
        <TextInput
          style={styles.condInput}
          placeholder="Enter a medical condition"
          placeholderTextColor="#777"
          value={newCond}
          onChangeText={setNewCond}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addCondition}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tagsRow}>
        {conditions.map(cond => (
          <View key={cond} style={styles.tag}>
            <Text style={styles.tagText}>{cond}</Text>
            <TouchableOpacity onPress={() => removeCondition(cond)}>
              <Text style={styles.tagRemove}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <Text style={styles.header}>Medications</Text>
      {/* List of added medications */}
      {medications.map(med => (
        <View key={med.id} style={styles.medRow}>
          <Text style={styles.medText}>{med.name} — {med.dosage}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.medButton} onPress={openMedModal}>
        <Text style={styles.medButtonText}>Add Medication</Text>
      </TouchableOpacity>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>

      {/* Medication Modal */}
      <Modal
        visible={showMedModal}
        transparent
        animationType="slide"
      >
        <KeyboardAwareScrollView
          style={styles.modalContainer}
          contentContainerStyle={styles.modalContentContainer}
          enableOnAndroid={true}
          enableAutomaticScroll={(Platform.OS === "ios")}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            {!showReminderModal && (
              <View style={styles.modalHeaderContainer}>
                <TouchableOpacity onPress={() => {setShowMedModal(false); setShowReminderModal(false); setMedReminderDays([]); setMedReminderTimes([]); setTempTime(new Date());}}>
                  <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>
              </View>
            )
            }

            {showReminderModal && (
              <View style={styles.modalHeaderContainer}>
                <TouchableOpacity onPress={() => {setShowMedModal(true); setShowReminderModal(false); setShowTimePicker(false);}}>
                  <Ionicons name="chevron-back" size={30} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {setShowMedModal(false); setShowReminderModal(false); setMedReminderDays([]); setMedReminderTimes([]); setTempTime(new Date());}}>
                  <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>
              </View>
            )
            }

            {/* Modal Body */}
            {!showReminderModal ? (
              <>
                <Text style={styles.modalTextInputLabels}>Name:</Text>
            <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. Aspirin"
              value={medName}
              onChangeText={setMedName}
            />
                <Text style={styles.modalTextInputLabels}>Dosage:</Text>
            <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. 2 pills"
              value={medDosage}
              onChangeText={setMedDosage}
            />
                <Text style={styles.modalTextInputLabels}>Frequency:</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. 1 pill every morning"
                  value={medFrequency}
                  onChangeText={setMedFrequency}
                />
                <Text style={styles.modalTextInputLabels}>Duration:</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. 2 weeks"
                  value={medDuration}
                  onChangeText={setMedDuration}
                />
                <Text style={styles.modalTextInputLabels}>Notes:</Text>
                <TextInput
                  multiline
                  style={styles.modalTextInputMultiline}
                  placeholder="e.g. Take with food"
                  value={medNotes}
                  onChangeText={setMedNotes}
                />

                <View style={{ alignItems: "center", marginVertical: 12 }}>
                  <TouchableOpacity style={styles.modalButton} onPress={() => setShowReminderModal(true)}>
                    <Text style={styles.modalButtonText}>Next: Set Reminders</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTextInputLabels}>Reminder Days:</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12, justifyContent: "center" }}>
                  {daysOfWeek.map((day) => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => toggleDay(day)}
                      style={[styles.modalReminderDayButton,
                        { backgroundColor: medReminderDays.includes(day) ? "#060256" : "white",
                          borderColor: medReminderDays.includes(day) ? "white" : "#060256" }
                        ]}
                    >
                      <Text style={[styles.reminderModalText, { color: medReminderDays.includes(day) ? "white" : "#060256" }]}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={styles.modalTextInputLabels}>Reminder Times:</Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                    <Ionicons name="add-circle" size={20} color="white" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.medReminderTimesContainer}>
                  {medReminderTimes.map((time, idx) => (
                    <View key={idx} style={styles.medReminderTimeRow}>
                      <Text style={[styles.reminderModalText, { color: "white" }]}>{time}</Text>
                      <View style={{ flexDirection: "row" }}>
                        <TouchableOpacity style={{ marginRight: 5 }} onPress={() => editReminderTime(time, idx)}>
                          <Ionicons name="create-outline" size={15} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteReminderTime(idx)}>
                          <Ionicons name="trash-outline" size={15} color="white" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                {showTimePicker && (
                  <DateTimePicker
                    mode="time"
                    display="spinner"
                    value={tempTime}
                    onChange={onChangeTimePicker}
                    themeVariant="dark"
                  />
                )
                }

                {showTimePicker && Platform.OS === "ios" && (
                  <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                    <TouchableOpacity onPress={() => { setShowTimePicker(false); setReminderTimeToEditId(null); }}>
                      <Text style={{ color: "white" }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={confirmReminderTimeIOS}>
                      <Text style={{ color: "white" }}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                )
                }
                

                <View style={{ alignItems: "center", marginVertical: 12 }}>
                  <TouchableOpacity style={styles.modalButton} onPress={addMedication}>
                    <Text style={styles.modalButtonText}>Add</Text>
                  </TouchableOpacity>
            </View>
              </>
            )
            }
            
        </View>
        </KeyboardAwareScrollView>
      </Modal>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d96922',
    paddingTop: 48,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  condRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  condInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    color: '#000',
  },
  addBtn: {
    marginLeft: 8,
    backgroundColor: '#0057D2',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#333',
    marginRight: 4,
  },
  tagRemove: {
    fontSize: 16,
    color: '#333',
  },
  medRow: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  medText: {
    color: '#333',
  },
  medButton: {
    backgroundColor: '#28A745',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  medButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  continueBtn: {
    backgroundColor: '#08004d',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  continueText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: '#ffdddd',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContentContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  modalContent: {
    width: "90%",
    padding: 20,
    backgroundColor: "#060256",
    borderRadius: 8,
  },
  modalHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  modalTextInput: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    color: "black",
    marginBottom: 12,
  },
  modalTextInputLabels: {
    color: "white",
    marginBottom: 5,
    fontSize: 14,
    fontWeight: 500,
  },
  modalButton: {
    backgroundColor: "white",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    width: "60%",
    marginTop: 10,
  },
  modalButtonText: {
    color: "#060256",
    fontSize: 16,
    fontWeight: "600",
  },
  modalTextInputMultiline: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 15,
    height: 48,
    color: "black",
    marginBottom: 12,
  },
  modalReminderDayButton: {
    width: 35,
    height: 35,
    margin: 4,
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  reminderModalText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#060256",
  },
  medReminderTimesContainer: {
    flexDirection: "column",
    flexWrap: "wrap",
    paddingLeft: 5,
  },
  medReminderTimeRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 12,
    padding: 10,
    margin: 5,
    justifyContent: "space-between",
    width: "35%",
  },
});
