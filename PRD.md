
# PRD — FreeHosting

**Versi:** 1.0  
**Status:** Draft untuk pengembangan  
**Nama produk:** FreeHosting  
**Domain utama:** `freehost.my.id`  
**Domain proyek pengguna:** `*.host.my.id`

---

## 1. Ringkasan Produk

FreeHosting adalah platform hosting berbasis web yang memungkinkan pengguna menerbitkan website tanpa harus memahami proses deployment secara teknis.

Pengguna dapat mengunggah arsip proyek ZIP, sedangkan pengguna yang login juga dapat mengimpor repositori GitHub. Sistem mendeteksi framework, membantu konfigurasi, membuat deployment melalui Vercel, dan memberikan subdomain unik.

FreeHosting menggunakan Neon PostgreSQL sebagai database aplikasi dan Vercel sebagai platform deployment. Setiap proyek pengguna memiliki deployment Vercel tersendiri menggunakan arsitektur Multi-Project.

### Tujuan

- Mempermudah publikasi website.
- Mendeteksi framework secara otomatis.
- Memberikan subdomain unik.
- Menyediakan dashboard pengelolaan proyek.
- Memantau status dan riwayat deployment.
- Menjaga keamanan proyek dan data pengguna.

### Bukan tujuan MVP

- Menggantikan seluruh fitur Vercel.
- Menjamin semua framework bisa berjalan tanpa konfigurasi.
- Menyediakan hosting tanpa batas.
- Menjalankan kode pengguna di proses server dashboard.
- Mendukung semua jenis arsip sejak rilis pertama.

---

## 2. Target Pengguna

### 2.1 Pengguna Tamu

Pengguna yang belum memiliki akun.

Fitur:
- Upload proyek ZIP.
- Deteksi framework.
- Konfigurasi dasar.
- Deployment sesuai kuota tamu.
- Melihat status deployment.
- Mendapatkan URL proyek jika deployment berhasil.

### 2.2 Pengguna Terdaftar

Pengguna yang sudah login.

Fitur:
- Upload ZIP.
- Impor repositori GitHub.
- Mengelola beberapa proyek.
- Melihat riwayat deployment.
- Redeploy proyek.
- Mengatur konfigurasi build.
- Mengelola environment variables.
- Mengelola koneksi GitHub.

### 2.3 Administrator

Fitur yang direncanakan:
- Memantau penggunaan layanan.
- Melihat status deployment dan error.
- Mengelola kuota.
- Menangani laporan penyalahgunaan.
- Menangguhkan proyek yang melanggar kebijakan.
- Melihat audit aktivitas administratif.

---

## 3. Teknologi

| Komponen | Teknologi |
|---|---|
| Frontend | Next.js |
| Bahasa | TypeScript |
| Styling | Tailwind CSS |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM |
| Hosting dashboard | Vercel |
| Hosting proyek pengguna | Vercel API / Vercel for Platforms |
| Autentikasi | GitHub OAuth atau metode login yang dipilih |
| Impor repositori | GitHub App/OAuth |
| Upload MVP | ZIP |
| Background jobs | Antrean pekerjaan asinkron |
| Penyimpanan file | Object storage atau layanan penyimpanan terpisah |
| Domain utama | `freehost.my.id` |
| Domain proyek | `nama-proyek.host.my.id` |

### Catatan arsitektur

`freehost.my.id` dan `host.my.id` adalah dua domain berbeda.

Wildcard `*.host.my.id` dikonfigurasi sesuai dokumentasi Vercel. Wildcard tidak otomatis menghubungkan setiap subdomain ke deployment yang tepat; backend tetap harus melakukan pemetaan domain.

Sebelum rilis publik, verifikasi paket, batas penggunaan, API, wildcard SSL, dan ketentuan Vercel for Platforms.

---

## 4. Alur Pengguna

### 4.1 Upload sebagai Tamu

1. Pengguna membuka `freehost.my.id`.
2. Pengguna memilih Upload ZIP.
3. Pengguna memilih file `.zip`.
4. Sistem memvalidasi ukuran dan struktur arsip.
5. Sistem mendeteksi framework.
6. Sistem menampilkan konfigurasi yang terdeteksi.
7. Pengguna mengonfirmasi konfigurasi.
8. Sistem memeriksa kuota.
9. Backend membuat deployment melalui Vercel.
10. Dashboard menampilkan progres.
11. Jika berhasil, sistem menghubungkan subdomain.
12. Sistem menampilkan URL website.

