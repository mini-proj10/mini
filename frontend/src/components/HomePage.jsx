import React from 'react';

const HomePage = ({ onSelectMode, weather }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 우측 상단 날씨 표시 */}
      {weather && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="text-4xl">
              {weather.sky_condition === '맑음' ? '☀️' : 
               weather.sky_condition === '구름많음' ? '⛅' : 
               weather.sky_condition === '흐림' ? '☁️' : '🌤️'}
            </div>
            <div>
              <p className="text-sm text-gray-600">{weather.location}</p>
              <p className="text-2xl font-bold text-gray-800">{weather.temperature}°C</p>
              <p className="text-xs text-gray-500">{weather.sky_condition}</p>
            </div>
          </div>
        </div>
      )}

      {/* 중앙 선택 화면 */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-4">
            🍱 AI 점심 추천
          </h1>
          <p className="text-white text-xl mb-12">
            오늘 점심 메뉴를 추천해드릴게요
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* 1인 모드 */}
            <button
              onClick={() => onSelectMode('single')}
              className="group bg-white hover:bg-purple-50 rounded-2xl shadow-2xl p-8 transition-all transform hover:scale-105 hover:shadow-purple-500/50"
            >
              <div className="text-6xl mb-4">👤</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">1인</h2>
              <p className="text-gray-600">혼자 식사할 메뉴를 찾아요</p>
            </button>

            {/* 다인 모드 */}
            <button
              onClick={() => onSelectMode('multiple')}
              className="group bg-white hover:bg-pink-50 rounded-2xl shadow-2xl p-8 transition-all transform hover:scale-105 hover:shadow-pink-500/50"
            >
              <div className="text-6xl mb-4">👥</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">다인</h2>
              <p className="text-gray-600">함께 식사할 메뉴를 찾아요</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

