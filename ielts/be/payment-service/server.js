const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const paymentRoutes = require('./src/routes/payment.routes');

// Load environment variables
dotenv.config();

// Connect MongoDB
connectDB();

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

app.use('/', paymentRoutes);

const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
  console.log(`🚀 Payment service running on port ${PORT}`);
});
