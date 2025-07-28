import { BACKEND_API_HOST, GROQ_API_KEY } from "@env";
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
const callHuaweiOCR = async (imageBase64: string) => {
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
        return result.text;
    } catch (err) {
        console.error("OCR failed with error: ", err);
        throw err;
    }
};

// Ask LLM to extract medicine information
const extractMedInfo = async (extractedText: string) => {
    try {
        const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
        const systemPrompt = `
        You are an expert assistant that extracts medication details from text. Your task is to extract the medication name, dosage, frequency, duration, and additional notes.

        Your response must only be a single JSON object, with no explanations.
        Always respond in valid JSON format. Here are some examples of the expected output format:
        Example 1:
            {
                "medicine_name": "Ezetimibe",
                "dosage": "900mg",
                "frequency": "One tablet every morning",
                "duration": "No set duration",
                "additional_notes": "May be taken with or without food. Stop medication only on doctor's advice."
            }

        Example 2:
            {
                "medicine_name": "Amoxicillin",
                "dosage": "500mg",
                "frequency": "Twice a day",
                "duration": "7 days",
                "additional_notes": "Take with food."
            }
        
        Important Instructions:
            - Pay close attention to details like medication names, dosages, and frequencies.
            - Your output in JSON format have to always and only contain the following keys: "medicine_name", "dosage", "frequency", "duration", and "additional_notes".
            - If there are no additional notes, set the "additional_notes" key value as "Not applicable".
            - If there is no set duration identified, set the "duration" key value as "No set duration".
            - Do not make assumptions or guesses about missing information. If no relevant information can be found for a specific key, assign its value as "Not identified".
        `
        const groqMessages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: extractedText}
        ];

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: groqMessages,
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to extract medicine info from text.");
        }

        const result = await response.json();
        return result.choices?.[0]?.message?.content;
    } catch (err) {
        console.error("Error extracting medication info: ", err);
        return {
            "medicine_name": "Not identified because of error",
            "dosage": "Not identified because of error",
            "frequency": "Not identified because of error",
            "duration": "Not identified because of error",
            "additional_notes": "Not identified because of error"
        };
    }
};

export const performOCR = async (imageBase64: string) => {
    const extractedText = await callHuaweiOCR(imageBase64);
    const medInfo = await extractMedInfo(extractedText);
    return {
        "text": extractedText,
        "medInfo": medInfo
    };
};