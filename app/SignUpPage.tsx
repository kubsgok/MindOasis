// import React, { useState } from 'react';
// import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import AirtableService from '../airtable';

// interface SignUpProps {
//   setLoggedIn: (val: string) => void;
//   setUserId: (id: string) => void;
//   onShowLogin: () => void;  // ensure onShowLogin is included
// }

// const SignUpPage: React.FC<SignUpProps> = ({ setLoggedIn, setUserId, onShowLogin }) => {
//   const [name, setName]       = useState<string>('');
//   const [dob, setDob]         = useState<string>('');
//   const [email, setEmail]     = useState<string>('');
//   const [password, setPassword] = useState<string>('');
//   const [error, setError]     = useState<string>('');

//   const handleContinue = async () => {
//     if (!name || !dob || !email || !password) {
//       setError('All fields are required.');
//       return;
//     }
//     try {
//       const fields = { name, email, password, 'date of birth': dob };
//       const result = await AirtableService.addUser(fields);
//       const id = result[0].id;
//       await AsyncStorage.setItem('logged_in', 'true');
//       await AsyncStorage.setItem('user_id', id);
//       setUserId(id);
//       setLoggedIn('true');
//     } catch (e) {
//       console.error(e);
//       setError('Sign-up failed. Try again.');
//     }
//   };

//   return (
//     <View style={styles.container}>

//       <Text style={styles.title}>Sign up</Text>
//       <Image source={require('../assets/images/cat.png')} style={styles.avatar} />

//       {!!error && <Text style={styles.error}>{error}</Text>}

//       <Text style={styles.label}>Name:</Text>
//       <View style={styles.inputContainer}>
//         <MaterialCommunityIcons name="account-outline" size={20} color="#999" style={styles.icon} />
//         <TextInput style={styles.input} placeholder="your full name" placeholderTextColor="#777" value={name} onChangeText={setName} />
//       </View>

//       <Text style={styles.label}>Date of Birth:</Text>
//       <View style={styles.inputContainer}>
//         <MaterialCommunityIcons name="calendar-range" size={20} color="#999" style={styles.icon} />
//         <TextInput style={styles.input} placeholder="dd-mm-yyyy" placeholderTextColor="#777"  value={dob} onChangeText={setDob} />
//       </View>

//       <Text style={styles.label}>Email:</Text>
//       <View style={styles.inputContainer}>
//         <MaterialCommunityIcons name="email-outline" size={20} color="#999" style={styles.icon} />
//         <TextInput
//           style={styles.input}
//           placeholder="enter your email"
//           placeholderTextColor="#777"
//           keyboardType="email-address"
//           autoCapitalize="none"
//           value={email}
//           onChangeText={setEmail}
//         />
//       </View>

//       <Text style={styles.label}>Password:</Text>
//       <View style={styles.inputContainer}>
//         <MaterialCommunityIcons name="lock-outline" size={20} color="#999" style={styles.icon} />
//         <TextInput style={styles.input} placeholder="enter your password" placeholderTextColor="#777" secureTextEntry value={password} onChangeText={setPassword} />
//       </View>

//       <TouchableOpacity style={styles.button} onPress={handleContinue}>
//         <Text style={styles.buttonText}>Continue</Text>
//       </TouchableOpacity>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   backLink: {
//     marginBottom: 12,
//     paddingHorizontal: 4,
//   },
//   backText: {
//     color: 'white',
//     fontSize: 14,
//     textDecorationLine: 'underline',
//   },
//   container: {
//     flex: 1,
//     backgroundColor: '#d96922',
//     paddingHorizontal: 24,
//     justifyContent: 'center',
//   },
//   title: {
//     fontSize: 28,
//     color: 'white',
//     marginBottom: 24,
//   },
//   avatar: {
//     width: 120,
//     height: 120,
//     alignSelf: 'center',
//     marginBottom: 24,
//   },
//   error: {
//     color: '#ffdddd',
//     textAlign: 'center',
//     marginBottom: 12,
//   },
//   label: {
//     color: 'white',
//     marginLeft: 4,
//     marginBottom: 6,
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'white',
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     marginBottom: 16,
//   },
//   icon: {
//     marginRight: 8,
//   },
//   input: {
//     flex: 1,
//     height: 48,
//     fontSize: 16,
//   },
//   button: {
//     backgroundColor: '#08004d',
//     paddingVertical: 16,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginTop: 8,
//   },
//   buttonText: {
//     color: 'white',
//     fontSize: 18,
//     fontWeight: '600',
//   },
// });

