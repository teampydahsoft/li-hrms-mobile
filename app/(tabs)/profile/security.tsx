import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { ProfileSecuritySection } from '../../../src/features/profile/ProfileSecuritySection';

export default function ProfileSecurityScreen() {
    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-white">
            <ScrollView
                className="flex-1 px-8 py-4"
                contentContainerStyle={{ paddingBottom: 48 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <ProfileSecuritySection />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
