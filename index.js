require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const morgan = require('morgan');
const verification = require('./middlewere/middlewere');
const socketIo = require('socket.io');
const http = require('http');
const VideoData = require('./Schema/Video');
const QueueData = require('./Schema/Queue');
const app = express();
const server = http.createServer(app);
const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;
const { Adapter, UsbAdapter, TcpAdapter, SerialPortAdapter } = require('node-thermal-printer'); // Import Adapter classes

// Printer Configuration
let printer;
try {
  // GANTI BAGIAN INI SESUAI DENGAN KONEKSI PRINTER ANDA
  // Pastikan Anda memilih salah satu opsi di bawah ini dan mengkomentari yang lain.

  // Opsi A: Printer USB (paling umum untuk printer thermal langsung ke server)
  // Perlu package escpos-usb jika belum terinstal (npm install escpos-usb)
  // Atau pastikan driver USB sudah terinstal di OS Anda
  // Anda mungkin perlu mengetahui VID dan PID printer Anda
  // const Usb = require('escpos-usb');
  // const device = new Usb(); // Atau new Usb(0x04b8, 0x0202); // Ganti VID, PID printer Anda
  // printer = new ThermalPrinter({
  //   type: PrinterTypes.EPSON, // Ganti dengan tipe printer Anda (EPSON, STAR, GENERIC)
  //   interface: new UsbAdapter(device), // Gunakan UsbAdapter
  // });

  // Opsi B: Printer Jaringan (LAN/Ethernet)
  // printer = new ThermalPrinter({
  //   type: PrinterTypes.EPSON, // Ganti dengan tipe printer Anda (EPSON, STAR, GENERIC)
  //   interface: new TcpAdapter('192.168.1.100', 9100), // GANTI DENGAN IP PRINTER DAN PORT YANG BENAR
  //   // Contoh port default: 9100, 9000
  //   options: {
  //     timeout: 1000, // Timeout dalam ms
  //   }
  // });

  // Opsi C: Printer Serial Port (COM Port di Windows, /dev/ttyS0 di Linux)
  // Perlu package serialport jika belum terinstal (npm install serialport)
  // const SerialPort = require('serialport');
  // const port = new SerialPort('/dev/ttyUSB0', { // GANTI DENGAN PORT SERIAL ANDA
  //   baudRate: 9600, // GANTI DENGAN BAUD RATE PRINTER ANDA
  // });
  // printer = new ThermalPrinter({
  //   type: PrinterTypes.EPSON, // Ganti dengan tipe printer Anda
  //   interface: new SerialPortAdapter(port),
  // });

  // --- PENTING: Coba hubungkan ke printer saat aplikasi dimulai ---
  printer
    .isConnected()
    .then(() => {
      console.log('Printer thermal terhubung dan siap!');
    })
    .catch((err) => {
      console.error('Gagal terhubung ke printer thermal:', err.message);
      console.error('Pastikan printer ON, terhubung dengan benar, dan konfigurasi IP/Port/USB/Serial sudah sesuai.');
    });
} catch (e) {
  console.error('Error inisialisasi printer thermal:', e.message);
  console.error('Pastikan library printer sudah terinstal dan parameter koneksi benar.');
}

