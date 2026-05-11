import api from './axios.js';

export const resumesApi = {
  list:      ()        => api.get('/resumes'),
  create:    (data)    => api.post('/resumes',           data),
  update:    (id, data)=> api.put(`/resumes/${id}`,      data),
  delete:    (id)      => api.delete(`/resumes/${id}`),
  setActive: (id)      => api.patch(`/resumes/${id}/set-active`),
};
