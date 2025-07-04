import { StyleSheet, Text, View } from "react-native";

export default function DashboardTab() {
  return (
    <View style={styles.container}>
      <Text>Welcome to Dashboard!</Text>
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