import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function CustomHeader() {
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.leftButton}
                onPress={() => console.log("Side menu tapped")} // TO-DO: Link to menu
            >
                <Ionicons name="menu" size={40} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        height: 100,
        paddingHorizontal: 10,
        paddingTop: 30,
    },
    leftButton: {
        justifyContent: "center",
        alignItems: "center",
        width: 60,
    }
})