Kebijakan masa aktif proyek tamu dan mekanisme klaim proyek ke akun harus ditentukan sebelum rilis.

### 4.2 Upload sebagai Pengguna Terdaftar

1. Pengguna login.
2. Pengguna membuka dashboard.
3. Pengguna memilih Buat Proyek.
4. Pengguna mengunggah ZIP.
5. Sistem memvalidasi arsip.
6. Sistem mendeteksi framework.
7. Pengguna meninjau konfigurasi.
8. Sistem membuat deployment.
9. Data proyek disimpan ke Neon.
10. Dashboard menampilkan status dan URL.

### 4.3 Impor GitHub

1. Pengguna memilih Impor dari GitHub.
2. Pengguna memberikan izin melalui GitHub App/OAuth.
3. Pengguna memilih repositori.
4. Sistem memeriksa struktur repositori.
5. Sistem mendeteksi framework dan root directory.
6. Pengguna memilih branch dan mengonfirmasi konfigurasi.
7. Backend membuat deployment.
8. Sistem menyimpan metadata deployment.
9. Jika webhook diaktifkan, perubahan pada branch terkait dapat memicu deployment baru.
10. Dashboard menampilkan status terbaru.

### 4.4 Penanganan Kegagalan

1. Deployment gagal atau provider tidak merespons.
2. Sistem mencatat status dan kode error.
3. Dashboard menampilkan pesan yang mudah dipahami.
4. Pengguna dapat memperbaiki konfigurasi.
5. Pengguna dapat mencoba kembali jika kuota mengizinkan.
6. Retry otomatis hanya dilakukan untuk kegagalan sementara dan dibatasi.

---

## 5. Persyaratan Fungsional

### 5.1 Landing Page

- Menjelaskan layanan.
- Menampilkan tombol Upload ZIP.
- Menampilkan tombol Login.
- Menampilkan tombol Dashboard sesuai status sesi.
- Menjelaskan batasan hosting.
- Responsif untuk mobile dan desktop.
- Menampilkan loading, error, dan empty states yang sesuai.

### 5.2 Upload dan Validasi ZIP

MVP menerima arsip `.zip`.

Persyaratan:
- Menampilkan progres upload.
- Memvalidasi format dan ukuran.
- Membatasi jumlah file.
- Membatasi ukuran hasil ekstraksi.
- Membatasi waktu pemrosesan.
- Menolak arsip rusak.
- Mencegah path traversal.
- Mencegah zip bomb.
- Menangani symlink secara aman.
- Menghapus file sementara sesuai kebijakan retensi.
- Tidak menjalankan kode pengguna pada proses API utama.

Format `.tar.gz`, `.tar`, `.rar`, dan `.7z` dapat ditambahkan pada fase lanjutan.

Batas ukuran awal, misalnya 25 MB, hanya usulan dan harus diuji sebelum ditetapkan.

### 5.3 Deteksi Framework

Sistem memeriksa `package.json`, lockfile, konfigurasi framework, dan struktur direktori.

Framework awal:

| Framework | Metode deteksi |
|---|---|
| Next.js | Dependency `next` dan konfigurasi terkait |
| React + Vite | Dependency `vite` dan plugin React |
| Vue | Dependency Vue dan konfigurasi build |
| Astro | Dependency `astro` |
| HTML statis | `index.html` tanpa toolchain yang dikenali |
| Framework lainnya | Deteksi tambahan jika tersedia |

Persyaratan:
- Menyarankan konfigurasi build otomatis.
- Memungkinkan pengguna mengubah root directory.
- Memungkinkan pengaturan build command.
- Memungkinkan pengaturan output directory.
- Menangani monorepo melalui pemilihan root directory.
- Menyediakan konfigurasi manual untuk proyek yang tidak dikenali.
- Tidak menjamin build berhasil hanya karena framework berhasil dideteksi.

### 5.4 Manajemen Proyek

Pengguna dapat:
- Membuat proyek.
- Melihat daftar proyek.
- Mencari proyek.
- Melihat framework dan sumber proyek.
- Melihat status deployment.
- Melihat URL proyek.
- Mengubah nama tampilan.
- Mengubah konfigurasi build yang didukung.
- Memicu redeploy.
- Melihat riwayat deployment.
- Menghapus proyek.
- Mengelola environment variables.

