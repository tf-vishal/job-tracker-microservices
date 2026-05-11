import api from './axios.js';

export const authApi = {
  register: (data)        => api.post('/auth/register', data),
  login:    (data)        => api.post('/auth/login',    data),
  me:       ()            => api.get('/auth/me'),
  refresh:  (refreshToken)=> api.post('/auth/refresh',  { refreshToken }),
  logout:   ()            => api.post('/auth/logout'),
};
