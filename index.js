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

const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
const puppeteer = require('puppeteer');
const { print } = require('pdf-to-printer');

const triggerPrint = async (loketId, nomorAntrian) => {
  const htmlContent = `
    <html>
      <head>
        <style>
          /* Pastikan tidak ada margin di html dan body */
          html, body,head {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            width: 80mm;
            text-align: center;
          }
          .header { font-weight: bold; font-size: 14px; }
          .sub-header { font-size: 14px; margin-bottom: 20px; }
          .label { font-size: 16px; margin-bottom: 5px;}
          .nomor-antrian { 
            font-size: 80px;
            font-weight: bold; 
            line-height: 1;
            margin-bottom: 20px;
          }
          .container {
            padding: 10px; /* Menambahkan sedikit padding agar konten tidak menempel di garis */
        }
          .locket { font-size: 16px; margin-bottom: 20px;}
          .footer { font-size: 12px; }
          .tanggal { font-size: 12px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">LAYANAN ANTRIAN KEMENTERIAN</div>
          <div class="sub-header">HUKUM KEPULAUAN RIAU</div>
          
          <div class="label">Antrian No :</div>
          <div class="nomor-antrian">${nomorAntrian}</div>
          
          <div class="locket">Locket : ${loketId}</div>
          
          <div class="footer">Mohon menunggu panggilan Anda. Terima kasih.</div>
          
          <div class="tanggal">${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </body>
    </html>
  `;

  const pdfPath = path.join(__dirname, 'temp_struk.pdf');

  try {
    console.log('Membuat PDF...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // =================================================================
    // KUNCI UTAMA PERBAIKAN ADA DI SINI
    // =================================================================
    // 1. Ukur tinggi konten secara dinamis dari dalam browser
    const contentHeight = await page.evaluate(() => {
      // Menggunakan scrollHeight untuk mendapatkan tinggi total dari konten
      return document.body.scrollHeight;
    });

    console.log(`Tinggi konten terukur: ${contentHeight}px`);
    // =================================================================

    // 2. Membuat PDF dengan tinggi yang presisi sesuai hasil pengukuran
    await page.pdf({
      path: pdfPath,
      width: '80mm',
      height: `280px`, // Gunakan tinggi dinamis yang sudah diukur
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await browser.close();
    console.log(`PDF berhasil dibuat dengan tinggi presisi: ${pdfPath}`);

    const options = {
      printer: 'POS-80',
    };

    console.log(`Mengirim ke printer: ${options.printer}...`);
    await print(pdfPath, options);
    console.log('✅ Berhasil mengirim tugas cetak ke printer.');
  } catch (error) {
    console.error('❌ Error saat proses cetak:', error);
  } finally {
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
      console.log('File PDF sementara dihapus.');
    }
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
const Backupdatabase = require('./Backupdb.js');
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

server.listen(PORT, '0.0.0.0', async () => {
  // 1. Tambahkan async di sini
  console.log(`You are Running in PORT ${PORT}`);
});
