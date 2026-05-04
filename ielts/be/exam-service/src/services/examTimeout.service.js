const { expireDueAttempts } = require('./examLifecycle.service');

let intervalId = null;

async function runTimeoutSweep() {
  try {
    await expireDueAttempts();
  } catch (error) {
    console.error('Exam timeout sweep failed:', error.message);
  }
}

function startTimeoutSweeper() {
  if (intervalId) return;
  intervalId = setInterval(runTimeoutSweep, 30 * 1000);
}

function stopTimeoutSweeper() {
  if (!intervalId) return;
  clearInterval(intervalId);
  intervalId = null;
}

module.exports = {
  startTimeoutSweeper,
  stopTimeoutSweeper,
  runTimeoutSweep,
};
