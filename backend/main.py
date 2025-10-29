from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import uvicorn
from services.weather_service import WeatherService
from services.ai_service import AIService

app = FastAPI(
    title="AI 점심 메뉴 추천 API",
    description="날씨 기반 AI 점심 메뉴 추천 서비스",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 서비스 인스턴스
weather_service = WeatherService()
ai_service = AIService()

# Unsplash 서비스 (날씨별 배경 사진)
try:
    from services.unsplash_service import UnsplashService
    unsplash_service = UnsplashService()
except Exception as e:
    print(f"⚠️ Unsplash 서비스 로드 실패: {e}")
    unsplash_service = None

# Request 모델
class RecommendRequest(BaseModel):
    location: str = "서울"
    food_type: Optional[str] = "상관없음"
    mood: Optional[str] = "평범한"
    num_people: int = 1
    moods: Optional[list] = None  # 다인 모드일 때 각 사람의 기분

class CafeteriaMenuRequest(BaseModel):
    location: str = "서울"
    cafeteria_menu: str  # 구내식당 메뉴 (텍스트)
    user_location: Optional[Dict] = None  # 위도, 경도
    prefer_external: bool = True  # 외부식당 선호 (CAM 모드)

class RecipeRequest(BaseModel):
    menu_name: str
    num_servings: int = 1

@app.get("/")
async def root():
    return {
        "message": "AI 점심 메뉴 추천 API",
        "version": "1.0.0",
        "endpoints": {
            "weather": "/api/weather?location={location}",
            "recommend": "/api/recommend (POST)"
        }
    }

@app.get("/api/weather")
async def get_weather(location: str = "서울", lat: Optional[float] = None, lng: Optional[float] = None):
    """날씨 정보 조회 (좌표 우선, 없으면 location 사용)"""
    try:
        weather_data = await weather_service.get_weather(location, lat, lng)
        return {
            "success": True,
            "data": weather_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommend")
async def recommend_menu(request: RecommendRequest):
    """AI 메뉴 추천"""
    try:
        # 1. 날씨 정보 가져오기
        weather_data = await weather_service.get_weather(request.location)
        
        # 2. 사용자 선호도
        preferences = {
            "food_type": request.food_type,
            "mood": request.mood,
            "num_people": request.num_people,
            "moods": request.moods
        }
        
        # 3. AI 추천
        recommendation = await ai_service.recommend_lunch(weather_data, preferences)
        
        return {
            "success": True,
            "data": recommendation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommend-from-cafeteria")
async def recommend_from_cafeteria(request: CafeteriaMenuRequest):
    """구내식당 메뉴 기반 외부 메뉴 추천 (고급 프롬프트 시스템 + CAM 모드)"""
    try:
        # 1. 날씨 정보 가져오기 (사용자 좌표가 있으면 우선 사용)
        lat = None
        lng = None
        if request.user_location:
            lat = request.user_location.get('latitude')
            lng = request.user_location.get('longitude')
            print(f"📍 사용자 좌표 사용: lat={lat}, lng={lng}")
        
        weather_data = await weather_service.get_weather(
            request.location,
            lat=lat,
            lng=lng
        )
        
        # 2. 구내식당 메뉴 기반 추천 (CAM 모드 지원)
        recommendation = await ai_service.recommend_from_cafeteria_menu(
            weather_data,
            request.cafeteria_menu,
            request.user_location,
            request.prefer_external  # CAM 모드 전달
        )
        
        return {
            "success": True,
            "data": recommendation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recipe")
async def get_recipe(request: RecipeRequest):
    """레시피 생성"""
    try:
        recipe = await ai_service.generate_recipe(request.menu_name, request.num_servings)
        return {
            "success": True,
            "data": recipe
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/weather-photo")
async def get_weather_photo(weather_condition: str, temperature: Optional[float] = None):
    """날씨 조건에 맞는 배경 사진 가져오기"""
    try:
        if unsplash_service:
            photo_data = await unsplash_service.get_weather_photo(weather_condition, temperature)
            return {
                "success": True,
                "data": photo_data
            }
        else:
            # Unsplash 서비스 없으면 기본 그라데이션 반환
            fallback = {
                "success": False,
                "fallback": True,
                "background": "linear-gradient(140deg, #4facfe 0%, #00f2fe 50%, #00d4ff 100%)",
                "weather_condition": weather_condition
            }
            return {
                "success": True,
                "data": fallback
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

