// JournalPage v2
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { BORDER_RADIUS, SPACING } from '../../constants/layout';
import { COLORS } from '../../constants/colors';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { formatDate } from '../../utils/formatters';
import JournalToolbar from '../../components/journal/JournalToolbar';
import JournalSidebar from '../../components/journal/JournalSidebar';
import { createJournalBook, createJournalPage, getJournalBooks, saveJournalBooks } from '../../services/journalStore';
import { getItinerariesByUser, getItineraryById } from '../../services/itineraryService';
import { useThemePreference } from '../../contexts/ThemeContext';

const PEN_TYPES = [
    { key: 'pencil', label: 'Kurşun Kalem', subtitle: 'Doğal eskiz çizgisi', icon: 'pencil-outline', width: 2, opacity: 0.72 },
    { key: 'fineliner', label: 'Fineliner', subtitle: 'Temiz ince hat', icon: 'create-outline', width: 3, opacity: 1 },
    { key: 'ballpoint', label: 'İnce Kalem', subtitle: 'Not ve küçük çizimler', icon: 'create-outline', width: 2, opacity: 1 },
    { key: 'marker', label: 'Marker', subtitle: 'Tok ve net hatlar', icon: 'brush-outline', width: 6, opacity: 1, cap: 'square' },
    { key: 'brush', label: 'Fırça', subtitle: 'Yumuşak eskiz hissi', icon: 'color-wand-outline', width: 8, opacity: 1 },
    { key: 'calligraphy', label: 'Kaligrafi', subtitle: 'Geniş ve karakterli', icon: 'color-fill-outline', width: 10, opacity: 0.95, cap: 'square' },
    { key: 'highlighter', label: 'Fosforlu', subtitle: 'Yarı saydam vurgu', icon: 'water-outline', width: 20, opacity: 0.35, mode: 'multiply' },
];

const buildFabricHtml = (initialJson, entryId, themeBg) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body { margin:0; width:100%; height:100%; background:${themeBg}; overflow:hidden; -webkit-user-select:none; user-select:none; }
    #wrap { width:100%; height:100%; padding:12px; box-sizing:border-box; overflow:auto; }
    #page { position:relative; width:100%; min-height:100%; background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,.1); overflow:hidden; touch-action:none; }
    #pattern { position:absolute; inset:0; pointer-events:none; z-index:1; }
    #canvas { position:absolute; inset:0; z-index:2; width:100%; height:100%; touch-action:none; }
    #textEditor { position:absolute; z-index:5; display:none; min-width:40px; min-height:28px; border:2px dashed rgba(45,106,79,0.4); border-radius:8px; padding:4px 8px; background:rgba(255,255,255,0.4); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); box-shadow:0 4px 16px rgba(0,0,0,0.08); outline:none; resize:none; overflow:hidden; white-space:pre; color:inherit; font-family:inherit; }
    #textEditor:focus { border:2px solid #2D6A4F; background:rgba(255,255,255,0.9); }
    #deleteBtn { position:absolute; z-index:10; width:30px; height:30px; border:none; border-radius:15px; background:#E74C3C; color:#fff; display:none; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,.2); font-size:16px; cursor:pointer; }
  </style>
</head>
<body>
  <div id="wrap"><div id="page"><div id="pattern"></div><canvas id="canvas"></canvas><textarea id="textEditor" rows="1" spellcheck="false"></textarea><button id="deleteBtn">x</button></div></div>
