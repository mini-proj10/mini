import React, { useState } from 'react';
import WeatherDisplay from './components/WeatherDisplay';
import LunchRecommendation from './components/LunchRecommendation';
import { weatherAPI, recommendAPI } from './services/api';

function App() {
  const [location, setLocation] = useState('서울');
  const [spicyLevel, setSpicyLevel] = useState('보통');
  const [budget, setBudget] = useState('중간');
  const [foodType, setFoodType] = useState('상관없음');
  
  const [weather, setWeather] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const locations = ['서울', '강남', '여의도', '판교', '부산', '대구', '인천', '광주', '대전'];
  const spicyLevels = ['안 매움', '보통', '매움', '아주 매움'];
  const budgets = ['저렴', '중간', '비싼'];
  const foodTypes = ['상관없음', '한식', '중식', '일식', '양식', '분식'];

  const handleRecommend = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 날씨 정보 조회
      const weatherResponse = await weatherAPI.getWeather(location);
      setWeather(weatherResponse.data);

      // AI 메뉴 추천
      const recommendResponse = await recommendAPI.getRecommendation({
        location,
        spicy_level: spicyLevel,
        budget,
        food_type: foodType,
      });
      setRecommendation(recommendResponse.data);
    } catch (err) {
      setError('추천을 가져오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            🍱 AI 점심 추천
          </h1>
          <p className="text-white text-lg">
            날씨를 고려한 완벽한 점심 메뉴를 추천해드립니다
          </p>
        </div>

        {/* 설정 패널 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">설정</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                위치
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                매운맛 정도
              </label>
              <select
                value={spicyLevel}
                onChange={(e) => setSpicyLevel(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {spicyLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                가격대
              </label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {budgets.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                음식 종류
              </label>
              <select
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {foodTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleRecommend}
            disabled={loading}
            className={`w-full py-3 px-6 rounded-lg font-bold text-white text-lg transition-all ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transform hover:scale-105'
            }`}
          >
            {loading ? '추천 중...' : '메뉴 추천 받기'}
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* 날씨 정보 */}
        {weather && <WeatherDisplay weather={weather} />}

        {/* 추천 결과 */}
        {recommendation && <LunchRecommendation recommendation={recommendation} />}

        {/* 안내 메시지 */}
        {!weather && !recommendation && !loading && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 text-lg">
              위치와 선호도를 선택하고 '메뉴 추천 받기' 버튼을 눌러주세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

