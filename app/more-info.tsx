import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Button,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AirtableService from '../airtable';

export default function MoreInfoPage() {
  const router = useRouter();

  // Conditions state
  const [newCond, setNewCond] = useState<string>('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  // Medications state
  const [medications, setMedications] = useState<{ id: string; name: string; dosage: string }[]>([]);
  const [showMedModal, setShowMedModal] = useState<boolean>(false);
  const [medName, setMedName] = useState<string>('');
  const [medDosage, setMedDosage] = useState<string>('');

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
    setShowMedModal(true);
  };

  const addMedication = () => {
    const nameTrim = medName.trim();
    const dosageTrim = medDosage.trim();
    if (!nameTrim || !dosageTrim) {
      return;
    }
    const id = Date.now().toString();
    setMedications([...medications, { id, name: nameTrim, dosage: dosageTrim }]);
    setShowMedModal(false);
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
            Name:               med.name,
            Dosage:             med.dosage,
            // if you add a time picker later:
            // "Notification Times": med.timeString,
            User:               [ userId ], 
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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
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
      <Modal transparent animationType="slide" visible={showMedModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
            keyboardVerticalOffset={80}
          >
            <Text style={styles.modalHeader}>New Medication</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Medication name"
              placeholderTextColor="#777"
              value={medName}
              onChangeText={setMedName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Dosage (e.g. 2 pills)"
              placeholderTextColor="#777"
              value={medDosage}
              onChangeText={setMedDosage}
            />
            <View style={styles.modalBtns}>
              <Button title="Cancel" onPress={() => setShowMedModal(false)} />
              <Button title="Add" onPress={addMedication} />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScrollView>
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    color: '#000',
    marginBottom: 12,
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
