import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';
import { formatDate } from '../../utils/formatters';

const JournalSidebar = ({
    entries,
    activeEntryId,
    onSelectEntry,
    onCreateEntry,
    onDeleteEntry,
}) => (
    <View style={styles.container}>
        {entries.map((entry, index) => (
            <TouchableOpacity
                key={entry.id}
                style={[styles.row, activeEntryId === entry.id && styles.rowActive]}
                onPress={() => onSelectEntry(entry.id)}
                activeOpacity={0.85}
            >
                <View style={styles.rowLeft}>
                    <View style={[styles.pageBadge, activeEntryId === entry.id && styles.pageBadgeActive]}>
                        <Text style={[styles.pageBadgeTxt, activeEntryId === entry.id && styles.pageBadgeTxtActive]}>{index + 1}</Text>
                    </View>
                    <View style={styles.rowText}>
                        <Text numberOfLines={1} style={styles.rowTitle}>{entry.title || `Sayfa ${index + 1}`}</Text>
                        <Text style={styles.rowDate}>{formatDate(entry.date || entry.updatedAt)}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => onDeleteEntry(entry.id)}>
                    <Text style={styles.deleteTxt}>Sil</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        ))}
    </View>
);

const styles = StyleSheet.create({
    container: {
        gap: 8,
        marginBottom: SPACING.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 11,
    },
    rowActive: { borderColor: COLORS.primaryDark, backgroundColor: '#F8FBF9' },
    rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    pageBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF3EF', marginRight: 10 },
    pageBadgeActive: { backgroundColor: COLORS.primaryDark },
    pageBadgeTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 12, color: COLORS.primaryDark },
    pageBadgeTxtActive: { color: '#fff' },
    rowText: { flex: 1, paddingRight: 10 },
    rowTitle: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
    rowDate: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
    deleteBtn: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.error + '12' },
    deleteTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 11, color: COLORS.error },
});

export default JournalSidebar;
