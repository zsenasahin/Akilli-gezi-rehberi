import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { useThemePreference } from '../../contexts/ThemeContext';

export const PRESET_COLORS = [
    '#111827', '#4B5563', '#9CA3AF',
    '#EF4444', '#F97316', '#FACC15',
    '#22C55E', '#0EA5E9', '#6366F1',
    '#A855F7', '#EC4899', '#FFFFFF',
    '#FEF3C7', '#DCFCE7', '#DBEAFE',
];

export const FONT_FAMILIES = [
    { key: 'caveat', label: 'El yazısı' },
    { key: 'inter', label: 'Normal' },
    { key: 'lora', label: 'Serif' },
    { key: 'mono', label: 'Mono' },
];

export const PAGE_PATTERNS = [
    { key: 'plain', icon: 'document-outline', label: 'Boş' },
    { key: 'lined', icon: 'reorder-three-outline', label: 'Çizgili' },
    { key: 'grid', icon: 'grid-outline', label: 'Kareli' },
    { key: 'dotted', icon: 'apps-outline', label: 'Noktalı' },
];

export const SHAPE_TYPES = [
    { key: 'rect', icon: 'square-outline', label: 'Dikdörtgen' },
    { key: 'circle', icon: 'ellipse-outline', label: 'Daire' },
    { key: 'line', icon: 'remove-outline', label: 'Çizgi' },
    { key: 'arrow', icon: 'arrow-forward-outline', label: 'Ok' },
];

export const BULLET_TYPES = [
    { key: 'bullet', icon: 'ellipse', label: 'Madde' },
    { key: 'check', icon: 'checkbox-outline', label: 'Görev' },
    { key: 'numbered', icon: 'list-outline', label: 'Numaralı' },
    { key: 'star', icon: 'star-outline', label: 'Yıldız' },
    { key: 'arrow_bullet', icon: 'arrow-forward', label: 'Ok' },
];

export const STICKERS = ['✈️', '🗺️', '📍', '🏔️', '🌊', '🌅', '🌿', '🍃', '☀️', '🌙', '⭐', '❤️', '📸', '🎒', '🏕️', '🚂', '🚢', '🛵', '🍜', '☕', '🎵', '✨', '🔥', '💫', '🌸', '🦋'];

