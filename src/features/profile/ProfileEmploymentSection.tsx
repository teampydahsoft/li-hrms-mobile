import { View, Text } from 'react-native';
import { Building2, Users } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { HierarchyCard } from './shared';
import { useProfileData } from './ProfileDataContext';

export function ProfileEmploymentSection() {
    const { employee } = useAuthStore();
    const { hierarchyPeople } = useProfileData();

    if (!employee) {
        return <Text className="mb-8 text-neutral-500">Employee record not linked to this account.</Text>;
    }

    return (
        <View className="mb-8">
            <View className="mb-4 rounded-[28px] border border-emerald-100/60 bg-emerald-50/40 p-5">
                <View className="mb-3 flex-row items-center">
                    <Building2 size={20} color="#059669" />
                    <Text className="ml-2 text-sm font-black text-neutral-800">Placement</Text>
                </View>
                <View className="flex-row flex-wrap justify-between gap-y-3">
                    <View className="w-[48%]">
                        <Text className="text-[10px] font-black uppercase text-emerald-700">Division</Text>
                        <Text className="font-bold text-neutral-900">
                            {employee.division?.name ||
                                (typeof employee.division_id === 'object' && employee.division_id && 'name' in employee.division_id
                                    ? String((employee.division_id as { name?: string }).name)
                                    : '—')}
                        </Text>
                    </View>
                    <View className="w-[48%]">
                        <Text className="text-[10px] font-black uppercase text-emerald-700">Department</Text>
                        <Text className="font-bold text-neutral-900">{employee.department?.name || '—'}</Text>
                    </View>
                    <View className="w-[48%]">
                        <Text className="text-[10px] font-black uppercase text-emerald-700">Joined</Text>
                        <Text className="font-bold text-neutral-900">
                            {employee.joining_date ? new Date(employee.joining_date).toLocaleDateString() : '—'}
                        </Text>
                    </View>
                    <View className="w-[48%]">
                        <Text className="text-[10px] font-black uppercase text-emerald-700">Status</Text>
                        <Text className="font-bold text-neutral-900">{employee.employment_status || '—'}</Text>
                    </View>
                </View>
                {employee.shiftId?.name ? (
                    <View className="mt-4 border-t border-emerald-100/50 pt-3">
                        <Text className="text-[10px] font-black uppercase text-emerald-700">Shift</Text>
                        <Text className="font-bold text-neutral-900">
                            {employee.shiftId.name} ({employee.shiftId.startTime}–{employee.shiftId.endTime})
                        </Text>
                    </View>
                ) : null}
            </View>

            <View className="mb-3 flex-row items-center">
                <Users size={20} color="#64748B" />
                <Text className="ml-2 text-sm font-black text-neutral-800">Reporting & org</Text>
            </View>
            {hierarchyPeople.reporting.map((p, i) => (
                <HierarchyCard key={`r-${p._id || i}`} title={i === 0 ? 'Reports to' : `Manager ${i + 1}`} person={p} />
            ))}
            {hierarchyPeople.hod ? <HierarchyCard title="Division HOD (your dept)" person={hierarchyPeople.hod} /> : null}
            {hierarchyPeople.divManager ? <HierarchyCard title="Division manager" person={hierarchyPeople.divManager} /> : null}
            {hierarchyPeople.reporting.length === 0 && !hierarchyPeople.hod && !hierarchyPeople.divManager ? (
                <Text className="text-sm text-neutral-500">
                    No hierarchy details loaded. HR can link division/department on your profile.
                </Text>
            ) : null}

            {(employee.personal_email || employee.blood_group || employee.address) && (
                <View className="mt-4 rounded-[28px] border border-neutral-100 bg-white p-5">
                    <Text className="mb-2 text-xs font-black uppercase text-neutral-400">Other</Text>
                    {employee.personal_email ? (
                        <Text className="text-sm text-neutral-700">Personal email: {employee.personal_email}</Text>
                    ) : null}
                    {employee.blood_group ? <Text className="text-sm text-neutral-700">Blood group: {employee.blood_group}</Text> : null}
                    {employee.address ? <Text className="text-sm text-neutral-700">Address: {employee.address}</Text> : null}
                </View>
            )}
        </View>
    );
}
