import React, { useState, useEffect } from 'react';
import ManualLocationSelector from './components/ManualLocationSelector';
import CafeteriaInput from './components/CafeteriaInput';
import CafeteriaResult from './components/CafeteriaResult';
import RouletteGame from './components/RouletteGame';
import RestaurantPage from './components/RestaurantPage';
import DailyRecommendations from './components/DailyRecommendations';
import AlertBanner from './components/AlertBanner';
import { weatherAPI, cafeteriaAPI } from './services/api';

function App() {
  const [currentPage, setCurrentPage] = useState('landing'); // landing, location, input, result, roulette, restaurant
  const [location, setLocation] = useState('위치 확인 중...');
  const [userCoords, setUserCoords] = useState(null);
  const [weather, setWeather] = useState(null);
  const [cafeteriaMenu, setCafeteriaMenu] = useState('');
  const [recommendation, setRecommendation] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationPermission, setLocationPermission] = useState('pending'); // pending, granted, denied
  const [backgroundPhoto, setBackgroundPhoto] = useState(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDesc, setAlertDesc] = useState('');

  // 초기 테마 설정
  useEffect(() => {
    setTheme('default');
  }, []);

  // 날씨 테마 적용
  useEffect(() => {
    if (weather) {
      const theme = chooseThemeFromWeather(weather.sky_condition, weather.temperature);
      console.log('🎨 날씨 테마 적용:', theme, weather);
      setTheme(theme);
      
      // 배경 사진 가져오기
      fetchBackgroundPhoto(weather.sky_condition, weather.temperature);
    }
  }, [weather]);

  const chooseThemeFromWeather = (condition = '', temp = null) => {
    const c = (condition || '').toLowerCase();
    if (c.includes('맑')) return 'clear';
    if (c.includes('구름')) return 'clouds';
    if (c.includes('비')) return 'rain';
    if (c.includes('눈')) return 'snow';
    if (c.includes('흐림')) return 'cloudy';
    if (typeof temp === 'number') {
      if (temp >= 28) return 'hot';
      if (temp <= 3) return 'cold';
    }
    return 'default';
  };

  const setTheme = (theme = 'default') => {
    const themes = ['default', 'clear', 'clouds', 'cloudy', 'rain', 'snow', 'hot', 'cold'];
    themes.forEach(t => document.body.classList.remove(`theme-${t}`));
    document.body.classList.add(`theme-${theme}`);
    document.body.classList.add('app-bg');
    console.log('✅ 테마 적용 완료:', theme);
  };

  const fetchBackgroundPhoto = async (weatherCondition, temperature) => {
    try {
      console.log('📸 배경 이미지 설정:', weatherCondition, temperature);
      
      // 날씨 조건에 따른 로컬 이미지 선택
      let imageName = 'sunny.png'; // 기본값
      
      const condition = (weatherCondition || '').toLowerCase();
      if (condition.includes('맑')) {
        const sunnyImages = ['sunny.png', 'sunny2.jpg', 'sunny3.png'];
        imageName = sunnyImages[Math.floor(Math.random() * sunnyImages.length)];
      } else if (condition.includes('구름') || condition.includes('흐림')) {
        const cloudyImages = ['cloudy.png', 'cloudy2.jpg', 'cloudy3.png'];
        imageName = cloudyImages[Math.floor(Math.random() * cloudyImages.length)];
      } else if (condition.includes('비')) {
        const rainyImages = ['rainy.png', 'rainy2.jpg', 'rainy3.png'];
        imageName = rainyImages[Math.floor(Math.random() * rainyImages.length)];
      } else if (condition.includes('눈')) {
        const snowyImages = ['snowy.png', 'snowy2.jpg', 'snowy3.png'];
        imageName = snowyImages[Math.floor(Math.random() * snowyImages.length)];
      }
      
      const imageUrl = `/images/weather/${imageName}`;
      console.log('✅ 배경 이미지 적용:', imageUrl);
      
      setBackgroundPhoto(imageUrl);
      document.body.style.backgroundImage = `url(${imageUrl})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
    } catch (error) {
      console.error('❌ 배경 이미지 설정 실패:', error);
      document.body.style.backgroundImage = 'none';
    }
  };

  // 시작하기 버튼 클릭
  const handleStart = async () => {
    // 수동 설정이 이미 있으면 바로 진행
    if (userCoords && location && location !== '위치 확인 중...') {
      if (!weather) {
        await fetchWeather(location, userCoords);
      }
      setCurrentPage('input');
      return;
    }
    setCurrentPage('location');
    // 자동 위치 권한 플로우 실행
    requestLocation();
  };

  // 카카오 API로 좌표를 주소로 변환
  const getAddressFromCoords = async (latitude, longitude) => {
    try {
      const KAKAO_API_KEY = 'ef42433f3c101ffeb3d1bae45a775180'; // 기본 키 (사용자가 교체 가능)
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${longitude}&y=${latitude}`,
        {
          headers: {
            'Authorization': `KakaoAK ${KAKAO_API_KEY}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('📍 카카오 주소 변환 결과:', data);
        
        if (data.documents && data.documents.length > 0) {
          const address = data.documents[0].address;
          const roadAddress = data.documents[0].road_address;
          
          // 우선순위: 도로명 주소 > 지번 주소
          if (roadAddress) {
            // 예: 서울특별시 강남구
            const city = roadAddress.region_1depth_name.replace('특별시', '시').replace('광역시', '시');
            const district = roadAddress.region_2depth_name;
            return district ? `${city} ${district}` : city;
          } else if (address) {
            // 예: 서울특별시 강남구
            const city = address.region_1depth_name.replace('특별시', '시').replace('광역시', '시');
            const district = address.region_2depth_name;
            return district ? `${city} ${district}` : city;
          }
        }
      }
    } catch (error) {
      console.error('❌ 주소 변환 실패:', error);
    }
    
    return '서울시'; // 기본값
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserCoords(coords);
          setLocationPermission('granted');
          
          // 카카오 API로 주소 변환
          const addressName = await getAddressFromCoords(coords.latitude, coords.longitude);
          console.log('✅ 변환된 주소:', addressName);
          
          setLocation(addressName);
          await fetchWeather(addressName, coords);
          setCurrentPage('input');
        },
        async (error) => {
          console.warn('위치 정보 접근 거부:', error);
          setLocationPermission('denied');
          
          setLocation('서울시');
          await fetchWeather('서울시');
          
          setTimeout(() => {
            setCurrentPage('input');
          }, 3000);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      setLocationPermission('denied');
      setLocation('서울시');
      fetchWeather('서울시');
      setTimeout(() => {
        setCurrentPage('input');
      }, 3000);
    }
  };

  const fetchWeather = async (loc, coords = null) => {
    try {
      const response = await weatherAPI.getWeather(loc, coords);
      console.log('날씨 API 응답:', response.data);
      setWeather(response.data);
      
      if (response.data) {
        const theme = chooseThemeFromWeather(response.data.sky_condition, response.data.temperature);
        console.log('테마 즉시 적용:', theme, response.data);
        setTheme(theme);
        await fetchBackgroundPhoto(response.data.sky_condition, response.data.temperature);
      }
    } catch (err) {
      console.error('날씨 정보 가져오기 실패:', err);
    }
  };

  const handleMenuInput = async (input) => {
    setLoading(true);
    setError(null);
    setCafeteriaMenu(input.content);

    try {
      const response = await cafeteriaAPI.getRecommendation(
        location,
        input.content,
        userCoords
      );
      
      // 검증 실패 응답 처리
      if (response.data.need_more_info && response.data.missing) {
        const missing = response.data.missing[0] || '';
        if (missing.includes('valid_food_name')) {
          setAlertTitle('메뉴 인식 불가');
          setAlertDesc(response.data.brief_rationale || '입력하신 단어가 음식명으로 인식되지 않았습니다. 예: 김치찌개, 파스타, 초밥처럼 실제 음식명을 입력해주세요.');
          setAlertOpen(true);
          setLoading(false);
          return;
        }
      }
      
      setRecommendation(response.data);
      setCurrentPage('result');
    } catch (err) {
      setError('추천을 가져오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMenu = (menuName) => {
    setSelectedMenu(menuName);
    setCurrentPage('restaurant');
  };

  const handleShowRoulette = () => {
    setCurrentPage('roulette');
  };

  const handleRouletteResult = (menuName) => {
    setSelectedMenu(menuName);
    setCurrentPage('restaurant');
  };

  const handleBack = () => {
    setCurrentPage('input');
    setRecommendation(null);
    setSelectedMenu(null);
  };

  const handleBackToResult = () => {
    setCurrentPage('result');
  };

  // Landing 화면
  if (currentPage === 'landing') {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="glass rounded-3xl p-10 md:p-14 shadow-2xl">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-amber-400 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="h-9 w-9">
                <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/>
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">🍱 밥뭇나?!</h1>
            <p className="mt-3 text-slate-600">
              구내식당 메뉴 기반 AI 점심 추천 서비스<br className="hidden sm:block"/>
              날씨에 따라 최적의 메뉴를 추천해드립니다
            </p>
            <button 
              onClick={handleStart}
              className="btn-primary mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-semibold shadow-lg"
            >
              <span>시작하기</span>
            </button>
          </div>
        </div>
        <div className="absolute right-4 bottom-4">
          <ManualLocationSelector
            onResolved={async ({ lat, lng, address, name }) => {
              const coords = { latitude: lat, longitude: lng };
              setUserCoords(coords);
              const addr = address || name || '서울시';
              setLocation(addr);
              await fetchWeather(addr, coords);
            }}
          />
        </div>
      </div>
    );
  }

  // 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-3xl p-10 md:p-14 shadow-2xl text-center max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-500">
            <svg className="spinner h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" opacity=".2"></circle>
              <path d="M12 2a10 10 0 0 1 10 10"></path>
            </svg>
          </div>
          <p className="text-lg font-semibold text-slate-800">Gemini AI가 메뉴를 추천하고 있어요…</p>
          <p className="mt-2 text-slate-500">입력한 메뉴와 날씨를 반영하여 3가지 메뉴를 구성합니다</p>
        </div>
      </div>
    );
  }

  // 위치 권한 요청 화면 (원복)
  if (currentPage === 'location') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-3xl p-10 md:p-14 shadow-2xl text-center max-w-md">
          <div className="text-7xl mb-6">📍</div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 mb-3">
            위치 정보 접근
          </h1>
          {locationPermission === 'pending' && (
            <>
              <p className="text-slate-600 mb-6">
                날씨 정보와 주변 식당 검색을 위해<br/>
                위치 정보가 필요합니다
              </p>
              <div className="animate-pulse">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full w-1/2"></div>
                </div>
              </div>
            </>
          )}
          {locationPermission === 'denied' && (
            <>
              <p className="text-slate-600 mb-4">
                위치 정보 접근이 거부되었습니다
              </p>
              <p className="text-slate-500 text-sm mb-6">
                기본 위치(서울)로 진행합니다...
              </p>
              <div className="text-amber-700 text-sm bg-amber-50 rounded-lg p-3">
                💡 브라우저 설정에서 위치 권한을 허용하면<br/>
                더 정확한 주변 식당을 찾을 수 있습니다
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Alert Banner */}
      <AlertBanner
        open={alertOpen}
        title={alertTitle}
        desc={alertDesc}
        onClose={() => setAlertOpen(false)}
      />

      {/* 에러 메시지 */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 glass border border-red-200 text-red-800 px-6 py-3 rounded-lg shadow-lg z-50">
          {error}
          <button onClick={() => setError(null)} className="ml-4">✕</button>
        </div>
      )}

      {/* 메인 레이아웃: 페이지 + 사이드바 */}
      <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-[1000px] mx-auto items-start justify-center">
        {/* 메인 콘텐츠 영역 */}
        <div className="w-full lg:w-[1150px] flex-shrink-0">
          {/* 페이지 라우팅 */}
          {currentPage === 'input' && (
            <CafeteriaInput
              onSubmit={handleMenuInput}
              onValidationError={(title, desc) => {
                setAlertTitle(title);
                setAlertDesc(desc);
                setAlertOpen(true);
              }}
              weather={weather}
              location={location}
            />
          )}

          {currentPage === 'result' && (
            <CafeteriaResult
              recommendation={recommendation}
              weather={weather}
              location={location}
              onSelectMenu={handleSelectMenu}
              onShowRoulette={handleShowRoulette}
              onBack={handleBack}
            />
          )}

          {currentPage === 'roulette' && recommendation && (
            <RouletteGame
              menus={recommendation.recommendations}
              weather={weather}
              location={location}
              onResult={handleRouletteResult}
              onBack={handleBackToResult}
            />
          )}
          {currentPage === 'restaurant' && (
            <RestaurantPage
              menuName={selectedMenu}
              weather={weather}
              location={location}
              userCoords={userCoords}
              onBack={handleBackToResult}
            />
          )}
        </div>

        {/* 사이드바: 오늘의 추천 메뉴 (input, result, roulette, restaurant 페이지에서만 표시) */}
        {['input', 'result', 'roulette', 'restaurant'].includes(currentPage) && weather && (
          <aside className="w-full lg:w-[360px] lg:sticky lg:top-6 lg:self-start flex-shrink-0">
            <DailyRecommendations 
              location={location} 
              userCoords={userCoords}
              weather={weather}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

export default App;
