import React, { useState, useEffect } from 'react';
import CafeteriaInput from './components/CafeteriaInput';
import CafeteriaResult from './components/CafeteriaResult';
import RouletteGame from './components/RouletteGame';
import RestaurantPage from './components/RestaurantPage';
import { weatherAPI, cafeteriaAPI } from './services/api';

function App() {
  const [currentPage, setCurrentPage] = useState('location'); // location, input, result, roulette, restaurant
  const [location, setLocation] = useState('서울');
  const [userCoords, setUserCoords] = useState(null);
  const [weather, setWeather] = useState(null);
  const [cafeteriaMenu, setCafeteriaMenu] = useState('');
  const [recommendation, setRecommendation] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationPermission, setLocationPermission] = useState('pending'); // pending, granted, denied

  // 위치 정보 요청
  useEffect(() => {
    if (currentPage === 'location') {
      requestLocation();
    }
  }, [currentPage]);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserCoords(coords);
          setLocationPermission('granted');
          
          // 위치 기반으로 지역명 설정 (간단하게 서울로 설정, 실제로는 역지오코딩 필요)
          setLocation('서울');
          
          // 날씨 정보 가져오기
          fetchWeather('서울');
          
          // 입력 페이지로 이동
          setCurrentPage('input');
        },
        (error) => {
          console.warn('위치 정보 접근 거부:', error);
          setLocationPermission('denied');
          
          // 위치 권한이 없어도 기본 위치로 진행
          setLocation('서울');
          fetchWeather('서울');
          
          // 3초 후 자동으로 입력 페이지로 이동
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
      setWeather(response.data);
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

  // 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold">Gemini AI가 메뉴를 분석하고 있어요...</p>
          <p className="text-white/80 text-sm mt-2">구내식당 메뉴를 기반으로 3가지 추천을 준비중입니다</p>
        </div>
      </div>
    );
  }

  // 위치 권한 요청 화면
  if (currentPage === 'location') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        <div className="text-center bg-white/10 backdrop-blur-lg rounded-3xl p-12 max-w-md">
          <div className="text-7xl mb-6">📍</div>
          <h1 className="text-4xl font-bold text-white mb-4">
            위치 정보 접근
          </h1>
          
          {locationPermission === 'pending' && (
            <>
              <p className="text-white text-lg mb-6">
                날씨 정보와 주변 식당 검색을 위해<br/>
                위치 정보가 필요합니다
              </p>
              <div className="animate-pulse">
                <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full w-1/2 animate-[slide_1s_ease-in-out_infinite]"></div>
                </div>
              </div>
            </>
          )}
          
          {locationPermission === 'denied' && (
            <>
              <p className="text-white text-lg mb-4">
                위치 정보 접근이 거부되었습니다
              </p>
              <p className="text-white/80 text-sm mb-6">
                기본 위치(서울)로 진행합니다...
              </p>
              <div className="text-yellow-300 text-sm">
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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500">
      {/* 에러 메시지 */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
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
          onSelectMenu={handleSelectMenu}
          onShowRoulette={handleShowRoulette}
          onBack={handleBack}
        />
      )}

      {currentPage === 'roulette' && recommendation && (
        <RouletteGame
          menus={recommendation.recommendations}
          onResult={handleRouletteResult}
          onBack={handleBackToResult}
        />
      )}

      {currentPage === 'restaurant' && (
        <RestaurantPage
          menuName={selectedMenu}
          location={location}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

export default App;

