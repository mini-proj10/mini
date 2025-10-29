import React from 'react';

const LunchRecommendation = ({ recommendation }) => {
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

  const getCategoryColor = (category) => {
    const colors = {
      '한식': 'bg-red-100 text-red-800',
      '중식': 'bg-yellow-100 text-yellow-800',
      '일식': 'bg-pink-100 text-pink-800',
      '양식': 'bg-blue-100 text-blue-800',
      '분식': 'bg-green-100 text-green-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
        <span className="mr-2">🍱</span>
        오늘의 추천 메뉴
      </h2>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-4xl font-bold text-purple-600">
            {recommendation.menu}
          </h3>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getCategoryColor(recommendation.category)}`}>
            {getCategoryEmoji(recommendation.category)} {recommendation.category}
          </span>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg mb-4">
          <p className="text-gray-700 leading-relaxed">
            <span className="font-bold text-purple-700">추천 이유:</span> {recommendation.reason}
          </p>
        </div>

        {recommendation.temperature_match && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <p className="text-gray-700">
              <span className="font-bold text-blue-700">날씨와의 조화:</span> {recommendation.temperature_match}
            </p>
          </div>
        )}

        {recommendation.alternatives && recommendation.alternatives.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-bold text-gray-700 mb-2">대체 메뉴:</p>
            <div className="flex flex-wrap gap-2">
              {recommendation.alternatives.map((alt, index) => (
                <span
                  key={index}
                  className="bg-white px-3 py-1 rounded-full text-sm text-gray-700 shadow-sm"
                >
                  {alt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {recommendation.weather_info && (
        <div className="border-t pt-4">
          <p className="text-xs text-gray-500">
            {recommendation.weather_info.location} · {recommendation.weather_info.temperature}°C · {recommendation.weather_info.condition}
          </p>
        </div>
      )}
    </div>
  );
};

export default LunchRecommendation;

