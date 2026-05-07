import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

const ConfettiOverlay = ({ onAnimationFinish, visible = true }) => {
    const lottieRef = useRef(null);

    useEffect(() => {
        if (visible && lottieRef.current) {
            lottieRef.current.play();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            <LottieView
                ref={lottieRef}
                source={require('../../../assets/animations/Confetti.json')}
                autoPlay={false}
                loop={false}
                style={styles.lottie}
                onAnimationFinish={onAnimationFinish}
                resizeMode="cover"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lottie: {
        width: width,
        height: height,
    },
});

export default ConfettiOverlay;
