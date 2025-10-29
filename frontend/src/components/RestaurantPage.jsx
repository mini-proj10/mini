import React, { useEffect, useState } from 'react';

const RestaurantPage = ({ menuName, weather, location, onBack }) => {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 카카오맵 API 스크립트 로드
    const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_API_KEY || '97530b44b3984f6777b7a8897d33e173';
    console.log('🗺️ 카카오맵 API 키:', KAKAO_API_KEY);
    
    // 이미 로드된 스크립트가 있으면 제거
    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services&autoload=false`;
    script.async = true;
    
    script.onload = () => {
      console.log('✅ 카카오맵 스크립트 로드 성공');
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          console.log('✅ 카카오맵 초기화 성공');
          setIsMapLoaded(true);
          // initMap()은 별도 useEffect에서 실행
        });
      } else {
        console.error('❌ window.kakao.maps가 없습니다');
        setError('카카오맵 API를 초기화할 수 없습니다.');
      }
    };

    script.onerror = (e) => {
      console.error('❌ 카카오맵 스크립트 로드 실패:', e);
      setError('카카오맵을 불러올 수 없습니다. API 키를 확인해주세요.');
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [menuName, location]);

  // isMapLoaded가 true가 되면 지도 초기화
  useEffect(() => {
    if (isMapLoaded) {
      console.log('🗺️ DOM 렌더링 대기 중...');
      // DOM이 렌더링될 시간을 주기 위해 setTimeout 사용
      const timer = setTimeout(() => {
        initMap();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isMapLoaded]);

  const initMap = () => {
    console.log('🗺️ initMap 실행, 검색어:', menuName);
    const container = document.getElementById('map');
    if (!container) {
      console.error('❌ map 컨테이너를 찾을 수 없습니다');
      return;
    }

    try {
      // 기본 좌표 (서울)
      let defaultLat = 37.5665;
      let defaultLng = 126.9780;

      const options = {
        center: new window.kakao.maps.LatLng(defaultLat, defaultLng),
        level: 4 // 조금 더 넓은 범위
      };

      const map = new window.kakao.maps.Map(container, options);
      console.log('✅ 지도 생성 성공');
      
      // 사용자 현재 위치 가져오기
      if (navigator.geolocation) {
        console.log('📍 현재 위치 가져오는 중...');
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            console.log(`✅ 현재 위치: ${lat}, ${lng}`);
            
            const locPosition = new window.kakao.maps.LatLng(lat, lng);
            map.setCenter(locPosition);
            
            // 현재 위치 마커 표시
            const currentMarker = new window.kakao.maps.Marker({
              position: locPosition,
              map: map
            });
            
            const infowindow = new window.kakao.maps.InfoWindow({
              content: '<div style="padding:5px;font-size:12px;color:#4F46E5;">📍 현재 위치</div>'
            });
            infowindow.open(map, currentMarker);
            
            // 현재 위치 기준으로 음식점 검색
            searchPlaces(map, lat, lng);
          },
          (error) => {
            console.warn('⚠️ 위치 정보를 가져올 수 없습니다:', error.message);
            console.log('📍 기본 위치(서울)로 검색합니다');
            // 위치 권한이 없으면 서울 중심으로 검색
            searchPlaces(map, defaultLat, defaultLng);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      } else {
        console.warn('⚠️ 브라우저가 위치 정보를 지원하지 않습니다');
        searchPlaces(map, defaultLat, defaultLng);
      }
      
    } catch (error) {
      console.error('❌ 지도 초기화 중 오류:', error);
      setError('지도를 초기화하는 중 오류가 발생했습니다.');
    }
  };

  const searchPlaces = (map, lat, lng) => {
    // 장소 검색 객체 생성
    const ps = new window.kakao.maps.services.Places();
    
    // 현재 위치 기준으로 반경 내 검색
    const searchOption = {
      location: new window.kakao.maps.LatLng(lat, lng),
      radius: 2000, // 2km 반경
      size: 10 // 최대 10개
    };

    // 🆕 메뉴명에서 핵심 키워드만 추출하는 함수 (안전망)
    const extractCoreKeyword = (name) => {
      // 제거할 수식어 목록
      const modifiers = [
        '따뜻한', '시원한', '차가운', '뜨거운', '얼큰한', '매운', '순한',
        '고급', '프리미엄', '특별한', '신선한', '건강한', '든든한',
        '간편한', '가벼운', '푸짐한', '깔끔한', '부드러운', '바삭한',
        '달콤한', '새콤한', '고소한', '진한', '담백한',
        '정통', '전통', '수제', '직화', '숯불', '수타'
      ];
      
      let keyword = name.trim();
      
      // 앞의 수식어 제거
      modifiers.forEach(modifier => {
        keyword = keyword.replace(new RegExp(`^${modifier}\\s*`, 'g'), '');
      });
      
      // 뒤의 수식어 제거 ("생선구이 정식" -> "생선구이")
      keyword = keyword.replace(/\s*(정식|세트|코스|요리|전문점|맛집|식당)$/g, '');
      
      return keyword.trim() || name; // 빈 문자열이면 원본 반환
    };

    // 검색어 정제
    const searchKeyword = extractCoreKeyword(menuName);
    console.log('🔍 원본 메뉴명:', menuName);
    if (searchKeyword !== menuName) {
      console.log('🔍 정제된 검색어:', searchKeyword);
    }
    
    // 키워드로 장소 검색
    console.log('🔍 장소 검색 시작:', searchKeyword, `(반경 2km)`);
    ps.keywordSearch(searchKeyword, (data, status) => {
      console.log('🔍 검색 결과 상태:', status);
      console.log('🔍 검색 결과 데이터:', data);
      
      if (status === window.kakao.maps.services.Status.OK) {
        console.log(`✅ ${data.length}개의 장소를 찾았습니다`);
        
        // 검색 결과를 지도에 표시
        data.forEach((place, index) => {
          const markerPosition = new window.kakao.maps.LatLng(place.y, place.x);
          
          const marker = new window.kakao.maps.Marker({
            position: markerPosition,
            map: map
          });

          // 인포윈도우 생성
          const infowindow = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:8px;font-size:12px;">
              <strong>${index + 1}. ${place.place_name}</strong><br/>
              <span style="font-size:11px;color:#666;">${place.road_address_name || place.address_name}</span><br/>
              <span style="font-size:11px;color:#FF6B35;">📞 ${place.phone || '전화번호 없음'}</span>
            </div>`
          });

          window.kakao.maps.event.addListener(marker, 'click', () => {
            infowindow.open(map, marker);
          });
          
          // 첫 번째 마커는 기본으로 정보창 표시
          if (index === 0) {
            infowindow.open(map, marker);
          }
        });

        // 검색 결과가 있으면 첫 번째 결과 주변으로 지도 범위 조정
        if (data.length > 0) {
          const bounds = new window.kakao.maps.LatLngBounds();
          
          // 현재 위치 포함
          bounds.extend(new window.kakao.maps.LatLng(lat, lng));
          
          // 검색 결과들 포함
          data.forEach(place => {
            bounds.extend(new window.kakao.maps.LatLng(place.y, place.x));
          });
          
          map.setBounds(bounds);
          console.log('✅ 지도 범위 조정 완료');
        }
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        console.warn('⚠️ 검색 결과가 없습니다');
        alert(`주변 2km 내에 "${menuName}" 음식점을 찾을 수 없습니다.\n검색 범위를 확대해보세요.`);
      } else if (status === window.kakao.maps.services.Status.ERROR) {
        console.error('❌ 검색 중 오류 발생');
      }
    }, searchOption);
  };

  return (
    <div className="min-h-screen px-4 py-8">
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
              <div className="font-semibold">{location || weather.location}</div>
            </div>
          </div>
          <div className="chip rounded-xl px-3 py-1.5 text-sm font-medium text-slate-700 mt-2">
            {weather.temperature}°C
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="glass rounded-xl px-4 py-2 mb-4 hover:bg-white/90"
        >
          ← 뒤로가기
        </button>

        <div className="glass rounded-3xl shadow-2xl overflow-hidden">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 md:p-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">🗺️ {menuName} 맛집 찾기</h2>
            <p className="opacity-90 text-lg">주변의 {menuName} 음식점을 찾아보세요</p>
          </div>

          {/* 지도 */}
          <div className="relative">
            {error ? (
              <div className="h-96 flex items-center justify-center bg-base-200">
                <div className="text-center p-8">
                  <div className="alert alert-error max-w-md mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                      <p className="font-bold">{error}</p>
                      <p className="text-sm">카카오맵 API 키를 확인해주세요</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : !isMapLoaded ? (
              <div className="h-96 flex items-center justify-center bg-base-200">
                <div className="text-center">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                  <p className="mt-4">지도를 불러오는 중...</p>
                </div>
              </div>
            ) : (
              <div id="map" className="w-full h-96"></div>
            )}
          </div>

          {/* 안내 메시지 */}
          <div className="p-6 bg-white/50">
            <div className="glass rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6 text-blue-500"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span className="text-sm"><strong>📍 현재 위치 기반:</strong> 주변 2km 반경 내 음식점을 표시합니다.</span>
              </div>
            </div>
            
            <div className="glass rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm"><strong>💡 Tip:</strong> 마커를 클릭하면 상세 정보(주소, 전화번호)를 확인할 수 있습니다.</span>
              </div>
            </div>
          </div>

          {/* 다시 검색 버튼 */}
          <div className="p-6">
            <button
              onClick={onBack}
              className="btn-primary rounded-xl w-full py-4 text-lg font-semibold"
            >
              다른 메뉴 추천받기 🔄
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantPage;

