const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/ielts_reading';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('📚 Reading DB Connected!');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    // Không crash app, log lỗi và tiếp tục
    setTimeout(() => connectDB(), 5000); // Retry sau 5 giây
  }
};

module.exports = connectDB;