Nilai environment variables yang tersimpan harus dilindungi dan tidak ditampilkan kembali secara sembarangan.

### 5.5 Integrasi Vercel

- Membuat dan mengelola deployment melalui API/SDK yang didukung.
- Menyimpan ID proyek dan deployment dari Vercel.
- Memantau status deployment secara asinkron.
- Menangani timeout.
- Menangani rate limit.
- Mencegah permintaan duplikat yang tidak terkendali.
- Menyimpan log yang aman.
- Memisahkan proyek dashboard dari proyek pengguna.
- Membersihkan resource provider ketika proyek dihapus.
- Menyimpan token di server, bukan di browser.

**Validasi teknis wajib:** buktikan bahwa mekanisme deployment ZIP yang dipilih benar-benar didukung oleh API Vercel yang akan digunakan. Jangan menganggap alur upload ZIP dan impor Git mempunyai mekanisme deployment yang sama.

### 5.6 Domain dan Subdomain

Domain utama:
`freehost.my.id`

Domain proyek:
`nama-proyek.host.my.id`

Persyaratan:
- Slug proyek harus unik.
- Slug dinormalisasi dan divalidasi.
- Nama khusus dicadangkan untuk sistem.
- Sistem memetakan hostname ke deployment yang benar.
- Status domain disimpan.
- Status HTTPS diperiksa jika tersedia melalui integrasi.
- Slug yang sudah digunakan harus ditolak.
- Penghapusan proyek membersihkan pemetaan domain.
- Perubahan slug harus menangani domain lama dan baru secara konsisten.

Wildcard DNS tidak menggantikan pemetaan deployment individual.

### 5.7 GitHub

- Menggunakan GitHub App/OAuth.
- Meminta izin minimum.
- Menampilkan repositori yang bisa diakses pengguna.
- Mendukung repositori privat dengan izin eksplisit.
- Menyimpan repository ID dan referensi non-rahasia.
- Mendukung pemilihan branch.
- Mendukung root directory.
- Memverifikasi keaslian webhook.
- Memproses webhook secara idempoten.
- Memungkinkan pengguna memutus koneksi GitHub.

### 5.8 Dashboard

Halaman yang direncanakan:

- Overview.
- Projects.
- Project Detail.
- Deployment History.
- Deployment Logs.
- Project Settings.
- Environment Variables.
- GitHub Integrations.
- Account Settings.
- Help dan Status Layanan.

Desain harus mobile-first, modern, mudah dipahami, dan memiliki status loading, empty, success, serta error.

---

## 6. Kuota dan Kebijakan Penggunaan

Kuota harus ditegakkan di server dan dapat diubah tanpa harus mengubah kode UI.

Contoh kebijakan awal untuk diuji:

### Tamu
- Hanya upload ZIP.
- Jumlah proyek aktif terbatas.
- Batas ukuran upload.
- Batas deployment harian.
- Retensi proyek yang jelas.

### Pengguna Terdaftar
- Upload ZIP.
- Impor GitHub.
- Beberapa proyek aktif.
- Riwayat deployment.
- Redeploy.
- Pengaturan proyek.

Nilai final ditentukan berdasarkan pengujian biaya, batas provider, dan risiko penyalahgunaan.

Jangan menjanjikan hosting tanpa batas jika kemampuan infrastruktur belum mendukungnya.

---

## 7. Struktur Database Neon

### 7.1 `users`

Kolom:
- `id` — UUID, primary key.
- `email`.
- `display_name`.
- `avatar_url`.
- `created_at`.
- `updated_at`.

### 7.2 `auth_accounts`

Kolom:
- `id`.
- `user_id`.
- `provider`.
- `provider_account_id`.
- `created_at`.

### 7.3 `projects`

Kolom:
- `id`.
- `owner_user_id`.
- `guest_session_id`.
- `name`.
- `slug`.
- `framework`.
- `source_type`.
- `source_reference`.
- `root_directory`.
- `build_command`.
- `output_directory`.
- `status`.
- `created_at`.
- `updated_at`.
- `deleted_at`.

`source_type` berisi `zip` atau `github`.

### 7.4 `deployments`

Kolom:
- `id`.
- `project_id`.
- `provider`.
- `provider_project_id`.
- `provider_deployment_id`.
- `status`.
- `deployment_url`.
- `commit_reference`.
- `error_code`.
- `started_at`.
- `finished_at`.
- `created_at`.

