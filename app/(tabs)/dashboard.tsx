import CustomHeader from "@/components/CustomHeader";
import { StyleSheet, Text, View } from "react-native";

export default function DashboardTab() {
  return (
    <View style={styles.container}>
      <CustomHeader></CustomHeader>
      <View style={styles.contentContainer}>
        <Text>Welcome to Dashboard!</Text>
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