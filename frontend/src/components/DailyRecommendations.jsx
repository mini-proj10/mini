import React, { useState, useEffect } from 'react';
import { dailyRecommendationsAPI } from '../services/api';

const DailyRecommendations = ({ location, userCoords, weather }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState(null);

  useEffect(() => {
    fetchDailyRecommendations();
  }, [location, userCoords]);

  const fetchDailyRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dailyRecommendationsAPI.getDailyRecommendations(
        location || '서울시',
        userCoords
      );
      
      if (response.success) {
        setRecommendations(response.data);
      } else {
        setError('추천 메뉴를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('오늘의 추천 메뉴 조회 실패:', err);
      setError('추천 메뉴를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (menuName) => {
    // 카카오맵으로 주변 음식점 검색 (키워드만 사용, 현재 위치 기반)
    const kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(menuName)}`;
    window.open(kakaoMapUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-2xl">🍽️</span>
          <span>오늘의 메뉴</span>
        </h2>
        <div className="flex justify-center items-center py-8">
          <div className="loading loading-spinner loading-md text-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-2xl">🍽️</span>
          <span>오늘의 메뉴</span>
        </h2>
        <div className="alert alert-error text-sm">
          <span>{error}</span>
        </div>
        <button 
          onClick={fetchDailyRecommendations}
          className="btn btn-primary btn-sm mt-3 w-full"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!recommendations || !recommendations.recommendations) {
    return null;
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-gray-200">
      {/* 헤더 */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
          <span className="text-2xl">🍽️</span>
          <span>오늘의 메뉴</span>
        </h2>
        {recommendations.summary && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {recommendations.summary}
          </p>
        )}
      </div>

      {/* 추천 메뉴 리스트 */}
      <div className="space-y-3">
        {recommendations.recommendations.map((menu, index) => (
          <div
            key={index}
            onClick={() => handleMenuClick(menu.menu_name)}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3.5 border-l-4 border-blue-500 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-start gap-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-base font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {menu.menu_name}
                  </h3>
                  <span className="badge badge-primary badge-sm flex-shrink-0">
                    {menu.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {menu.reason}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="bg-white/70 px-2 py-1 rounded-full">
                    💰 {menu.price_range}
                  </span>
                  <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    🗺️ 주변 검색
                  </span>
                </div>
              </div>
              <div className="text-2xl flex-shrink-0">
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 정보 */}
      {recommendations.weather && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1 truncate">
              📍 {recommendations.weather.location}
            </span>
            <span className="flex items-center gap-1 flex-shrink-0">
              🌡️ {recommendations.weather.temperature}°C
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyRecommendations;

