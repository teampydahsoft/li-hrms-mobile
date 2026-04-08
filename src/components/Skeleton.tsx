import { useEffect, useRef } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';

type SkeletonBlockProps = {
    height: number;
    width?: number | 'auto' | `${number}%`;
    radius?: number;
    style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({ height, width = '100%', radius = 12, style }: SkeletonBlockProps) {
    const opacity = useRef(new Animated.Value(0.45)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.9,
                    duration: 700,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.45,
                    duration: 700,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                {
                    height,
                    width,
                    borderRadius: radius,
                    backgroundColor: '#E5E7EB',
                    opacity,
                },
                style,
            ]}
        />
    );
}

export function SkeletonCard() {
    return (
        <View style={{ borderRadius: 22, borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#fff', padding: 16, marginBottom: 12 }}>
            <SkeletonBlock height={12} width="38%" />
            <SkeletonBlock height={16} width="70%" style={{ marginTop: 10 }} />
            <SkeletonBlock height={12} width="55%" style={{ marginTop: 10 }} />
            <SkeletonBlock height={10} width="90%" style={{ marginTop: 10 }} />
        </View>
    );
}
