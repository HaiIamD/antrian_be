// backup-scheduler-final.js
const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// --- KONFIGURASI ---
const DB_NAME = 'DatabaseAntrian';
const BACKUP_PATH = path.join(__dirname, 'mongo_backups');

// Pastikan folder untuk menyimpan backup .gz ada
if (!fs.existsSync(BACKUP_PATH)) {
  fs.mkdirSync(BACKUP_PATH);
}

// --- FUNGSI BACKUP (Menjadi sangat simpel) ---
const backupDatabase = () => {
  const date = new Date().toISOString().slice(0, 10); // Format: YYYY-MM-DD
  // Nama file sekarang berakhiran .gz
  const archiveFile = path.join(BACKUP_PATH, `${DB_NAME}-${date}.gz`);

  console.log(`Memulai backup ke satu file: ${archiveFile}`);

  // Mengubah argumen untuk menggunakan --archive dan --gzip
  const args = [
    `--db=${DB_NAME}`,
    `--archive=${archiveFile}`, // Opsi untuk output ke satu file
    '--gzip', // Opsi untuk kompresi
  ];

  // Menjalankan proses mongodump
  const fullPathToMongoDump = process.env.BASE_MONGODUMP;
  const mongodump = spawn(fullPathToMongoDump, args);

  mongodump.on('close', (code) => {
    if (code === 0) {
      console.log(`✅ Backup berhasil dibuat: ${archiveFile}`);
    } else {
      console.error(`❌ Backup gagal. Proses mongodump keluar dengan kode ${code}`);
    }
  });

  mongodump.on('error', (error) => {
    console.error(`❌ Gagal memulai proses mongodump: ${error.message}`);
  });

  // Berguna untuk melihat progres dari mongodump
  mongodump.stderr.on('data', (data) => {
    console.log(`[mongodump]: ${data}`);
  });
};

// --- PENJADWALAN CRON ---
// Berjalan setiap hari jam 2 pagi WIB
cron.schedule(
  '5 17 * * *',
  () => {
    console.log('----------------------------------------------------');
    console.log(`Menjalankan backup terjadwal (single file) pada ${new Date().toLocaleString('id-ID')}`);
    backupDatabase();
    console.log('----------------------------------------------------');
  },
  {
    scheduled: true,
    timezone: 'Asia/Jakarta',
  }
);

console.log('🟢 Cron job untuk backup MongoDB (single file .gz) telah dijadwalkan.');
console.log('Tugas akan berjalan setiap hari pada pukul 17:05 WIB.');
