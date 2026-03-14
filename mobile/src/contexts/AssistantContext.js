/**
 * AssistantContext — Uygulama genelinde AI asistanına iletilecek bağlamı yönetir.
 *
 * Her ekran kendi bağlamını buraya yazar.
 * FloatingAssistant ve diğer asistan butonları buradan okur.
 *
 * Bağlam örnekleri:
 *   - Gezi planı içinde: { screen: 'itinerary', city, days, places, completedCount, ... }
 *   - Şehir detayında:   { screen: 'city', city }
 *   - Ana sayfa:         { screen: 'home' }
 *   - Genel:             {}
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

const AssistantContext = createContext({
    context: {},
    setAssistantContext: () => { },
    clearAssistantContext: () => { },
});

export const AssistantProvider = ({ children }) => {
    const [context, setContext] = useState({});

    const setAssistantContext = useCallback((newContext) => {
        setContext(prev => ({ ...prev, ...newContext }));
    }, []);

    const clearAssistantContext = useCallback(() => {
        setContext({});
    }, []);

    return (
        <AssistantContext.Provider value={{ context, setAssistantContext, clearAssistantContext }}>
            {children}
        </AssistantContext.Provider>
    );
};

export const useAssistantContext = () => useContext(AssistantContext);

export default AssistantContext;
