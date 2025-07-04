import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
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

  const [newCond, setNewCond] = useState<string>('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // could fetch existing user conditions here if desired
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

  const handleContinue = async () => {
    if (conditions.length === 0) {
      setError('Please add at least one condition.');
      return;
    }
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (userId) {
        // await AirtableService.updateConditions(userId, [ 'Anxiety', 'Depression' ]);
        await AirtableService.updateConditions(userId, conditions);
      }
      // navigate to next screen
      // router.replace('/choose-avatar');
    } catch (e) {
      console.error(e);
      setError('Failed to save conditions.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      {/* Medical Conditions */}
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

      {/* Medications Section */}
      <Text style={styles.header}>Medications</Text>
      <TouchableOpacity style={styles.medButton}>
        <Text style={styles.medButtonText}>Add Medication</Text>
      </TouchableOpacity>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
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
});
