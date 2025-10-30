import React from 'react';

const HomePage = ({ onSelectMode, weather }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 우측 상단 날씨 표시 - 모바일에서는 상단 중앙 */}
      {weather && (
        <div className="fixed sm:absolute top-2 left-1/2 sm:left-auto sm:right-4 transform -translate-x-1/2 sm:translate-x-0 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 sm:p-4 z-10 max-w-[90%] sm:max-w-none">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="text-2xl sm:text-3xl md:text-4xl">
              {weather.sky_condition === '맑음' ? '☀️' : 
               weather.sky_condition === '구름많음' ? '⛅' : 
               weather.sky_condition === '흐림' ? '☁️' : '🌤️'}
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600 truncate">{weather.location}</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">{weather.temperature}°C</p>
              <p className="text-[10px] sm:text-xs text-gray-500">{weather.sky_condition}</p>
            </div>
          </div>
        </div>
      )}

      {/* 중앙 선택 화면 */}
      <div className="flex-1 flex items-center justify-center px-4 pt-20 sm:pt-0">
        <div className="text-center w-full max-w-2xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4">
            🍱 AI 점심 추천
          </h1>
          <p className="text-white text-base sm:text-lg md:text-xl mb-8 sm:mb-12">
            오늘 점심 메뉴를 추천해드릴게요
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* 1인 모드 */}
            <button
              onClick={() => onSelectMode('single')}
              className="group bg-white hover:bg-purple-50 rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 transition-all transform hover:scale-105 hover:shadow-purple-500/50"
            >
              <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">👤</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">1인</h2>
              <p className="text-sm sm:text-base text-gray-600">혼자 식사할 메뉴를 찾아요</p>
            </button>

            {/* 다인 모드 */}
            <button
              onClick={() => onSelectMode('multiple')}
              className="group bg-white hover:bg-pink-50 rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 transition-all transform hover:scale-105 hover:shadow-pink-500/50"
            >
              <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">👥</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">다인</h2>
              <p className="text-sm sm:text-base text-gray-600">함께 식사할 메뉴를 찾아요</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

