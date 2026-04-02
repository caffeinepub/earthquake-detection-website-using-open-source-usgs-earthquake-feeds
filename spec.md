# WhoFeelAnEarthquake

## Current State
App sudah memiliki EEW tab dengan peta Leaflet yang menampilkan:
- Lingkaran MMI zone (filled + dashed rings)
- P-wave dan S-wave rings yang bergerak real-time
- Epicenter pulsing marker
- Info card dan impact zones table di bawah peta

Belum ada label kota/wilayah di dalam masing-masing MMI ring zone.

## Requested Changes (Diff)

### Add
- Fungsi utilitas untuk mengambil nama kota/kabupaten/provinsi terdekat dari koordinat menggunakan Nominatim reverse geocoding (OpenStreetMap)
- Marker label kota di dalam setiap MMI zone ring (di tepi lingkaran, bukan di tengah) pada peta EEW
- Label menampilkan nama kota/region terkecil yang berada di batas radius masing-masing MMI level
- Cache hasil geocoding agar tidak spam API

### Modify
- `EewView.tsx`: Tambahkan layer label kota di setiap MMI boundary ring, diambil via reverse geocoding pada koordinat titik-titik di sekitar radius masing-masing MMI zone
- `eewUtils.ts`: Tambahkan helper untuk menghitung titik koordinat di circumference lingkaran MMI (cardinal points: N, E, S, W)

### Remove
- Tidak ada yang dihapus

## Implementation Plan
1. Tambahkan helper `getCircumferencePoint(lat, lon, radiusKm, bearingDeg)` di `eewUtils.ts` untuk menghitung koordinat di tepi lingkaran
2. Di `EewView.tsx`, buat fungsi `fetchCityLabels(lat, lon, mag, depth)` yang:
   - Untuk setiap MMI level, hitung radius surface
   - Ambil 1 titik di arah Timur (bearing 90°) dari epicenter pada radius tersebut
   - Panggil Nominatim reverse geocoding untuk titik tersebut
   - Kembalikan nama kota/kabupaten/provinsi
3. Simpan hasil geocoding di React state (per selectedEq.id)
4. Render label sebagai Leaflet DivIcon di tepi setiap MMI ring (arah Timur dari epicenter)
5. Label menampilkan nama kota + MMI level dengan warna sesuai MMI
