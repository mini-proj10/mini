import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const weatherAPI = {
  getWeather: async (location, coords = null) => {
    let url = `/api/weather?location=${encodeURIComponent(location)}`;
    if (coords && coords.latitude && coords.longitude) {
      url += `&lat=${coords.latitude}&lng=${coords.longitude}`;
    }
    const response = await api.get(url);
    return response.data;
  },
};

export const recommendAPI = {
  getRecommendation: async (data) => {
    const response = await api.post('/api/recommend', data);
    return response.data;
  },
};

export const recipeAPI = {
  getRecipe: async (menuName, numServings = 1) => {
    const response = await api.post('/api/recipe', {
      menu_name: menuName,
      num_servings: numServings
    });
    return response.data;
  },
};

export const cafeteriaAPI = {
  getRecommendation: async (location, cafeteriaMenu, userLocation = null, preferExternal = true) => {
    const response = await api.post('/api/recommend-from-cafeteria', {
      location,
      cafeteria_menu: cafeteriaMenu,
      user_location: userLocation,
      prefer_external: preferExternal  // CAM 모드 활성화
    });
    return response.data;
  },
};

export default api;

