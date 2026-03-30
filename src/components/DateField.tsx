import { useState } from 'react';
import { Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
/** Bypass package `index.js` — it re-exports `DateTimePickerAndroid` which Metro fails to resolve on some setups. */
import DateTimePicker from '@react-native-community/datetimepicker/src/datetimepicker';

export function formatYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date {
    if (!s) return new Date();
    const d = new Date(s + 'T12:00:00');
    return Number.isNaN(d.getTime()) ? new Date() : d;
}

type Props = {
    label: string;
    value: string;
    onChange: (ymd: string) => void;
    minimumDate?: Date;
    maximumDate?: Date;
};

export function DateField({ label, value, onChange, minimumDate, maximumDate }: Props) {
    const [iosOpen, setIosOpen] = useState(false);
    const [androidOpen, setAndroidOpen] = useState(false);
    const [draft, setDraft] = useState(parseYmd(value));
    const date = parseYmd(value);

    return (
        <View className="mb-4">
            <Text className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2">{label}</Text>
            <TouchableOpacity
                onPress={() => {
                    if (Platform.OS === 'android') {
                        setAndroidOpen(true);
                    } else {
                        setDraft(date);
                        setIosOpen(true);
                    }
                }}
                className="bg-white rounded-2xl border-2 border-neutral-100 px-4 py-3.5"
                activeOpacity={0.85}
            >
                <Text className="text-neutral-900 font-bold">{value || 'Select date'}</Text>
            </TouchableOpacity>

            {Platform.OS === 'android' && androidOpen && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    minimumDate={minimumDate}
                    maximumDate={maximumDate}
                    onChange={(_e: unknown, d?: Date) => {
                        setAndroidOpen(false);
                        if (d) onChange(formatYmd(d));
                    }}
                />
            )}

            {Platform.OS === 'ios' && (
                <Modal transparent animationType="slide" visible={iosOpen} onRequestClose={() => setIosOpen(false)}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setIosOpen(false)}
                        className="flex-1 justify-end bg-black/40"
                    >
                        <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-3xl p-4 pb-8">
                            <View className="flex-row justify-between items-center mb-2">
                                <TouchableOpacity onPress={() => setIosOpen(false)}>
                                    <Text className="text-neutral-500 font-bold">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        onChange(formatYmd(draft));
                                        setIosOpen(false);
                                    }}
                                >
                                    <Text className="text-primary font-black">Done</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={draft}
                                mode="date"
                                display="spinner"
                                minimumDate={minimumDate}
                                maximumDate={maximumDate}
                                onChange={(_e: unknown, d?: Date) => {
                                    if (d) setDraft(d);
                                }}
                            />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>
            )}
        </View>
    );
}
