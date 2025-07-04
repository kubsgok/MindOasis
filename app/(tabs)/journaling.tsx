import CustomHeader from "@/components/CustomHeader";
import { StyleSheet, Text, View } from "react-native";

export default function JournalingTab() {
  return (
    <View style={styles.container}>
      <CustomHeader></CustomHeader>
      <View style={styles.contentContainer}>
        <Text>Welcome to Journaling!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EA6F1D",
  },
  contentContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  }
});