// Fungsi untuk memicu cetak
const triggerPrint = async (loketId, nomorAntrian) => {
  if (!printer) {
    console.error('Printer belum terinisialisasi atau gagal terhubung.');
    return;
  }

  try {
    // Reset printer untuk memastikan bersih
    printer.alignCenter(); // Tengahkan semua teks secara default
    printer.setTextSize(0, 0); // Ukuran teks normal
    printer.setBold(false); // Tidak tebal
    printer.newLine(); // Baris kosong untuk spasi atas

    // Logo (Simulasi - ini akan dicetak sebagai baris kosong atau tidak sama jika tidak ada gambar bitmap)
    // Jika Anda ingin mencetak logo, Anda harus mengkonversi gambar ke format bitmap (monochrome)
    // dan menggunakan printer.printImage(bitmapData);
    // Untuk saat ini, kita bisa mencetak beberapa baris kosong sebagai placeholder logo.
    printer.newLine();
    printer.newLine();
    printer.newLine(); // Placeholder untuk tinggi logo

    // Header Aplikasi
    printer.setBold(true); // Tebal
    printer.setTextSize(0, 0); // Ukuran normal
    printer.print('LAYANAN ANTRIAN KEMENTERIAN');
    printer.newLine();
    printer.print('HUKUM KEPULAUAN RIAU');
    printer.setBold(false); // Kembali normal

    printer.newLine();
    printer.newLine();

    // Antrian No:
    printer.setTextSize(0, 0); // Normal
    printer.print('Antrian No :');
    printer.newLine();

    // Nomor Antrean Utama
    printer.setTextSize(4, 4); // Sangat besar (sesuai gambar)
    printer.setBold(true); // Lebih tebal untuk nomor antrean
    printer.print(`${nomorAntrian}`); // Hanya nomornya saja
    printer.setBold(false); // Kembali normal
    printer.setTextSize(0, 0); // Kembali normal

    printer.newLine();
    printer.newLine();

    // Locket :
    printer.print(`Locket : ${loketId}`);
    printer.newLine();
    printer.newLine();
    printer.newLine(); // Spasi lebih untuk pesan

    // Pesan
    printer.print('Mohon menunggu panggilan Anda. Terima kasih.');
    printer.newLine();

    // Tanggal dan Waktu (sesuai format gambar)
    // Membuat format tanggal "Kamis, 22 Maret 2025"
    const date = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('id-ID', options);
    printer.print(formattedDate);
    printer.newLine();
    printer.newLine();

    printer.cut(); // Potong kertas

    // Untuk DummyAdapter, execute() akan menghasilkan output ke konsol.
    await printer.execute(); // Eksekusi perintah cetak
    console.log(`Berhasil mencetak nomor: ${nomorAntrian} untuk Loket: ${loketId} (Simulasi Cetak Selesai).`);
    console.log('\n--- Tampilan Cetak di Konsol (Simulasi) ---');
    const printedContent = printer.getText(); // Ambil konten yang dicetak
    console.log(printedContent);
    console.log('-------------------------------------------\n');
  } catch (error) {
    console.error('Error saat mencetak ke printer:', error);
  }
};

