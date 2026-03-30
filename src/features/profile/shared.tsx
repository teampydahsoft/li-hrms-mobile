import { View, Text } from 'react-native';

export function getRoleLabel(role: string) {
    const labels: Record<string, string> = {
        super_admin: 'Super Admin',
        sub_admin: 'Sub Admin',
        hr: 'HR Manager',
        hod: 'Head of Department',
        employee: 'Employee',
        manager: 'Manager',
    };
    return labels[role] || role;
}

export function HierarchyCard({ title, person }: { title: string; person: { name: string; email?: string; role?: string } }) {
    return (
        <View className="mb-3 rounded-2xl border border-neutral-100 bg-white px-4 py-3">
            <Text className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{title}</Text>
            <Text className="mt-1 text-base font-bold text-neutral-900">{person.name}</Text>
            {person.role ? <Text className="text-xs text-neutral-500">{person.role}</Text> : null}
            {person.email ? <Text className="mt-0.5 text-xs text-neutral-500">{person.email}</Text> : null}
        </View>
    );
}
