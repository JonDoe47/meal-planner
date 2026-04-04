import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err.response?.data || err)
  }
)

export const authApi = {
  login: (data) => api.post('/auth/login', data)
}

export const categoryApi = {
  list: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`)
}

export const dishApi = {
  list: (params) => api.get('/dishes', { params }),
  get: (id) => api.get(`/dishes/${id}`),
  create: (formData) => api.post('/dishes', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/dishes/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/dishes/${id}`)
}

export const mealApi = {
  list: (params) => api.get('/mealplans', { params }),
  save: (data) => api.post('/mealplans', data),
  delete: (id) => api.delete(`/mealplans/${id}`)
}

export const biliApi = {
  getCover: (url) => api.get('/bilibili/cover', { params: { url } }),
  analyze: (url) => api.post('/bilibili/analyze', { url })
}

export const userApi = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
  delete: (id) => api.delete(`/users/${id}`)
}

export const dishRequestApi = {
  list: () => api.get('/dish-requests'),
  create: (data) => api.post('/dish-requests', data),
  handle: (id, data) => api.put(`/dish-requests/${id}`, data),
  delete: (id) => api.delete(`/dish-requests/${id}`)
}

export const ingredientApi = {
  summary: (params) => api.get('/ingredients/summary', { params }),
  byOrder: (params) => api.get('/ingredients/by-order', { params })
}
