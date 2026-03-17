const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/ielts_lessons';

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Lesson DB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    setTimeout(() => connectDB(), 5000);
  }
};

module.exports = connectDB;
