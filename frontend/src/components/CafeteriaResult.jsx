import React, { useState } from 'react';

const CafeteriaResult = ({ recommendation, weather, location, onSelectMenu, onShowRoulette, onBack }) => {
  const [selectedMenu, setSelectedMenu] = useState(null);

  if (!recommendation || !recommendation.recommendations) {
    return null;
  }

  const { cafeteria_menu, recommendations, weather_summary, weather_info } = recommendation;

  const handleMenuClick = (menu) => {
    setSelectedMenu(menu);
  };

  const handleConfirm = () => {
    if (selectedMenu) {
      onSelectMenu(selectedMenu.menu_name || selectedMenu.menu);
    }
  };

  const getTypeColor = (type) => {
    // 새 스키마와 기존 스키마 모두 지원
    if (type.includes('상위')) return 'from-yellow-500 to-orange-500';
    if (type.includes('대체')) return 'from-green-500 to-teal-500';
    if (type.includes('예외')) return 'from-blue-500 to-purple-500';
    
    switch (type) {
      case '상위호환':
        return 'from-yellow-500 to-orange-500';
      case '비슷한카테고리':
        return 'from-green-500 to-teal-500';
      case '날씨기반':
        return 'from-blue-500 to-purple-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getTypeEmoji = (type) => {
    // 새 스키마와 기존 스키마 모두 지원
    if (type.includes('상위')) return '⭐';
    if (type.includes('대체')) return '🍽️';
    if (type.includes('예외')) return '🌤️';
    
    switch (type) {
      case '상위호환':
        return '⭐';
      case '비슷한카테고리':
        return '🍽️';
      case '날씨기반':
        return '🌤️';
      default:
        return '🍴';
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      {/* 상단 날씨 정보 */}
      {weather && (
        <div className="absolute top-4 right-4 glass rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-yellow-300/80 flex items-center justify-center">
              <span className="text-xl">
                {weather.sky_condition === '맑음' ? '☀️' : 
                 weather.sky_condition === '구름많음' ? '⛅' : 
                 weather.sky_condition === '흐림' ? '☁️' : 
                 weather.sky_condition === '비' ? '🌧️' : 
                 weather.sky_condition === '눈' ? '❄️' : '🌤️'}
              </span>
            </div>
            <div>
              <div className="text-[13px] text-slate-500">현재 위치</div>
              <div className="font-semibold text-sm">{location || weather.location || '서울시'}</div>
            </div>
          </div>
          <div className="chip rounded-xl px-3 py-1.5 text-sm font-medium text-slate-700 mt-2">
            {weather.temperature}°C
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <button
            onClick={onBack}
            className="glass rounded-xl px-4 py-2 absolute top-4 left-4 hover:bg-white/90"
          >
            ← 뒤로가기
          </button>
          
          <div className="glass rounded-3xl p-6 shadow-2xl inline-block">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-3">
              🎯 AI 메뉴 추천
            </h1>
            <div className="chip rounded-xl px-4 py-2 text-sm">
              <span className="font-semibold mr-2">오늘 구내식당:</span> {cafeteria_menu}
            </div>
          </div>
        </div>

        {/* 추천 메뉴 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {recommendations.map((item, index) => (
            <div
              key={index}
              onClick={() => handleMenuClick(item)}
              className={`glass rounded-2xl shadow-2xl cursor-pointer transition-all transform hover:scale-105 overflow-hidden ${
                selectedMenu?.menu_name === item.menu_name || selectedMenu?.menu === item.menu ? 'ring-4 ring-indigo-500' : ''
              }`}
            >
              {/* 카드 헤더 */}
              <div className={`bg-gradient-to-r ${getTypeColor(item.type)} p-4`}>
                <div className="flex items-center justify-between text-white">
                  <span className="font-bold text-lg">
                    {getTypeEmoji(item.type)} {item.type}
                  </span>
                  {(selectedMenu?.menu_name === item.menu_name || selectedMenu?.menu === item.menu) && (
                    <div className="badge badge-success text-2xl">✓</div>
                  )}
                </div>
              </div>

              {/* 카드 본문 */}
              <div className="card-body">
                {/* 메뉴명 - 상단에 크게 */}
                <h3 className="card-title text-2xl font-bold mb-1">
                  {item.menu_name || item.display_name || item.menu}
                </h3>
                
                {/* 식당명 - 메뉴명 바로 아래 */}
                {item.restaurant_name && (
                  <div className="text-sm text-slate-600 mb-3">
                    📍 {item.restaurant_name}
                  </div>
                )}
                
                {/* 카테고리와 거리, 가격 정보 */}
                <div className="flex gap-2 flex-wrap mb-3">
                  {(item.minutes_away || item.distance?.walking_min) && (
                    <div className="badge badge-outline">
                      🚶 도보 {item.minutes_away || item.distance.walking_min}분
                    </div>
                  )}
                  {item.price_range && (
                    <div className="badge badge-primary">
                      💰 {item.price_range}
                    </div>
                  )}
                </div>
                
                {/* 추천 이유 - 아래에 */}
                <p className="text-base-content/70 text-sm leading-relaxed">
                  {item.reason}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 버튼들 */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
          <button
            onClick={onShowRoulette}
            className="glass rounded-xl px-6 py-3 text-[15px] font-semibold hover:bg-white/90"
          >
            🎰 룰렛으로 결정하기
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={!selectedMenu}
            className="btn-primary rounded-xl px-6 py-3 text-[15px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedMenu ? `${selectedMenu.menu_name || selectedMenu.display_name || selectedMenu.menu} 주변 식당 찾기 🔍` : '메뉴를 선택해주세요'}
          </button>
        </div>

        {/* 안내 메시지 */}
        {!selectedMenu && (
          <div className="text-center mt-6">
            <div className="alert alert-info inline-flex">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>메뉴를 클릭해서 선택하거나, 룰렛으로 운에 맡겨보세요!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CafeteriaResult;

