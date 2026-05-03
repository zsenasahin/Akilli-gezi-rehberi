import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';
import { useThemePreference } from '../../contexts/ThemeContext';

const PRESET_COLORS = ['#111827', '#4B5563', '#EF4444', '#F97316', '#FACC15', '#22C55E', '#0EA5E9', '#6366F1', '#A855F7', '#EC4899', '#FFFFFF'];
const FONT_FAMILIES = [
    { key: 'caveat', label: 'El yazısı' },
    { key: 'inter', label: 'Normal' },
    { key: 'lora', label: 'Serif' },
];
const PAGE_PATTERNS = [
    { key: 'plain', icon: 'document-outline', label: 'Boş' },
    { key: 'lined', icon: 'reorder-three-outline', label: 'Çizgili' },
    { key: 'grid', icon: 'grid-outline', label: 'Kareli' },
    { key: 'dotted', icon: 'apps-outline', label: 'Noktalı' },
];

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
    pagePattern,
    canUndo,
    canRedo,
    onPenPress,
    onTextPress,
    onImagePress,
    onLinkPress,
    onEraserPress,
    onUndo,
    onRedo,
    onMorePress,
    onToggleColorPanel,
    onToggleSizePanel,
    onToggleTextPanel,
    onColorSelect,
    onCustomHexChange,
    onApplyCustomHex,
    onToggleCustomColor,
    onPenSizeChange,
    onEraserSizeChange,
    onTextSizeChange,
    onTextFamilyChange,
    onTextStyleToggle,
    onPagePatternChange,
    onSave,
    onExport,
}) => {
    const { theme } = useThemePreference();
    const activeColor = activeTool === 'text' ? textColor : penColor;

    const ToolBtn = ({ active, disabled, onPress, children }) => (
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, active && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }, disabled && styles.btnDisabled]} onPress={onPress} disabled={disabled} activeOpacity={0.82}>
            {children}
        </TouchableOpacity>
    );

    const Pill = ({ active, label, onPress }) => (
        <TouchableOpacity style={[styles.pill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, active && { backgroundColor: theme.colors.pill, borderColor: theme.colors.primary }]} onPress={onPress} activeOpacity={0.85}>
            <Text style={[styles.pillTxt, { color: theme.colors.textSecondary }, active && { color: theme.colors.primary, fontFamily: FONTS.bodySemiBold }]}>{label}</Text>
        </TouchableOpacity>
    );

    const IconAction = ({ icon, label, onPress }) => (
        <TouchableOpacity style={[styles.actionPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={onPress} activeOpacity={0.85}>
            <Ionicons name={icon} size={15} color={theme.colors.text} />
            <Text style={[styles.actionTxt, { color: theme.colors.text }]}>{label}</Text>
        </TouchableOpacity>
    );

    const ControlRow = ({ label, value, min, max, onChange }) => {
        const current = Number(value || min);
        return (
            <View style={styles.controlRow}>
                <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
                <TouchableOpacity style={[styles.stepBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => onChange(Math.max(min, current - 1))}><Ionicons name="remove" size={15} color={theme.colors.text} /></TouchableOpacity>
                <View style={[styles.valueTrack, { backgroundColor: theme.colors.surfaceSoft }]}>
                    <View style={[styles.valueFill, { backgroundColor: theme.colors.border, width: `${Math.max(0, Math.min(100, ((current - min) / (max - min)) * 100))}%` }]} />
                    <Text style={[styles.valueTxt, { color: theme.colors.text }]}>{current}</Text>
                </View>
                <TouchableOpacity style={[styles.stepBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => onChange(Math.min(max, current + 1))}><Ionicons name="add" size={15} color={theme.colors.text} /></TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                <ToolBtn active={activeTool === 'pen'} onPress={onPenPress}>
                    <Ionicons name={penIcon} size={19} color={activeTool === 'pen' ? '#fff' : theme.colors.text} />
                </ToolBtn>
                <ToolBtn active={activeTool === 'text'} onPress={onTextPress}><Text style={[styles.aa, { color: theme.colors.text }, activeTool === 'text' && styles.activeText]}>Aa</Text></ToolBtn>
                <ToolBtn onPress={onImagePress}><Ionicons name="image-outline" size={19} color={theme.colors.text} /></ToolBtn>
                <ToolBtn active={activeTool === 'link'} onPress={onLinkPress}><Ionicons name="location-outline" size={19} color={activeTool === 'link' ? '#fff' : theme.colors.text} /></ToolBtn>
                <ToolBtn active={activeTool === 'eraser'} onPress={onEraserPress}><Ionicons name="tablet-portrait-outline" size={19} color={activeTool === 'eraser' ? '#fff' : theme.colors.text} style={{ transform: [{ rotate: '90deg' }] }} /></ToolBtn>
                <ToolBtn active={panel === 'color'} onPress={onToggleColorPanel}>
                    <View style={[styles.swatch, { backgroundColor: activeColor, borderColor: theme.colors.border }]} />
                </ToolBtn>
                <ToolBtn active={panel === 'size'} onPress={onToggleSizePanel}><Ionicons name="options-outline" size={19} color={panel === 'size' ? '#fff' : theme.colors.text} /></ToolBtn>
                {activeTool === 'text' && <ToolBtn active={panel === 'text'} onPress={onToggleTextPanel}><Ionicons name="text-outline" size={19} color={panel === 'text' ? '#fff' : theme.colors.text} /></ToolBtn>}
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                <ToolBtn disabled={!canUndo} onPress={onUndo}><Ionicons name="arrow-undo-outline" size={19} color={canUndo ? theme.colors.text : theme.colors.border} /></ToolBtn>
                <ToolBtn disabled={!canRedo} onPress={onRedo}><Ionicons name="arrow-redo-outline" size={19} color={canRedo ? theme.colors.text : theme.colors.border} /></ToolBtn>
                <ToolBtn active={panel === 'more'} onPress={onMorePress}><Ionicons name="ellipsis-horizontal" size={19} color={panel === 'more' ? '#fff' : theme.colors.text} /></ToolBtn>
            </ScrollView>

            {panel === 'color' && (
                <View style={[styles.panel, { backgroundColor: theme.colors.surfaceSoft, borderColor: theme.colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colors}>
                        {PRESET_COLORS.map((color) => {
                            const selected = activeColor === color;
                            return (
                                <TouchableOpacity
                                    key={color}
                                    style={[styles.colorDot, { backgroundColor: color, borderColor: color === '#FFFFFF' ? theme.colors.border : color }, selected && { borderColor: theme.colors.primary, transform: [{ scale: 1.12 }] }]}
                                    onPress={() => onColorSelect(color)}
                                    activeOpacity={0.85}
                                />
                            );
                        })}
                        <TouchableOpacity style={[styles.colorDot, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={onToggleCustomColor} activeOpacity={0.85}>
                            <Ionicons name="add" size={16} color={theme.colors.text} />
                        </TouchableOpacity>
                    </ScrollView>
                    {showCustomColor && (
                        <View style={styles.hexRow}>
                            <TextInput value={customHex} onChangeText={onCustomHexChange} autoCapitalize="characters" placeholder="#RRGGBB" placeholderTextColor={theme.colors.textSecondary} style={[styles.hexInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]} />
                            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: theme.colors.pill }]} onPress={onApplyCustomHex}><Text style={[styles.applyTxt, { color: theme.colors.primary }]}>Uygula</Text></TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {panel === 'size' && (
                <View style={[styles.panel, { backgroundColor: theme.colors.surfaceSoft, borderColor: theme.colors.border }]}>
                    <ControlRow label={activeTool === 'eraser' ? 'Silgi' : 'Kalem'} value={activeTool === 'eraser' ? eraserSize : penSize} min={1} max={activeTool === 'eraser' ? 54 : 32} onChange={activeTool === 'eraser' ? onEraserSizeChange : onPenSizeChange} />
                </View>
            )}

            {activeTool === 'text' && panel === 'text' && (
                <View style={[styles.panel, { backgroundColor: theme.colors.surfaceSoft, borderColor: theme.colors.border }]}>
                    <ControlRow label="Boyut" value={textSize} min={10} max={64} onChange={onTextSizeChange} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
                        {FONT_FAMILIES.map((font) => <Pill key={font.key} active={textFontFamily === font.key} label={font.label} onPress={() => onTextFamilyChange(font.key)} />)}
                        <Pill active={textBold} label="B" onPress={() => onTextStyleToggle('bold')} />
                        <Pill active={textItalic} label="I" onPress={() => onTextStyleToggle('italic')} />
                    </ScrollView>
                </View>
            )}

            {panel === 'more' && (
                <View style={[styles.panel, { backgroundColor: theme.colors.surfaceSoft, borderColor: theme.colors.border }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
                        {PAGE_PATTERNS.map((pattern) => (
                            <TouchableOpacity key={pattern.key} style={[styles.patternBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, pagePattern === pattern.key && { backgroundColor: theme.colors.pill, borderColor: theme.colors.primary }]} onPress={() => onPagePatternChange(pattern.key)} activeOpacity={0.85}>
                                <Ionicons name={pattern.icon} size={15} color={pagePattern === pattern.key ? theme.colors.primary : theme.colors.textSecondary} />
                                <Text style={[styles.patternTxt, { color: theme.colors.textSecondary }, pagePattern === pattern.key && { color: theme.colors.primary, fontFamily: FONTS.bodySemiBold }]}>{pattern.label}</Text>
                            </TouchableOpacity>
                        ))}
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
    row: { alignItems: 'center', gap: 8, paddingRight: 6 },
    btn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    btnDisabled: { opacity: 0.35 },
    aa: { fontFamily: FONTS.bodySemiBold, fontSize: 15 },
    activeText: { color: '#fff' },
    swatch: { width: 20, height: 20, borderRadius: 10, borderWidth: 1 },
    divider: { width: 1, height: 24, marginHorizontal: 2 },
    panel: { borderRadius: 18, borderWidth: 1, padding: 10, gap: 8 },
    colors: { alignItems: 'center', gap: 9, paddingRight: 4 },
    colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    hexRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    hexInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, fontFamily: FONTS.body, fontSize: 12 },
    applyBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    applyTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
    controlRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    controlLabel: { width: 44, fontFamily: FONTS.bodyMedium, fontSize: 12 },
    stepBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    valueTrack: { flex: 1, height: 30, borderRadius: 15, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    valueFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
    valueTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 12 },
    pills: { alignItems: 'center', gap: 8, paddingRight: 4 },
    pill: { minHeight: 30, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    pillTxt: { fontFamily: FONTS.bodyMedium, fontSize: 12 },
    patternBtn: { height: 32, paddingHorizontal: 11, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
    patternTxt: { fontFamily: FONTS.bodyMedium, fontSize: 12 },
    actionPill: { height: 32, paddingHorizontal: 11, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionTxt: { fontFamily: FONTS.bodyMedium, fontSize: 12 },
});

export default JournalToolbar;
