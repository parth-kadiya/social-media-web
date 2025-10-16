// client/src/services/api.js

import axios from 'axios';

// Yahan se '/api' hata dein, agar default value me hai to.
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  // Ab baseURL me '/api' ko yahan jodein.
  baseURL: `${baseURL}/api`
});

export default api;