<script>
(() => {
  const entryId = '${entryId || ''}';
  const initial = ${initialJson || 'null'};
  const pageEl = document.getElementById('page');
  const wrapEl = document.getElementById('wrap');
  const patternEl = document.getElementById('pattern');
  const canvasEl = document.getElementById('canvas');
  const editorEl = document.getElementById('textEditor');
  const deleteBtn = document.getElementById('deleteBtn');
  const ctx = canvasEl.getContext('2d');
  const send = (payload) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  const presets = {
    pencil: { width: 2, opacity: 0.72, cap: 'round', join: 'round', mode: 'source-over' },
    fineliner: { width: 3, opacity: 1, cap: 'round', join: 'round', mode: 'source-over' },
    ballpoint: { width: 2, opacity: 1, cap: 'round', join: 'round', mode: 'source-over' },
    marker: { width: 6, opacity: 1, cap: 'square', join: 'bevel', mode: 'source-over' },
    brush: { width: 8, opacity: 1, cap: 'round', join: 'round', mode: 'source-over' },
    calligraphy: { width: 10, opacity: 0.95, cap: 'square', join: 'miter', mode: 'source-over' },
    highlighter: { width: 20, opacity: 0.35, cap: 'square', join: 'bevel', mode: 'multiply' },
  };
  const fontMap = { caveat: 'Caveat', inter: 'Inter', lora: 'Lora' };
  const state = { activeTool: 'pen', penType: 'ballpoint', penColor: '#000000', penSize: 2, eraserSize: 16, eraserMode: 'stroke', textStyle: { size: 20, family: 'inter', weight: 'normal', style: 'normal', color: '#000000' }, pagePattern: 'plain', strokes: [], texts: [], images: [], chips: [], selected: null, drawing: null, transform: null, editingTextId: null, historyStack: [], historyIndex: -1, restoring: false };
  const uid = (prefix) => prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
  const cloneBoard = () => JSON.parse(JSON.stringify({ appVersion: 2, pagePattern: state.pagePattern, strokes: state.strokes, texts: state.texts, images: state.images, chips: state.chips }));
  const historyStatus = () => send({ type: 'history', canUndo: state.historyIndex > 0, canRedo: state.historyIndex >= 0 && state.historyIndex < state.historyStack.length - 1 });
  const saveHistory = () => { if (state.restoring) return; state.historyStack = state.historyStack.slice(0, state.historyIndex + 1); state.historyStack.push(cloneBoard()); state.historyIndex = state.historyStack.length - 1; historyStatus(); };
  const restoreBoard = (snapshot) => { state.pagePattern = snapshot?.pagePattern || 'plain'; state.strokes = snapshot?.strokes || []; state.texts = snapshot?.texts || []; state.images = snapshot?.images || []; state.chips = snapshot?.chips || []; state.selected = null; applyPattern(state.pagePattern); hideEditor(true); render(); };
  const loadHistoryAt = (idx) => { if (idx < 0 || idx >= state.historyStack.length) return; state.restoring = true; restoreBoard(state.historyStack[idx]); state.restoring = false; historyStatus(); };
  const resizeCanvas = () => { const rect = pageEl.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; const width = Math.max(1, Math.floor(rect.width)); const height = Math.max(1, Math.floor(Math.max(rect.height, window.innerHeight - 24))); canvasEl.width = Math.floor(width * dpr); canvasEl.height = Math.floor(height * dpr); canvasEl.style.width = width + 'px'; canvasEl.style.height = height + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); render(); };
  const point = (event) => { const rect = canvasEl.getBoundingClientRect(); const touch = event.touches?.[0] || event.changedTouches?.[0] || event; return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }; };
  const fontFor = (text) => { const family = fontMap[text.family] || text.family || 'Inter'; return (text.style || 'normal') + ' ' + (text.weight || 'normal') + ' ' + (text.size || 20) + 'px ' + family; };
  const getLineHeight = (size) => { const isLines = state.pagePattern === 'lined' || state.pagePattern === 'grid'; return isLines ? 28 : Math.max(24, (size || 20) * 1.3); };
  const applyPattern = (type) => { state.pagePattern = type; if (type === 'plain') { patternEl.style.background = 'transparent'; return; } if (type === 'lined') { patternEl.style.backgroundImage = 'linear-gradient(to bottom, #E0E0E0 1px, transparent 1px)'; patternEl.style.backgroundSize = '100% 28px'; return; } if (type === 'grid') { patternEl.style.backgroundImage = 'linear-gradient(to right, #E0E0E0 1px, transparent 1px), linear-gradient(to bottom, #E0E0E0 1px, transparent 1px)'; patternEl.style.backgroundSize = '28px 28px'; return; } patternEl.style.backgroundImage = 'radial-gradient(circle, #BDBDBD 2px, transparent 2px)'; patternEl.style.backgroundSize = '28px 28px'; };
  const roundRect = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); };
  const drawStroke = (stroke) => { if (!stroke.points || stroke.points.length < 2) return; ctx.save(); ctx.globalAlpha = stroke.opacity ?? 1; ctx.globalCompositeOperation = stroke.mode || 'source-over'; ctx.strokeStyle = stroke.color || '#000'; ctx.lineWidth = stroke.width || 2; ctx.lineCap = stroke.cap || 'round'; ctx.lineJoin = stroke.join || 'round'; ctx.beginPath(); ctx.moveTo(stroke.points[0].x, stroke.points[0].y); for (let i = 1; i < stroke.points.length; i += 1) { const prev = stroke.points[i - 1]; const cur = stroke.points[i]; ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + cur.x) / 2, (prev.y + cur.y) / 2); } const last = stroke.points[stroke.points.length - 1]; ctx.lineTo(last.x, last.y); ctx.stroke(); ctx.restore(); };
  const drawText = (item) => { if (item.id === state.editingTextId) return; ctx.save(); ctx.font = fontFor(item); ctx.fillStyle = item.color || '#000'; ctx.textBaseline = 'top'; const lines = (item.text || '').split('\\n'); const lh = getLineHeight(item.size); lines.forEach((line, idx) => { ctx.fillText(line || ' ', item.x + 8, item.y + 4 + idx * lh); }); ctx.restore(); };
  const drawChip = (chip) => { ctx.save(); const width = chip.width || Math.max(220, (chip.label || '').length * 8 + 22); const height = chip.height || 40; const fontSize = Math.max(11, Math.min(22, height * 0.35)); ctx.font = fontSize + 'px Inter'; ctx.fillStyle = '#E8F5E9'; ctx.strokeStyle = '#2D6A4F'; roundRect(chip.x, chip.y, width, height, Math.min(10, height / 4)); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2D6A4F'; ctx.textBaseline = 'middle'; ctx.fillText(chip.label || '', chip.x + 10, chip.y + height / 2); ctx.restore(); };
  const imageCache = new Map();
  const drawImageItem = (item) => { let img = imageCache.get(item.id); if (!img) { img = new Image(); img.onload = render; img.src = item.dataUrl; imageCache.set(item.id, img); } if (img.complete) ctx.drawImage(img, item.x, item.y, item.width, item.height); };
  const textBox = (item) => { ctx.save(); ctx.font = fontFor(item); const lines = (item.text || ' ').split('\\n'); const measuredWidth = Math.max(40, ...lines.map((line) => ctx.measureText(line || ' ').width)); ctx.restore(); const lh = getLineHeight(item.size); return { x: item.x, y: item.y, w: item.width || measuredWidth + 16, h: item.height || Math.max(lh, lines.length * lh) + 8 }; };
  const selectionBox = () => { if (!state.selected) return null; const { type, id } = state.selected; if (type === 'text') { const item = state.texts.find((t) => t.id === id); return item ? textBox(item) : null; } if (type === 'image') { const item = state.images.find((i) => i.id === id); return item ? { x: item.x, y: item.y, w: item.width, h: item.height } : null; } if (type === 'chip') { const item = state.chips.find((c) => c.id === id); return item ? { x: item.x, y: item.y, w: item.width || Math.max(220, (item.label || '').length * 8 + 22), h: item.height || 40 } : null; } return null; };
  const drawSelection = () => { const box = selectionBox(); if (!box) { deleteBtn.style.display = 'none'; return; } ctx.save(); ctx.strokeStyle = '#2D6A4F'; ctx.setLineDash([5, 4]); ctx.strokeRect(box.x - 4, box.y - 4, box.w + 8, box.h + 8); ctx.setLineDash([]); ctx.fillStyle = '#2D6A4F'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(box.x + box.w + 6, box.y + box.h + 6, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); deleteBtn.style.display = 'flex'; deleteBtn.style.left = (box.x + box.w + 10) + 'px'; deleteBtn.style.top = Math.max(6, box.y - 16) + 'px'; };
  const drawPagePattern = (width, height) => { ctx.save(); ctx.strokeStyle = '#E0E0E0'; ctx.fillStyle = '#BDBDBD'; ctx.lineWidth = 1; if (state.pagePattern === 'lined') { for (let y = 28; y < height; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); } } if (state.pagePattern === 'grid') { for (let x = 28; x < width; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); } for (let y = 28; y < height; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); } } if (state.pagePattern === 'dotted') { for (let x = 14; x < width; x += 28) for (let y = 14; y < height; y += 28) { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); } } ctx.restore(); };
  const render = () => { const width = canvasEl.clientWidth || 1; const height = canvasEl.clientHeight || 1; ctx.clearRect(0, 0, width, height); ctx.save(); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); ctx.restore(); drawPagePattern(width, height); state.images.forEach(drawImageItem); state.chips.forEach(drawChip); state.strokes.forEach(drawStroke); if (state.drawing) drawStroke(state.drawing); state.texts.forEach(drawText); drawSelection(); };
  const hitBox = (p) => { for (let i = state.texts.length - 1; i >= 0; i -= 1) { const box = textBox(state.texts[i]); if (p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h) return { type: 'text', id: state.texts[i].id }; } for (let i = state.images.length - 1; i >= 0; i -= 1) { const item = state.images[i]; if (p.x >= item.x && p.x <= item.x + item.width && p.y >= item.y && p.y <= item.y + item.height) return { type: 'image', id: item.id }; } for (let i = state.chips.length - 1; i >= 0; i -= 1) { const item = state.chips[i]; const width = item.width || Math.max(220, (item.label || '').length * 8 + 22); const height = item.height || 40; if (p.x >= item.x && p.x <= item.x + width && p.y >= item.y && p.y <= item.y + height) return { type: 'chip', id: item.id }; } return null; };
  const resizeHit = (p) => { const box = selectionBox(); if (!box) return false; const hx = box.x + box.w + 6; const hy = box.y + box.h + 6; return Math.hypot(p.x - hx, p.y - hy) <= 18; };
  const selectedItem = () => { if (!state.selected) return null; const { type, id } = state.selected; if (type === 'text') return state.texts.find((item) => item.id === id); if (type === 'image') return state.images.find((item) => item.id === id); if (type === 'chip') return state.chips.find((item) => item.id === id); return null; };
  const moveSelected = (dx, dy) => { const item = selectedItem(); if (!item) return; item.x = Math.max(0, item.x + dx); item.y = Math.max(0, item.y + dy); };
  const resizeSelected = (startBox, p) => { const item = selectedItem(); if (!item || !startBox) return; const nextW = Math.max(42, p.x - startBox.x); const nextH = Math.max(30, p.y - startBox.y); if (state.selected.type === 'text') { const ratio = nextH / Math.max(1, startBox.h); item.size = Math.max(10, Math.min(72, Math.round((item.startSize || item.size || 20) * ratio))); item.width = nextW; item.height = nextH; return; } item.width = nextW; item.height = nextH; };
  const deleteSelected = () => { if (!state.selected) return; const { type, id } = state.selected; if (type === 'text') state.texts = state.texts.filter((item) => item.id !== id); if (type === 'image') state.images = state.images.filter((item) => item.id !== id); if (type === 'chip') state.chips = state.chips.filter((item) => item.id !== id); state.selected = null; saveHistory(); render(); };
  const hideEditor = (discard) => { if (!state.editingTextId) { editorEl.style.display = 'none'; return; } const item = state.texts.find((t) => t.id === state.editingTextId); if (item && !discard) { item.text = editorEl.value; item.width = editorEl.offsetWidth; item.height = editorEl.offsetHeight; if (!item.text.trim()) state.texts = state.texts.filter((t) => t.id !== item.id); saveHistory(); } state.editingTextId = null; editorEl.style.display = 'none'; send({ type: 'textEditing', active: false }); render(); };
  const editText = (item) => { state.editingTextId = item.id; state.selected = { type: 'text', id: item.id }; editorEl.value = item.text || ''; editorEl.style.left = item.x + 'px'; editorEl.style.top = item.y + 'px'; editorEl.style.font = fontFor(item); editorEl.style.color = item.color || '#000'; editorEl.style.lineHeight = getLineHeight(item.size) + 'px'; editorEl.style.width = Math.max(40, item.width || 40) + 'px'; editorEl.style.height = Math.max(28, item.height || 28) + 'px'; editorEl.style.display = 'block'; setTimeout(() => { editorEl.focus(); editorEl.setSelectionRange(editorEl.value.length, editorEl.value.length); }, 0); send({ type: 'textEditing', active: true }); render(); };
  const createText = (x, y) => { hideEditor(false); let snapY = y; const isLines = state.pagePattern === 'lined' || state.pagePattern === 'grid'; if (isLines) { snapY = Math.floor(y / 28) * 28 + 2; } const item = { id: uid('text'), x, y: snapY, text: '', size: state.textStyle.size, family: state.textStyle.family, weight: state.textStyle.weight, style: state.textStyle.style, color: state.textStyle.color, width: 40, height: 28 }; state.texts.push(item); editText(item); };
  const updateEditorSize = () => { editorEl.style.width = 'auto'; editorEl.style.height = 'auto'; editorEl.style.width = Math.max(40, editorEl.scrollWidth) + 'px'; editorEl.style.height = Math.max(28, editorEl.scrollHeight) + 'px'; };
  editorEl.addEventListener('input', updateEditorSize);
  editorEl.addEventListener('blur', () => hideEditor(false));
  deleteBtn.addEventListener('click', deleteSelected);
  const removeAt = (hit) => { state.selected = hit; deleteSelected(); };
  const down = (event) => { event.preventDefault(); const p = point(event); if (state.activeTool !== 'text') hideEditor(false); if (resizeHit(p)) { const item = selectedItem(); if (item) item.startSize = item.size; state.transform = { mode: 'resize', last: p, startBox: selectionBox() }; return; } const hit = hitBox(p); if (state.activeTool === 'text') { if (hit?.type === 'text') { const item = state.texts.find((t) => t.id === hit.id); if (item) editText(item); } else if (hit) { state.selected = hit; state.transform = { mode: 'move', last: p }; render(); } else { createText(p.x, p.y); } return; } if (state.activeTool === 'eraser' && state.eraserMode === 'stroke' && hit) { removeAt(hit); return; } if (hit) { state.selected = hit; state.transform = { mode: 'move', last: p }; render(); return; } state.selected = null; if (state.activeTool === 'pen' || state.activeTool === 'eraser') { const pen = presets[state.penType] || presets.ballpoint; state.drawing = { id: uid('stroke'), tool: state.activeTool, color: state.activeTool === 'eraser' ? '#000000' : state.penColor, width: state.activeTool === 'eraser' ? state.eraserSize : (state.penSize || pen.width), opacity: state.activeTool === 'eraser' ? 1 : pen.opacity, cap: pen.cap || 'round', join: pen.join || 'round', mode: state.activeTool === 'eraser' ? 'destination-out' : (pen.mode || 'source-over'), points: [p] }; } render(); };
  const move = (event) => { const p = point(event); if (state.transform) { event.preventDefault(); if (state.transform.mode === 'move') { moveSelected(p.x - state.transform.last.x, p.y - state.transform.last.y); state.transform.last = p; } else resizeSelected(state.transform.startBox, p); render(); return; } if (!state.drawing) return; event.preventDefault(); state.drawing.points.push(p); render(); };
  const up = (event) => { if (state.transform) { event.preventDefault(); const item = selectedItem(); if (item) delete item.startSize; state.transform = null; saveHistory(); render(); return; } if (!state.drawing) return; event.preventDefault(); if (state.drawing.points.length === 1) state.drawing.points.push({ x: state.drawing.points[0].x + 0.1, y: state.drawing.points[0].y + 0.1 }); state.strokes.push(state.drawing); state.drawing = null; saveHistory(); render(); };
  if (window.PointerEvent) {
    canvasEl.addEventListener('pointerdown', down);
    canvasEl.addEventListener('pointermove', move);
    canvasEl.addEventListener('pointerup', up);
    canvasEl.addEventListener('pointercancel', up);
  } else {
    canvasEl.addEventListener('touchstart', down, { passive: false });
    canvasEl.addEventListener('touchmove', move, { passive: false });
    canvasEl.addEventListener('touchend', up, { passive: false });
    canvasEl.addEventListener('mousedown', down);
    canvasEl.addEventListener('mousemove', move);
    canvasEl.addEventListener('mouseup', up);
  }
  const addImage = (dataUrl) => { const img = new Image(); img.onload = () => { const maxWidth = Math.min(300, canvasEl.clientWidth - 40); const scale = img.width > maxWidth ? maxWidth / img.width : 1; const item = { id: uid('image'), dataUrl, width: Math.max(40, img.width * scale), height: Math.max(40, img.height * scale) }; item.x = Math.max(20, (canvasEl.clientWidth - item.width) / 2); item.y = Math.max(20, (canvasEl.clientHeight - item.height) / 2); state.images.push(item); imageCache.set(item.id, img); state.selected = { type: 'image', id: item.id }; saveHistory(); render(); }; img.src = dataUrl; };
  const addPlaceChip = (label) => { const item = { id: uid('chip'), label, x: 80, y: 80, width: Math.max(220, label.length * 8 + 22), height: 40 }; state.chips.push(item); state.selected = { type: 'chip', id: item.id }; saveHistory(); render(); };
  const exportPng = () => { hideEditor(false); render(); return canvasEl.toDataURL('image/png'); };
  const handleMessage = (raw) => { try { const msg = typeof raw === 'string' ? JSON.parse(raw) : raw; if (msg.type === 'setTool') { if (msg.value === 'pen') state.activeTool = 'pen'; else if (msg.value === 'text') state.activeTool = 'text'; else if (msg.value === 'eraser') state.activeTool = 'eraser'; else if (msg.value === 'image') state.activeTool = 'image'; else if (msg.value === 'link') state.activeTool = 'link'; else if (presets[msg.value]) { state.activeTool = 'pen'; state.penType = msg.value; } else state.activeTool = 'pen'; if (msg.value !== 'text') send({ type: 'textEditing', active: false }); } if (msg.type === 'setPenType') { state.penType = msg.value; state.activeTool = 'pen'; } if (msg.type === 'setColor') { if (state.activeTool === 'text') { state.textStyle.color = msg.value; const activeText = state.texts.find((t) => state.selected?.type === 'text' && t.id === state.selected.id); if (activeText) { activeText.color = msg.value; saveHistory(); } } else state.penColor = msg.value; render(); } if (msg.type === 'setPenSize') state.penSize = Number(msg.value || 2); if (msg.type === 'setEraserSize') state.eraserSize = Number(msg.value || 16); if (msg.type === 'setEraserMode') state.eraserMode = msg.value || 'stroke'; if (msg.type === 'setTextStyle') { state.textStyle = { ...state.textStyle, ...(msg.value || {}) }; const activeText = state.texts.find((t) => state.selected?.type === 'text' && t.id === state.selected.id); if (activeText) { Object.assign(activeText, state.textStyle); if (state.editingTextId === activeText.id) editText(activeText); saveHistory(); render(); } } if (msg.type === 'setPagePattern') { const nextPattern = msg.value || 'plain'; if (state.pagePattern !== nextPattern) { applyPattern(nextPattern); saveHistory(); } } if (msg.type === 'addImage' && msg.dataUrl) addImage(msg.dataUrl); if (msg.type === 'addLinkedChip' && msg.label) addPlaceChip(msg.label); if (msg.type === 'deleteSelected') deleteSelected(); if (msg.type === 'undo') { if (state.historyIndex > 0) { state.historyIndex -= 1; loadHistoryAt(state.historyIndex); } } if (msg.type === 'redo') { if (state.historyIndex < state.historyStack.length - 1) { state.historyIndex += 1; loadHistoryAt(state.historyIndex); } } if (msg.type === 'requestSave') send({ type: 'save', entryId, json: cloneBoard() }); if (msg.type === 'exportPng') send({ type: 'exportPng', png: exportPng() }); } catch (e) { send({ type: 'error', message: e.message || 'Defter hatasi' }); } };
  window.__fromNative = handleMessage; window.addEventListener('message', (e) => handleMessage(e.data)); document.addEventListener('message', (e) => handleMessage(e.data));
  const normalizedInitial = initial && initial.appVersion === 2 ? initial : null; if (normalizedInitial) restoreBoard(normalizedInitial); else applyPattern('plain'); saveHistory(); resizeCanvas(); window.addEventListener('resize', resizeCanvas);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { const kb = window.innerHeight - window.visualViewport.height; wrapEl.style.paddingBottom = kb > 80 ? (kb + 16) + 'px' : '0px'; if (state.editingTextId) { const item = state.texts.find((t) => t.id === state.editingTextId); if (item) wrapEl.scrollTop = Math.max(0, item.y - 120); } });
})();
</script>
</body>
</html>
`;

const PEN_DEFAULTS = {
    pencil: { size: 2, opacity: 0.72 },
    fineliner: { size: 3, opacity: 1 },
    ballpoint: { size: 2, opacity: 1 },
    marker: { size: 6, opacity: 1 },
    brush: { size: 8, opacity: 1 },
    calligraphy: { size: 10, opacity: 0.95 },
    highlighter: { size: 18, opacity: 0.35 },
};

const JournalPage = ({ navigation }) => {
    const { user } = useAuth();
    const { theme } = useThemePreference();
    const webRef = useRef(null);
    const [books, setBooks] = useState([]);
    const [activeBookId, setActiveBookId] = useState(null);
    const [entries, setEntries] = useState([]);
    const [activeEntryId, setActiveEntryId] = useState(null);
    const [title, setTitle] = useState('Yeni Hatira');
    const [dateInput, setDateInput] = useState(new Date().toISOString().slice(0, 10));
    const [tripLabel, setTripLabel] = useState('');
    const [entryCanvas, setEntryCanvas] = useState(null);
    const [webKey, setWebKey] = useState(1);
    const [canvasZoom, setCanvasZoom] = useState(1);

    const [activeTool, setActiveTool] = useState('pen');
    const [penType, setPenType] = useState('ballpoint');
    const [penColor, setPenColor] = useState('#000000');
    const [textColor, setTextColor] = useState('#000000');
    const [customHex, setCustomHex] = useState('#2D6A4F');
    const [showCustomColor, setShowCustomColor] = useState(false);
    const [panel, setPanel] = useState(null);
    const [penSize, setPenSize] = useState(2);
    const [eraserSize, setEraserSize] = useState(16);
    const [eraserMode, setEraserMode] = useState('stroke');
    const [textSize, setTextSize] = useState(20);
    const [textFamily, setTextFamily] = useState('inter');
    const [textBold, setTextBold] = useState(false);
    const [textItalic, setTextItalic] = useState(false);
    const [pagePattern, setPagePattern] = useState('plain');

    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [saving, setSaving] = useState(false);

    const [entriesModalVisible, setEntriesModalVisible] = useState(false);
    const [bookModalVisible, setBookModalVisible] = useState(false);
    const [newBookTitle, setNewBookTitle] = useState('');
    const [placesModalVisible, setPlacesModalVisible] = useState(false);
    const [penModalVisible, setPenModalVisible] = useState(false);
    const [tripLinks, setTripLinks] = useState([]);

    const activeEntry = useMemo(() => entries.find((entry) => entry.id === activeEntryId) || null, [entries, activeEntryId]);
    const activeBook = useMemo(() => books.find((book) => book.id === activeBookId) || null, [books, activeBookId]);
    const activePageIndex = useMemo(() => Math.max(0, entries.findIndex((entry) => entry.id === activeEntryId)), [entries, activeEntryId]);

    const postToBoard = useCallback((payload) => {
        const json = JSON.stringify(payload);
        const encoded = JSON.stringify(json);
        webRef.current?.injectJavaScript(`
            (function(){ 
                try { 
                    var msg = ${encoded};
                    if (window.__fromNative) window.__fromNative(msg);
                    else window.dispatchEvent(new MessageEvent('message',{data: msg}));
                } catch(e){}
            })();
            true;
        `);
    }, []);

    const applyToolSettings = useCallback(() => {
        postToBoard({ type: 'setPenType', value: penType });
        postToBoard({ type: 'setTool', value: activeTool === 'pen' ? penType : (activeTool === 'eraser' ? 'eraser' : activeTool) });
        postToBoard({ type: 'setColor', value: activeTool === 'text' ? textColor : penColor });
        postToBoard({ type: 'setPenSize', value: penSize });
        postToBoard({ type: 'setEraserSize', value: eraserSize });
        postToBoard({ type: 'setEraserMode', value: eraserMode });
        postToBoard({ type: 'setPagePattern', value: pagePattern });
        postToBoard({
            type: 'setTextStyle',
            value: {
                size: textSize,
                family: textFamily,
                color: textColor,
                weight: textBold ? 'bold' : 'normal',
                style: textItalic ? 'italic' : 'normal',
            },
        });
    }, [postToBoard, penType, activeTool, textColor, penColor, penSize, eraserSize, eraserMode, pagePattern, textSize, textFamily, textBold, textItalic]);

    const loadJournal = useCallback(async () => {
        const storedBooks = await getJournalBooks(user?.id);
        if (storedBooks.length) {
            const book = storedBooks[0];
            const pages = book.pages || [];
            const page = pages[0];
            setBooks(storedBooks);
            setActiveBookId(book.id);
            setEntries(pages);
            setActiveEntryId(page?.id || null);
            setTitle(page?.title || 'Sayfa 1');
            setDateInput((page?.date || new Date().toISOString()).slice(0, 10));
            setTripLabel(page?.tripLabel || '');
            
            let loadedCanvas = null;
            if (page?.canvasStatePath) {
                try {
                    const str = await FileSystem.readAsStringAsync(page.canvasStatePath);
                    loadedCanvas = JSON.parse(str);
                } catch (e) {}
            } else if (page?.canvasState) {
                loadedCanvas = page.canvasState;
            }
            setEntryCanvas(loadedCanvas);
            setNewBookTitle('');
        } else {
            const freshBook = createJournalBook('');
            const firstPage = freshBook.pages[0];
            setBooks([freshBook]);
            setActiveBookId(freshBook.id);
            setEntries(freshBook.pages);
            setActiveEntryId(firstPage.id);
            setTitle(firstPage.title);
            setDateInput((firstPage.date || new Date().toISOString()).slice(0, 10));
            setTripLabel('');
            setEntryCanvas(null);
            setNewBookTitle('');
            await saveJournalBooks(user?.id, [freshBook]);
        }
    }, [user?.id]);

    const loadTrips = useCallback(async () => {
        const { data } = await getItinerariesByUser(user?.id);
        const itineraries = data || [];
        const details = await Promise.all(
            itineraries.slice(0, 25).map(async (itinerary) => {
                const { data: detail } = await getItineraryById(itinerary.id);
                const places = (detail?.itinerary_items || [])
                    .map((item) => item?.places?.name)
                    .filter(Boolean);
                return {
                    itineraryId: itinerary.id,
                    cityName: itinerary?.cities?.name || 'Sehir',
                    date: itinerary.created_at,
                    places: Array.from(new Set(places)),
                };
            })
        );
        setTripLinks(details);
    }, [user?.id]);

    useFocusEffect(useCallback(() => {
        loadJournal();
        loadTrips();
    }, [loadJournal, loadTrips]));

    useEffect(() => {
        if (!activeEntryId) return;
        setWebKey((v) => v + 1);
    }, [activeEntryId]);

    useEffect(() => {
        if (!activeEntryId) return;
        const timer = setInterval(() => postToBoard({ type: 'requestSave' }), 20000);
        return () => clearInterval(timer);
    }, [activeEntryId, postToBoard]);

    const persistBooks = async (nextBooks) => {
        setBooks(nextBooks);
        await saveJournalBooks(user?.id, nextBooks).catch(console.error);
    };

    const persistEntries = async (nextEntries) => {
        setEntries(nextEntries);
        setBooks((prevBooks) => {
            const nextBooks = prevBooks.map((book) => (
                book.id === activeBookId
                    ? { ...book, pages: nextEntries, updatedAt: new Date().toISOString() }
                    : book
            ));
            saveJournalBooks(user?.id, nextBooks).catch(console.error);
            return nextBooks;
        });
    };

    const saveMeta = async () => {
        if (!activeEntry) return;
        const next = entries.map((entry) => (
            entry.id === activeEntry.id
                ? { ...entry, title: title || 'Yeni Hatira', date: new Date(dateInput).toISOString(), tripLabel }
                : entry
        ));
        await persistEntries(next);
    };

    const handleBoardMessage = async (event) => {
        try {
            const payload = JSON.parse(event.nativeEvent.data);
            if (payload.type === 'history') {
                setCanUndo(Boolean(payload.canUndo));
                setCanRedo(Boolean(payload.canRedo));
                return;
            }
            if (payload.type === 'save' && payload.entryId) {
                setSaving(true);
                
                let fileUri = null;
                if (payload.json) {
                    fileUri = `${FileSystem.documentDirectory}canvas_${payload.entryId}.json`;
                    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload.json)).catch((e) => console.log('FS error:', e));
                }

                setEntries((prevEntries) => {
                    const next = prevEntries.map((entry) => (
                        entry.id === payload.entryId
                            ? {
                                ...entry,
                                title: title || 'Yeni Hatıra',
                                date: new Date(dateInput).toISOString(),
                                tripLabel,
                                canvasStatePath: fileUri || entry.canvasStatePath || null,
                                canvasState: null,
                                thumbnail: null,
                                updatedAt: new Date().toISOString(),
                            }
                            : entry
                    ));
                    
                    setBooks((prevBooks) => {
                        const nextBooks = prevBooks.map((book) => {
                            if (book.pages && book.pages.some(p => p.id === payload.entryId)) {
                                return { ...book, pages: next, updatedAt: new Date().toISOString() };
                            }
                            return book;
                        });
                        saveJournalBooks(user?.id, nextBooks).catch(() => {});
                        return nextBooks;
                    });
                    
                    return next;
                });

                setSaving(false);
                return;
            }
            if (payload.type === 'exportPng' && payload.png) {
                const base64 = payload.png.replace(/^data:image\/png;base64,/, '');
                const filePath = `${FileSystem.cacheDirectory}hatira-${Date.now()}.png`;
                await FileSystem.writeAsStringAsync(filePath, base64, { encoding: FileSystem.EncodingType.Base64 });
                await Sharing.shareAsync(filePath);
                return;
            }
            if (payload.type === 'error') {
                console.warn('Journal board error:', payload.message);
                return;
            }
        } catch (error) {
            setSaving(false);
        }
    };

    const createEntry = async () => {
        const fresh = createJournalPage(entries.length + 1);
        const next = [...entries, fresh];
        await persistEntries(next);
        setActiveEntryId(fresh.id);
        setTitle(fresh.title);
        setDateInput((fresh.date || new Date().toISOString()).slice(0, 10));
        setTripLabel('');
        setEntryCanvas(null);
        setEntriesModalVisible(false);
    };

    const createBook = async () => {
        const trimmedTitle = newBookTitle.trim();
        if (!trimmedTitle) {
            Alert.alert('Defter adı gerekli', 'Yeni defter oluşturmadan önce bir isim yaz.');
            return;
        }
        const freshBook = createJournalBook(trimmedTitle);
        const nextBooks = [freshBook, ...books];
        await persistBooks(nextBooks);
        setActiveBookId(freshBook.id);
        setEntries(freshBook.pages);
        setActiveEntryId(freshBook.pages[0].id);
        setTitle(freshBook.pages[0].title);
        setDateInput((freshBook.pages[0].date || new Date().toISOString()).slice(0, 10));
        setTripLabel('');
        setEntryCanvas(null);
        setNewBookTitle('');
        setBookModalVisible(false);
        setEntriesModalVisible(false);
    };

    const selectBook = (bookId) => {
        const book = books.find((item) => item.id === bookId);
        if (!book) return;
        const firstPage = book.pages?.[0] || createJournalPage(1);
        setActiveBookId(book.id);
        setEntries(book.pages?.length ? book.pages : [firstPage]);
        setActiveEntryId(firstPage.id);
        setTitle(firstPage.title || 'Sayfa 1');
        setDateInput((firstPage.date || new Date().toISOString()).slice(0, 10));
        setTripLabel(firstPage.tripLabel || '');
        
        const loadCanvas = async () => {
            let loadedCanvas = null;
            if (firstPage?.canvasStatePath) {
                try {
                    const str = await FileSystem.readAsStringAsync(firstPage.canvasStatePath);
                    loadedCanvas = JSON.parse(str);
                } catch (e) {}
            } else if (firstPage?.canvasState) {
                loadedCanvas = firstPage.canvasState;
            }
            setEntryCanvas(loadedCanvas);
        };
        loadCanvas();
        setNewBookTitle(book.title || '');
        setEntriesModalVisible(false);
    };

    const selectEntry = (entryId) => {
        const entry = entries.find((item) => item.id === entryId);
        if (!entry) return;
        setActiveEntryId(entry.id);
        setTitle(entry.title || 'Yeni Hatira');
        setDateInput((entry.date || new Date().toISOString()).slice(0, 10));
        setTripLabel(entry.tripLabel || '');
        
        const loadCanvas = async () => {
            let loadedCanvas = null;
            if (entry?.canvasStatePath) {
                try {
                    const str = await FileSystem.readAsStringAsync(entry.canvasStatePath);
                    loadedCanvas = JSON.parse(str);
                } catch (e) {}
            } else if (entry?.canvasState) {
                loadedCanvas = entry.canvasState;
            }
            setEntryCanvas(loadedCanvas);
        };
        loadCanvas();
        setEntriesModalVisible(false);
    };

    const goToRelativePage = (direction) => {
        if (!entries.length) return;
        const nextIndex = activePageIndex + direction;
        if (nextIndex < 0 || nextIndex >= entries.length) return;
        postToBoard({ type: 'requestSave' });
        setTimeout(() => {
            selectEntry(entries[nextIndex].id);
        }, 150);
    };

    const adjustZoom = (delta) => {
        setCanvasZoom((prev) => Math.max(0.75, Math.min(1.8, Number((prev + delta).toFixed(2)))));
    };

    const deleteEntry = (entryId) => {
        if (entries.length <= 1) {
            Alert.alert('Uyari', 'En az bir kayit kalmali.');
            return;
        }
        Alert.alert('Kayit silinsin mi?', 'Bu islem geri alinamaz.', [
            { text: 'Iptal', style: 'cancel' },
            {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                    const next = entries.filter((entry) => entry.id !== entryId);
                    await persistEntries(next);
                    selectEntry(next[0].id);
                },
            },
        ]);
    };

    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') {
            Alert.alert('Izin Gerekli', 'Resim eklemek icin galeri izni gerekli.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.9,
        });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        const uri = result.assets[0].uri;
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const ext = (uri.split('.').pop() || 'jpeg').toLowerCase();
        postToBoard({ type: 'addImage', dataUrl: `data:image/${ext};base64,${base64}` });
    };

    const addPlaceChip = (option) => {
        const label = `📍 ${option.placeName} — ${option.cityName}`;
        setTripLabel(`${option.cityName} - ${option.placeName}`);
        postToBoard({ type: 'addLinkedChip', label });
        setPlacesModalVisible(false);
    };

    const linkOptions = useMemo(() => {
        const options = [];
        tripLinks.forEach((trip) => {
            if (trip.places.length) {
                trip.places.forEach((placeName) => options.push({ ...trip, placeName }));
            } else {
                options.push({ ...trip, placeName: 'Gezi Noktasi' });
            }
        });
        return options;
    }, [tripLinks]);

    const choosePenType = (pen) => {
        setPenType(pen.key);
        setPenSize(pen.width);
        setActiveTool('pen');
        setPenModalVisible(false);
        setPanel('size');
        postToBoard({ type: 'setPenType', value: pen.key });
        postToBoard({ type: 'setTool', value: pen.key });
        postToBoard({ type: 'setPenSize', value: pen.width });
    };

    const setTextTool = () => {
        setActiveTool('text');
        setPanel('text');
        postToBoard({ type: 'setTool', value: 'text' });
    };

    const setPenTool = () => {
        setActiveTool('pen');
        setPenModalVisible(true);
        postToBoard({ type: 'setTool', value: penType });
    };

    const setEraserTool = () => {
        setActiveTool('eraser');
        setPanel('size');
        postToBoard({ type: 'setTool', value: 'eraser' });
    };

    const setColor = (color) => {
        if (activeTool === 'text') setTextColor(color);
        else setPenColor(color);
        postToBoard({ type: 'setColor', value: color });
    };

    const applyCustomHex = () => {
        if (!/^#[0-9A-Fa-f]{6}$/.test(customHex.trim())) {
            Alert.alert('Gecersiz renk', 'Lutfen #RRGGBB formatini kullan.');
            return;
        }
        setColor(customHex.trim());
        setShowCustomColor(false);
    };

    useEffect(() => { applyToolSettings(); }, [applyToolSettings, webKey]);

    const handleBack = () => {
        postToBoard({ type: 'requestSave' });
        setTimeout(() => {
            navigation?.goBack?.();
        }, 150);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.topBar, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity style={[styles.headerIcon, { backgroundColor: theme.colors.surfaceSoft }]} onPress={handleBack} activeOpacity={0.8}>
                    <Ionicons name="arrow-back" size={23} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.topTitleWrap}>
                    <Text style={[styles.topTitle, { color: theme.colors.text }]}>Hatira Defteri</Text>
                    <Text style={[styles.topSubTitle, { color: theme.colors.textSecondary }]}>Sayfalar, notlar ve cizimler</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={[styles.headerIcon, { backgroundColor: theme.colors.surfaceSoft }]} onPress={() => setEntriesModalVisible(true)} activeOpacity={0.8}>
                        <Ionicons name="albums-outline" size={21} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.pageStrip, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                <TouchableOpacity style={styles.pageInfo} onPress={() => setEntriesModalVisible(true)} activeOpacity={0.85}>
                    <View style={styles.pageTitleWrap}>
                        <Text style={[styles.pageTitle, { color: theme.colors.text }]} numberOfLines={1}>{activeBook?.title || 'Hatıra Defteri'}</Text>
                        <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
                    </View>
                    <Text style={[styles.pageMeta, { color: theme.colors.textSecondary }]}>Sayfa {activePageIndex + 1} / {Math.max(entries.length, 1)} • {title || 'Sayfa'}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.addPageBtn, { backgroundColor: theme.colors.pill }]} onPress={createEntry} activeOpacity={0.85}>
                    <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} />
                    <Text style={[styles.addPageBtnTxt, { color: theme.colors.primary }]}>Yeni Sayfa</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.toolbarWrap}>
                <JournalToolbar
                    activeTool={activeTool}
                    penIcon={PEN_TYPES.find((p) => p.key === penType)?.icon || 'create-outline'}
                    panel={panel}
                    penColor={penColor}
                    textColor={textColor}
                    customHex={customHex}
                    showCustomColor={showCustomColor}
                    penSize={penSize}
                    eraserSize={eraserSize}
                    textSize={textSize}
                    textFontFamily={textFamily}
                    textBold={textBold}
                    textItalic={textItalic}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onPenPress={setPenTool}
                    onTextPress={setTextTool}
                    onImagePress={pickImage}
                    onLinkPress={() => setPlacesModalVisible(true)}
                    onEraserPress={setEraserTool}
                    onUndo={() => postToBoard({ type: 'undo' })}
                    onRedo={() => postToBoard({ type: 'redo' })}
                    pagePattern={pagePattern}
                    onMorePress={() => setPanel((v) => (v === 'more' ? null : 'more'))}
                    onToggleColorPanel={() => setPanel((v) => (v === 'color' ? null : 'color'))}
                    onToggleSizePanel={() => setPanel((v) => (v === 'size' ? null : 'size'))}
                    onToggleTextPanel={() => setPanel((v) => (v === 'text' ? null : 'text'))}
                    onColorSelect={setColor}
                    onCustomHexChange={setCustomHex}
                    onApplyCustomHex={applyCustomHex}
                    onToggleCustomColor={() => setShowCustomColor((v) => !v)}
                    onPenSizeChange={(v) => { setPenSize(v); postToBoard({ type: 'setPenSize', value: v }); }}
                    onEraserSizeChange={(v) => { setEraserSize(v); postToBoard({ type: 'setEraserSize', value: v }); }}
                    onTextSizeChange={(v) => {
                        setTextSize(v);
                        postToBoard({ type: 'setTextStyle', value: { size: v, family: textFamily, color: textColor, weight: textBold ? 'bold' : 'normal', style: textItalic ? 'italic' : 'normal' } });
                    }}
                    onTextFamilyChange={(family) => {
                        setTextFamily(family);
                        postToBoard({ type: 'setTextStyle', value: { size: textSize, family, color: textColor, weight: textBold ? 'bold' : 'normal', style: textItalic ? 'italic' : 'normal' } });
                    }}
                    onTextStyleToggle={(kind) => {
                        if (kind === 'bold') setTextBold((v) => !v);
                        else setTextItalic((v) => !v);
                        postToBoard({
                            type: 'setTextStyle',
                            value: {
                                size: textSize,
                                family: textFamily,
                                color: textColor,
                                weight: kind === 'bold' ? (!textBold ? 'bold' : 'normal') : (textBold ? 'bold' : 'normal'),
                                style: kind === 'italic' ? (!textItalic ? 'italic' : 'normal') : (textItalic ? 'italic' : 'normal'),
                            },
                        });
                    }}
                    onPagePatternChange={(value) => {
                        setPagePattern(value);
                        postToBoard({ type: 'setPagePattern', value });
                    }}
                    onDeleteSelected={() => postToBoard({ type: 'deleteSelected' })}
                    onSave={() => postToBoard({ type: 'requestSave' })}
                    onExport={() => postToBoard({ type: 'exportPng' })}
                />
            </View>

            <View style={[styles.canvasWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <TouchableOpacity style={[styles.sideArrow, styles.sideArrowLeft, activePageIndex === 0 && styles.sideArrowDisabled]} onPress={() => goToRelativePage(-1)} disabled={activePageIndex === 0} activeOpacity={0.85}>
                    <Ionicons name="chevron-back" size={18} color={activePageIndex === 0 ? theme.colors.textSecondary : theme.colors.text} />
                </TouchableOpacity>
                <View style={styles.webViewport}>
                    <View style={[styles.webScaleWrap, { transform: [{ scale: canvasZoom }] }]}>
                        <WebView
                            key={webKey}
                            ref={webRef}
                            source={{ html: buildFabricHtml(entryCanvas ? JSON.stringify(entryCanvas) : 'null', activeEntryId, theme.colors.background) }}
                            originWhitelist={['*']}
                            onMessage={handleBoardMessage}
                            onLoadEnd={applyToolSettings}
                            style={styles.web}
                            javaScriptEnabled
                            domStorageEnabled
                            scrollEnabled={false}
                            keyboardDisplayRequiresUserAction={false}
                            androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
                        />
                    </View>
                </View>
                <TouchableOpacity style={[styles.sideArrow, styles.sideArrowRight, activePageIndex >= entries.length - 1 && styles.sideArrowDisabled]} onPress={() => goToRelativePage(1)} disabled={activePageIndex >= entries.length - 1} activeOpacity={0.85}>
                    <Ionicons name="chevron-forward" size={18} color={activePageIndex >= entries.length - 1 ? theme.colors.textSecondary : theme.colors.text} />
                </TouchableOpacity>
                <View style={[styles.zoomDock, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <TouchableOpacity style={styles.zoomBtn} onPress={() => adjustZoom(-0.1)} activeOpacity={0.85}>
                        <Ionicons name="remove" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.zoomLabel, { color: theme.colors.text }]}>%{Math.round(canvasZoom * 100)}</Text>
                    <TouchableOpacity style={styles.zoomBtn} onPress={() => adjustZoom(0.1)} activeOpacity={0.85}>
                        <Ionicons name="add" size={16} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {saving ? <Text style={styles.savingTxt}>Kaydediliyor...</Text> : null}

            <Modal visible={penModalVisible} transparent animationType="slide" onRequestClose={() => setPenModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setPenModalVisible(false)}>
                    <Pressable style={styles.bottomSheet} onPress={(event) => event.stopPropagation()}>
                        <View style={styles.dragHandle} />
                        {PEN_TYPES.map((pen) => (
                            <TouchableOpacity key={pen.key} style={styles.penRow} onPress={() => choosePenType(pen)}>
                                <View style={styles.penRowLeft}>
                                    <View style={styles.penIconWrap}>
                                        <Ionicons name={pen.icon} size={18} color={COLORS.primaryDark} />
                                    </View>
                                    <View>
                                        <Text style={styles.penRowTitle}>{pen.label}</Text>
                                        <Text style={styles.penRowSub}>{pen.subtitle}</Text>
                                    </View>
                                </View>
                                <View style={styles.penPreviewWrap}>
                                    <View style={[styles.penPreviewLine, { height: Math.max(2, Math.min(10, pen.width)), opacity: pen.opacity }]} />
                                </View>
                                {penType === pen.key ? <Ionicons name="checkmark-circle" size={18} color={COLORS.primaryDark} /> : null}
                            </TouchableOpacity>
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={placesModalVisible} transparent animationType="slide" onRequestClose={() => setPlacesModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setPlacesModalVisible(false)}>
                    <Pressable style={styles.bottomSheet} onPress={(event) => event.stopPropagation()}>
                        <View style={styles.dragHandle} />
                        <Text style={styles.sheetTitle}>Yer Ekle</Text>
                        <ScrollView contentContainerStyle={styles.sheetList}>
                            {linkOptions.map((option) => (
                                <TouchableOpacity
                                    key={`${option.itineraryId}-${option.placeName}`}
                                    style={styles.linkItem}
                                    onPress={() => addPlaceChip(option)}
                                >
                                    <Text style={styles.linkItemTitle}>{option.cityName}</Text>
                                    <Text style={styles.linkItemSub}>📍 {option.placeName}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={entriesModalVisible} transparent animationType="fade" onRequestClose={() => setEntriesModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setEntriesModalVisible(false)}>
                    <Pressable style={[styles.libraryScreen, { backgroundColor: theme.colors.background }]} onPress={(event) => event.stopPropagation()}>
                        <View style={styles.recordsHeader}>
                            <Text style={styles.sheetTitle}>Defterlerim</Text>
                            <View style={styles.recordsActions}>
                                <TouchableOpacity style={styles.newBtn} onPress={() => { setEntriesModalVisible(false); setNewBookTitle(''); setBookModalVisible(true); }}>
                                    <Text style={styles.newBtnTxt}>+ Defter</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.newBtn} onPress={createEntry}>
                                    <Text style={styles.newBtnTxt}>+ Sayfa</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.libraryContent}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookList}>
                            {books.map((book) => (
                                <TouchableOpacity key={book.id} style={[styles.bookCard, activeBookId === book.id && styles.bookCardActive]} onPress={() => selectBook(book.id)} activeOpacity={0.85}>
                                    <Text numberOfLines={1} style={styles.bookCardTitle}>{book.title}</Text>
                                    <Text style={styles.bookCardMeta}>{(book.pages || []).length} sayfa</Text>
                                    <Text style={styles.bookCardMeta}>{formatDate(book.createdAt || book.updatedAt)}</Text>
                                </TouchableOpacity>
                            ))}
                            </ScrollView>
                            <View style={[styles.activeBookPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                                <View style={styles.metaInputs}>
                                    <TextInput
                                        value={activeBook?.title || newBookTitle}
                                        onChangeText={(value) => {
                                            setNewBookTitle(value);
                                            if (!activeBook) return;
                                            const nextBooks = books.map((book) => book.id === activeBook.id ? { ...book, title: value, updatedAt: new Date().toISOString() } : book);
                                            setBooks(nextBooks);
                                        }}
                                        onBlur={async () => {
                                            if (!activeBook) return;
                                            const nextBooks = books.map((book) => book.id === activeBook.id ? { ...book, title: newBookTitle || book.title } : book);
                                            await persistBooks(nextBooks);
                                        }}
                                        placeholder="Defter adı"
                                        placeholderTextColor={COLORS.textLight}
                                        style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                                    />
                                </View>
                                <View style={styles.recordsHeader}>
                                    <Text style={styles.subSheetTitle}>Sayfalar</Text>
                                    <TouchableOpacity style={styles.newBtn} onPress={createEntry}>
                                        <Text style={styles.newBtnTxt}>+ Sayfa</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.metaInputs}>
                                    <TextInput value={title} onChangeText={setTitle} onBlur={saveMeta} placeholder="Sayfa basligi" placeholderTextColor={COLORS.textLight} style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]} />
                                    <TextInput value={dateInput} onChangeText={setDateInput} onBlur={saveMeta} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textLight} style={[styles.input, { width: 120, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]} />
                                </View>
                                <JournalSidebar
                                    entries={entries}
                                    activeEntryId={activeEntryId}
                                    onSelectEntry={selectEntry}
                                    onCreateEntry={createEntry}
                                    onDeleteEntry={deleteEntry}
                                />
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={bookModalVisible} transparent animationType="fade" onRequestClose={() => setBookModalVisible(false)}>
                <Pressable style={styles.centeredOverlay} onPress={() => setBookModalVisible(false)}>
                    <Pressable style={[styles.popupCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={(event) => event.stopPropagation()}>
                        <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>Yeni Defter</Text>
                        <Text style={[styles.popupHint, { color: theme.colors.textSecondary }]}>Yeni hatıra defterin için kısa ve karakterli bir isim belirle.</Text>
                        <TextInput
                            value={newBookTitle}
                            onChangeText={setNewBookTitle}
                            placeholder="Defterin adı"
                            placeholderTextColor={COLORS.textLight}
                            style={[styles.input, styles.popupInput, { backgroundColor: theme.colors.surfaceSoft, borderColor: theme.colors.border, color: theme.colors.text }]}
                            autoFocus
                        />
                        <View style={styles.popupActions}>
                            <TouchableOpacity style={[styles.popupSecondaryBtn, { backgroundColor: theme.colors.surfaceSoft }]} onPress={() => setBookModalVisible(false)}>
                                <Text style={[styles.popupSecondaryTxt, { color: theme.colors.textSecondary }]}>Vazgeç</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryActionBtn, { backgroundColor: theme.colors.primary }, !newBookTitle.trim() && styles.primaryActionBtnDisabled]} onPress={createBook} disabled={!newBookTitle.trim()}>
                                <Text style={[styles.primaryActionTxt, { color: '#ffffff' }]}>Oluştur</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingTop: Platform.OS === 'ios' ? 14 : 8,
        paddingBottom: 10,
        borderBottomWidth: 1,
    },
    headerIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addHeaderIcon: { backgroundColor: COLORS.primaryDark },
    topTitleWrap: { flex: 1, marginHorizontal: 12 },
    topTitle: { fontFamily: FONTS.heading, fontSize: FONT_SIZES.lg },
    topSubTitle: { marginTop: 2, fontFamily: FONTS.body, fontSize: 12 },
    pageStrip: {
        marginHorizontal: SPACING.md,
        marginTop: 10,
        marginBottom: 8,
        minHeight: 56,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    pageInfo: { flex: 1, alignItems: 'flex-start', paddingRight: 8 },
    pageTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pageTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 16 },
    pageMeta: { marginTop: 2, fontFamily: FONTS.body, fontSize: 12 },
    addPageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
    },
    addPageBtnTxt: { fontFamily: FONTS.bodySemiBold, fontSize: 13 },
    toolbarWrap: { marginHorizontal: SPACING.md, marginBottom: 8 },
    canvasWrap: { flex: 1, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: 28, overflow: 'hidden', shadowColor: '#10211A', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 22, elevation: 4, position: 'relative', borderWidth: 1 },
    webViewport: { flex: 1, overflow: 'hidden' },
    webScaleWrap: { flex: 1 },
    web: { flex: 1, backgroundColor: COLORS.surface },
    sideArrow: { position: 'absolute', top: '50%', marginTop: -22, width: 40, height: 44, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', zIndex: 5, borderWidth: 1, borderColor: '#D7E5DE' },
    sideArrowLeft: { left: 10 },
    sideArrowRight: { right: 10 },
    sideArrowDisabled: { opacity: 0.45 },
    zoomDock: { position: 'absolute', right: 14, bottom: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 1, borderColor: '#D7E5DE', paddingHorizontal: 8, paddingVertical: 8, alignItems: 'center', gap: 6, zIndex: 5 },
    zoomBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAF9', borderWidth: 1, borderColor: '#E5E7EB' },
    zoomLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 11, color: COLORS.textPrimary },
    savingTxt: { position: 'absolute', right: SPACING.md, bottom: SPACING.lg, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, fontFamily: FONTS.body, fontSize: 11, color: COLORS.textSecondary },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
    centeredOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.overlay, paddingHorizontal: SPACING.lg },
    bottomSheet: { maxHeight: '75%', backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, paddingTop: 8 },
    popupCard: { width: '100%', maxWidth: 420, borderRadius: 28, padding: SPACING.md, borderWidth: 1, shadowColor: '#10211A', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.12, shadowRadius: 28, elevation: 8 },
    dragHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: SPACING.sm },
    sheetTitle: { fontFamily: FONTS.heading, fontSize: FONT_SIZES.lg, color: COLORS.textPrimary, marginBottom: SPACING.sm },
    penRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: SPACING.sm, marginBottom: SPACING.xs, gap: 10 },
    penRowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    penIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryMuted },
    penRowTitle: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
    penRowSub: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
    penPreviewWrap: { flex: 1, height: 26, justifyContent: 'center', paddingHorizontal: 8 },
    penPreviewLine: { width: '100%', borderRadius: 999, backgroundColor: '#111827' },
    sheetList: { gap: SPACING.xs, paddingBottom: SPACING.sm },
    linkItem: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceAlt, padding: SPACING.sm },
    linkItemTitle: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
    linkItemSub: { fontFamily: FONTS.body, fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
    recordsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xs },
    recordsActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    subSheetTitle: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, marginBottom: 0 },
    libraryScreen: { flex: 1, marginTop: Platform.OS === 'ios' ? 54 : 22, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
    libraryContent: { paddingBottom: SPACING.xl },
    bookList: { gap: SPACING.sm, paddingBottom: SPACING.sm },
    activeBookPanel: { borderRadius: 24, borderWidth: 1, padding: SPACING.sm, shadowColor: '#10211A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 },
    bookCard: { width: 180, borderRadius: 18, borderWidth: 1, borderColor: '#D7E5DE', backgroundColor: '#F8FAF9', padding: 14 },
    bookCardActive: { borderColor: COLORS.primaryDark, backgroundColor: '#FFFFFF' },
    bookCardTitle: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
    bookCardMeta: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
    newBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.primaryMuted },
    newBtnTxt: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.xs, color: COLORS.primaryDark },
    metaInputs: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
    input: { flex: 1, borderWidth: 1, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 13, fontFamily: FONTS.body, fontSize: FONT_SIZES.sm },
    popupHint: { marginBottom: 16, fontFamily: FONTS.body, fontSize: 14, lineHeight: 22 },
    popupInput: { marginTop: 2, borderRadius: 16 },
    primaryActionBtn: { flex: 1, borderRadius: 16, alignItems: 'center', paddingVertical: 14 },
    primaryActionBtnDisabled: { opacity: 0.45 },
    primaryActionTxt: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm },
    popupActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
    popupSecondaryBtn: { flex: 1, borderRadius: 16, alignItems: 'center', paddingVertical: 14 },
    popupSecondaryTxt: { fontFamily: FONTS.bodySemiBold, fontSize: FONT_SIZES.sm },
});

export default JournalPage;
