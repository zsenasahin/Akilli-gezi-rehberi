import AsyncStorage from '@react-native-async-storage/async-storage';

const JOURNAL_KEY = 'travel_journal_entries_v1';

const makeKey = (userId) => `${JOURNAL_KEY}:${userId || 'guest'}`;

export const createJournalEntry = () => {
    const now = new Date();
    return {
        id: `journal_${Date.now()}`,
        title: 'Yeni Hatıra',
        date: now.toISOString(),
        tripId: null,
        tripLabel: null,
        canvasState: null,
        thumbnail: null,
        updatedAt: now.toISOString(),
    };
};

export const createJournalBook = (title = '') => {
    const now = new Date();
    const firstPage = createJournalEntry();
    return {
        id: `journal_book_${Date.now()}`,
        title: title || '',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        pages: [{ ...firstPage, title: 'Sayfa 1' }],
    };
};

export const createJournalPage = (pageNumber = 1) => ({
    ...createJournalEntry(),
    title: `Sayfa ${pageNumber}`,
});

const normalizeBooks = (parsed) => {
    if (!Array.isArray(parsed)) return [];
    if (parsed[0]?.pages) {
        return parsed.map((book) => ({
            ...book,
            pages: Array.isArray(book.pages) && book.pages.length ? book.pages : [createJournalPage(1)],
        }));
    }
    if (!parsed.length) return [];
    return [{
        id: `journal_book_legacy_${Date.now()}`,
        title: '',
        createdAt: parsed[0]?.date || parsed[0]?.updatedAt || new Date().toISOString(),
        updatedAt: parsed[0]?.updatedAt || new Date().toISOString(),
        pages: parsed,
    }];
};

export const getJournalEntries = async (userId) => {
    try {
        const raw = await AsyncStorage.getItem(makeKey(userId));
        const parsed = raw ? JSON.parse(raw) : [];
        const books = normalizeBooks(parsed);
        return books[0]?.pages || [];
    } catch (error) {
        return [];
    }
};

export const saveJournalEntries = async (userId, entries) => {
    await AsyncStorage.setItem(makeKey(userId), JSON.stringify(entries || []));
};

export const getJournalBooks = async (userId) => {
    try {
        const raw = await AsyncStorage.getItem(makeKey(userId));
        const parsed = raw ? JSON.parse(raw) : [];
        const books = normalizeBooks(parsed);
        if (raw && Array.isArray(parsed) && parsed[0] && !parsed[0].pages) {
            await saveJournalBooks(userId, books);
        }
        return books;
    } catch (error) {
        return [];
    }
};

export const saveJournalBooks = async (userId, books) => {
    await AsyncStorage.setItem(makeKey(userId), JSON.stringify(books || []));
};