const JournalToolbar = ({
    activeTool,
    penIcon,
    panel,
    penColor,
    textColor,
    customHex,
    showCustomColor,
    penSize,
    eraserSize,
    textSize,
    textFontFamily,
    textBold,
    textItalic,
    textUnderline,
    textAlign,
    pagePattern,
    canUndo,
    canRedo,
    selectedType,
    onPenPress,
    onTextPress,
    onImagePress,
    onLinkPress,
    onEraserPress,
    onShapePress,
    onBulletPress,
    onStickerPress,
    onUndo,
    onRedo,
    onMorePress,
    onToggleColorPanel,
    onToggleSizePanel,
    onToggleTextPanel,
    onToggleShapePanel,
    onToggleBulletPanel,
    onToggleStickerPanel,
    onColorSelect,
    onCustomHexChange,
    onApplyCustomHex,
    onToggleCustomColor,
    onPenSizeChange,
    onEraserSizeChange,
    onTextSizeChange,
    onTextFamilyChange,
    onTextStyleToggle,
    onTextAlignChange,
    onPagePatternChange,
    onShapeSelect,
    onBulletSelect,
    onStickerSelect,
    onDeleteSelected,
    onSave,
    onExport,
}) => {
    const { theme } = useThemePreference();
    const activeColor = activeTool === 'text' ? textColor : penColor;

    const ToolBtn = ({ active, disabled, onPress, children, style }) => (
        <TouchableOpacity
            style={[
                styles.btn,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                active && { backgroundColor: theme.colors.primary || COLORS.primary, borderColor: theme.colors.primary || COLORS.primary },
                disabled && styles.btnDisabled,
                style,
            ]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.82}
        >
            {children}
        </TouchableOpacity>
    );

    const Pill = ({ active, label, onPress, style }) => (
        <TouchableOpacity
            style={[
                styles.pill,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                active && { backgroundColor: (theme.colors.pill || COLORS.primaryMuted), borderColor: theme.colors.primary || COLORS.primary },
                style,
            ]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <Text style={[
                styles.pillTxt,
                { color: theme.colors.textSecondary },
                active && { color: theme.colors.primary || COLORS.primary, fontFamily: FONTS.bodySemiBold },
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const IconAction = ({ icon, label, onPress, danger }) => (
        <TouchableOpacity
            style={[
                styles.actionPill,
                { backgroundColor: danger ? (COLORS.error + '15') : theme.colors.surface, borderColor: danger ? COLORS.error : theme.colors.border },
            ]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <Ionicons name={icon} size={15} color={danger ? COLORS.error : theme.colors.text} />
            <Text style={[styles.actionTxt, { color: danger ? COLORS.error : theme.colors.text }]}>{label}</Text>
        </TouchableOpacity>
    );

    const ControlRow = ({ label, value, min, max, onChange }) => {
        const current = Number(value || min);
        const pct = Math.max(0, Math.min(100, ((current - min) / (max - min)) * 100));
        return (
            <View style={styles.controlRow}>
                <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
                <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => onChange(Math.max(min, current - 1))}
                >
                    <Ionicons name="remove" size={15} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={[styles.valueTrack, { backgroundColor: theme.colors.surfaceSoft || theme.colors.surface }]}>
                    <View style={[styles.valueFill, { backgroundColor: theme.colors.primary || COLORS.primary, width: `${pct}%` }]} />
                    <Text style={[styles.valueTxt, { color: theme.colors.text }]}>{current}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => onChange(Math.min(max, current + 1))}
                >
                    <Ionicons name="add" size={15} color={theme.colors.text} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {/* ── Ana araç çubuğu ── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {/* Kalem */}
                <ToolBtn active={activeTool === 'pen'} onPress={onPenPress}>
                    <Ionicons name={penIcon || 'create-outline'} size={19} color={activeTool === 'pen' ? '#fff' : theme.colors.text} />
                </ToolBtn>

                {/* Metin */}
                <ToolBtn active={activeTool === 'text'} onPress={onTextPress}>
                    <Text style={[styles.aa, { color: activeTool === 'text' ? '#fff' : theme.colors.text }]}>Aa</Text>
                </ToolBtn>

                {/* Şekil */}
                <ToolBtn active={activeTool === 'shape'} onPress={onToggleShapePanel}>
                    <Ionicons name="shapes-outline" size={19} color={activeTool === 'shape' ? '#fff' : theme.colors.text} />
                </ToolBtn>

                {/* Bullet Journal */}
                <ToolBtn active={activeTool === 'bullet'} onPress={onToggleBulletPanel}>
                    <Ionicons name="list-outline" size={19} color={activeTool === 'bullet' ? '#fff' : theme.colors.text} />
                </ToolBtn>

                {/* Sticker */}
                <ToolBtn active={panel === 'sticker'} onPress={onToggleStickerPanel}>
                    <Text style={styles.stickerIcon}>✨</Text>
                </ToolBtn>

                {/* Fotoğraf */}
                <ToolBtn onPress={onImagePress}>
                    <Ionicons name="image-outline" size={19} color={theme.colors.text} />
                </ToolBtn>

                {/* Yer bağlantısı */}
                <ToolBtn active={activeTool === 'link'} onPress={onLinkPress}>
                    <Ionicons name="location-outline" size={19} color={activeTool === 'link' ? '#fff' : theme.colors.text} />
                </ToolBtn>

                {/* Silgi */}
                <ToolBtn active={activeTool === 'eraser'} onPress={onEraserPress}>
                    <Ionicons
                        name="tablet-portrait-outline"
                        size={19}
                        color={activeTool === 'eraser' ? '#fff' : theme.colors.text}
                        style={{ transform: [{ rotate: '90deg' }] }}
                    />
                </ToolBtn>

                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                {/* Renk */}
                <ToolBtn active={panel === 'color'} onPress={onToggleColorPanel}>
                    <View style={[styles.swatch, { backgroundColor: activeColor, borderColor: theme.colors.border }]} />
                </ToolBtn>

                {/* Boyut */}
                <ToolBtn active={panel === 'size'} onPress={onToggleSizePanel}>
                    <Ionicons name="options-outline" size={19} color={panel === 'size' ? '#fff' : theme.colors.text} />
                </ToolBtn>

                {/* Metin stili (sadece text modunda) */}
                {activeTool === 'text' && (
                    <ToolBtn active={panel === 'text'} onPress={onToggleTextPanel}>
                        <Ionicons name="text-outline" size={19} color={panel === 'text' ? '#fff' : theme.colors.text} />
                    </ToolBtn>
                )}

                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                {/* Geri al */}
                <ToolBtn disabled={!canUndo} onPress={onUndo}>
                    <Ionicons name="arrow-undo-outline" size={19} color={canUndo ? theme.colors.text : theme.colors.border} />
                </ToolBtn>

                {/* İleri al */}
                <ToolBtn disabled={!canRedo} onPress={onRedo}>
                    <Ionicons name="arrow-redo-outline" size={19} color={canRedo ? theme.colors.text : theme.colors.border} />
                </ToolBtn>

                {/* Seçili sil */}
                {selectedType && (
                    <ToolBtn onPress={onDeleteSelected} style={{ borderColor: COLORS.error + '60' }}>
                        <Ionicons name="trash-outline" size={19} color={COLORS.error} />
                    </ToolBtn>
                )}

                {/* Daha fazla */}
                <ToolBtn active={panel === 'more'} onPress={onMorePress}>
                    <Ionicons name="ellipsis-horizontal" size={19} color={panel === 'more' ? '#fff' : theme.colors.text} />
                </ToolBtn>
            </ScrollView>

            {/* ── Renk paneli ── */}
            {panel === 'color' && (
                <View style={[styles.panel, { backgroundColor: theme.colors.surfaceSoft || theme.colors.surface, borderColor: theme.colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colors}>
                        {PRESET_COLORS.map((color) => {
                            const selected = activeColor === color;
                            return (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorDot,
                                        { backgroundColor: color, borderColor: color === '#FFFFFF' ? theme.colors.border : color },
                                        selected && { borderColor: theme.colors.primary || COLORS.primary, transform: [{ scale: 1.18 }] },
                                    ]}
                                    onPress={() => onColorSelect(color)}
                                    activeOpacity={0.85}
                                />
                            );
                        })}
                        <TouchableOpacity
                            style={[styles.colorDot, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                            onPress={onToggleCustomColor}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="add" size={16} color={theme.colors.text} />
                        </TouchableOpacity>
                    </ScrollView>
                    {showCustomColor && (
                        <View style={styles.hexRow}>
                            <TextInput
                                value={customHex}
                                onChangeText={onCustomHexChange}
                                autoCapitalize="characters"
                                placeholder="#RRGGBB"
                                placeholderTextColor={theme.colors.textSecondary}
                                style={[styles.hexInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                            />
                            <TouchableOpacity
                                style={[styles.applyBtn, { backgroundColor: COLORS.primaryMuted }]}
                                onPress={onApplyCustomHex}
                            >
                                <Text style={[styles.applyTxt, { color: COLORS.primary }]}>Uygula</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {/* ── Boyut paneli ── */}
            {panel === 'size' && (
                <View style={[styles.panel, { backgroundColor: theme.colors.surfaceSoft || theme.colors.surface, borderColor: theme.colors.border }]}>
                    <ControlRow
                        label={activeTool === 'eraser' ? 'Silgi' : 'Kalem'}
                        value={activeTool === 'eraser' ? eraserSize : penSize}
                        min={1}
                        max={activeTool === 'eraser' ? 54 : 32}
                        onChange={activeTool === 'eraser' ? onEraserSizeChange : onPenSizeChange}
                    />
                </View>
            )}

            {/* ── Metin stili paneli ── */}
            {activeTool === 'text' && panel === 'text' && (
                <View style={[styles.panel, { backgroundColor: theme.colors.surfaceSoft || theme.colors.surface, borderColor: theme.colors.border }]}>
                    <ControlRow label="Boyut" value={textSize} min={10} max={72} onChange={onTextSizeChange} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
                        {FONT_FAMILIES.map((font) => (
                            <Pill key={font.key} active={textFontFamily === font.key} label={font.label} onPress={() => onTextFamilyChange(font.key)} />
                        ))}
                        <View style={[styles.divider, { backgroundColor: theme.colors.border, width: 1, height: 24, marginHorizontal: 2 }]} />
                        <Pill active={textBold} label="B" onPress={() => onTextStyleToggle('bold')} style={{ minWidth: 36 }} />
                        <Pill active={textItalic} label="I" onPress={() => onTextStyleToggle('italic')} style={{ minWidth: 36 }} />
                        <Pill active={textUnderline} label="U" onPress={() => onTextStyleToggle('underline')} style={{ minWidth: 36 }} />
                        <View style={[styles.divider, { backgroundColor: theme.colors.border, width: 1, height: 24, marginHorizontal: 2 }]} />
                        <Pill active={textAlign === 'left'} label="⬅" onPress={() => onTextAlignChange('left')} style={{ minWidth: 36 }} />
                        <Pill active={textAlign === 'center'} label="≡" onPress={() => onTextAlignChange('center')} style={{ minWidth: 36 }} />
                        <Pill active={textAlign === 'right'} label="➡" onPress={() => onTextAlignChange('right')} style={{ minWidth: 36 }} />
                    </ScrollView>
                </View>
            )}

            {/* ── Şekil paneli ── */}
            {panel === 'shape' && (
                <View style={[styles.panel, { backgroundColor: theme.colors.surfaceSoft || theme.colors.surface, borderColor: theme.colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
                        {SHAPE_TYPES.map((shape) => (
                            <TouchableOpacity
                                key={shape.key}
                                style={[styles.patternBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                                onPress={() => onShapeSelect(shape.key)}
                                activeOpacity={0.85}
                            >
                                <Ionicons name={shape.icon} size={16} color={theme.colors.text} />
                                <Text style={[styles.patternTxt, { color: theme.colors.textSecondary }]}>{shape.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* ── Bullet journal paneli ── */}
            {panel === 'bullet' && (
                <View style={[styles.panel, { backgroundColor: theme.colors.surfaceSoft || theme.colors.surface, borderColor: theme.colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
                        {BULLET_TYPES.map((bullet) => (
                            <TouchableOpacity
                                key={bullet.key}
                                style={[styles.patternBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                                onPress={() => onBulletSelect(bullet.key)}
                                activeOpacity={0.85}
                            >
                                <Ionicons name={bullet.icon} size={14} color={theme.colors.text} />
                                <Text style={[styles.patternTxt, { color: theme.colors.textSecondary }]}>{bullet.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* ── Sticker paneli ── */}
            {panel === 'sticker' && (
                <View style={[styles.panel, { backgroundColor: theme.colors.surfaceSoft || theme.colors.surface, borderColor: theme.colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stickerRow}>
                        {STICKERS.map((emoji) => (
                            <TouchableOpacity
                                key={emoji}
                                style={styles.stickerBtn}
                                onPress={() => onStickerSelect(emoji)}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.stickerEmoji}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* ── Daha fazla paneli ── */}
            {panel === 'more' && (
                <View style={[styles.panel, { backgroundColor: theme.colors.surfaceSoft || theme.colors.surface, borderColor: theme.colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
                        {PAGE_PATTERNS.map((pattern) => (
                            <TouchableOpacity
                                key={pattern.key}
                                style={[
                                    styles.patternBtn,
                                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                                    pagePattern === pattern.key && { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
                                ]}
                                onPress={() => onPagePatternChange(pattern.key)}
                                activeOpacity={0.85}
                            >
                                <Ionicons
                                    name={pattern.icon}
                                    size={15}
                                    color={pagePattern === pattern.key ? COLORS.primary : theme.colors.textSecondary}
                                />
                                <Text style={[
                                    styles.patternTxt,
                                    { color: theme.colors.textSecondary },
                                    pagePattern === pattern.key && { color: COLORS.primary, fontFamily: FONTS.bodySemiBold },
                                ]}>
                                    {pattern.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <View style={[styles.divider, { backgroundColor: theme.colors.border, width: 1, height: 24, marginHorizontal: 4 }]} />
                        <IconAction icon="save-outline" label="Kaydet" onPress={onSave} />
                        <IconAction icon="download-outline" label="PNG" onPress={onExport} />
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 8,
        gap: 8,
        shadowColor: '#10211A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.06,
        shadowRadius: 18,
        elevation: 4,
    },
    row: { alignItems: 'center', gap: 7, paddingRight: 6 },
    btn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    btnDisabled: { opacity: 0.35 },
    aa: { fontFamily: FONTS.bodySemiBold, fontSize: 15 },
    stickerIcon: { fontSize: 18 },
    swatch: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },
    divider: { width: 1, height: 24, marginHorizontal: 2 },
    panel: { borderRadius: 18, borderWidth: 1, padding: 10, gap: 8 },
    colors: { alignItems: 'center', gap: 8, paddingRight: 4 },
    colorDot: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hexRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    hexInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        fontFamily: FONTS.body,
        fontSize: 12,
    },
    applyBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    applyTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
    controlRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    controlLabel: { width: 44, fontFamily: FONTS.bodyMedium, fontSize: 12 },
    stepBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    valueTrack: {
        flex: 1,
        height: 30,
        borderRadius: 15,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    valueFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
    valueTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
    pills: { alignItems: 'center', gap: 7, paddingRight: 4 },
    pill: {
        minHeight: 32,
        paddingHorizontal: 13,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillTxt: { fontFamily: FONTS.bodyMedium, fontSize: 12 },
    patternBtn: {
        height: 34,
        paddingHorizontal: 12,
        borderRadius: 17,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    patternTxt: { fontFamily: FONTS.bodyMedium, fontSize: 12 },
    actionPill: {
        height: 34,
        paddingHorizontal: 12,
        borderRadius: 17,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionTxt: { fontFamily: FONTS.bodyMedium, fontSize: 12 },
    stickerRow: { alignItems: 'center', gap: 6, paddingRight: 4 },
    stickerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.04)',
    },
    stickerEmoji: { fontSize: 22 },
});

export default JournalToolbar;
