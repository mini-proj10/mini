import React, { useState, useRef } from 'react';

const RouletteGame = ({ menus, dailyRecommendations, includeDaily, weather, location, onResult, onBack }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);

  // 룰렛에 사용할 메뉴 리스트 생성
  const getRouletteMenus = () => {
    if (!includeDaily || !dailyRecommendations?.recommendations) {
      return menus;
    }
    
    // 오늘의 메뉴 3개를 추가 (추천 메뉴 3개 + 오늘의 메뉴 3개 = 총 6개)
    const dailyMenus = dailyRecommendations.recommendations.map(rec => ({
      menu_name: rec.menu_name || rec.display_name,
      type: '오늘의 메뉴',
      reason: `오늘의 추천 메뉴입니다`,
      restaurant_name: rec.restaurant_name,
      distance: rec.distance
    }));
    
    return [...menus, ...dailyMenus];
  };

  const rouletteMenus = getRouletteMenus();

  const spin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);

    // 랜덤 결과 선택
    const selectedIndex = Math.floor(Math.random() * rouletteMenus.length);
    const selectedMenu = rouletteMenus[selectedIndex];

    // 회전 각도 계산 (최소 5바퀴 + 랜덤 각도)
    const degreePerItem = 360 / rouletteMenus.length;
    const targetRotation = 360 * 5 + (360 - (selectedIndex * degreePerItem + degreePerItem / 2));
    
    setRotation(rotation + targetRotation);

    // 애니메이션 완료 후 결과 표시
    setTimeout(() => {
      setIsSpinning(false);
      setResult(selectedMenu);
    }, 4000);
  };

  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500'
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* 메인 콘텐츠 */}
          <div className="flex-1 lg:max-w-4xl">
            {/* 상단: 뒤로가기 버튼 + 날씨 정보 */}
            <div className="w-full pt-3 sm:pt-4 pb-2">
              <div className="flex items-center justify-between gap-3">
                {/* 좌측: 뒤로가기 버튼 */}
                <button
                  onClick={onBack}
                  className="glass rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-white/90 text-sm sm:text-base flex-shrink-0"
                >
                  ← 뒤로
                </button>
                
                {/* 우측: 날씨 + 주소 박스 */}
                {weather && (
                  <div className="glass rounded-lg sm:rounded-xl shadow-lg p-2 sm:p-3 flex-shrink min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-yellow-300/80 flex items-center justify-center flex-shrink-0">
                        <span className="text-base sm:text-xl">
                          {weather.sky_condition === '맑음' ? '☀️' : 
                           weather.sky_condition === '구름많음' ? '⛅' : 
                           weather.sky_condition === '흐림' ? '☁️' : 
                           weather.sky_condition === '비' ? '🌧️' : 
                           weather.sky_condition === '눈' ? '❄️' : '🌤️'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] sm:text-[13px] text-slate-500">현재 위치</div>
                        <div className="font-semibold text-xs sm:text-sm truncate">{location || weather.location || '서울시'}</div>
                      </div>
                      <div className="chip rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-slate-700 flex-shrink-0">
                        {weather.temperature}°C
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 헤더 박스 */}
            <div className="w-full pb-4">
              <div className="glass rounded-xl shadow-lg p-4 sm:p-5 text-center">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 mb-1">
                  🎰 밥뭇나?! 룰렛
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm md:text-base">
                  운명에 맡겨보세요!
                </p>
              </div>
            </div>

            {/* 룰렛 컨테이너 */}
            <div className="glass rounded-xl shadow-lg p-6 sm:p-8 mb-4">
              <div className="relative flex items-center justify-center">
                {/* 화살표 포인터 */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4 sm:-translate-y-5 z-10">
                  <div className="w-0 h-0 border-l-[20px] sm:border-l-[25px] border-r-[20px] sm:border-r-[25px] border-t-[40px] sm:border-t-[50px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg"></div>
                </div>

                {/* 룰렛 휠 */}
                <div className="relative w-80 h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] lg:w-[32rem] lg:h-[32rem]">
                  <div
                    className="w-full h-full rounded-full shadow-2xl transition-transform duration-[4000ms] ease-out overflow-hidden"
                    style={{
                      transform: `rotate(${rotation}deg)`
                    }}
                  >
                    {/* 룰렛 섹션들 */}
                    {rouletteMenus.map((menu, index) => {
                      const degreePerItem = 360 / rouletteMenus.length;
                      const startAngle = index * degreePerItem;
                      const endAngle = startAngle + degreePerItem;
                      const color = colors[index % colors.length];

                      // 원의 중심에서 시작하여 호를 그리는 polygon 생성
                      const points = ['50% 50%']; // 중심점
                      
                      // 시작 각도부터 끝 각도까지 여러 점을 생성하여 부드러운 호 만들기
                      const segments = 20;
                      for (let i = 0; i <= segments; i++) {
                        const angle = startAngle + (degreePerItem * i / segments) - 90;
                        const x = 50 + 50 * Math.cos(angle * Math.PI / 180);
                        const y = 50 + 50 * Math.sin(angle * Math.PI / 180);
                        points.push(`${x}% ${y}%`);
                      }

                      return (
                        <div
                          key={index}
                          className={`absolute w-full h-full ${color}`}
                          style={{
                            clipPath: `polygon(${points.join(', ')})`,
                          }}
                        >
                          <div
                            className="absolute text-white font-bold text-xs sm:text-base md:text-lg lg:text-xl drop-shadow-lg whitespace-nowrap"
                            style={{
                              top: '50%',
                              left: '50%',
                              transform: `rotate(${startAngle + degreePerItem / 2}deg) translate(-50%, -180px) scale(0.9)`,
                              transformOrigin: '0 0'
                            }}
                          >
                            {menu.menu_name || menu.display_name || menu.menu}
                          </div>
                        </div>
                      );
                    })}

                    {/* 중앙 원 */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white rounded-full shadow-lg border-3 sm:border-4 md:border-[5px] border-gray-300 flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl md:text-4xl">🍽️</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 버튼 또는 결과 */}
            {!result ? (
              <div className="text-center mb-4 ">
                <button
                  onClick={spin}
                  disabled={isSpinning}
                  className="btn-primary rounded-xl text-base sm:text-lg md:text-xl px-8 sm:px-10 py-3 sm:py-4 disabled:opacity-50 w-full sm:w-auto"
                >
                  {isSpinning ? (
                    <>
                      <svg className="spinner h-5 w-5 sm:h-6 sm:w-6 inline-block mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" opacity=".2"></circle>
                        <path d="M12 2a10 10 0 0 1 10 10"></path>
                      </svg>
                      돌리는 중...
                    </>
                  ) : (
                    '🎲 룰렛 돌리기!'
                  )}
                </button>
              </div>
            ) : (
              <div className="glass rounded-xl shadow-lg p-4 sm:p-6 mb-4">
                <div className="text-center">
                  <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🎉</div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2 sm:mb-3">
                    {result.menu_name || result.display_name || result.menu}
                  </h2>
                  {result.restaurant_name && (
                    <p className="text-sm sm:text-base text-slate-600 mb-2 truncate px-2">📍 {result.restaurant_name}</p>
                  )}
                  <div className="flex gap-2 justify-center mb-3 sm:mb-4 flex-wrap">
                    {(result.minutes_away || result.distance?.walking_min) && (
                      <span className="text-xs sm:text-sm text-slate-600 bg-slate-100 px-2 sm:px-3 py-1 rounded">
                        🚶 {result.minutes_away || result.distance.walking_min}분
                      </span>
                    )}
                    {result.price_range && (
                      <span className="text-xs sm:text-sm text-indigo-600 bg-indigo-50 px-2 sm:px-3 py-1 rounded">
                        💰 {result.price_range}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
                    {result.reason}
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4 sm:mt-6">
                    <button
                      onClick={spin}
                      className="glass rounded-xl px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold hover:bg-white/90 w-full sm:w-auto"
                    >
                      🔄 다시 돌리기
                    </button>
                    <button
                      onClick={() => onResult(result.menu_name || result.menu)}
                      className="btn-primary rounded-xl px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold w-full sm:w-auto"
                    >
                      ✓ 이 메뉴로 결정!
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouletteGame;

