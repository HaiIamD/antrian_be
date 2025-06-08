const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userAuth = new Schema(
  {
    userName: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      min: 5,
    },
    locket: {
      type: Number,
      enum: [1, 2, 3, 4],
      validate: {
        validator: function (value) {
          if (this.role === 'staff') {
            return value !== undefined && value !== null;
          }
          return true;
        },
        message: 'Locket is required for staff users.',
      },
    },
    role: {
      type: String,
      enum: ['staff', 'admin'],
      default: 'staff',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('UserAuth', userAuth);
module.exports = User;
