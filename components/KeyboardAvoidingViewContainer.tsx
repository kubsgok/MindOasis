import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";

type Props = {
    children: ReactNode;
};

export default function KeyboardAvoidingViewContainer({
    children,
}: Props) {
    if (Platform.OS === "android") {
        return <>{children}</>;
    }

    return (
        <KeyboardAvoidingView
            style={{flex: 1}}
            behavior="padding"
            keyboardVerticalOffset={90}
        >
        { children }
        </KeyboardAvoidingView>
    );
}