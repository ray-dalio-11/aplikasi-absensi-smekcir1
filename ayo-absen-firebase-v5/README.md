# Ayo Absen + Firebase (v5)

Struktur: `siswa|guru|ortu|admin.html` (cangkang tipis) memuat `ayo.css`, `ayo-app.js` (UI dan logika), `ayo-firebase.js` (Auth Google + Firestore).

1. Firebase Console: aktifkan Authentication > Google, buat Firestore, tambah Web app, isi `CFG` di `ayo-firebase.js`.
2. Authentication > Settings > Authorized domains: tambahkan domain hosting.
3. Deploy: `firebase deploy --only firestore:rules,hosting` (lokal di Termux: `python -m http.server 8000`, buka http://localhost:8000/siswa.html).
4. Admin pertama: login di admin.html, salin UID yang tampil, buat dokumen `users/<UID>` di Firestore berisi role: "admin", email: "<email>". Login ulang.
5. Data awal diisi admin (tidak ada data contoh): titik lokasi (tab Lokasi), siswa (tab Siswa, impor NISN, nama, kelas), jadwal (tab Jadwal), pengumuman (Beranda). Simpan satu perubahan agar dokumen `ayo/meta` terbentuk.
6. Siswa/ortu/guru: login Google, isi NISN/NIP, tunggu persetujuan admin di Beranda admin.
7. Nilai diinput guru di tab Validasi. Rekap 30 hari: admin menekan "Muat data" lalu "Unduh CSV".
8. Absen wajib foto dan akurasi GPS maksimal 25 m, radius maksimal 10 m.
