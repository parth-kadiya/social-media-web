// client/src/services/api.js

import axios from 'axios';

const apiURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: apiURL
});

export default api;