### 7.5 `domains`

Kolom:
- `id`.
- `project_id`.
- `hostname`.
- `provider_domain_id`.
- `status`.
- `https_status`.
- `created_at`.
- `updated_at`.

### 7.6 `project_settings`

Kolom:
- `project_id`.
- `package_manager`.
- `install_command`.
- `build_command`.
- `output_directory`.
- `root_directory`.
- `created_at`.
- `updated_at`.

### 7.7 `usage_records`

Kolom:
- `id`.
- `owner_user_id`.
- `guest_session_id`.
- `project_id`.
- `event_type`.
- `quantity`.
- `period_start`.
- `created_at`.

### 7.8 `github_installations`

Kolom:
- `id`.
- `user_id`.
- `provider_installation_id`.
- `status`.
- `created_at`.
- `updated_at`.

### 7.9 `jobs`

Kolom:
- `id`.
- `job_type`.
- `project_id`.
- `deployment_id`.
- `status`.
- `attempt_count`.
- `scheduled_at`.
- `started_at`.
- `finished_at`.
- `last_error_code`.
- `created_at`.

### Aturan Database

- Gunakan foreign key.
- Gunakan indeks untuk pencarian umum.
- Terapkan unique constraint untuk slug dan hostname.
- Cegah race condition saat reservasi slug.
- Periksa kepemilikan proyek pada setiap operasi.
- Gunakan migration yang terkontrol.
- Jangan menyimpan arsip proyek di database.
- Jangan menyimpan rahasia sebagai plaintext.
- Terapkan kebijakan penghapusan dan retensi data.

---

## 8. Keamanan dan Privasi

Kode pengguna harus selalu dianggap tidak tepercaya.

Persyaratan keamanan:
- Validasi arsip secara aman.
- Batas ukuran, waktu, dan resource.
- Isolasi build dan runtime sesuai kemampuan provider.
- Autentikasi dan otorisasi pada setiap operasi.
- Perlindungan terhadap IDOR.
- Perlindungan terhadap CSRF jika relevan.
- Perlindungan terhadap XSS dan SQL injection.
- Perlindungan terhadap SSRF.
- Verifikasi webhook.
- Rate limiting.
- Redaksi rahasia pada log.
- Penyimpanan token yang aman.
- Validasi slug dan perlindungan terhadap domain takeover.
- Audit untuk operasi sensitif.
- Penghapusan resource provider secara konsisten.
- Kebijakan privasi.
- Ketentuan penggunaan.
- Mekanisme pelaporan penyalahgunaan.

Jangan menjalankan `npm install`, build script, atau kode proyek pengguna dalam proses API utama. Build harus dilakukan oleh sistem deployment terisolasi yang sesuai.

---

## 9. Status Deployment

Status internal yang disarankan:

- `uploaded`
- `validating`
- `detected`
- `queued`
- `deploying`
- `building`
- `assigning_domain`
- `ready`
- `failed`
- `cancelled`
- `deleting`

Persyaratan:
- Menampilkan status yang benar-benar diketahui.
- Menampilkan waktu pembaruan terakhir.
- Menampilkan ringkasan error yang aman.
- Menampilkan log sesuai izin.
- Menghindari polling berlebihan.
- Membedakan kegagalan build dengan kegagalan domain atau HTTPS.

---

## 10. Kriteria Penerimaan MVP

MVP dianggap siap diuji jika:

1. Website utama dapat diakses melalui `freehost.my.id` dengan HTTPS.
2. Pengguna tamu dapat mengunggah ZIP valid.
3. Arsip rusak, terlalu besar, atau berbahaya ditolak dengan aman.
4. Sistem mendeteksi framework yang didukung.
5. Konfigurasi dapat ditinjau sebelum deployment.
6. Satu proyek contoh berhasil di-deploy melalui integrasi Vercel.
7. Status deployment ditampilkan dengan benar.
8. Proyek berhasil mendapat subdomain `nama-proyek.host.my.id`.
9. Subdomain bisa diakses melalui HTTPS.
10. Metadata tersimpan di Neon PostgreSQL.
11. Slug duplikat ditolak, termasuk ketika dua permintaan terjadi bersamaan.
12. Pengguna tidak dapat mengakses proyek milik pengguna lain.
13. Timeout dan rate limit ditangani dengan aman.
14. Penghapusan proyek membersihkan pemetaan domain.
15. Rahasia tidak muncul di frontend atau log.
16. Kuota ditegakkan di server.
17. Alur deployment ZIP terbukti didukung oleh integrasi Vercel yang dipilih.

