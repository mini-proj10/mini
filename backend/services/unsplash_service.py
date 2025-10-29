import httpx
from typing import Dict, Optional
import os
from dotenv import load_dotenv

load_dotenv()

class UnsplashService:
    def __init__(self):
        # Unsplash API 키 (무료 계정용)
        self.access_key = os.getenv("UNSPLASH_API_KEY", "hx_FDkHR9pj3KZWltnKlOOtCWYVyDmMU8F1oQWjpncY")
        self.base_url = "https://api.unsplash.com"
        print("✅ Unsplash 서비스 초기화")

    async def get_weather_photo(self, weather_condition: str, temperature: Optional[float] = None) -> Dict:
        """날씨 조건에 맞는 배경 사진을 가져옵니다."""
        try:
            keywords = self._get_keywords_for_weather(weather_condition, temperature)
            photo_url = await self._fetch_photo_from_unsplash(keywords)
            
            if photo_url:
                return {
                    "success": True,
                    "photo_url": photo_url,
                    "weather_condition": weather_condition,
                    "keywords": keywords
                }
            else:
                return self._get_fallback_photo(weather_condition)
                
        except Exception as e:
            print(f"⚠️ Unsplash API 오류: {e}")
            return self._get_fallback_photo(weather_condition)

    def _get_keywords_for_weather(self, condition: str, temperature: Optional[float] = None) -> str:
        """날씨 조건에 맞는 키워드를 반환합니다."""
        condition_lower = condition.lower()
        
        # 온도 기반 키워드 우선
        if temperature is not None:
            if temperature >= 28:
                return "hot summer sunny"
            elif temperature <= 3:
                return "cold winter snow"
        
        # 날씨 조건 기반 키워드
        if "맑" in condition_lower or "clear" in condition_lower:
            return "sunny clear sky"
        elif "구름" in condition_lower or "cloud" in condition_lower:
            return "cloudy clouds"
        elif "비" in condition_lower or "rain" in condition_lower:
            return "rain rainy storm"
        elif "눈" in condition_lower or "snow" in condition_lower:
            return "snow snowy winter"
        elif "안개" in condition_lower or "fog" in condition_lower or "mist" in condition_lower:
            return "fog mist hazy"
        else:
            return "weather nature"

    async def _fetch_photo_from_unsplash(self, keywords: str) -> Optional[str]:
        """Unsplash API에서 사진을 가져옵니다."""
        try:
            params = {
                "query": keywords,
                "orientation": "landscape",
                "per_page": 1,
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/photos/random",
                    params=params,
                    headers={"Authorization": f"Client-ID {self.access_key}"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    photo_url = data.get("urls", {}).get("regular")
                    print(f"✅ Unsplash 사진 가져오기 성공: {keywords}")
                    return photo_url
                else:
                    print(f"⚠️ Unsplash API 응답 오류: {response.status_code}")
                    return None
                    
        except Exception as e:
            print(f"⚠️ Unsplash API 호출 실패: {e}")
            return None

    def _get_fallback_photo(self, weather_condition: str) -> Dict:
        """API 실패 시 사용할 그라데이션 배경을 반환합니다."""
        fallback_colors = {
            "맑음": "linear-gradient(140deg, #4facfe 0%, #00f2fe 50%, #00d4ff 100%)",
            "구름많음": "linear-gradient(140deg, #a8edea 0%, #fed6e3 50%, #ff9a9e 100%)",
            "흐림": "linear-gradient(140deg, #868f96 0%, #596164 100%)",
            "비": "linear-gradient(160deg, #667eea 0%, #764ba2 60%, #6b73ff 100%)",
            "눈": "linear-gradient(180deg, #ffecd2 0%, #fcb69f 50%, #ff8a80 100%)",
            "안개": "linear-gradient(160deg, #a8edea 0%, #fed6e3 50%, #ff9a9e 100%)",
        }
        
        return {
            "success": False,
            "fallback": True,
            "background": fallback_colors.get(weather_condition, fallback_colors["맑음"]),
            "weather_condition": weather_condition
        }

