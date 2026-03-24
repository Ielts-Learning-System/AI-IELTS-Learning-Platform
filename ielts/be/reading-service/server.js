require('dotenv').config();
const connectDB = require('./src/config/db');
const app = require('./app');

// ====== Database Connection ======
connectDB();

// ====== Start Server ======
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`📖 Reading Service is running on port ${PORT}`);
});