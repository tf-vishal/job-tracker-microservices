import api from './axios.js';

export const jobsApi = {
  list:   (status) => api.get('/jobs', { params: status ? { status } : {} }),
  stats:  ()       => api.get('/jobs/stats'),
  create: (data)   => api.post('/jobs',      data),
  update: (id, data)=> api.put(`/jobs/${id}`, data),
  delete: (id)     => api.delete(`/jobs/${id}`),
};
