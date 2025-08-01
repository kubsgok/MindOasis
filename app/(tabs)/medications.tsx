import AirtableService from "@/airtable";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { convertImageToBase64, performOCR, pickImage } from "../../utils/ocr";

export default function MedicationsTab() {
  // Image OCR state
  const [image, setImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Medications state
  const [medications, setMedications] = useState<{ id: string; name: string; dosage: string; frequency: string; duration: string; notes: string; reminderDays: string[]; reminderTimes: string[]; }[]>([]);
  const [medName, setMedName] = useState<string>("");
  const [medDosage, setMedDosage] = useState<string>("");
  const [medFrequency, setMedFrequency] = useState<string>("");
  const [medDuration, setMedDuration] = useState<string>("");
  const [medNotes, setMedNotes] = useState<string>("");
  const [medToEditId, setMedToEditId] = useState<string | null>(null);

  // Medications reminders state
  const [medReminderDays, setMedReminderDays] = useState<string[]>([]);
  const [medReminderTimes, setMedReminderTimes] = useState<string[]>([]);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [reminderTimeToEditId, setReminderTimeToEditId] = useState<number | null>(null);

  // Modals state
  const [showMedModal, setShowMedModal] = useState<boolean>(false);
  const [showReminderModal, setShowReminderModal] = useState<boolean>(false);
  

  // Fetch medications that are already in Airtable
  useEffect(() => {
    const fetchMedications = async () => {
      try {
        const userId = await AsyncStorage.getItem("user_id");
        if (!userId) return;

        const meds = await AirtableService.getMedicationsForUser(userId);
        setMedications(meds);
      } catch (err) {
        console.error("Failed to load medications from Airtable: ", err);
      }
    };

    fetchMedications();
  }, [medications]);

  // Opening the medications modal
  const openMedModal = (med?: typeof medications[0]) => {
    if (med) {
      setMedToEditId(med.id);
      setMedName(med.name);
      setMedDosage(med.dosage);
      setMedFrequency(med.frequency);
      setMedDuration(med.duration);
      setMedNotes(med.notes);
      setMedReminderDays(med.reminderDays || []);
      setMedReminderTimes(med.reminderTimes || []);
    } else {
      setMedToEditId(null);
      setMedName("");
      setMedDosage("");
      setMedFrequency("");
      setMedDuration("");
      setMedNotes("");
      setMedReminderDays([]);
      setMedReminderTimes([]);
      setTempTime(new Date());
    }

    setShowMedModal(true);
  }

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

  // Adding or editing a medication
  const addOrUpdateMedication = async () => {
    const nameTrim = (medName || "").trim();
    const dosageTrim = (medDosage || "").trim();
    const frequencyTrim = (medFrequency || "").trim();
    const durationTrim = (medDuration || "").trim();
    const notesTrim = (medNotes || "").trim()
    if (!nameTrim || !dosageTrim || !frequencyTrim) return;

    const newMedFields = {
      name: nameTrim,
      dosage: dosageTrim,
      frequency: frequencyTrim,
      duration: durationTrim,
      notes: notesTrim,
      reminderDays: medReminderDays,
      reminderTimes: medReminderTimes,
    };

    setShowMedModal(false);
    setShowReminderModal(false);
    
    if (medToEditId) {
      //Update medication in Airtable
      await updateMedicationInAirtable({ ...newMedFields, id: medToEditId });

      //Update medication in local state
      const updatedMeds = medications.map((med) => (med.id === medToEditId ? { ...newMedFields, id: medToEditId } : med));
      setMedications(updatedMeds);
    } else {
      //Add medication to Airtable
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) return;
      
      try {
        const result = await AirtableService.addMedication({
          Name: nameTrim,
          Dosage: dosageTrim,
          Frequency: frequencyTrim,
          Duration: durationTrim,
          "Additional Notes": notesTrim,
          "Reminder Days": medReminderDays,
          "Reminder Times": medReminderTimes.join(","),
          User: [ userId ],
        });

        console.log('Fields being sent to Airtable:', result);

        const medRecordId = result?.[0]?.id;
        if (!medRecordId) throw new Error("No medication record ID returned");

        // Add medication to local state
        const newMed = {
          id: medRecordId,
          ...newMedFields,
        };
        setMedications([...medications, newMed]);
      } catch (err) {
        console.error("Failed to add medication to Airtable: ", err);
      }
    }
  };

  // Saving edits to medications to Airtable
  const updateMedicationInAirtable = async (medToUpdate: typeof medications[0]) => {
    try {
      //Update medication in Airtable
      await AirtableService.updateMedication(medToEditId, {
        Name: medToUpdate.name,
        Dosage: medToUpdate.dosage,
        Frequency: medToUpdate.frequency,
        Duration: medToUpdate.duration,
        "Additional Notes": medToUpdate.notes,
        "Reminder Days": medReminderDays,
        "Reminder Times": medReminderTimes.join(","),
      });
    } catch (err) {
      console.error("Failed to update medication in Airtable: ", err);
    }
  };

  // Deleting a medication
  const deleteMedication = async (medToDeleteId: string) => {
    try {
      setMedications(medications.filter((med) => med.id !== medToDeleteId));
      setShowMedModal(false);

      // Delete medication from Airtable
      await AirtableService.deleteMedication(medToDeleteId);
    } catch (err) {
      console.error("Failed to delete medication: ", err);
    }
  };

  // OCR function
  const handleOCR = async (source: "camera" | "gallery") => {
    const uri = await pickImage(source);
    if (!uri) {
      // console.error("[APP OCR] No URI retrieved");
      return;
    }

    setImage(uri);
    setLoading(true);

    try {
      console.log("[APP OCR] Performing OCR...");
      const base64Image = await convertImageToBase64(uri);
      const ocrResult = await performOCR(base64Image);

      console.log("Extracted text: ", ocrResult.text);
      console.log("Medication info: ", ocrResult.medInfo);
      setExtractedText(ocrResult.text);
      const medInfo = ocrResult.medInfo;
      setMedName(medInfo.medicine_name);
      setMedDosage(medInfo.dosage);
      setMedFrequency(medInfo.frequency);
      setMedDuration(medInfo.duration);
      setMedNotes(medInfo.additional_notes);
      console.log("[App OCR] OCR completed.");
    } catch (err) {
      console.log("OCR failed: ", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Medications</Text>
      {/* List of added medications */}
      {medications.map(med => (
        <View key={med.id} style={styles.medRow}>
          <Text style={styles.medText}>{med.name} — {med.dosage}</Text>
          <TouchableOpacity onPress={() => openMedModal(med)}>
            <Ionicons name="create-outline" size={20} color="black" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.addMedButton} onPress={() => openMedModal()}>
        <Text style={styles.addMedButtonText}>Add Medication</Text>
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
                <View style={{ flexDirection: "row" }}>
                  <TouchableOpacity style={{ paddingRight: 5 }} onPress={() => handleOCR("camera")}>
                    <Ionicons name="camera" size={30} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleOCR("gallery")}>
                    <Ionicons name="image" size={30} color="white" />
                  </TouchableOpacity>
                </View>
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
                    <Text style={styles.modalButtonText}>
                      {medToEditId ? "Next: Edit Reminders" : "Next: Set Reminders"}
                    </Text>
                  </TouchableOpacity>
                  {medToEditId && (
                      <TouchableOpacity style={styles.modalButton} onPress={() => deleteMedication(medToEditId)}>
                        <Text style={styles.modalButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )
                  }
                </View>

                {loading && (<ActivityIndicator />)}
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
                  <TouchableOpacity style={styles.modalButton} onPress={addOrUpdateMedication}>
                    <Text style={styles.modalButtonText}>
                      {medToEditId ? "Save" : "Add"}
                    </Text>
                  </TouchableOpacity>
                  {medToEditId && (
                      <TouchableOpacity style={styles.modalButton} onPress={() => deleteMedication(medToEditId)}>
                        <Text style={styles.modalButtonText}>Delete</Text>
                      </TouchableOpacity>
                    )
                  }
                </View>
              </>
            )
            }
            
          </View>
        </KeyboardAwareScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EA6F1D",
    paddingTop: 48,
  },
  contentContainer: {
    padding: 24,
    alignItems: "center",
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
  header: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    marginBottom: 24,
  },
  addMedButton: {
    backgroundColor: "#060256",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    width: "60%",
    marginTop: 20,
  },
  addMedButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  medRow: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  medText: {
    color: "#333",
  },
  modalTextInput: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    color: "black",
    marginBottom: 12,
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
  reminderModalButton: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    width: "60%",
    marginTop: 10,
    flexDirection: "row",
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