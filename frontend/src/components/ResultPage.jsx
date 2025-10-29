import React, { useState } from 'react';

const ResultPage = ({ recommendation, weather, onBack, onGetRecipe, onFindRestaurant }) => {
  const [showOptions, setShowOptions] = useState(false);

  if (!recommendation) return null;

  const getCategoryEmoji = (category) => {
    const emojis = {
      '한식': '🍚',
      '중식': '🥢',
      '일식': '🍱',
      '양식': '🍝',
      '분식': '🍜',
    };
    return emojis[category] || '🍽️';
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      {/* 우측 상단 날씨 */}
      {weather && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="text-4xl">
              {weather.sky_condition === '맑음' ? '☀️' : '🌤️'}
            </div>
            <div>
              <p className="text-sm text-gray-600">{weather.location}</p>
              <p className="text-2xl font-bold text-gray-800">{weather.temperature}°C</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <button
          onClick={onBack}
          className="mb-4 text-gray-600 hover:text-gray-800 flex items-center"
        >
          <span className="mr-2">←</span> 처음으로
        </button>

        {/* 추천 결과 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{getCategoryEmoji(recommendation.category)}</div>
          <h2 className="text-5xl font-bold text-purple-600 mb-4">
            {recommendation.menu}
          </h2>
          <span className="inline-block bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-semibold">
            {recommendation.category}
          </span>
        </div>

        {/* 추천 이유 */}
        <div className="bg-purple-50 rounded-lg p-6 mb-6">
          <p className="text-gray-700 leading-relaxed mb-2">
            <span className="font-bold text-purple-700">💡 추천 이유:</span>
          </p>
          <p className="text-gray-700">{recommendation.reason}</p>
        </div>

        {/* 날씨 매칭 */}
        {recommendation.temperature_match && (
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <p className="text-gray-700">
              <span className="font-bold text-blue-700">🌡️ 날씨와의 조화:</span>
            </p>
            <p className="text-gray-700">{recommendation.temperature_match}</p>
          </div>
        )}

        {/* 대체 메뉴 */}
        {recommendation.alternatives && recommendation.alternatives.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <p className="font-bold text-gray-700 mb-3">🔄 다른 추천 메뉴:</p>
            <div className="flex flex-wrap gap-2">
              {recommendation.alternatives.map((alt, index) => (
                <span
                  key={index}
                  className="bg-white px-4 py-2 rounded-full text-sm text-gray-700 shadow-sm"
                >
                  {alt}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 선택 버튼 */}
        {!showOptions ? (
          <button
            onClick={() => setShowOptions(true)}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-lg font-bold text-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
          >
            다음 단계 ➡️
          </button>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 음식점 찾기 */}
            <button
              onClick={() => onFindRestaurant(recommendation.menu)}
              className="bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              🗺️ 음식점 찾기
            </button>

            {/* 레시피 보기 */}
            <button
              onClick={() => onGetRecipe(recommendation.menu)}
              className="bg-green-500 hover:bg-green-600 text-white py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              📖 레시피 보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultPage;

