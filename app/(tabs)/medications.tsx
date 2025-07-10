import AirtableService from "@/airtable";
import { BACKEND_API_HOST } from "@env";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function MedicationsTab() {
  // Image OCR state
  const [image, setImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Medications state
  const [showMedModal, setShowMedModal] = useState<boolean>(false);
  const [medications, setMedications] = useState<{ id: string; name: string; dosage: string; frequency: string; duration: string; notes: string; }[]>([]);
  const [medName, setMedName] = useState<string>("");
  const [medDosage, setMedDosage] = useState<string>("");
  const [medFrequency, setMedFrequency] = useState<string>("");
  const [medDuration, setMedDuration] = useState<string>("");
  const [medNotes, setMedNotes] = useState<string>("");

  const [medToEditId, setMedToEditId] = useState<string | null>(null);

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
  }, []);

  const openMedModal = (med?: typeof medications[0]) => {
    if (med) {
      setMedToEditId(med.id);
      setMedName(med.name);
      setMedDosage(med.dosage);
      setMedFrequency(med.frequency);
      setMedDuration(med.duration);
      setMedNotes(med.notes);
    } else {
      setMedToEditId(null);
      setMedName("");
      setMedDosage("");
      setMedFrequency("");
      setMedDuration("");
      setMedNotes("");
    }

    setShowMedModal(true);
  }

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
    };

    setShowMedModal(false);

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
          User: [ userId ],
        });

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

  const updateMedicationInAirtable = async (medToUpdate: typeof medications[0]) => {
    try {
      //Update medication in Airtable
      await AirtableService.updateMedication(medToEditId, {
        Name: medToUpdate.name,
        Dosage: medToUpdate.dosage,
        Frequency: medToUpdate.frequency,
        Duration: medToUpdate.duration,
        "Additional Notes": medToUpdate.notes,
      });
    } catch (err) {
      console.error("Failed to update medication in Airtable: ", err);
    }
  };

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

  const pickImageCamera = async () => {

    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        alert("Camera permission is required to take photos.");
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: true,
        base64: true,
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (!result.canceled) {
        console.log("[Camera] Image pick: Not cancelled.");
        performOCR(result.assets[0].uri);
      }

    } catch (err) {
      console.error("Error while picking image from camera: ", err);
    }
  };

  const pickImageGallery = async () => {
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Permission not granted.",
          "Media library permission is required to select images.",
          [
            {
              text: "Cancel",
            },
            {
              text: "Open Settings",
              onPress: () => {
                Platform.OS === "ios" ? Linking.openURL("app-settings:") : Linking.openSettings();
              },
            },
          ]
        );
      }
    } catch (err) {
      console.error("Error while picking image from gallery: ", err);
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      base64: true,
      allowsMultipleSelection: false,
      quality: 1,
    });

    if (!result.canceled) {
      console.log("[Gallery] Image pick: Not cancelled.");
      performOCR(result.assets[0].uri);
    }
  };

  const performOCR = async (uri: string) => {
    setImage(uri);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", {
      uri,
      name: "photo.jpg",
      type: "image/jpeg",
    } as any);

    try {
      const response = await fetch(`${BACKEND_API_HOST}/ocr`, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: formData,
      });

      const data = await response.json();
      console.log("Raw data: ", data);
      console.log("Extracted text: ", data.extracted_text);
      console.log("Medication info: ", data.medication_info);
      setExtractedText(data.extracted_text);
      const medInfo = data.medication_info;
      setMedName(medInfo.medicine_name);
      setMedDosage(medInfo.dosage);
      setMedFrequency(medInfo.frequency);
      setMedDuration(medInfo.duration);
      setMedNotes(medInfo.additional_notes);
      console.log("OCR completed");
    } catch (err) {
      console.log("Fetch error: ", err);
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
            <View style={styles.modalHeaderContainer}>
              <TouchableOpacity onPress={() => setShowMedModal(false)}>
                <Ionicons name="close" size={30} color="white" />
              </TouchableOpacity>
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity style={{ paddingRight: 5 }} onPress={pickImageCamera}>
                  <Ionicons name="camera" size={30} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={pickImageGallery}>
                  <Ionicons name="image" size={30} color="white" />
                </TouchableOpacity>
              </View>
            </View>
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
            {loading && (<ActivityIndicator />)}
          </View>
        </KeyboardAwareScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#d96922",
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
    fontWeight: '600',
  },
});