import CustomHeader from "@/components/CustomHeader";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, ListRenderItem, Modal, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function HomeTab() {
  const router = useRouter();
  const [showMedInput, setShowMedInput] = useState(false);
  const [reminder, setReminder] = useState<string>("");
  const [reminders, setReminders] = useState<string[]>([]);
  const [editIndex, setEditIndex] = useState<number>(-1);

  const handleAddReminder = () => {
    if (reminder) {
      if (editIndex !== -1) {
        const updatedReminders = [...reminders];
        updatedReminders[editIndex] = reminder;
        setReminders(updatedReminders);
        setEditIndex(-1);
      } else {
        setReminders([...reminders, reminder]);
      }
      setReminder("");
      setShowMedInput(false);
    }
  };

  const handleEditReminder = (index: number) => {
    const reminderToEdit = reminders[index];
    setShowMedInput(true);
    setReminder(reminderToEdit);
    setEditIndex(index)
  };

  const handleDeleteReminder = (index: number) => {
    const updatedReminders = [...reminders];
    setShowMedInput(false);
    updatedReminders.splice(index, 1);
    setReminders(updatedReminders);
  };

  const renderItem: ListRenderItem<string> = ({ item, index }) => (
    <View style={styles.reminderContainer}>
      <Text style={styles.reminderText}>{item + " "}</Text>
      <View style={styles.reminderButtons}>
        <TouchableOpacity
          onPress={() => handleEditReminder(index)}
        >
          <Ionicons name="create" size={25} color="#837c7c" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <CustomHeader></CustomHeader>
      <SafeAreaView style={styles.contentContainer}>
        <TouchableOpacity
          style={styles.petButton}
          onPress={() => router.push("../chat")}
        >
          <Text style={styles.subtitle}>Click me to chat!</Text>
          <Image source={require("@/assets/images/cat.png")} style={styles.petPhoto} />
        </TouchableOpacity>
        <View style={styles.medicationsContainer}>
          <View style={styles.medicationsHeader}>
            <Text style={styles.titleText}>Medications</Text>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <Modal
                transparent
                animationType="slide"
                visible={showMedInput}
                onRequestClose={() => setShowMedInput(false)}
              >
                <View style={styles.modalContainer}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <TouchableOpacity
                        onPress={() => setShowMedInput(false)}
                        style={styles.modalHeaderButton}
                      >
                        <Ionicons name="close" size={30} color="#000000" />
                      </TouchableOpacity>
                      <Text style={styles.modalHeaderTitle}>Add reminder</Text>
                      <TouchableOpacity
                        onPress={() => {
                          console.log("Delete button tapped");
                          setShowMedInput(false);
                        }} // TO-DO: Handle delete logic
                        style={styles.modalHeaderButton}
                      >
                        <Ionicons name="trash" size={30} color="#000000" />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.textbox}
                      placeholder="Enter medicine name"
                      value={reminder}
                      onChangeText={(text) => setReminder(text)}
                    />

                    <TextInput
                      style={styles.textbox}
                      placeholder="Enter dosage (e.g. 1 tablet, 3 times a day)"
                    />

                    <Text style={styles.modalText}>Set reminder times</Text>

                    <TouchableOpacity
                      onPress={ handleAddReminder }
                      style={styles.modalButton}
                    >
                      <Text style={styles.modalButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
              </Modal>
            </KeyboardAvoidingView>

            <TouchableOpacity
              onPress={() => setShowMedInput(true)}
            >
              <Ionicons name="add-circle" size={30} color="#000000" />
            </TouchableOpacity>
          </View>

          <FlatList 
            data={reminders}
            renderItem={renderItem}
            keyExtractor={(_item: string, index: number) => index.toString()}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EA6F1D",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#EA6F1D",
    justifyContent: "center",
    alignItems: "center",
  },
  medicationsContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: "#7E86FF",
    padding: 50,
  },
  medicationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderTitle: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    height: "auto",
    width: "90%",
    borderRadius: 20,
  },
  modalButton: {
    backgroundColor: "#060256",
    width: 90,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  modalText: {
    color: "#000000",
    marginHorizontal: 20,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "semibold",
  },
  modalHeaderButton: {
    padding: 10,
  },
  reminderContainer: {
    backgroundColor: "#FFF5D5",
    marginTop: 10,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reminderText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "semibold",
    padding: 10,
  },
  reminderButtons: {
    flexDirection: "row",
    marginRight: 5,
  },
  titleText: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
  textbox: {
    borderWidth: 1,
    borderRadius: 10,
    height: 40,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 10,
  },
  petButton: {
    alignItems: "center",
  },
  petPhoto: {
    width: 200,
    height: 200,
  }
});