// Socket Io Configuraituion
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinLoket', (loket) => {
    socket.join(`loket-${loket}`);
    console.log(`Socket ${socket.id} joined room loket-${loket}`);
  });

  socket.on('joinTV', () => {
    socket.join('tv-display');
    console.log(`Socket ${socket.id} joined TV display room`);
  });

  // Event baru untuk memanggil antrean berikutnya dari loket
  socket.on('callNextQueue', async ({ loketId }) => {
    try {
      const loketNum = parseInt(loketId);
      const queue = await QueueData.findOne({ locket: loketNum });

      if (queue && queue.nextQueue <= queue.totalQueue) {
        queue.lastTakenNumber = queue.currentQueue;
        queue.currentQueue = queue.nextQueue;
        queue.nextQueue++;

        await queue.save();

        const currentQueueNumber = queue.currentQueue;

        // Kirim update ke semua yang mendengarkan 'antrianDipanggil' (terutama TV)
        // Kirim loketId dalam format 'loket1' untuk konsistensi di frontend
        io.to('tv-display').emit('antrianDipanggil', {
          loketId: `loket${loketNum}`, // Kirim dalam format 'loket1'
          nomorAntrian: currentQueueNumber,
          locketData: {
            // Kirim data locket lengkap untuk pembaruan di TV
            locket: loketNum,
            currentQueue: queue.currentQueue,
            lastTakenNumber: queue.lastTakenNumber,
            totalQueue: queue.totalQueue,
            nextQueue: queue.nextQueue,
          },
        });

        // Juga kirim update ke loket yang memanggil agar UI-nya diperbarui
        io.to(`loket-${loketNum}`).emit('locketDataUpdated', {
          locket: loketNum,
          currentQueue: queue.currentQueue,
          lastTakenNumber: queue.lastTakenNumber,
          totalQueue: queue.totalQueue,
          nextQueue: queue.nextQueue,
        });

        console.log(`Loket ${loketId} called number ${currentQueueNumber}`);
      } else {
        console.log(`No more queues or locket not found for loketId: ${loketId}`);
        // Optionally, emit an error or info back to the calling loket
        io.to(`loket-${loketNum}`).emit('noMoreQueue', { loketId: `loket${loketNum}`, message: 'Tidak ada antrian lagi.' });
      }
    } catch (error) {
      console.error('Error calling next queue:', error);
      // Optionally, emit an error back to the calling loket
      io.to(`loket-${parseInt(loketId)}`).emit('callQueueError', {
        loketId: `loket${parseInt(loketId)}`,
        message: 'Terjadi kesalahan saat memanggil antrean.',
      });
    }
  });

  // Event untuk menambahkan antrean dari halaman pengambilan
  socket.on('requestQueueNumber', async ({ locketId }) => {
    try {
      const loketNum = parseInt(locketId);
      const queue = await QueueData.findOne({ locket: loketNum });

      if (queue) {
        // Nomor antrean yang akan diberikan adalah totalQueue + 1
        const newQueueNumber = queue.totalQueue + 1;
        queue.totalQueue++;

        await queue.save();

        // await triggerPrint(loketNum, newQueueNumber);

        // Kirim nomor antrean yang baru diambil kembali ke klien yang meminta
        socket.emit('queueNumberAssigned', {
          locketId: loketNum,
          nomorAntrian: newQueueNumber,
        });

        // Broadcast update totalQueue HANYA ke loket yang spesifik (e.g., loket-1, loket-2)
        io.to(`loket-${loketNum}`).emit('totalQueueUpdatedForLocket', {
          locket: loketNum,
          totalQueue: newQueueNumber,
        });

        console.log(`Antrean baru ${newQueueNumber} diberikan untuk Loket ${loketNum}`);
      } else {
        console.log(`Locket ${loketNum} not found.`);
        socket.emit('queueAssignmentError', {
          message: `Locket ${loketNum} tidak ditemukan.`,
        });
      }
    } catch (error) {
      console.error('Error assigning new queue number:', error);
      socket.emit('queueAssignmentError', {
        message: 'Terjadi kesalahan saat mengambil nomor antrean.',
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3002;
const connectDb = require('./ConnectDb');
const path = require('path');
const fs = require('fs');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
app.use(morgan('common'));
app.use(cors());
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// Database Connection
connectDb();

// Configuration router
const authRoute = require('./Router/Auth');
const queueRoute = require('./Router/Queue');
const fileRoute = require('./Router/File');

// Multer Configuration for error and validation
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/assets');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const fileFilter = function (req, file, cb) {
  const allowedTypes = /mp4|mov|avi/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Hanya file gambar dan video yang diperbolehkan!'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

app.post(
  '/upload/saveFile',
  verification,
  (req, res, next) => {
    // Membungkus upload.single('file') di dalam fungsi middleware untuk menangkap error Multer
    upload.single('file')(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // Error dari Multer (misalnya LIMIT_FILE_SIZE, LIMIT_FILE_COUNT, dll.)
        console.error('Multer Error during upload:', err.message);
        // Memberikan response error yang lebih informatif ke klien
        return res.status(400).json({
          error: `Gagal mengunggah file: ${err.message}. Pastikan ukuran file tidak lebih dari 50MB dan formatnya adalah video (mp4, mov, avi).`,
        });
      } else if (err) {
        // Error kustom dari fileFilter atau error lain yang tidak terkait Multer spesifik
        console.error('General Upload Error:', err.message);
        return res.status(400).json({ error: `Gagal mengunggah file: ${err.message}` });
      }
      // Jika tidak ada error dari Multer, lanjutkan ke handler route utama berikutnya
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        // Ini akan tertangkap jika fileFilter Multer menolak file
        return res.status(400).json({ error: 'Tidak ada file yang diunggah atau format tidak valid (hanya mp4, mov, avi).' });
      }

      let video = await VideoData.findOne(); //
      const fileBaru = req.file.filename; //
      let fileLama = null; //

      console.log('DEBUG: Final filename string to be saved to DB:', fileBaru); // Tambahkan ini

      const publicBaseUrl = process.env.BASE_URL; //

      if (!video) {
        video = new VideoData({ filename: `${publicBaseUrl}/assets/${fileBaru}` }); //
      } else {
        fileLama = video.filename; //
        video.filename = `${publicBaseUrl}/assets/${fileBaru}`; //
      }

      const savedVideo = await video.save(); //

      // Hapus file lama jika ada
      if (fileLama) {
        //
        const parsedUrl = new URL(fileLama); //
        const filenameToDelete = path.basename(parsedUrl.pathname); //

        const oldPath = path.join(__dirname, 'public', 'assets', filenameToDelete); //

        if (fs.existsSync(oldPath)) {
          //
          fs.unlinkSync(oldPath); //
          console.log(`File lama dihapus: ${filenameToDelete} dari ${oldPath}`); //
        } else {
          console.log(`File lama tidak ditemukan di path: ${oldPath}`); //
        }
      }

      return res.status(200).json({
        message: fileLama ? 'Berhasil memperbarui Video / Gambar' : 'Berhasil menambahkan Video / Gambar', //
        filename: savedVideo.filename, //
      });
    } catch (error) {
      console.error('Server error during video upload process:', error); // Log error lebih spesifik
      return res.status(500).json({ error: 'Ada kesalahan pada server saat proses upload video, silahkan coba lagi' });
    }
  }
);
// Route Without upload File
app.use('/auth', authRoute);
app.use('/locket', queueRoute);
app.use('/upload', fileRoute);

app.use('*', (req, res) => {
  res.status(500).json('Undifined Url , Try Again');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`You are Running in PORT ${PORT}`);
});
