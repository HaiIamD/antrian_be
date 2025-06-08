const mongoose = require('mongoose');

const connection = async () => {
  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log('Already Connect To Database');
  } catch (error) {
    console.log('Failed TO connect with Database');
  }
};

module.exports = connection;
