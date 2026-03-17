# Repertuvar — Kurulum & Yayın Rehberi

## Proje yapısı

```
repertuvar/
├── App.js              ← Tüm uygulama kodu
├── app.json            ← Expo yapılandırması
├── eas.json            ← Build yapılandırması
├── package.json        ← Bağımlılıklar
├── babel.config.js
├── tsconfig.json
├── make_icons.py       ← İkon oluşturucu (opsiyonel)
└── assets/
    ├── icon.png
    ├── adaptive-icon.png
    ├── splash.png
    └── favicon.png
```

---

## 1. İlk kurulum

```bash
cd ~/Desktop/repertuvar
npm install
```

---

## 2. Geliştirme — telefonda test

```bash
npx expo start
```

QR kodu Expo Go ile okut.

> nvm kuruluysa önce: `nvm use 18`

---

## 3. Arkadaşlara dağıtım (APK)

```bash
# Expo hesabına giriş
eas login

# EAS projeyi başlat (ilk seferinde)
eas init

# APK build al (~10-15 dk)
eas build --platform android --profile preview
```

Build bitince Expo sana bir **indirme linki** verir.
Linki WhatsApp/Telegram ile paylaş → arkadaş indirir, kurar.

> Android'de "bilinmeyen kaynak" uyarısı çıkarsa:
> Ayarlar → Güvenlik → Bu kaynaktan izin ver

---

## 4. Play Store'a yayınlama

### 4a. Google Play Console hesabı
→ play.google.com/console → 25$ ödeme

### 4b. Production build
```bash
eas build --platform android --profile production
```
`.aab` dosyası oluşur.

### 4c. Play Console'da
1. "Uygulama oluştur" → Repertuvar
2. Store bilgilerini doldur (açıklama, ekran görüntüleri)
3. İçerik derecelendirmesi anketi (5 dk)
4. Production → Yeni sürüm → .aab yükle
5. İnceleye gönder (1-3 gün)

### 4d. Gizlilik politikası (zorunlu)
→ app-privacy-policy-generator.firebaseapp.com
Ücretsiz oluştur, linki Play Console'a ekle.

---

## 5. Güncelleme göndermek

Kod değişikliği yaptıktan sonra:

1. `app.json` içinde `versionCode`'u 1 artır (1 → 2)
2. `version`'ı güncelle (1.0.0 → 1.0.1)
3. `eas build --platform android --profile production`
4. Play Console → Yeni sürüm → yükle

---

## Bağımlılıklar

| Paket | Versiyon | Ne için |
|---|---|---|
| expo | ~51.0.0 | Temel framework |
| react-native | 0.74.1 | Mobil UI |
| @react-native-async-storage/async-storage | 1.23.1 | Yerel veri saklama |
| react-native-safe-area-context | 4.10.1 | Bildirim çubuğu boşluğu |
| react-native-screens | ~3.31.1 | Ekran yönetimi |
