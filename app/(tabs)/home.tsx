import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HomeTab() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text>Welcome to Home!</Text>
      <StatusBar style="auto" />

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("../chat")}
      >
        <Text style={styles.buttonText}>Click here to chat!</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EA6F1D",
  },
  button: {
    backgroundColor: "#060256",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "semibold",
  }
});