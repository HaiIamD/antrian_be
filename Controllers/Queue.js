const LocketData = require('../Schema/Queue');
const HistoryData = require('../Schema/queueHistory');
const moment = require('moment-timezone');

const getLocketData = async (req, res) => {
  try {
    const { locket } = req.params;
    const findLocketData = await LocketData.findOne({ locket: locket });

    if (!findLocketData) return res.status(404).json({ error: 'Locket data tidak ditemukan, silahkan hubungi administrator' });

    res.status(200).json({
      _id: findLocketData._id,
      locket: findLocketData.locket,
      totalQueue: findLocketData.totalQueue,
      currentQueue: findLocketData.currentQueue,
      nextQueue: findLocketData.nextQueue,
      lastTakenNumber: findLocketData.lastTakenNumber,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Ada kesalahan pada server, silahkan coba lagi' });
  }
};

const saveLocketData = async (req, res) => {
  try {
    const { locket } = req.body;
    const findLocketData = await LocketData.findOne({ locket: locket });

    if (!findLocketData) return res.status(404).json({ error: 'Locket data tidak ditemukan, silahkan hubungi administrator' });

    const startOfDay = moment().tz('Asia/Jakarta').startOf('day').toDate();
    const endOfDay = moment().tz('Asia/Jakarta').endOf('day').toDate();
    const existingHistory = await HistoryData.findOne({
      locket: locket,
      day: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existingHistory) {
      existingHistory.totalQueue += findLocketData.totalQueue;
      existingHistory.currentQueue += findLocketData.currentQueue;
      existingHistory.nextQueue += findLocketData.currentQueue;
      existingHistory.lastTakenNumber += findLocketData.currentQueue;
      await existingHistory.save();
    } else {
      const today = moment().tz('Asia/Jakarta').toDate();

      const saveQueue = new HistoryData({
        locket: findLocketData.locket,
        day: today,
        totalQueue: findLocketData.totalQueue,
        currentQueue: findLocketData.currentQueue,
        nextQueue: findLocketData.nextQueue,
        lastTakenNumber: findLocketData.lastTakenNumber,
      });

      const savedQueue = await saveQueue.save();
      if (!savedQueue) {
        return res.status(500).json({ error: 'Gagal menyimpan data antrian ke histori' });
      }
    }

    Object.assign(findLocketData, {
      totalQueue: 0,
      currentQueue: 0,
      nextQueue: 1,
      lastTakenNumber: 0,
    });
    await findLocketData.save();

    return res.status(200).json({ message: 'Berhasil melakukan save antrian' });
  } catch (error) {
    res.status(500).json({ error: 'Ada kesalahan pada server, silahkan coba lagi' });
  }
};

const getAllLocketData = async (req, res) => {
  try {
    const findLocketData = await LocketData.find({}).select('_id locket currentQueue');

    if (!findLocketData) return res.status(404).json({ error: 'Tidak ada locket yang di temukan, silahkan hubungi administrator' });

    res.status(200).json(findLocketData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Ada kesalahan pada server, silahkan coba lagi' });
  }
};

const getWeekLocketData = async (req, res) => {
  try {
    const now = moment().tz('Asia/Jakarta');
    const hariIndonesia = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    let endDate = now.clone();

    let daysToSubtract = 0;
    const currentDayOfWeek = now.day();

    if (currentDayOfWeek === 0) {
      daysToSubtract = 2;
    } else if (currentDayOfWeek === 1) {
      daysToSubtract = 3;
    } else if (currentDayOfWeek === 6) {
      daysToSubtract = 1;
    } else {
      daysToSubtract = 1;
    }

    endDate.subtract(daysToSubtract, 'days').endOf('day');

    const datesToFetch = [];
    let tempDate = endDate.clone();

    while (datesToFetch.length < 5) {
      const dayOfWeek = tempDate.day();

      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        datesToFetch.unshift(tempDate.format('YYYY-MM-DD'));
      }
      tempDate.subtract(1, 'day');
    }

    const queryStartDate = moment(datesToFetch[0]).tz('Asia/Jakarta').startOf('day').toDate();
    const queryEndDate = moment(datesToFetch[datesToFetch.length - 1])
      .tz('Asia/Jakarta')
      .endOf('day')
      .toDate();

    const findLocketData = await HistoryData.find({
      day: {
        $gte: queryStartDate,
        $lte: queryEndDate,
      },
    }).select('locket totalQueue day');

    if (!findLocketData || findLocketData.length === 0) {
      return res.status(404).json({ error: 'Tidak ada data locket yang ditemukan untuk 7 hari kerja terakhir.' });
    }

    // Buat objek untuk menyimpan totalQueue per hari dan locket
    const dailyData = {}; // { 'YYYY-MM-DD': { 'Locket 1': total, 'Locket 2': total } }

    findLocketData.forEach((data) => {
      const dateKey = moment(data.day).tz('Asia/Jakarta').format('YYYY-MM-DD');
      if (datesToFetch.includes(dateKey)) {
        // Hanya proses tanggal yang ada di datesToFetch
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = {};
        }
        const locketName = `Locket ${data.locket}`;
        dailyData[dateKey][locketName] = (dailyData[dateKey][locketName] || 0) + data.totalQueue;
      }
    });

    const labels = [];
    const datasetsMap = new Map();
    const locketColors = {
      'Locket 1': { borderColor: '#00003c', backgroundColor: '#00003c' },
      'Locket 2': { borderColor: '#1abc9c', backgroundColor: '#1abc9c' },
      'Locket 3': { borderColor: '#00d4ff', backgroundColor: '#00d4ff' },
      'Locket 4': { borderColor: '#ff69b4', backgroundColor: '#ff69b4' },
    };

    // Inisialisasi datasets dengan array kosong untuk data
    for (const locketName in locketColors) {
      const colors = locketColors[locketName];
      datasetsMap.set(locketName, {
        label: locketName,
        data: [],
        borderColor: colors.borderColor,
        backgroundColor: colors.backgroundColor,
        tension: 0,
        fill: false,
      });
    }

    // Isi labels dan datasets berdasarkan datesToFetch (urutan sudah benar)
    datesToFetch.forEach((dateStr) => {
      const dateMoment = moment(dateStr).tz('Asia/Jakarta');
      const dayOfWeek = dateMoment.day();
      labels.push(hariIndonesia[dayOfWeek] + ' (' + dateMoment.format('DD/MM') + ')');

      for (const locketName in locketColors) {
        const locketDataset = datasetsMap.get(locketName);
        // Ambil data dari dailyData, jika tidak ada, default ke 0
        locketDataset.data.push(dailyData[dateStr] ? dailyData[dateStr][locketName] || 0 : 0);
      }
    });

    const datasets = Array.from(datasetsMap.values());

    res.status(200).json({ labels, datasets });
  } catch (error) {
    console.error('Error fetching week locket data:', error);
    res.status(500).json({ error: 'Ada kesalahan pada server, silahkan coba lagi.' });
  }
};

const getFilterLocketData = async (req, res) => {
  try {
    const daysFilter = parseInt(req.query.days) || 7;

    const now = new Date();
    const startDate = new Date(now);
    startDate.setUTCDate(now.getUTCDate() - daysFilter);
    startDate.setUTCHours(0, 0, 0, 0);

    const locketColors = {
      'Locket 1': '#0d0d84',
      'Locket 2': '#0acf65',
      'Locket 3': '#1ddfff',
      'Locket 4': '#ff5cc4',
    };

    const findLocketData = await HistoryData.aggregate([
      {
        $match: {
          day: {
            $gte: startDate,
            $lte: now,
          },
        },
      },
      {
        $group: {
          _id: '$locket',
          totalQueue: { $sum: '$totalQueue' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    if (!findLocketData || findLocketData.length === 0) {
      return res.status(404).json({ error: 'Tidak ada data locket yang ditemukan dalam rentang waktu ini.' });
    }

    // Susun data sesuai format yang diminta untuk frontend
    const labels = [];
    const dataValues = [];
    const backgroundColors = [];

    findLocketData.forEach((item) => {
      const locketLabel = `Locket ${item._id}`;
      labels.push(locketLabel);
      dataValues.push(item.totalQueue);
      backgroundColors.push(locketColors[locketLabel] || '#cccccc');
    });

    const formattedData = {
      labels: labels,
      datasets: [
        {
          label: `Kunjungan ${daysFilter} Hari`,
          data: dataValues,
          backgroundColor: backgroundColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 15,
        },
      ],
    };

    res.status(200).json(formattedData);
  } catch (error) {
    res.status(500).json({ error: 'Ada kesalahan pada server, silahkan coba lagi.' });
  }
};

module.exports = { getLocketData, saveLocketData, getAllLocketData, getWeekLocketData, getFilterLocketData };
