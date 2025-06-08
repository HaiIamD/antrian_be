const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const queueHistorySchema = new Schema(
  {
    locket: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: true,
    },
    day: {
      type: Date,
      require: true,
    },
    totalQueue: {
      type: Number,
      default: 0,
    },
    currentQueue: {
      type: Number,
      default: 0,
    },
    nextQueue: {
      type: Number,
      default: 1,
    },
    lastTakenNumber: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const HistoryData = mongoose.model('QueueHistory', queueHistorySchema);
module.exports = HistoryData;