---

## 11. Tahapan Pengembangan

### Fase 0 — Validasi Teknis

- Verifikasi paket dan ketentuan Vercel.
- Uji pembuatan deployment melalui API/SDK.
- Buktikan alur deployment ZIP tanpa GitHub.
- Uji wildcard domain.
- Uji pemetaan hostname ke deployment.
- Uji HTTPS.
- Evaluasi biaya dan batas provider.

**Target:** satu website contoh berhasil di-deploy dan dapat diakses melalui subdomain.

### Fase 1 — Fondasi Aplikasi

- Inisialisasi Next.js + TypeScript.
- Hubungkan Neon PostgreSQL.
- Konfigurasi Drizzle ORM.
- Buat schema dan migration.
- Buat autentikasi dan sesi tamu.
- Implementasikan otorisasi.
- Bangun landing page dan dashboard dasar.

### Fase 2 — Upload dan Deteksi

- Implementasikan upload ZIP.
- Tambahkan penyimpanan sementara.
- Validasi arsip.
- Deteksi framework.
- Tampilkan konfigurasi.
- Terapkan kuota.

### Fase 3 — Integrasi Deployment

- Implementasikan adapter Vercel.
- Tambahkan antrean pekerjaan.
- Simpan status deployment.
- Tambahkan retry terbatas.
- Tampilkan riwayat dan log.
- Uji kegagalan provider.

### Fase 4 — Domain

- Konfigurasi wildcard.
- Otomatiskan reservasi slug.
- Hubungkan domain ke deployment.
- Verifikasi HTTPS.
- Tangani konflik dan kegagalan domain.

### Fase 5 — GitHub

- Implementasikan GitHub App/OAuth.
- Tambahkan pemilihan repositori.
- Tambahkan pemilihan branch dan root directory.
- Implementasikan webhook.
- Tambahkan redeploy otomatis.

### Fase 6 — Beta Publik

- Pengujian keamanan.
- Pengujian beban.
- Penetapan kuota.
- Kebijakan privasi dan penggunaan.
- Monitoring.
- Backup.
- Audit.
- Prosedur penanganan insiden.
- Peluncuran bertahap.

---

## 12. Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| API tidak mendukung alur deployment yang dibutuhkan | Buktikan melalui prototipe sebelum pengembangan penuh |
| Biaya provider meningkat | Kuota, monitoring, dan pembatasan deployment |
| Kode berbahaya | Gunakan build terisolasi |
| Wildcard tidak memetakan deployment otomatis | Hubungkan hostname melalui integrasi platform |
| Slug bentrok | Unique constraint dan transaksi database |
| Arsip ZIP berbahaya | Validasi, batas ekstraksi, dan isolasi |
| Token bocor | Secret storage dan redaksi log |
| Deployment timeout | Job asinkron dan retry terbatas |
| Proyek tamu ditinggalkan | Retensi dan penghapusan otomatis |
| Penyalahgunaan hosting | Rate limit dan mekanisme pelaporan |

---

## 13. Keputusan yang Belum Final

1. Batas ukuran ZIP.
2. Kuota proyek tamu dan akun.
3. Masa aktif proyek tamu.
4. Mekanisme klaim proyek tamu ke akun.
5. Metode autentikasi final.
6. Pilihan object storage.
7. Sistem antrean pekerjaan.
8. Dukungan environment variables pada MVP.
9. Kebijakan konten dan penghapusan proyek.
10. Framework yang benar-benar didukung pada rilis pertama.
11. Detail API deployment ZIP sesuai dokumentasi Vercel yang berlaku.
12. Batas proyek, domain, dan deployment sesuai paket Vercel.

---

## 14. Definisi Sukses

Keberhasilan awal adalah satu alur end-to-end yang terbukti:

**Upload ZIP → validasi → deteksi framework → deployment Vercel → pemetaan `nama-proyek.host.my.id` → HTTPS aktif → metadata tersimpan di Neon.**

Setelah alur tersebut stabil, fitur impor GitHub, riwayat deployment yang lebih lengkap, environment variables, dan peningkatan kuota dapat ditambahkan secara bertahap.
