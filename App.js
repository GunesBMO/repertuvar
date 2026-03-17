import React, { useState, useEffect, useContext, createContext } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ScrollView, StyleSheet, Alert, ActivityIndicator,
  StatusBar, Platform, KeyboardAvoidingView,
  useWindowDimensions, Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

// ── Ayarlar context ───────────────────────────────────────
const SettingsContext = createContext(null);
const useSettings = () => useContext(SettingsContext);

const FONT_OPTIONS = [
  { label: "Küçük", base: 13 },
  { label: "Orta",  base: 15 },
  { label: "Büyük", base: 18 },
];

const THEME_OPTIONS = [
  { label: "Açık",  bg: "#FAFAF9", card: "#FFFFFF", bgSec: "#F1EFE8", text: "#2C2C2A", textSub: "#888780", purple: "#534AB7", purpleBg: "#EEEDFE", border: "#D3D1C7", borderLight: "#E8E6DF", statusBar: "dark-content" },
  { label: "Koyu",  bg: "#1C1C1E", card: "#2C2C2E", bgSec: "#3A3A3C", text: "#F2F2F7", textSub: "#8E8E93", purple: "#A39EF5", purpleBg: "#2C2A4A", border: "#48484A", borderLight: "#3A3A3C", statusBar: "light-content" },
  { label: "Sepia", bg: "#F5F0E8", card: "#FFF9F0", bgSec: "#EDE5D8", text: "#3B2F1E", textSub: "#8B7355", purple: "#7B5EA7", purpleBg: "#EDE5F5", border: "#C8B89A", borderLight: "#DDD0C0", statusBar: "dark-content" },
];

const STORAGE_KEY   = "repertuvar:v2";
const SETTINGS_KEY  = "repertuvar:settings";
const NOTES         = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT_MAP      = { Db:"C#", Eb:"D#", Gb:"F#", Ab:"G#", Bb:"A#" };
const CHORD_PALETTE = ["Am","Em","Dm","Gm","C","G","D","E","A","F","Bm","B","E7","A7","D7","G7","Cadd9","Gsus4","Fmaj7","Cmaj7"];
const CATS          = ["Pop","Rock","Klasik","Caz","Halk","R&B","Metal","Folk","Elektronik"];
const ALL_KEYS      = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

