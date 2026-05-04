const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const examRoutes = require('./src/routes/exam.routes');

const app = express();

app.use(cors());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

app.use('/', examRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'exam-service' });
});

app.use((err, req, res, next) => {
  console.error('exam-service error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

module.exports = app;
