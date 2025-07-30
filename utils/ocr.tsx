import { BACKEND_API_HOST } from "@env";
import * as ImagePicker from "expo-image-picker";
import { Alert, Linking, Platform } from "react-native";

// Take photo of medicine label using camera or pick image from photo gallery
export const pickImage = async (source: "camera" | "gallery"): Promise<string | null> => {
    try {
        if (source === "camera") {
            const { granted } = await ImagePicker.requestCameraPermissionsAsync();
            if (!granted) {
                Alert.alert(
                    "Permission not granted.",
                    "Camera permission is required to take photos.",
                    [
                        {
                            text: "Cancel",
                        },
                        {
                            text: "Open Settings",
                            onPress: () => {
                            Platform.OS === "ios" ? Linking.openURL("app-settings:") : Linking.openSettings();
                            },
                        },
                    ]
                );
                return null;
            }

            let result = await ImagePicker.launchCameraAsync({
                mediaTypes: "images",
                allowsEditing: true,
                base64: true,
                allowsMultipleSelection: false,
                quality: 1,
            });

            return result.canceled ? null : result.assets[0].uri;
        } else {
            const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!granted) {
                Alert.alert(
                    "Permission not granted.",
                    "Media library permission is required to select images.",
                    [
                        {
                            text: "Cancel",
                        },
                        {
                            text: "Open Settings",
                            onPress: () => {
                            Platform.OS === "ios" ? Linking.openURL("app-settings:") : Linking.openSettings();
                            },
                        },
                    ]
                );
                return null;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: "images",
                allowsEditing: true,
                base64: true,
                allowsMultipleSelection: false,
                quality: 1,
            });

            return result.canceled ? null : result.assets[0].uri;
        }
    } catch (err) {
        console.error("Image pick error: ", err);
        return null;
    }
};

// Convert image to base64
export const convertImageToBase64 = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onerror = () => reject("Base64 conversion failed.");
        reader.onload = () => resolve(reader.result?.toString().split(",")[1] || "");
        reader.readAsDataURL(blob);
    });
};

// Call Python endpoint for Huawei OCR
export const performOCR = async (imageBase64: string) => {
    try {
        const response = await fetch(`${BACKEND_API_HOST}/huawei-ocr`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ image_base64: imageBase64 }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "OCR failed.");
        }

        const result = await response.json();
        return {
            "text": result.extracted_text,
            "medInfo": result.medication_info
        };
    } catch (err) {
        console.error("OCR failed with error: ", err);
        throw err;
    }
};