// frontend/src/services/news.js
import api from './auth';

export const getNews = async () => {
  try {
    const response = await api.get('/news');
    return response.data;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
};