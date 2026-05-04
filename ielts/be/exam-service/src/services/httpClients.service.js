const axios = require('axios');

function createClient(baseURL) {
  return axios.create({
    baseURL,
    timeout: 120000,
  });
}

const aiClient = createClient(process.env.AI_SERVICE_URL || 'http://localhost:3012');
const readingClient = createClient(process.env.READING_SERVICE_URL || 'http://localhost:3002');
const listeningClient = createClient(process.env.LISTENING_SERVICE_URL || 'http://localhost:3003');
const writingClient = createClient(process.env.WRITING_SERVICE_URL || 'http://localhost:3004');
const speakingClient = createClient(process.env.SPEAKING_SERVICE_URL || 'http://localhost:3008');

module.exports = {
  aiClient,
  readingClient,
  listeningClient,
  writingClient,
  speakingClient,
};
