require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const writingRoutes = require('./src/routes/writing.routes');
const submissionRoutes = require('./src/routes/submission.routes');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', writingRoutes);
app.use('/submissions', submissionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'writing-service' });
});



// Connect DB và bật Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Writing DB Connected');
    
    // ĐÂY CHÍNH LÀ LỆNH MỞ CỬA BỊ THIẾU
    app.listen(PORT, () => {
      console.log(`🚀 Writing Service is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });