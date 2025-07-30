import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AirtableService from '../../airtable';

export default function JournalingTab() {
  const [writingMode, setWritingMode] = useState<'free' | 'prompt' | null>(null);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [currentPromptId, setCurrentPromptId] = useState('');
  const [journalText, setJournalText] = useState('');
  const [moodRating, setMoodRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    // Get user ID from storage
    AsyncStorage.getItem('user_id').then(id => {
      if (id) setUserId(id);
    });
  }, []);

  const loadPrompts = async () => {
    setPromptLoading(true);
    try {
      const promptRecords = await AirtableService.getAllPrompts();
      setPrompts(promptRecords);
      if (promptRecords.length > 0) {
        const randomIndex = Math.floor(Math.random() * promptRecords.length);
        const selectedPrompt = promptRecords[randomIndex];
        setCurrentPrompt(selectedPrompt.fields.Prompt || '');
        setCurrentPromptId(selectedPrompt.id);
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
      setError('Failed to load prompts. Please try again.');
    } finally {
      setPromptLoading(false);
    }
  };

  const generateNewPrompt = () => {
    if (prompts.length > 0) {
      const randomIndex = Math.floor(Math.random() * prompts.length);
      const selectedPrompt = prompts[randomIndex];
      setCurrentPrompt(selectedPrompt.fields.Prompt || '');
      setCurrentPromptId(selectedPrompt.id);
    }
  };

  const handleModeSelection = (mode: 'free' | 'prompt') => {
    setWritingMode(mode);
    setError('');
    if (mode === 'prompt' && prompts.length === 0) {
      loadPrompts();
    } else if (mode === 'prompt' && prompts.length > 0) {
      generateNewPrompt();
    }
  };

  const validateEntry = () => {
    if (!journalText.trim()) {
      setError('Please write something in your journal entry.');
      return false;
    }
    if (writingMode === 'prompt' && !currentPrompt) {
      setError('Please select a prompt first.');
      return false;
    }
    if (!userId) {
      setError('User session not found. Please log in again.');
      return false;
    }
    return true;
  };

  const saveEntry = async () => {
    if (!validateEntry()) return;

    setLoading(true);
    setError('');

    try {
                      const fields = {
          User: [userId], // Link to user record (just the ID, not an array)
          Date: new Date().toISOString().split('T')[0], // Today's date
          Response: journalText.trim(),
          'Prompt Used': writingMode === 'prompt' ? [currentPromptId] : [],
          'Scale': moodRating,
        };

        console.log('Fields being sent to Airtable:', fields);

        const result = await AirtableService.addJournalEntry(fields);
      
      if (result) {
        Alert.alert(
          'Success!',
          'Your journal entry has been saved.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setJournalText('');
                setMoodRating(5);
                setWritingMode(null);
                setCurrentPrompt('');
              }
            }
          ]
        );
      } else {
        setError('Failed to save entry. Please try again.');
      }
    } catch (error) {
      console.error('Error saving journal entry:', error);
      setError('Failed to save entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Journal Your Thoughts</Text>
        
        {!!error && <Text style={styles.error}>{error}</Text>}

        {/* Writing Mode Selection */}
        <View style={styles.modeContainer}>
          <Text style={styles.sectionTitle}>Choose Your Writing Style</Text>
          <View style={styles.modeButtons}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                writingMode === 'free' && styles.modeButtonActive
              ]}
              onPress={() => handleModeSelection('free')}
            >
              <MaterialCommunityIcons 
                name="pencil" 
                size={24} 
                color={writingMode === 'free' ? '#08004d' : '#666'} 
              />
              <Text style={[
                styles.modeButtonText,
                writingMode === 'free' && styles.modeButtonTextActive
              ]}>
                Free Write
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                writingMode === 'prompt' && styles.modeButtonActive
              ]}
              onPress={() => handleModeSelection('prompt')}
            >
              <MaterialCommunityIcons 
                name="lightbulb" 
                size={24} 
                color={writingMode === 'prompt' ? '#08004d' : '#666'} 
              />
              <Text style={[
                styles.modeButtonText,
                writingMode === 'prompt' && styles.modeButtonTextActive
              ]}>
                Use Prompt
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Prompt Section */}
        {writingMode === 'prompt' && (
          <View style={styles.promptContainer}>
            <Text style={styles.sectionTitle}>Your Prompt</Text>
            {promptLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#08004d" />
                <Text style={styles.loadingText}>Loading prompts...</Text>
              </View>
            ) : (
              <>
                <View style={styles.promptBox}>
                  <Text style={styles.promptText}>{currentPrompt}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.newPromptButton}
                  onPress={generateNewPrompt}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color="#08004d" />
                  <Text style={styles.newPromptButtonText}>New Prompt</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Journal Text Input */}
        {writingMode && (
          <View style={styles.textContainer}>
            <Text style={styles.sectionTitle}>Your Thoughts</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Write your thoughts here..."
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
              value={journalText}
              onChangeText={setJournalText}
            />
          </View>
        )}

        {/* Mood Slider */}
        {writingMode && (
          <View style={styles.moodContainer}>
            <Text style={styles.sectionTitle}>How are you feeling today?</Text>
            <Text style={styles.moodRating}>{moodRating.toFixed(1)}/10</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={10}
              value={moodRating}
              onValueChange={setMoodRating}
              minimumTrackTintColor="#08004d"
              maximumTrackTintColor="#ddd"
            />
            <View style={styles.moodLabels}>
              <Text style={styles.moodLabel}>😔</Text>
              <Text style={styles.moodLabel}>😊</Text>
            </View>
          </View>
        )}

        {/* Save Button */}
        {writingMode && (
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={saveEntry}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save" size={20} color="white" />
                <Text style={styles.saveButtonText}>Save Entry</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d96922',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    color: 'white',
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '600',
  },
  error: {
    color: '#ffdddd',
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    marginBottom: 16,
    fontWeight: '600',
  },
  modeContainer: {
    marginBottom: 32,
  },
  modeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: '#08004d',
  },
  modeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: 'white',
  },
  promptContainer: {
    marginBottom: 32,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    gap: 12,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  promptBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  promptText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  newPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  newPromptButtonText: {
    color: '#08004d',
    fontSize: 14,
    fontWeight: '600',
  },
  textContainer: {
    marginBottom: 32,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  moodContainer: {
    marginBottom: 32,
  },
  moodRating: {
    color: 'white',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  moodLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  moodLabel: {
    fontSize: 20,
  },
  saveButton: {
    backgroundColor: '#08004d',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});