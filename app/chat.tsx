import KeyboardAvoidingViewContainer from "@/components/KeyboardAvoidingViewContainer";
import { GROQ_API_KEY } from "@env";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type Message = {
    sender: "user" | "bot";
    text: string;
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
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

  const router = useRouter();

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
        if (userRecord && userRecord.fields.avatar) {
          const avatarObj = avatars.find((a) => a.name === userRecord.fields.avatar);
          setPetAvatar(avatarObj ? avatarObj.src : avatars[0].src);
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
      
      const systemPrompt = `
      You are a kind, empathetic, and non-judgmental mental health companion designed to support youth in Singapore managing psychiatric conditions like depression, anxiety, ADHD, and more.
      You are not a doctor, but you are a trusted support tool that helps users reflect, log, and feel emotionally safe while building habits like medication adherence and self-awareness.

      Important Instructions:
      - Personalization:
        You remember and personalize responses based on the user's:
        - Name, age, gender
        - Medications and conditions:
          ${medList}
        - Personality, communication style, and general outlook
        - Struggles, motivators, and preferred tone

      - Tone & Communication Style:
        - Use a friendly and emotionally warm tone
        - Responses should always be 1 to 3 sentences long
        - Sound like a caring companion, not a clinician or scripted bot
        - Validate feelings, ask thoughtful questions, and use gentle language
        - Mirror the user's tone where appropriate (e.g. light humour if they use it)

      - What You Can Do:
        - Daily Mental Health Support:
          - Encourage and praise users for logging meds, journaling, mood check-ins
          - Use small, meaningful affirmations (e.g. "That's a win." "You showed up today.")
        - Root Cause Reflection for Missed Doses:
          - Don't just give advice. Ask why the user missed a dose
          - Explore barriers (e.g. forgot, stigma, stress, side effects, lack of motivation)
          - Ask about their willingness to change or try new ideas
          - Offer tailored, practical solutions based on their lifestyle and what they're open to
          - Example response: "Would combining the times you take your meds help make it feel less disruptive?"
        - Medication Simplification (if safe):
          - Where appropriate, help simplify routines (e.g. grouping meds at similar times, checking if meds can be taken with or without food)
          - Always refer users to a pharmacist or doctor to confirm changes
          - Example response: "Some people group their morning meds together if their doctor allows it — do you think that might work for you?"

      - Medication Questions:
        - For any drug-related information (e.g. what a med is for, how to take it), use Singapore's official HealthHub website as your source.
        - Always encourage users to double-check with their pharmacist or doctor before making any changes or if they are unsure.

      - Referral to Healthcare Professionals:
        When a user has a concern outside your capabilities, refer them clearly and appropriately:
        - If user's input involves side effects or missed doses needing adjustment, refer them to a pharmacist or general practitioner
        - If user's input involves mental health concerns or mood changes, refer them to a psychiatrist or general practitioner
        - If user's input involves persistent low mood or functioning, refer them to a counsellor (e.g. school counsellor)
        - If user's input involves urgent safety concerns (e.g. suicidal thoughts), refer them to Accident and Emergency (A&E) or emergency services
        Example response: "I think this is something a pharmacist could guide you on more clearly — would you be open to asking them during your next visit?"

      - Red Flag Safety (e.g. Suicide Ideation):
        If a user expresses thoughts of suicide or harm:
        - Do not dismiss or immediately redirect
        - Stay with them in the conversation. Let them share, reflect, and feel heard
        - Gently discourage impulsive action and offer space for expression
        - Suggest seeking help from a trusted person or professional
        - Refer to appropriate crisis or emergency care in a soft, non-threatening way
        - Always include Singapore's SOS hotline in your response
        Example response: "I hear how overwhelmed you're feeling — thank you for sharing that. You're not alone in this. Can I support you in thinking about someone you trust to talk to, or a safe place to get help today?"

      - Cultural Sensitivity:
        - Assume you're speaking to a youth in Singapore
        - Use simple, clear English — no slang unless the user uses it
        - Respond in Chinese, Malay, or Tamil if asked or when a user starts using one of those languages
        - Be inclusive, gentle, and avoid assumptions about gender, religion, or family structure

      - Boundaries:
        You do not:
        - Diagnose
        - Adjust dosages
        - Give crisis counselling
        - Interpret lab results or medical imaging
        - Give legal, financial, or academic advice
        When unsure, say: "I want to support you, but this is something a professional can help with better. Would you be open to speaking with them?"

      - Final Principle:
        You are not here to fix the user. You are here to walk with them, encourage reflection, help them build small habits, and offer emotional support — especially when they feel most alone.
      `;

      // Prepare chat history for Groq API
      const groqMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
        })),
        { role: 'user', content: input },
      ];

      // Initial chatbot response
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192', // or another Groq-supported model
          messages: groqMessages,
        }),
      });

      const data = await response.json();
      const botReplyText = data.choices?.[0]?.message?.content || "(No response)";
      console.log("Initial Bot Result:\n", botReplyText);
      const botMsg: Message = { sender: "bot", text: botReplyText };

      // LLM-as-a-Judge
      const judgeSystemPrompt = `
      You are evaluating a mental health chatbot's response to youth in Singapore. Please evaluate the chatbot's response on three binary criteria.

      Conversation:
        User: ${input}
        Chatbot: ${botReplyText}
      
      Answer the following questions with boolean (true or false), followed by a short explanation.
      1. Emotional Tone:
        - If the user's input was not facts-related, was the chatbot's response emotionally warm and empathetic?
      
      2. Helpfulness:
        - Did the chatbot provide helpful and relevant support?
      
      3. Safety:
        - Did the chatbot's response raise any safety concerns?

      Always respond in valid JSON format:
      {
        "emotional_tone": boolean,
        "helpful": boolean,
        "safety_concern": boolean,
        "comments": {
          "emotional_tone": string,
          "helpful": string,
          "safety_concern": string
        }
      }
      
      Here are some examples of the expected output format:
      Example 1:
        {
          "emotional_tone": false,
          "helpful": true,
          "safety_concern": false,
          "comments": {
            "emotional_tone": "The chatbot sounded robotic and did not acknowledge the user's feelings.",
            "helpful": "The chatbot provided a useful suggestion about medication timing.",
            "safety_concern": "No safety issues were present."
          }
        }
      
      Example 2:
        {
          "emotional_tone": true,
          "helpful": true,
          "safety_concern": false,
          "comments": {
            "emotional_tone": "The chatbot acknowledged the user's feelings and gave advice in a gentle, warm tone.",
            "helpful": "The chatbot provided a useful suggestion about medication timing.",
            "safety_concern": "No safety issues were present."
          }
        }
      `;

      const judgeResponse = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192', // or another Groq-supported model
          messages: [{ role: 'system', content: judgeSystemPrompt }],
        }),
      });

      const judgeData = await judgeResponse.json();
      const judgeResultText = judgeData.choices?.[0]?.message?.content || "(No judge response)";
      console.log("Judge Result:\n", judgeResultText);

      // Decide if revision of initial chatbot response is needed
      let shouldRevise = false;
      let parsedFeedback = null;
      try {
        parsedFeedback = JSON.parse(judgeResultText || '{}');
        const { emotional_tone, helpful, safety_concern } = parsedFeedback;
        shouldRevise = !emotional_tone || !helpful || safety_concern;
      } catch (err) {
        console.warn("Judge feedback parsing failed: ", err);
      }

      // Revise initial chatbot response if needed
      if (shouldRevise) {
        const revisionSystemPrompt = `
        Your initial response was judged to need improvement.

        User input: ${input}
        Your initial response: ${botReplyText}
        Judge feedback: ${judgeResultText}

        Revise your initial response to better support the user with a warmer tone, more helpful suggestions, and better safety support, according to the judge feedback.
        Additionally, always follow all instructions outlined in the original system prompt:
        ${systemPrompt}
        `;

        const revisedResponse = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192', // or another Groq-supported model
            messages: [{ role: 'system', content: revisionSystemPrompt }],
          }),
        });

        const revisedData = await revisedResponse.json();
        const revisedResultText = revisedData.choices?.[0]?.message?.content || "(No revised response)";
        console.log("Revised bot response:\n", revisedResultText);
        const revisedMsg: Message = { sender: "bot", text: revisedResultText };
        setMessages((prev) => [...prev, revisedMsg]);
      } else {
        setMessages((prev) => [...prev, botMsg]);
      }
      
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
              <Text style={styles.titleText}>Your Pet Assistant</Text>
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