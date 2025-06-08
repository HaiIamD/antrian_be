const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bannerSchema = new Schema(
  {
    text: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const BannerData = mongoose.model('Banner', bannerSchema);
module.exports = BannerData;
