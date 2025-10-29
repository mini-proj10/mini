import React, { useState, useRef } from 'react';

const RouletteGame = ({ menus, weather, location, onResult, onBack }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);

  const spin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);

    // 랜덤 결과 선택
    const selectedIndex = Math.floor(Math.random() * menus.length);
    const selectedMenu = menus[selectedIndex];

    // 회전 각도 계산 (최소 5바퀴 + 랜덤 각도)
    const degreePerItem = 360 / menus.length;
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
    <div className="min-h-screen py-8 px-4">
      {/* 상단 날씨 정보 */}
      {weather && (
        <div className="absolute top-4 left-4 glass rounded-xl shadow-lg p-4 z-10">
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

      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <button
            onClick={onBack}
            className="glass rounded-xl px-4 py-2 absolute top-4 left-4 hover:bg-white/90"
          >
            ← 뒤로가기
          </button>
          
          <div className="glass rounded-3xl p-6 shadow-2xl inline-block">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-800 mb-2">
              🎰 밥뭇나?! 룰렛
            </h1>
            <p className="text-slate-600 text-lg">
              운명에 맡겨보세요!
            </p>
          </div>
        </div>

        {/* 룰렛 컨테이너 */}
        <div className="relative flex items-center justify-center mb-8">
          {/* 화살표 포인터 */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4 z-10">
            <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[40px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg"></div>
          </div>

          {/* 룰렛 휠 */}
          <div className="relative w-80 h-80 md:w-96 md:h-96">
            <div
              className="w-full h-full rounded-full shadow-2xl transition-transform duration-[4000ms] ease-out overflow-hidden"
              style={{
                transform: `rotate(${rotation}deg)`
              }}
            >
              {/* 룰렛 섹션들 */}
              {menus.map((menu, index) => {
                const degreePerItem = 360 / menus.length;
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
                      className="absolute text-white font-bold text-sm md:text-base drop-shadow-lg whitespace-nowrap"
                      style={{
                        top: '50%',
                        left: '50%',
                        transform: `rotate(${startAngle + degreePerItem / 2}deg) translate(-50%, -130px)`,
                        transformOrigin: '0 0'
                      }}
                    >
                      {menu.menu_name || menu.display_name || menu.menu}
                    </div>
                  </div>
                );
              })}

              {/* 중앙 원 */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full shadow-lg border-4 border-gray-300 flex items-center justify-center">
                <span className="text-2xl">🍽️</span>
              </div>
            </div>
          </div>
        </div>

        {/* 버튼 또는 결과 */}
        {!result ? (
          <div className="text-center">
            <button
              onClick={spin}
              disabled={isSpinning}
              className="btn-primary rounded-xl text-2xl px-12 py-6 disabled:opacity-50"
            >
              {isSpinning ? (
                <>
                  <svg className="spinner h-6 w-6 inline-block mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          <div className="glass rounded-3xl shadow-2xl p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="card-title text-4xl justify-center mb-4">
                {result.menu_name || result.display_name || result.menu}
              </h2>
              {result.restaurant_name && (
                <p className="text-slate-600 mb-2">📍 {result.restaurant_name}</p>
              )}
              <div className="flex gap-2 justify-center mb-4">
                {(result.minutes_away || result.distance?.walking_min) && (
                  <div className="badge badge-lg badge-outline">
                    🚶 도보 {result.minutes_away || result.distance.walking_min}분
                  </div>
                )}
                {result.price_range && (
                  <div className="badge badge-lg badge-primary">💰 {result.price_range}</div>
                )}
              </div>
              <p className="text-base-content/80 mb-6 leading-relaxed">
                {result.reason}
              </p>
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={spin}
                  className="glass rounded-xl px-6 py-3 text-[15px] font-semibold hover:bg-white/90"
                >
                  🔄 다시 돌리기
                </button>
                <button
                  onClick={() => onResult(result.menu_name || result.menu)}
                  className="btn-primary rounded-xl px-6 py-3 text-[15px] font-semibold"
                >
                  ✓ 이 메뉴로 결정!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 메뉴 목록 */}
        {!result && (
          <div className="glass rounded-3xl shadow-xl mt-8 p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">📋 후보 메뉴</h3>
            <div className="grid grid-cols-3 gap-3">
                {menus.map((menu, index) => (
                  <div
                    key={index}
                    className="glass rounded-xl shadow p-3 text-center"
                  >
                    <p className="font-semibold text-slate-800">{menu.menu_name || menu.display_name || menu.menu}</p>
                    {menu.restaurant_name && (
                      <p className="text-xs text-slate-500 mb-1">📍 {menu.restaurant_name}</p>
                    )}
                    {menu.price_range && (
                      <p className="text-xs text-slate-600">💰 {menu.price_range}</p>
                    )}
                  </div>
                ))}
              </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouletteGame;

