require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3004;

// Connect DB and start Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Writing DB Connected');
    app.listen(PORT, () => {
      console.log(`Writing Service is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });