const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/db');
const app = require('./app');

// Connect MongoDB
connectDB();

const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});
