const BannerData = require('../Schema/Banner');
const VideoData = require('../Schema/Video');

const saveSlider = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      text = '';
    }
    const banner = await BannerData.findOne();

    if (!banner) {
      const newBanner = new BannerData({ text });
      const savebanner = await newBanner.save();
      if (savebanner) {
        return res.status(200).json({ message: 'Berhasil menambahkan slider', text: savebanner.text });
      } else {
        res.status(500).json('Gagal menambahkan slider');
      }
    } else {
      banner.text = text;
      const updatedBanner = await banner.save();
      return res.status(200).json({ message: 'Berhasil memperbarui slider', text: updatedBanner.text });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Ada kesalahan pada server, silahkan coba lagi' });
  }
};

const getSlider = async (req, res) => {
  try {
    const findBanner = await BannerData.findOne({});
    if (findBanner) {
      res.status(200).json({ text: findBanner.text });
    } else {
      res.status(200).json({ text: '' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Ada kesalahan pada server, silahkan coba lagi' });
  }
};

const getFile = async (req, res) => {
  try {
    const Video = await VideoData.findOne({});
    if (Video) {
      res.status(200).json({ path: Video.filename });
    } else {
      res.status(200).json({ path: '' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Ada kesalahan pada server, silahkan coba lagi' });
  }
};

module.exports = { saveSlider, getSlider, getFile };
