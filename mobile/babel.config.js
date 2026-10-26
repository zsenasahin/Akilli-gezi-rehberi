module.exports = function (api) {
    api.cache(true);
    // Reanimated 4 / worklets Babel eklentisini babel-preset-expo kendisi ekler.
    // Elle 'react-native-reanimated/plugin' eklemek eklentiyi iki kez çalıştırır.
    return {
        presets: ['babel-preset-expo'],
    };
};
