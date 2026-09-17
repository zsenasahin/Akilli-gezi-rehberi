// Geçici, yalnızca uygulama içi harita seçimi sırasında kullanılan bellek deposu.
// Route parametrelerine callback koymadığımız için React Navigation uyarısı üretmez.
let pendingLocation = null;

export const setPendingLocation = (location) => {
    pendingLocation = location;
};

export const consumePendingLocation = () => {
    const location = pendingLocation;
    pendingLocation = null;
    return location;
};
