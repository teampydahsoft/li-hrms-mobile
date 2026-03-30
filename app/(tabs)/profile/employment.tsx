import { ScrollView } from 'react-native';
import { ProfileEmploymentSection } from '../../../src/features/profile/ProfileEmploymentSection';

export default function ProfileEmploymentScreen() {
    return (
        <ScrollView
            className="flex-1 bg-white px-8 py-4"
            contentContainerStyle={{ paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
        >
            <ProfileEmploymentSection />
        </ScrollView>
    );
}
