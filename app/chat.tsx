import KeyboardAvoidingViewContainer from "@/components/KeyboardAvoidingViewContainer";
import { BACKEND_API_HOST } from "@env";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type Message = {
    sender: "user" | "bot";
    text: string;
};

// Avatar mapping (reuse from home page)
const avatars = [
  { name: 'cat', src: require('../assets/avatars/cat.png') },
  { name: 'dog', src: require('../assets/avatars/dog.png') },
  { name: 'bunny', src: require('../assets/avatars/bunny.png') },
  { name: 'dog2', src: require('../assets/avatars/dog2.png') },
  { name: 'hamster', src: require('../assets/avatars/hamster.png') },
  { name: 'bird', src: require('../assets/avatars/bird.png') },
  { name: 'hamster2', src: require('../assets/avatars/hamster2.png') },
  { name: 'dog3', src: require('../assets/avatars/dog3.png') },
  { name: 'cat2', src: require('../assets/avatars/cat2.png') },
];

export default function Chat({ medications: propMeds }: { medications?: any[] }) { 
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [medications, setMedications] = useState<any[]>(propMeds || []);
  const [petAvatar, setPetAvatar] = useState<any>(avatars[0].src); // default to cat
  const [petName, setPetName] = useState<string>("Pet Name"); // default text

  const router = useRouter();
  // // Fetch user data
  // useEffect(() => {
    
  // });
  // Fetch medications if not passed as prop
  useEffect(() => {
    if (!propMeds) {
      (async () => {
        try {
          const userId = await AsyncStorage.getItem('user_id');
          if (!userId) return;
          // Dynamically import AirtableService to avoid circular deps
          const AirtableService = (await import('../airtable')).default;
          const meds = await AirtableService.getMedicationsForUser(userId);
          setMedications(meds);
        } catch (e) {
          console.error('Failed to fetch medications:', e);
        }
      })();
    }
  }, [propMeds]);

  // Fetch pet avatar on mount
  useEffect(() => {
    (async () => {
      try {
        const userId = await AsyncStorage.getItem('user_id');
        if (!userId) return;
        const AirtableService = (await import('../airtable')).default;
        const users: { id: string; fields: any }[] = await AirtableService.getAllUsers();
        const userRecord = users.find((u: { id: string; fields: any }) => u.id === userId);
        if (userRecord) {
          // Set pet avatar
          if (userRecord.fields.avatar) {
            const avatarObj = avatars.find((a) => a.name === userRecord.fields.avatar);
            setPetAvatar(avatarObj ? avatarObj.src : avatars[0].src);
          }
          // Set pet name
          if (userRecord.fields.name) {
            setPetName(userRecord.fields.name);
          }
        }
      } catch (e) {
        // fallback to default
      }
    })();
  }, []);

  const handleSubmit = async () => {
    setInput("");
    Keyboard.dismiss();
    if (!input.trim()) return;

    const userMsg: Message = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Prepare system prompt with user data
      const medList = medications && medications.length
        ? `The user's medications are: ${medications.map(m => m.name).join(', ')}.`
        : "";

      const response = await fetch(`${BACKEND_API_HOST}/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "test_user",
          message: input,
          chat_history: messages.reduce<[string, string][]>((acc, cur, i, arr) => {
            if (cur.sender === "user" && arr[i+1]?.sender === "bot") {
              acc.push([cur.text, arr[i+1].text]);
            }
            return acc;
          }, [])
        }),
      });

      const data = await response.json()
      const botMsg: Message = { sender: "bot", text: data.botResponse };
      setMessages((prev) => [...prev, botMsg]);
      
    } catch (err) {
      console.log("Fetch error: ", err);
      const errorMsg: Message = {
        sender: "bot",
        text: "Sorry, something went wrong. Please try again later.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

  }

  return (
    <KeyboardAvoidingViewContainer>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
            >
                <Ionicons name="close" size={30} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>{petName}</Text>
            </View>

            <TouchableOpacity 
              style={styles.petPhotoContainer}
              onPress={() => console.log("Pet profile photo tapped")} // TO-DO: Link to chat history
            >
              <Image source={petAvatar} style={styles.petPhoto}/>
            </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={{padding: 10}}
        >
          {messages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.messageBubble,
                msg.sender === "user" ? styles.userBubble : styles.botBubble,
              ]}
            >
              <Text style={[styles.messageText, msg.sender === "user" ? styles.userText : styles.botText, ]}>{ msg.text }</Text>
            </View>
          ))}
          
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            multiline
            style={{
              height: 40,
              flex: 1,
              borderRadius: 10,
              backgroundColor: "#FFFFFF",
              padding: 12,
            }}
            placeholder="Type a message..."
            value={ input }
            onChangeText={ setInput }
            onSubmitEditing={ handleSubmit }
          />
          
          {
            input.trim() ? (
              <TouchableOpacity
                style={styles.button}
                onPress={ handleSubmit }
              >
                <Ionicons size={20} name="send" color="#060256" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.button}
              >
                <Ionicons size={20} name="send" color="#ACACAD" />
              </TouchableOpacity>
            )
          }
        </View>
        
      </View>
    </KeyboardAvoidingViewContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EA6F1D",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#060256",
    height: 100,
    paddingHorizontal: 10,
    paddingTop: 30,
  },
  backButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 50,
  },
  titleContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  titleText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  petPhotoContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 60,
  },
  petPhoto: {
    width: 50,
    height: 50,
  },
  messagesContainer: {
    flex: 1,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
    maxWidth: "80%",
  },
  userBubble: {
    backgroundColor: "#060256",
    alignSelf: "flex-end",
  },
  botBubble: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
  },
  userText: {
    color: "#FFFFFF",
  },
  botText: {
    color: "#000000",
  },
  inputContainer: {
    flexDirection: "row",
    backgroundColor: "#060256",
    padding: 10,
    height: 80,
  },
  button: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    height: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "semibold",
  },
});