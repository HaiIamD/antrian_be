const mongoose = require('mongoose');
const User = require('./Schema/userAuth');
const bcrypt = require('bcrypt');

const connection = async () => {
  // --- Blok 1: Khusus untuk Koneksi Database ---
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Already Connect To Database');
  } catch (error) {
    console.error('❌ Failed TO connect with Database:', error.message);
    // Hentikan proses jika koneksi gagal
    process.exit(1);
  }

  // --- Blok 2: Khusus untuk Logika Pembuatan Admin ---
  try {
    const adminUser = await User.findOne({ role: 'admin' });

    if (!adminUser) {
      console.log('Admin user not found. Creating a new one...');

      // 1. Definisikan password untuk admin (ambil dari .env)
      const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
      if (!adminPassword) {
        console.error('ADMIN_DEFAULT_PASSWORD tidak ditemukan di file .env. Admin tidak bisa dibuat.');
        return; // Hentikan jika password tidak ada
      }

      const salt = await bcrypt.genSalt();
      // 2. Gunakan variabel yang benar
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      const newAdmin = new User({
        userName: 'admin',
        password: hashedPassword,
        role: 'admin',
        locket: 1,
      });

      await newAdmin.save();
      console.log('🚀 Admin user has been created successfully!');
    } else {
      console.log('Admin user already exists. No action needed.');
    }
  } catch (error) {
    // Pesan error ini sekarang lebih relevan
    console.error('❌ Error during admin user check/creation:', error.message);
  }
};

module.exports = connection;
