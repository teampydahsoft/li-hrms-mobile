import { View, Text } from 'react-native';
import { Building2, IdCard, ShieldCheck, User2 } from 'lucide-react-native';

type Props = {
    empNo: string;
    empName: string;
    designation: string;
    division: string;
    department: string;
};

export function EmployeeMetaCard({ empNo, empName, designation, division, department }: Props) {
    return (
        <View className="mb-4 rounded-[28px] border-2 border-neutral-100 bg-white p-5">
            <Text className="mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">Employee</Text>

            <View className="mb-3 rounded-2xl border border-neutral-100 bg-neutral-50 px-3 py-3">
                <View className="flex-row items-center gap-2">
                    <User2 size={14} color="#64748B" />
                    <Text className="text-[9px] font-black uppercase tracking-wider text-neutral-500">Name</Text>
                </View>
                <Text className="mt-1 text-sm font-black text-neutral-900">{empName || '—'}</Text>
            </View>

            <View className="mb-3 flex-row gap-2">
                <View className="min-w-0 flex-1 rounded-2xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                    <View className="flex-row items-center gap-1.5">
                        <IdCard size={13} color="#64748B" />
                        <Text className="text-[9px] font-black uppercase tracking-wider text-neutral-500">Emp No</Text>
                    </View>
                    <Text className="mt-1 text-xs font-black text-neutral-800">{empNo || '—'}</Text>
                </View>
                <View className="min-w-0 flex-1 rounded-2xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                    <View className="flex-row items-center gap-1.5">
                        <ShieldCheck size={13} color="#64748B" />
                        <Text className="text-[9px] font-black uppercase tracking-wider text-neutral-500">Designation</Text>
                    </View>
                    <Text className="mt-1 text-xs font-black text-neutral-800" numberOfLines={1}>
                        {designation || '—'}
                    </Text>
                </View>
            </View>

            <View className="rounded-2xl border border-neutral-100 bg-neutral-50 px-3 py-3">
                <View className="flex-row items-center gap-1.5">
                    <Building2 size={13} color="#64748B" />
                    <Text className="text-[9px] font-black uppercase tracking-wider text-neutral-500">Organization</Text>
                </View>
                <Text className="mt-2 text-xs text-neutral-700">
                    <Text className="font-bold text-neutral-500">Division: </Text>
                    {division || '—'}
                </Text>
                <Text className="mt-1 text-xs text-neutral-700">
                    <Text className="font-bold text-neutral-500">Department: </Text>
                    {department || '—'}
                </Text>
            </View>
        </View>
    );
}
