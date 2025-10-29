import React, { useEffect, useMemo, useRef, useState } from 'react';
import LocationSearch from './LocationSearch';

// 간단한 시 선택 목록 (필요 시 확장 가능)
const CITIES = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시',
  '세종특별자치시', '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도',
  '경상북도', '경상남도', '제주특별자치도'
];

export default function ManualLocationSelector({ onResolved }) {
  const [country] = useState('대한민국');
  const [city, setCity] = useState('서울특별시');
  const [district, setDistrict] = useState('');
  const [districtOptions, setDistrictOptions] = useState([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const placesRef = useRef(null);

  // 카카오 Places 서비스 준비
  useEffect(() => {
    const waitKakao = () =>
      new Promise((resolve) => {
        const check = () => {
          if (window.kakao && window.kakao.maps && window.kakao.maps.services) resolve();
          else setTimeout(check, 50);
        };
        check();
      });
    (async () => {
      await waitKakao();
      placesRef.current = new window.kakao.maps.services.Places();
    })();
  }, []);

  // 시/도 변경 시 구/군 목록 로드 (구청 검색으로 유추)
  useEffect(() => {
    if (!placesRef.current || !city) return;
    setLoadingDistricts(true);
    setDistrict('');
    const query = `${city} 구청`;
    placesRef.current.keywordSearch(query, (data, status) => {
      setLoadingDistricts(false);
      if (status !== window.kakao.maps.services.Status.OK) {
        setDistrictOptions([]);
        return;
      }
      const set = new Set();
      (data || []).forEach((d) => {
        const addr = d.road_address_name || d.address_name || '';
        // 공백 기준 분해 후 2뎁스(구/군) 추정
        const parts = addr.split(/\s+/);
        if (parts.length >= 2) {
          const candidate = parts[1];
          if (candidate.endsWith('구') || candidate.endsWith('군')) {
            set.add(candidate);
          }
        }
      });
      const arr = Array.from(set).sort();
      setDistrictOptions(arr);
    });
  }, [city]);

  const prefix = useMemo(() => {
    const parts = [country, city, district].filter(Boolean);
    return parts.join(' ');
  }, [country, city, district]);

  return (
    <div className="glass rounded-xl p-4 shadow-md w-80">
      <div className="text-left text-sm font-semibold mb-2">수동 위치 설정</div>
      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="block text-xs text-slate-500 mb-1">국가</label>
          <input value={country} disabled className="w-full border rounded px-2 py-1 bg-slate-50" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">시/도</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">구/군</label>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="">구/군 선택</option>
            {districtOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {loadingDistricts && (
            <div className="text-[11px] text-slate-500 mt-1">구/군 불러오는 중…</div>
          )}
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">건물 선택</label>
          <div>
            <LocationSearch
              queryPrefix={prefix}
              onResolved={(place) => {
                // place: {lat, lng, address, name}
                const addr = place.address || `${prefix} ${place.name}`;
                onResolved({ ...place, address: addr });
              }}
            />
            <div className="text-[11px] text-slate-500 mt-1">검색 시 자동으로 "{prefix}" 문맥이 반영됩니다.</div>
          </div>
        </div>
      </div>
    </div>
  );
}


