const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/db');
const app = require('./app');

// Mongo
connectDB();

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Billing service running on port ${PORT}`);
});