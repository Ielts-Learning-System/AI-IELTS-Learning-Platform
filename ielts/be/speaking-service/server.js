require('dotenv').config();
const connectDB = require('./src/config/db');
const app = require('./app');

connectDB();

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
  console.log(`Speaking Service is running on port ${PORT}`);
});
