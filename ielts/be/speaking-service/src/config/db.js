const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set!');
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log('Speaking DB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // Retry after 5 seconds instead of crashing
    console.log('Retrying DB connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
}

module.exports = connectDB;