// ── Transpoz ──────────────────────────────────────────────
function noteIdx(n) { return NOTES.indexOf(FLAT_MAP[n] || n); }
function transposeNote(n, st) { const i = noteIdx(n); return i === -1 ? n : NOTES[((i+st)%12+12)%12]; }
function transposeChord(ch, st) { return st === 0 ? ch : ch.replace(/([A-G][#b]?)/g, m => transposeNote(m, st)); }

// ── ChordPro parser ───────────────────────────────────────
function parseLine(line, st) {
  const pairs = [], re = /\[([^\]]+)\]([^\[]*)/g;
  let match, last = 0;
  while ((match = re.exec(line)) !== null) {
    if (match.index > last) pairs.push({ chord: "", syl: line.slice(last, match.index) });
    pairs.push({ chord: transposeChord(match[1], st), syl: match[2] });
    last = match.index + match[0].length;
  }
  if (last < line.length) pairs.push({ chord: "", syl: line.slice(last) });
  if (!pairs.length) pairs.push({ chord: "", syl: line });
  return pairs;
}

function ChordProView({ text, semitones = 0 }) {
  const { theme, fontSize } = useSettings();
  if (!text) return null;
  return (
    <View>
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <View key={i} style={{ height: 10 }} />;
        if (/^\s*\[[^\]]+\]\s*$/.test(line))
          return <Text key={i} style={[st.sectionLabel, { color: theme.textSub, fontSize: fontSize - 4, marginTop: i === 0 ? 0 : 16 }]}>{line.trim().slice(1,-1).toUpperCase()}</Text>;
        if (!line.includes("["))
          return <Text key={i} style={[st.plainLine, { color: theme.text, fontSize: fontSize + 1 }]}>{line}</Text>;
        return (
          <View key={i} style={st.chordRow}>
            {parseLine(line, semitones).map(({ chord, syl }, j) => (
              <View key={j} style={st.chordPair}>
                <Text style={[st.chordName, { color: theme.purple, fontSize: fontSize - 2, opacity: chord ? 1 : 0 }]}>{chord || " "}</Text>
                <Text style={[st.chordLyric, { color: theme.text, fontSize: fontSize + 1 }]}>{syl || " "}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

// ── Storage ───────────────────────────────────────────────
async function loadSongs() {
  try { const r = await AsyncStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
async function saveSongs(songs) {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(songs)); } catch {}
}

// ── Topbar — safe area farkında ───────────────────────────
function Topbar({ left, center, right }) {
  const { theme } = useSettings();
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.topbarWrap, {
      backgroundColor: theme.bg,
      borderBottomColor: theme.borderLight,
      paddingTop: insets.top + 8,   // ← bildirim çubuğunun tam altından başlar
      paddingBottom: 10,
      paddingHorizontal: 16,
    }]}>
      <View style={st.topbarRow}>
        <View style={{ flex: 1, alignItems: "flex-start" }}>{left}</View>
        {center ? <View style={{ flex: 2, alignItems: "center" }}>{center}</View> : null}
        <View style={{ flex: 1, alignItems: "flex-end" }}>{right}</View>
      </View>
    </View>
  );
}

// ── Ayarlar Modal ─────────────────────────────────────────
function SettingsModal({ visible, onClose }) {
  const { theme, themeIdx, setThemeIdx, fontSize, fontIdx, setFontIdx } = useSettings();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={[st.topbarWrap, {
          backgroundColor: theme.bg, borderBottomColor: theme.borderLight,
          paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: 16,
        }]}>
          <View style={st.topbarRow}>
            <View style={{ flex: 1 }} />
            <View style={{ flex: 2, alignItems: "center" }}>
              <Text style={[st.topbarTitle, { color: theme.text }]}>Ayarlar</Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ color: theme.purple, fontSize: 16 }}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30, gap: 28 }}>
          <View>
            <Text style={[st.settingsSection, { color: theme.textSub }]}>TEMA</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              {THEME_OPTIONS.map((t, i) => (
                <TouchableOpacity key={i} onPress={() => setThemeIdx(i)}
                  style={[st.themeCard, { backgroundColor: t.card, borderColor: themeIdx === i ? t.purple : t.border, borderWidth: themeIdx === i ? 2 : .5 }]}>
                  <View style={{ flexDirection: "row", gap: 4, marginBottom: 8 }}>
                    {[t.purple, t.bg, t.bgSec].map((col, j) => (
                      <View key={j} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: col }} />
                    ))}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: t.text }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View>
            <Text style={[st.settingsSection, { color: theme.textSub }]}>YAZI BOYUTU</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              {FONT_OPTIONS.map((f, i) => (
                <TouchableOpacity key={i} onPress={() => setFontIdx(i)}
                  style={[st.fontCard, { backgroundColor: theme.card, borderColor: fontIdx === i ? theme.purple : theme.border, borderWidth: fontIdx === i ? 2 : .5 }]}>
                  <Text style={{ fontSize: f.base + 2, color: theme.text, fontWeight: "500" }}>Aa</Text>
                  <Text style={{ fontSize: 12, color: theme.textSub, marginTop: 4 }}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={[st.settingsPreview, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[st.sectionLabel, { color: theme.textSub, fontSize: fontSize - 4, marginTop: 0, marginBottom: 10 }]}>ÖNİZLEME</Text>
            <View style={st.chordRow}>
              {[{ chord:"Am", syl:"Bu" },{ chord:"G", syl:"gün" },{ chord:"F", syl:"gü" },{ chord:"C", syl:"zel" }].map((p, j) => (
                <View key={j} style={st.chordPair}>
                  <Text style={[st.chordName, { color: theme.purple, fontSize: fontSize - 2 }]}>{p.chord}</Text>
                  <Text style={[st.chordLyric, { color: theme.text, fontSize: fontSize + 1 }]}>{p.syl}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Form Modal ────────────────────────────────────────────
function SongForm({ visible, existing, onClose, onSave }) {
  const { theme } = useSettings();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [key, setKey] = useState("");
  const [category, setCategory] = useState("");
  const [chords, setChords] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (visible) {
      setTitle(existing?.title || ""); setArtist(existing?.artist || "");
      setKey(existing?.key || ""); setCategory(existing?.category || "");
      setChords(existing?.chords || ""); setNotes(existing?.notes || "");
      setCursor(0);
    }
  }, [visible, existing?.id]);

  const insertChord = (chord) => {
    const ins = `[${chord}]`, pos = cursor ?? chords.length;
    setChords(chords.slice(0, pos) + ins + chords.slice(pos));
    setCursor(pos + ins.length);
  };

  const save = async () => {
    if (!title.trim()) { Alert.alert("Uyarı", "Eser adı zorunludur."); return; }
    setSaving(true);
    const all = await loadSongs(), now = new Date().toISOString();
    const data = { title: title.trim(), artist: artist.trim(), key, category, chords, notes: notes.trim() };
    let updated, saved;
    if (existing) {
      updated = all.map(s => s.id === existing.id ? { ...s, ...data, updatedAt: now } : s);
      saved = updated.find(s => s.id === existing.id);
    } else {
      saved = { ...data, id: `${Date.now()}`, createdAt: now };
      updated = [...all, saved];
    }
    await saveSongs(updated); setSaving(false); onSave(saved, updated);
  };

  const inp = [st.inp, { borderColor: theme.border, backgroundColor: theme.card, color: theme.text }];
  const lbl = [st.label, { color: theme.textSub }];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={[st.topbarWrap, { backgroundColor: theme.bg, borderBottomColor: theme.borderLight, paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: 16 }]}>
          <View style={st.topbarRow}>
            <TouchableOpacity onPress={onClose}><Text style={{ color: theme.purple, fontSize: 16 }}>İptal</Text></TouchableOpacity>
            <Text style={[st.topbarTitle, { color: theme.text }]}>{existing ? "Düzenle" : "Yeni Eser"}</Text>
            <TouchableOpacity onPress={save} disabled={saving} style={[st.saveBtn, { backgroundColor: theme.purple }]}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.saveBtnText}>Kaydet</Text>}
            </TouchableOpacity>
          </View>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
            <Text style={lbl}>ESER ADI *</Text>
            <TextInput style={[...inp, { marginBottom: 16 }]} value={title} onChangeText={setTitle} placeholder="Şarkı adı" placeholderTextColor={theme.textSub} />
            <Text style={lbl}>SANATÇI</Text>
            <TextInput style={[...inp, { marginBottom: 16 }]} value={artist} onChangeText={setArtist} placeholder="Sanatçı adı" placeholderTextColor={theme.textSub} />
            <Text style={lbl}>TON</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 6 }}>
              {ALL_KEYS.map(k => (
                <TouchableOpacity key={k} onPress={() => setKey(key === k ? "" : k)}
                  style={[st.chip, { borderColor: theme.border, backgroundColor: theme.card }, key === k && { backgroundColor: theme.purpleBg, borderColor: theme.purple }]}>
                  <Text style={[st.chipText, { color: theme.textSub }, key === k && { color: theme.purple, fontWeight: "500" }]}>{k}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={lbl}>KATEGORİ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 6 }}>
              {CATS.map(c => (
                <TouchableOpacity key={c} onPress={() => setCategory(category === c ? "" : c)}
                  style={[st.chip, { borderColor: theme.border, backgroundColor: theme.card }, category === c && { backgroundColor: theme.purpleBg, borderColor: theme.purple }]}>
                  <Text style={[st.chipText, { color: theme.textSub }, category === c && { color: theme.purple, fontWeight: "500" }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={lbl}>AKOR & SÖZLER</Text>
            <Text style={{ fontSize: 12, color: theme.textSub, marginBottom: 8, lineHeight: 17 }}>Format: [Am]bu[G]gün — Palette tıkla → [Akor] eklenir</Text>
            <View style={st.paletteWrap}>
              {CHORD_PALETTE.map(c => (
                <TouchableOpacity key={c} onPress={() => insertChord(c)} style={[st.paletteBtn, { borderColor: theme.border, backgroundColor: theme.bgSec }]}>
                  <Text style={[st.paletteBtnText, { color: theme.purple }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[...inp, st.bigArea]} value={chords} onChangeText={setChords}
              onSelectionChange={e => setCursor(e.nativeEvent.selection.start)}
              placeholder={"[Am]Bu[G]gün gü[F]zel bir [C]gün\n[Em]Se[Am]ni dü[G]şündüm\n\n[Chorus]\n[F]Dün[C]ya dö[G]nü[Am]yor"}
              multiline numberOfLines={8} placeholderTextColor={theme.textSub} textAlignVertical="top" />
            <Text style={[lbl, { marginTop: 16 }]}>NOTLAR</Text>
            <TextInput style={[...inp, { minHeight: 80, paddingTop: 12 }]} value={notes} onChangeText={setNotes}
              placeholder="Capo, tempo, parmak düzeni…" multiline numberOfLines={3}
              placeholderTextColor={theme.textSub} textAlignVertical="top" />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Liste ekranı ──────────────────────────────────────────
function ListScreen({ songs, selectedId, onSelect, onAdd, search, onSearch, onSettings }) {
  const { theme, fontSize } = useSettings();
  const insets = useSafeAreaInsets();

  const filtered = songs
    .filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()) || (s.artist||"").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title, "tr"));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Topbar
        left={<Text style={[st.topbarTitle, { color: theme.text }]}>Repertuvar</Text>}
        right={
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Text style={{ fontSize: 13, color: theme.textSub }}>{songs.length} eser</Text>
            <TouchableOpacity onPress={onSettings} style={[st.iconBtn, { borderColor: theme.border }]}>
              <Text style={{ fontSize: 15 }}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAdd} style={[st.addBtn, { backgroundColor: theme.purple }]}>
              <Text style={st.addBtnText}>+ Ekle</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <TextInput style={[st.searchInp, { borderColor: theme.border, backgroundColor: theme.card, color: theme.text, marginHorizontal: 12, marginTop: 12, marginBottom: 4 }]}
        placeholder="Ara…" value={search} onChangeText={onSearch}
        placeholderTextColor={theme.textSub} clearButtonMode="while-editing" />
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 20 }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.borderLight }} />}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 80 }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>🎵</Text>
            <Text style={{ color: theme.textSub, fontSize: 14, textAlign: "center" }}>
              {songs.length === 0 ? "Henüz eser yok.\n+ Ekle'ye bas!" : "Sonuç yok."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[st.listItem, item.id === selectedId && { backgroundColor: theme.purpleBg, borderLeftWidth: 3, borderLeftColor: theme.purple }]}
            onPress={() => onSelect(item)}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize, fontWeight: "500", color: theme.text }} numberOfLines={1}>{item.title}</Text>
              {item.artist ? <Text style={{ fontSize: fontSize - 2, color: theme.textSub, marginTop: 2 }} numberOfLines={1}>{item.artist}</Text> : null}
            </View>
            <View style={{ flexDirection: "row", gap: 5, flexShrink: 0 }}>
              {item.key ? <View style={[st.tagPurple, { backgroundColor: theme.purpleBg }]}><Text style={[st.tagPurpleText, { color: theme.purple, fontSize: fontSize - 3 }]}>{item.key}</Text></View> : null}
              {item.category ? <View style={[st.tagGray, { backgroundColor: theme.bgSec }]}><Text style={[st.tagGrayText, { color: theme.textSub, fontSize: fontSize - 3 }]}>{item.category}</Text></View> : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ── Detay ekranı ──────────────────────────────────────────
function DetailScreen({ song, onBack, onEdit, onDelete }) {
  const { theme, fontSize } = useSettings();
  const insets = useSafeAreaInsets();
  const [transpose, setTranspose] = useState(0);
  useEffect(() => { setTranspose(0); }, [song?.id]);
  if (!song) return null;
  const tLabel = transpose === 0 ? "0" : (transpose > 0 ? `+${transpose}` : `${transpose}`);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Topbar
        left={
          <TouchableOpacity onPress={onBack}>
            <Text style={{ color: theme.purple, fontSize: 16 }}>← Geri</Text>
          </TouchableOpacity>
        }
        right={
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={onEdit} style={[st.btnSm, { borderColor: theme.border }]}>
              <Text style={[st.btnSmText, { color: theme.text, fontSize: fontSize - 2 }]}>Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={[st.btnSm, { borderColor: "#E24B4A" }]}>
              <Text style={[st.btnSmText, { color: "#E24B4A", fontSize: fontSize - 2 }]}>Sil</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        <Text style={{ fontSize: fontSize + 6, fontWeight: "500", color: theme.text, marginBottom: 2 }}>{song.title}</Text>
        {song.artist ? <Text style={{ fontSize, color: theme.textSub, marginBottom: 12 }}>{song.artist}</Text> : <View style={{ height: 12 }} />}
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {song.key ? <View style={[st.tagPurple, { backgroundColor: theme.purpleBg, paddingHorizontal: 10, paddingVertical: 4 }]}><Text style={[st.tagPurpleText, { color: theme.purple, fontSize: fontSize - 1 }]}>♩ {transposeNote(song.key, transpose)}</Text></View> : null}
          {song.category ? <View style={[st.tagGray, { backgroundColor: theme.bgSec, paddingHorizontal: 10, paddingVertical: 4 }]}><Text style={[st.tagGrayText, { color: theme.textSub, fontSize: fontSize - 1 }]}>{song.category}</Text></View> : null}
        </View>
        <View style={[st.transposeBar, { backgroundColor: theme.bgSec }]}>
          <Text style={[st.transLabel, { color: theme.textSub }]}>TRANSPOZ</Text>
          <TouchableOpacity onPress={() => setTranspose(t => t - 1)} style={[st.transBtn, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[st.transBtnText, { color: theme.text }]}>−</Text>
          </TouchableOpacity>
          <Text style={[st.transVal, { color: theme.text }]}>{tLabel}</Text>
          <TouchableOpacity onPress={() => setTranspose(t => t + 1)} style={[st.transBtn, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[st.transBtnText, { color: theme.text }]}>+</Text>
          </TouchableOpacity>
          {transpose !== 0 && (
            <TouchableOpacity onPress={() => setTranspose(0)} style={[st.transBtn, { borderColor: theme.border, backgroundColor: theme.card, paddingHorizontal: 10, width: "auto" }]}>
              <Text style={{ fontSize: 12, color: theme.textSub }}>↺ sıfırla</Text>
            </TouchableOpacity>
          )}
        </View>
        {song.chords ? (
          <>
            <Text style={[st.sectionLabel, { color: theme.textSub, fontSize: fontSize - 4, marginTop: 20, marginBottom: 10 }]}>AKORLAR & SÖZLER</Text>
            <ChordProView text={song.chords} semitones={transpose} />
          </>
        ) : null}
        {song.notes ? (
          <>
            <Text style={[st.sectionLabel, { color: theme.textSub, fontSize: fontSize - 4 }]}>NOTLAR</Text>
            <View style={[st.notesBox, { backgroundColor: theme.bgSec }]}>
              <Text style={{ fontSize: fontSize - 1, color: theme.text, lineHeight: 22 }}>{song.notes}</Text>
            </View>
          </>
        ) : null}
        {!song.chords && !song.notes ? <Text style={{ color: theme.textSub, fontSize }}>İçerik eklenmemiş.</Text> : null}
      </ScrollView>
    </View>
  );
}

// ── Ana uygulama ──────────────────────────────────────────
function Main() {
  const { width, height } = useWindowDimensions();
  const isLandscapeTablet = width >= 768 && width > height;
  const { theme } = useSettings();
  const insets = useSafeAreaInsets();

  const [songs, setSongs] = useState([]);
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [screen, setScreen] = useState("list");
  const [formVisible, setFormVisible] = useState(false);
  const [editSong, setEditSong] = useState(null);
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => { loadSongs().then(data => { setSongs(data); }); }, []);

  const handleSelect = (song) => { setSel(song); if (!isLandscapeTablet) setScreen("detail"); };
  const handleSave   = (saved, updated) => { setSongs(updated); setSel(saved); setFormVisible(false); if (!isLandscapeTablet) setScreen("detail"); };
  const handleDelete = () => {
    Alert.alert("Sil", `"${sel?.title}" silinsin mi?`, [
      { text: "İptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: async () => {
        const updated = songs.filter(s => s.id !== sel.id);
        await saveSongs(updated); setSongs(updated); setSel(null); setScreen("list");
      }},
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={theme.statusBar}
      />
      {isLandscapeTablet ? (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View style={{ width: 300, borderRightWidth: .5, borderRightColor: theme.borderLight }}>
            <ListScreen songs={songs} selectedId={sel?.id} onSelect={handleSelect}
              onAdd={() => { setEditSong(null); setFormVisible(true); }}
              search={search} onSearch={setSearch} onSettings={() => setSettingsVisible(true)} />
          </View>
          <View style={{ flex: 1 }}>
            {sel
              ? <DetailScreen song={sel} onBack={() => setSel(null)} onEdit={() => { setEditSong(sel); setFormVisible(true); }} onDelete={handleDelete} />
              : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 48, opacity: .2 }}>♪</Text>
                  <Text style={{ color: theme.textSub, fontSize: 14, marginTop: 8 }}>Bir şarkı seç</Text>
                </View>}
          </View>
        </View>
      ) : screen === "list" ? (
        <ListScreen songs={songs} selectedId={sel?.id} onSelect={handleSelect}
          onAdd={() => { setEditSong(null); setFormVisible(true); }}
          search={search} onSearch={setSearch} onSettings={() => setSettingsVisible(true)} />
      ) : (
        <DetailScreen song={sel} onBack={() => setScreen("list")}
          onEdit={() => { setEditSong(sel); setFormVisible(true); }} onDelete={handleDelete} />
      )}
      <SongForm visible={formVisible} existing={editSong} onClose={() => setFormVisible(false)} onSave={handleSave} />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </View>
  );
}

export default function App() {
  const [themeIdx, setThemeIdx] = useState(0);
  const [fontIdx, setFontIdx]   = useState(1);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then(r => {
      if (r) { const { ti, fi } = JSON.parse(r); setThemeIdx(ti ?? 0); setFontIdx(fi ?? 1); }
    }).catch(() => {});
  }, []);

  const persist = (ti, fi) => { try { AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ti, fi })); } catch {} };
  const handleTheme = (i) => { setThemeIdx(i); persist(i, fontIdx); };
  const handleFont  = (i) => { setFontIdx(i);  persist(themeIdx, i); };

  const ctx = {
    theme: THEME_OPTIONS[themeIdx], themeIdx, setThemeIdx: handleTheme,
    fontSize: FONT_OPTIONS[fontIdx].base, fontIdx, setFontIdx: handleFont,
  };

  return (
    <SafeAreaProvider>
      <SettingsContext.Provider value={ctx}>
        <Main />
      </SettingsContext.Provider>
    </SafeAreaProvider>
  );
}

// ── Stiller ───────────────────────────────────────────────
const st = StyleSheet.create({
  topbarWrap: { borderBottomWidth: .5 },
  topbarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topbarTitle: { fontSize: 18, fontWeight: "500" },
  iconBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: .5, alignItems: "center", justifyContent: "center" },
  addBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  searchInp: { padding: 11, borderWidth: .5, borderRadius: 11, fontSize: 15 },
  listItem: { paddingVertical: 13, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  tagPurple: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tagPurpleText: { fontSize: 12, fontWeight: "500" },
  tagGray: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tagGrayText: { fontSize: 12 },
  transposeBar: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 },
  transLabel: { fontSize: 10, fontWeight: "500", letterSpacing: .4, marginRight: 4 },
  transBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: .5, alignItems: "center", justifyContent: "center" },
  transBtnText: { fontSize: 20, lineHeight: 24 },
  transVal: { fontSize: 14, fontWeight: "500", minWidth: 28, textAlign: "center" },
  chordRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 2 },
  chordPair: { flexDirection: "column", alignItems: "flex-start", marginRight: 6, marginBottom: 8 },
  chordName: { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontWeight: "500", minHeight: 20, lineHeight: 20 },
  chordLyric: { lineHeight: 22 },
  plainLine: { lineHeight: 24, marginBottom: 2 },
  sectionLabel: { fontWeight: "500", letterSpacing: .5 },
  notesBox: { borderRadius: 10, padding: 12 },
  btnSm: { borderWidth: .5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  btnSmText: { fontSize: 13 },
  saveBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { color: "#fff", fontWeight: "500", fontSize: 14 },
  label: { fontSize: 11, fontWeight: "500", letterSpacing: .4, marginBottom: 7 },
  inp: { borderWidth: .5, borderRadius: 10, padding: 12, fontSize: 15 },
  bigArea: { minHeight: 180, paddingTop: 12, textAlignVertical: "top" },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: .5 },
  chipText: { fontSize: 13 },
  paletteWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  paletteBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, borderWidth: .5 },
  paletteBtnText: { fontSize: 13, fontWeight: "500" },
  settingsSection: { fontSize: 11, fontWeight: "500", letterSpacing: .5 },
  themeCard: { flex: 1, borderRadius: 12, padding: 12 },
  fontCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center", justifyContent: "center", minHeight: 70 },
  settingsPreview: { borderRadius: 12, borderWidth: .5, padding: 14 },
});
