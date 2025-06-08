const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const videoSchema = new Schema(
  {
    filename: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const VideoData = mongoose.model('Video', videoSchema);
module.exports = VideoData;
