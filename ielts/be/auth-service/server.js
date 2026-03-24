require('dotenv').config();
const connectDB = require('./src/config/db');
const app = require('./app');

// Connect to database
connectDB();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
});