// export default SignUpPage;
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  Platform,
  Modal,
  Button,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AirtableService from '../airtable';

interface SignUpProps {
  setLoggedIn: (val: string) => void;
  setUserId: (id: string) => void;
  onShowLogin: () => void;
}

const SignUpPage: React.FC<SignUpProps> = ({ setLoggedIn, setUserId, onShowLogin }) => {
  const [name, setName]             = useState<string>('');
  const [date, setDate]             = useState<Date>(new Date());
  const [dob, setDob]               = useState<string>('');
  const [email, setEmail]           = useState<string>('');
  const [password, setPassword]     = useState<string>('');
  const [error, setError]           = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const handleContinue = async () => {
    if (!name || !dob || !email || !password) {
      setError('All fields are required.');
      return;
    }
    try {
      const fields = { name, email, password, 'date of birth': dob };
      const result = await AirtableService.addUser(fields);
      const id = result[0].id;
      await AsyncStorage.setItem('logged_in', 'true');
      await AsyncStorage.setItem('user_id', id);
      setUserId(id);
      setLoggedIn('true');
    } catch (e) {
      console.error(e);
      setError('Sign-up failed. Try again.');
    }
  };

  const onChangeDate = (_event: any, selectedDate?: Date) => {
    const current = selectedDate || date;
    setDate(current);
    const dd = String(current.getDate()).padStart(2, '0');
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const yyyy = current.getFullYear();
    setDob(`${dd}-${mm}-${yyyy}`);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onShowLogin} style={styles.backLink}>
        <Text style={styles.backText}>← Back to Login</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Sign up</Text>
      <Image source={require('../assets/images/cat.png')} style={styles.avatar} />

      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* Name */}
      <Text style={styles.label}>Name:</Text>
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="account-outline" size={20} color="#999" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="your full name"
          placeholderTextColor="#777"
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Date of Birth */}
      <Text style={styles.label}>Date of Birth:</Text>
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={() => setShowDatePicker(true)}
      >
        <MaterialCommunityIcons name="calendar-range" size={20} color="#999" style={styles.icon} />
        <Text style={[
            styles.input,
            !dob && styles.placeholder,
            { lineHeight: 48, textAlignVertical: 'center' }
        ]}>
          {dob || 'dd-mm-yyyy'}
        </Text>
      </TouchableOpacity>

      <Modal
        transparent
        animationType="slide"
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              onChange={(e, d) => {
                setShowDatePicker(false);
                onChangeDate(e, d);
              }}
              textColor="#000"             // ensure dark text on iOS
              themeVariant="light"          // ensure light theme on iOS
            />
            <Button title="Done" onPress={() => setShowDatePicker(false)} />
          </View>
        </View>
      </Modal>

      {/* Email */}
      <Text style={styles.label}>Email:</Text>
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="email-outline" size={20} color="#999" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="enter your email"
          placeholderTextColor="#777"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      {/* Password */}
      <Text style={styles.label}>Password:</Text>
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="lock-outline" size={20} color="#999" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="enter your password"
          placeholderTextColor="#777"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  backLink:   { marginBottom: 12, paddingHorizontal: 4 },
  backText:   { color: 'white', fontSize: 14, textDecorationLine: 'underline' },
  container:  { flex: 1, backgroundColor: '#d96922', paddingHorizontal: 24, justifyContent: 'center' },
  title:      { fontSize: 28, color: 'white', marginBottom: 24, textAlign: 'center' },
  avatar:     { width: 120, height: 120, alignSelf: 'center', marginBottom: 24 },
  error:      { color: '#ffdddd', textAlign: 'center', marginBottom: 12 },
  label:      { color: 'white', marginLeft: 4, marginBottom: 6 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  icon:       { marginRight: 8 },
  input:      { flex: 1, height: 48, fontSize: 16, color: '#000'},
  placeholder:{ color: '#777' },
  button:     { backgroundColor: '#08004d', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
  },
});

export default SignUpPage;
