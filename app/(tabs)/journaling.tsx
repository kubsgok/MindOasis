import { StyleSheet, Text, View } from "react-native";

export default function JournalingTab() {
  return (
    <View style={styles.container}>
      <Text>Welcome to Journaling!</Text>
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
});