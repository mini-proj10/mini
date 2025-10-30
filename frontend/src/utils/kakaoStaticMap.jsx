// src/utils/kakaoStaticMap.js
export function getKakaoStaticMapUrl({ lat, lng, level = 4 }) {
    return `http://localhost:8000/api/map-capture?lat=${lat}&lng=${lng}&level=${level}`;
  }
  