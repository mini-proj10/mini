import React, { useState, useEffect } from 'react';
import CafeteriaInput from './components/CafeteriaInput';
import CafeteriaResult from './components/CafeteriaResult';
import RouletteGame from './components/RouletteGame';
import RestaurantPage from './components/RestaurantPage';
import { weatherAPI, cafeteriaAPI } from './services/api';

function App() {
  const [currentPage, setCurrentPage] = useState('landing'); // landing, location, input, result, roulette, restaurant
  const [location, setLocation] = useState('서울');
  const [userCoords, setUserCoords] = useState(null);
  const [weather, setWeather] = useState(null);
  const [cafeteriaMenu, setCafeteriaMenu] = useState('');
  const [recommendation, setRecommendation] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationPermission, setLocationPermission] = useState('pending'); // pending, granted, denied
  const [backgroundPhoto, setBackgroundPhoto] = useState(null);

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
      console.log('📸 배경 사진 요청:', weatherCondition, temperature);
      const response = await fetch(
        `http://localhost:8000/api/weather-photo?weather_condition=${encodeURIComponent(weatherCondition)}&temperature=${temperature || ''}`
      );
      const data = await response.json();
      
      if (data.success && data.data.success && data.data.photo_url) {
        console.log('✅ 배경 사진 가져오기 성공');
        setBackgroundPhoto(data.data.photo_url);
        document.body.style.backgroundImage = `url(${data.data.photo_url})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
      } else {
        console.log('⚠️ 배경 사진 없음, 테마 그라데이션 사용');
        document.body.style.backgroundImage = 'none';
      }
    } catch (error) {
      console.error('❌ 배경 사진 가져오기 실패:', error);
      document.body.style.backgroundImage = 'none';
    }
  };

  // 🆕 좌표를 주소로 변환하는 함수
  const getAddressFromCoords = (lat, lng) => {
    return new Promise((resolve, reject) => {
      // 카카오 API 로드 대기
      if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
        console.warn('⏳ 카카오맵 API 로딩 대기 중...');
        // 500ms 후 재시도
        setTimeout(() => {
          if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
            reject(new Error('카카오맵 API가 로드되지 않았습니다'));
          } else {
            getAddressFromCoords(lat, lng).then(resolve).catch(reject);
          }
        }, 500);
        return;
      }

      const geocoder = new window.kakao.maps.services.Geocoder();
      
      geocoder.coord2Address(lng, lat, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          if (result[0].address) {
            const addr = result[0].address;
            // 시/도 + 구/군 조합 (예: "서울 강남구", "경기도 성남시")
            const location = addr.region_2depth_name 
              ? `${addr.region_1depth_name} ${addr.region_2depth_name}`
              : addr.region_1depth_name;
            console.log('✅ 역지오코딩 성공:', location, addr);
            resolve(location);
          } else {
            reject(new Error('주소 정보 없음'));
          }
        } else {
          reject(new Error('역지오코딩 실패'));
        }
      });
    });
  };

  // 시작하기 버튼 클릭
  const handleStart = async () => {
    setCurrentPage('location');
    
    // 위치 권한 요청 전에 먼저 기본 위치로 날씨 로드
    await fetchWeather('서울');
    
    requestLocation();
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
          
          console.log('📍 GPS 좌표:', coords);
          
          // 🆕 좌표를 주소로 변환
          try {
            const address = await getAddressFromCoords(coords.latitude, coords.longitude);
            console.log('📍 변환된 주소:', address);
            setLocation(address);
            await fetchWeather(address);
          } catch (error) {
            console.error('❌ 주소 변환 실패, 기본값(서울) 사용:', error);
            setLocation('서울');
            await fetchWeather('서울');
          }
          
          setCurrentPage('input');
        },
        async (error) => {
          console.warn('위치 정보 접근 거부:', error);
          setLocationPermission('denied');
          
          setLocation('서울');
          await fetchWeather('서울');
          
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
      setLocation('서울');
      fetchWeather('서울');
      setTimeout(() => {
        setCurrentPage('input');
      }, 3000);
    }
  };

  const fetchWeather = async (loc) => {
    try {
      const response = await weatherAPI.getWeather(loc);
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
      <div className="min-h-screen flex items-center justify-center">
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

  // 위치 권한 요청 화면
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
      {/* 에러 메시지 */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 glass border border-red-200 text-red-800 px-6 py-3 rounded-lg shadow-lg z-50">
          {error}
          <button onClick={() => setError(null)} className="ml-4">✕</button>
        </div>
      )}

      {/* 페이지 라우팅 */}
      {currentPage === 'input' && (
        <CafeteriaInput
          onSubmit={handleMenuInput}
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
          onBack={handleBackToResult}
        />
      )}
    </div>
  );
}

export default App;
