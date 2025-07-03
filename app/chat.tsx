import KeyboardAvoidingViewContainer from "@/components/KeyboardAvoidingViewContainer";
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BACKEND_API_HOST } from "@env";
import { useState } from "react";
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type Message = {
    sender: "user" | "bot";
    text: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("")
  const [textInputHeight, setTextInputHeight] = useState(60)

  const handleContentSizeChange = (event: {
    nativeEvent: { contentSize: { height: number }};
  }) => {
    setTextInputHeight(Math.max(event.nativeEvent.contentSize.height, 40))
  };

  const handleSubmit = async () => {
    setInput("");
    Keyboard.dismiss();
    if (!input.trim()) return;

    const userMsg: Message = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);

    try {
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
              height: textInputHeight,
              flex: 1,
              borderRadius: 10,
              backgroundColor: "#FFFFFF",
              padding: 12,
            }}
            placeholder="Type a message..."
            value={ input }
            onChangeText={ setInput }
            onContentSizeChange={ handleContentSizeChange }
            onSubmitEditing={ handleSubmit }
          />

          <TouchableOpacity
            style={styles.button}
            onPress={ handleSubmit }
          >
            <IconSymbol size={20} name="paperplane.fill" color="#060256" />
          </TouchableOpacity>
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
    paddingVertical: 12,
    paddingHorizontal: 15,
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