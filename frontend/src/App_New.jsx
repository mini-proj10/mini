import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import PreferenceSelection from './components/PreferenceSelection';
import ResultPage from './components/ResultPage';
import RecipePage from './components/RecipePage';
import RestaurantPage from './components/RestaurantPage';
import { weatherAPI, recommendAPI, recipeAPI } from './services/api';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [mode, setMode] = useState(null);
  const [location, setLocation] = useState('서울');
  const [weather, setWeather] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 앱 시작 시 날씨 정보 가져오기
  useEffect(() => {
    fetchWeather();
  }, [location]);

  const fetchWeather = async () => {
    try {
      const response = await weatherAPI.getWeather(location);
      setWeather(response.data);
    } catch (err) {
      console.error('날씨 정보 가져오기 실패:', err);
    }
  };

  const handleSelectMode = (selectedMode) => {
    setMode(selectedMode);
    setCurrentPage('preference');
  };

  const handleSubmitPreference = async (preferences) => {
    setLoading(true);
    setError(null);

    try {
      const requestData = {
        location,
        food_type: preferences.foodType,
        mood: preferences.mood,
        num_people: preferences.numPeople,
        moods: preferences.moods
      };

      const response = await recommendAPI.getRecommendation(requestData);
      setRecommendation(response.data);
      setCurrentPage('result');
    } catch (err) {
      setError('추천을 가져오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecipe = async (menuName) => {
    setLoading(true);
    try {
      const numServings = mode === 'single' ? 1 : recommendation?.weather_info?.num_people || 1;
      const response = await recipeAPI.getRecipe(menuName, numServings);
      setRecipe(response.data);
      setCurrentPage('recipe');
    } catch (err) {
      setError('레시피를 가져오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFindRestaurant = (menuName) => {
    setCurrentPage('restaurant');
  };

  const handleBack = () => {
    setCurrentPage('home');
    setMode(null);
    setRecommendation(null);
    setRecipe(null);
  };

  const handleBackToPreference = () => {
    setCurrentPage('preference');
  };

  const handleBackToResult = () => {
    setCurrentPage('result');
  };

  // 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold">AI가 메뉴를 추천하고 있어요...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500">
      {/* 에러 메시지 */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {error}
        </div>
      )}

      {/* 페이지 라우팅 */}
      {currentPage === 'home' && (
        <HomePage
          onSelectMode={handleSelectMode}
          weather={weather}
        />
      )}

      {currentPage === 'preference' && (
        <PreferenceSelection
          mode={mode}
          onSubmit={handleSubmitPreference}
          onBack={handleBack}
          weather={weather}
        />
      )}

      {currentPage === 'result' && (
        <ResultPage
          recommendation={recommendation}
          weather={weather}
          onBack={handleBack}
          onGetRecipe={handleGetRecipe}
          onFindRestaurant={handleFindRestaurant}
        />
      )}

      {currentPage === 'recipe' && (
        <RecipePage
          recipe={recipe}
          onBack={handleBack}
        />
      )}

      {currentPage === 'restaurant' && (
        <RestaurantPage
          menuName={recommendation?.menu}
          location={location}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

export default App;

