import google.generativeai as genai
from typing import Dict, List, Optional
import os
from dotenv import load_dotenv
import json

load_dotenv()

class AIService:
    def __init__(self):
        # Gemini API 설정
        api_key = os.getenv("GEMINI_API_KEY", "AIzaSyBg5BiDftPSox4lsaI8kk4C62-qUPkk-58")
        if api_key:
            genai.configure(api_key=api_key)
            self.use_ai = True
            print("✅ Gemini API 연결됨 (고급 프롬프트 시스템)")
            
            # 시스템 인스트럭션 정의
            self.system_instruction = self._get_system_instruction()
            
            # 모델 초기화 (시스템 인스트럭션 포함)
            self.model = genai.GenerativeModel(
                'gemini-2.0-flash-exp',
                system_instruction=self.system_instruction
            )
        else:
            self.model = None
            self.use_ai = False
            print("⚠️  Gemini API 키가 없습니다. 규칙 기반 추천 로직을 사용합니다.")
    
    def _get_system_instruction(self) -> str:
        """고급 시스템 인스트럭션 정의"""
        return """
당신은 "밥뭇나?! - 직장인 점심 추천 AI"입니다. 아래 규칙에 따라 메뉴를 추천합니다.

## 핵심 규칙
1. **입력 데이터**: 오늘자 구내식당 메뉴는 참고 자료입니다.
2. **CAM 모드 (Cafeteria Avoidance Mode)**: 
   - 사용자가 구내식당 회피 의사를 보이면 **외부식당 우선 모드(CAM)**를 발동합니다.
   - CAM 발동 조건: prefer_external: true 또는 회피 키워드 감지
3. **CAM 모드 원칙**: 
   - 근처 외부 음식점(도보 0~15분) 추천을 최우선
   - 각 카테고리 Top3 중 **최소 2개 이상**은 'nearby' (외부) 식당
4. **거리 정책**: 도보 0~15분 범위 내만 추천
   - near: 0~5분
   - mid: 6~15분
5. **스코어링 가중치**:
   - **기본 모드**: taste 3 : nutrition 4 : practicality 3
   - **CAM 모드**: taste 3 : nutrition 3 : practicality 4
6. **예외(Wildcard)**는 CAM 여부 무관하게 외부 식당 위주로 구성
7. **날씨 고려**: 현재 날씨에 맞는 메뉴 추천
   - 더운 날씨: 시원한 메뉴, 냉면, 샐러드
   - 추운 날씨: 따뜻한 국물 요리
   - 비 오는 날: 실내 음식, 부침개, 전골

## 추천 카테고리
1. **상위호환(upgrade)**: 구내식당 메뉴의 고급/프리미엄 버전
2. **비슷한 카테고리(alternative)**: 같은 계열이지만 다른 음식
3. **예외(wildcard)**: 날씨 기반, 완전히 다른 종류의 음식

## 출력 형식
반드시 JSON 스키마를 준수하여 구조화된 데이터를 반환하세요.
"""
    
    async def recommend_from_cafeteria_menu(
        self,
        weather: Dict,
        cafeteria_menu: str,
        location: Optional[Dict] = None,
        prefer_external: bool = True  # 기본적으로 외부식당 선호 (CAM 모드)
    ) -> Dict:
        """고급 프롬프트 시스템으로 구내식당 메뉴 기반 추천"""
        
        # API 키가 없으면 규칙 기반 추천 사용
        if not self.use_ai:
            return self._get_fallback_cafeteria_recommendation(weather, cafeteria_menu)
        
        try:
            # 사용자 입력 데이터 구조화
            user_input = {
                "prefer_external": prefer_external,  # CAM 모드 트리거
                "today_cafeteria_menu": cafeteria_menu,
                "current_weather": f"{weather.get('temperature', 20)}℃, {weather.get('sky_condition', '맑음')}",
                "user_prefs": {
                    "budget": 15000,  # 기본 예산
                    "avoid": ["구내식당"] if prefer_external else [],
                    "allergy": [],
                    "favorite_flavor": self._get_flavor_from_weather(weather)
                },
                "location": weather.get('location', '서울'),
                "nearby_options": self._generate_nearby_options(cafeteria_menu, weather)
            }
            
            # 사용자 메시지 생성
            user_message = f"""
## 점심 메뉴 추천 요청 데이터
아래 입력 데이터를 분석하여 최적의 점심 메뉴를 추천하고, 결과를 JSON 형식으로 반환하세요.
---
{json.dumps(user_input, ensure_ascii=False, indent=2)}
---

**중요 규칙**:
1. **menu** 필드는 지도 검색용으로 수식어 없이 간결하게 작성하세요.
   - 좋은 예: "생선구이", "냉면", "김치찌개", "돈카츠", "파스타"
   - 나쁜 예: "따뜻한 생선구이", "시원한 평양냉면", "고급 프리미엄 돈카츠"
2. **display_name** 필드는 사용자에게 보여줄 풍부한 표현으로 작성하세요.
   - 예: "따뜻한 생선구이 정식", "시원한 평양냉면", "바삭한 프리미엄 돈카츠"

**추천 형식**:
{{
    "mode": {{
        "name": "CAM" 또는 "default",
        "reason": "모드 선택 이유"
    }},
    "cafeteria_menu": "{cafeteria_menu}",
    "recommendations": [
        {{
            "type": "상위호환",
            "menu": "생선구이",
            "display_name": "따뜻한 생선구이 정식",
            "category": "음식 카테고리",
            "reason": "추천 이유 (50자 이내)",
            "price_range": "가격대",
            "distance": {{
                "walking_min": 5,
                "bucket": "near",
                "policy_fit": true
            }},
            "score": {{
                "taste": 8,
                "nutrition": 7,
                "practicality": 9,
                "total": 8.0
            }},
            "meta": {{
                "source": "nearby",
                "priceLevel": "₩₩",
                "openNow": true
            }}
        }},
        {{
            "type": "비슷한카테고리",
            "menu": "간결한 메뉴명",
            "display_name": "풍부한 표현의 메뉴명",
            ...
        }},
        {{
            "type": "날씨기반",
            "menu": "간결한 메뉴명",
            "display_name": "풍부한 표현의 메뉴명",
            ...
        }}
    ],
    "weather_summary": "날씨 요약"
}}
"""
            
            # Gemini API 호출
            generation_config = genai.types.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.8,
            )
            
            response = self.model.generate_content(
                user_message,
                generation_config=generation_config
            )
            content = response.text
            
            # JSON 파싱
            try:
                recommendation = json.loads(content)
                print(f"✅ AI 추천 성공 (모드: {recommendation.get('mode', {}).get('name', 'default')})")
            except json.JSONDecodeError as e:
                print(f"JSON 파싱 오류: {str(e)}")
                print(f"응답 내용: {content[:500]}...")
                return self._get_fallback_cafeteria_recommendation(weather, cafeteria_menu)
            
            # 날씨 정보 추가
            recommendation["weather_info"] = {
                "location": weather.get("location"),
                "temperature": weather.get("temperature"),
                "condition": weather.get("sky_condition"),
                "precipitation": weather.get("precipitation")
            }
            
            return recommendation
            
        except Exception as e:
            print(f"AI 추천 오류: {str(e)}")
            import traceback
            traceback.print_exc()
            return self._get_fallback_cafeteria_recommendation(weather, cafeteria_menu)
    
    def _get_flavor_from_weather(self, weather: Dict) -> str:
        """날씨 기반 선호 맛 추출"""
        temp = weather.get('temperature', 20)
        condition = weather.get('sky_condition', '맑음')
        
        if temp > 25:
            return "시원함, 깔끔함, 상큼함"
        elif temp < 10:
            return "따뜻함, 든든함, 얼큰함"
        elif '비' in condition or '눈' in condition:
            return "따뜻함, 부드러움, 위로"
        else:
            return "균형잡힘, 신선함, 다양함"
    
    def _generate_nearby_options(self, cafeteria_menu: str, weather: Dict) -> List[Dict]:
        """가상의 주변 식당 옵션 생성 (실제로는 카카오맵 API와 연동 가능)"""
        temp = weather.get('temperature', 20)
        
        # 온도에 따른 기본 옵션
        options = []
        
        if temp > 25:
            options.extend([
                {"name": "시원한 냉면가게", "category": "한식/면", "walking_min": 7, "priceLevel": "₩₩", "openNow": True, "details": "평양냉면, 비빔냉면"},
                {"name": "프레시 샐러드 바", "category": "샐러드/서양식", "walking_min": 4, "priceLevel": "₩₩", "openNow": True, "details": "닭가슴살 샐러드, 저칼로리"},
            ])
        elif temp < 10:
            options.extend([
                {"name": "얼큰 김치찌개집", "category": "한식/찌개", "walking_min": 5, "priceLevel": "₩", "openNow": True, "details": "김치찌개, 순두부찌개"},
                {"name": "사골국밥 전문점", "category": "한식/국밥", "walking_min": 8, "priceLevel": "₩₩", "openNow": True, "details": "진한 사골국밥"},
            ])
        else:
            options.extend([
                {"name": "프리미엄 한식당", "category": "한식/정식", "walking_min": 10, "priceLevel": "₩₩₩", "openNow": True, "details": "계절 반찬 정식"},
                {"name": "맛있는 일식집", "category": "일식/초밥", "walking_min": 6, "priceLevel": "₩₩", "openNow": True, "details": "런치 초밥 세트"},
            ])
        
        # 구내식당 대안 (항상 포함)
        options.append({
            "name": "구내식당 대체 메뉴", 
            "category": "사내", 
            "walking_min": 0, 
            "priceLevel": "₩", 
            "openNow": True, 
            "details": f"{cafeteria_menu}의 대안"
        })
        
        return options
    
    def _build_prompt(self, weather: Dict, preferences: Optional[Dict]) -> str:
        """프롬프트 생성"""
        temp = weather.get("temperature", 20)
        condition = weather.get("sky_condition", "맑음")
        location = weather.get("location", "서울")
        
        prompt = f"""
        현재 날씨 정보:
        - 위치: {location}
        - 기온: {temp}°C
        - 날씨: {condition}
        - 강수: {weather.get("precipitation", "없음")}
        """
        
        if preferences:
            food_type = preferences.get("food_type", "상관없음")
            mood = preferences.get("mood", "평범한")
            num_people = preferences.get("num_people", 1)
            moods = preferences.get("moods", [])
            
            prompt += f"""
        
        사용자 정보:
        - 인원: {num_people}명
        - 음식 종류: {food_type}
        - 기분: {mood}
            """
            
            if moods and len(moods) > 1:
                prompt += f"\n        - 각 사람의 기분: {', '.join(moods)}"
        
        prompt += """
        
        위 정보를 바탕으로 직장인에게 적합한 점심 메뉴를 추천해주세요.
        날씨가 추우면 따뜻한 음식, 더우면 시원한 음식을 추천하고,
        비가 오면 국물 요리를, 맑은 날은 다양한 선택지를 제안해주세요.
        기분 상태도 고려해서 추천해주세요.
        """
        
        return prompt
    
    async def generate_recipe(self, menu_name: str, num_servings: int = 1) -> Dict:
        """레시피 생성"""
        if not self.use_ai:
            return self._get_fallback_recipe(menu_name, num_servings)
        
        try:
            prompt = f"""
'{menu_name}' 메뉴의 {num_servings}인분 레시피를 작성해주세요.

다음 형식으로 JSON 응답해주세요:
{{
    "menu_name": "메뉴명",
    "servings": {num_servings},
    "ingredients": [
        {{"name": "재료명", "amount": "양"}},
    ],
    "steps": [
        "1단계 설명",
        "2단계 설명",
    ],
    "cooking_time": "조리 시간",
    "difficulty": "쉬움/보통/어려움"
}}
"""
            
            response = self.model.generate_content(prompt)
            content = response.text
            
            # JSON 추출
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            try:
                recipe = json.loads(content)
                return recipe
            except json.JSONDecodeError:
                return self._get_fallback_recipe(menu_name, num_servings)
                
        except Exception as e:
            print(f"레시피 생성 오류: {str(e)}")
            return self._get_fallback_recipe(menu_name, num_servings)
    
    def _get_fallback_recipe(self, menu_name: str, num_servings: int) -> Dict:
        """기본 레시피"""
        return {
            "menu_name": menu_name,
            "servings": num_servings,
            "ingredients": [
                {"name": "주재료", "amount": f"{num_servings * 200}g"},
                {"name": "양파", "amount": f"{num_servings}개"},
                {"name": "마늘", "amount": f"{num_servings * 3}쪽"},
                {"name": "간장", "amount": f"{num_servings * 2}큰술"},
                {"name": "식용유", "amount": f"{num_servings}큰술"},
            ],
            "steps": [
                "재료를 깨끗이 씻어 준비합니다.",
                "양파와 마늘을 적당한 크기로 썰어줍니다.",
                "팬에 식용유를 두르고 마늘을 볶아 향을 냅니다.",
                "주재료를 넣고 중불에서 볶아줍니다.",
                "간장으로 간을 맞추고 완성합니다.",
            ],
            "cooking_time": "약 30분",
            "difficulty": "보통",
            "note": "AI API 연동 시 더 상세한 레시피가 제공됩니다."
        }
    
    def _get_smart_recommendation(self, weather: Dict, preferences: Optional[Dict] = None) -> Dict:
        """규칙 기반 스마트 추천"""
        temp = weather.get("temperature", 20)
        condition = weather.get("sky_condition", "맑음")
        precipitation = weather.get("precipitation", "없음")
        
        # 음식 데이터베이스
        menu_db = {
            "한식": {
                "따뜻한": [
                    {"name": "김치찌개", "spicy": "매움", "reason": "얼큰한 국물로 몸을 녹이기 좋습니다"},
                    {"name": "된장찌개", "spicy": "안 매움", "reason": "구수한 맛이 일품인 건강 메뉴입니다"},
                    {"name": "부대찌개", "spicy": "보통", "reason": "든든하고 푸짐한 한 끼입니다"},
                    {"name": "갈비탕", "spicy": "안 매움", "reason": "영양 만점 보양식입니다"},
                    {"name": "육개장", "spicy": "매움", "reason": "얼큰하고 시원한 국물이 속을 풀어줍니다"},
                ],
                "시원한": [
                    {"name": "냉면", "spicy": "안 매움", "reason": "시원한 육수가 더위를 식혀줍니다"},
                    {"name": "비빔냉면", "spicy": "매움", "reason": "새콤달콤 매콤한 맛이 일품입니다"},
                    {"name": "콩국수", "spicy": "안 매움", "reason": "고소하고 시원한 여름 별미입니다"},
                ],
                "중간": [
                    {"name": "비빔밥", "spicy": "보통", "reason": "영양 균형이 잡힌 건강식입니다"},
                    {"name": "불고기", "spicy": "안 매움", "reason": "달콤한 양념이 식욕을 돋웁니다"},
                    {"name": "제육볶음", "spicy": "매움", "reason": "매콤한 맛이 밥도둑입니다"},
                ]
            },
            "중식": {
                "따뜻한": [
                    {"name": "짬뽕", "spicy": "매움", "reason": "얼큰한 국물로 추위를 날립니다"},
                    {"name": "짜장면", "spicy": "안 매움", "reason": "부담 없이 즐기는 국민 메뉴입니다"},
                    {"name": "마라탕", "spicy": "아주 매움", "reason": "얼얼한 맛이 중독성 있습니다"},
                ],
                "시원한": [
                    {"name": "냉짬뽕", "spicy": "매움", "reason": "시원하고 얼큰한 맛의 조화입니다"},
                    {"name": "냉짜장", "spicy": "안 매움", "reason": "시원하게 즐기는 짜장면입니다"},
                ],
                "중간": [
                    {"name": "볶음밥", "spicy": "보통", "reason": "간단하고 맛있는 한 끼입니다"},
                    {"name": "탕수육", "spicy": "안 매움", "reason": "바삭하고 달콤한 인기 메뉴입니다"},
                ]
            },
            "일식": {
                "중간": [
                    {"name": "초밥", "spicy": "안 매움", "reason": "신선한 재료로 깔끔한 한 끼"},
                    {"name": "돈카츠", "spicy": "안 매움", "reason": "바삭하고 든든한 식사"},
                    {"name": "라멘", "spicy": "보통", "reason": "진한 국물이 일품인 면 요리"},
                    {"name": "우동", "spicy": "안 매움", "reason": "부드럽고 담백한 면 요리"},
                ]
            },
            "양식": {
                "중간": [
                    {"name": "파스타", "spicy": "안 매움", "reason": "다양한 소스로 즐기는 면 요리"},
                    {"name": "스테이크", "spicy": "안 매움", "reason": "육즙 가득한 고급 식사"},
                    {"name": "리조또", "spicy": "안 매움", "reason": "크리미하고 고소한 맛"},
                ]
            },
            "분식": {
                "따뜻한": [
                    {"name": "떡볶이", "spicy": "매움", "reason": "매콤달콤 간식 같은 한 끼"},
                    {"name": "라볶이", "spicy": "매움", "reason": "라면과 떡볶이의 환상 조합"},
                ],
                "중간": [
                    {"name": "김밥", "spicy": "안 매움", "reason": "간편하고 든든한 한 끼"},
                    {"name": "우동", "spicy": "안 매움", "reason": "담백하고 부드러운 면 요리"},
                ]
            }
        }
        
        # 선호도 가져오기
        pref_type = preferences.get("food_type", "상관없음") if preferences else "상관없음"
        pref_mood = preferences.get("mood", "평범한") if preferences else "평범한"
        num_people = preferences.get("num_people", 1) if preferences else 1
        
        # 온도에 따른 카테고리 선택
        if temp < 10:
            temp_category = "따뜻한"
        elif temp > 25:
            temp_category = "시원한"
        else:
            temp_category = "중간"
        
        # 비 오는 날은 국물 요리
        if precipitation != "없음":
            temp_category = "따뜻한"
        
        # 음식 종류 필터링
        if pref_type != "상관없음":
            available_types = [pref_type]
        else:
            available_types = list(menu_db.keys())
        
        # 후보 메뉴 수집
        candidates = []
        for food_type in available_types:
            if temp_category in menu_db[food_type]:
                for item in menu_db[food_type][temp_category]:
                    item["category"] = food_type
                    candidates.append(item)
            elif "중간" in menu_db[food_type]:
                for item in menu_db[food_type]["중간"]:
                    item["category"] = food_type
                    candidates.append(item)
        
        # 기분에 따른 필터링
        import random
        
        # 기분별 추천 메뉴 조정
        mood_preferences = {
            "기쁜": ["분식", "양식"],  # 가벼운 음식
            "슬픈": ["한식", "중식"],  # 위로되는 음식
            "화난": ["한식", "중식"],  # 매운 음식
            "피곤한": ["한식", "일식"],  # 든든한 음식
            "스트레스": ["중식", "한식"],  # 얼큰한 음식
            "평범한": None  # 제한 없음
        }
        
        if pref_mood in mood_preferences and mood_preferences[pref_mood]:
            mood_types = mood_preferences[pref_mood]
            mood_filtered = [c for c in candidates if c["category"] in mood_types]
            if mood_filtered:
                candidates = mood_filtered
        
        if candidates:
            selected = random.choice(candidates)
        else:
            # 기본 메뉴
            selected = {
                "name": "비빔밥",
                "category": "한식",
                "spicy": "보통",
                "reason": "영양 균형이 잡힌 건강식입니다"
            }
        
        # 대체 메뉴 생성
        alternatives = [c["name"] for c in candidates if c["name"] != selected["name"]][:3]
        if not alternatives:
            alternatives = ["김치찌개", "짜장면", "돈카츠"]
        
        # 온도 매칭 설명
        if temp < 10:
            temp_match = f"쌀쌀한 날씨({temp}°C)에 따뜻한 음식으로 몸을 녹이세요"
        elif temp > 25:
            temp_match = f"더운 날씨({temp}°C)에 시원한 음식으로 더위를 식히세요"
        else:
            temp_match = f"적당한 날씨({temp}°C)에 어떤 메뉴든 좋습니다"
        
        if precipitation != "없음":
            temp_match += f". {precipitation}가 내리니 따뜻한 국물 요리가 제격입니다"
        
        return {
            "menu": selected["name"],
            "category": selected["category"],
            "reason": selected["reason"],
            "temperature_match": temp_match,
            "alternatives": alternatives,
            "weather_info": {
                "location": weather.get("location"),
                "temperature": weather.get("temperature"),
                "condition": weather.get("sky_condition")
            }
        }
    
    def _get_fallback_cafeteria_recommendation(self, weather: Dict, cafeteria_menu: str) -> Dict:
        """API 오류 시 기본 추천"""
        temp = weather.get("temperature", 20)
        
        # 간단한 규칙 기반 추천
        recommendations = [
            {
                "type": "상위호환",
                "menu": "프리미엄 한정식",
                "category": "한식",
                "reason": "구내식당보다 고급스러운 한식 코스",
                "price_range": "15,000-20,000원"
            },
            {
                "type": "비슷한카테고리",
                "menu": "김치찌개",
                "category": "한식",
                "reason": "구수하고 든든한 한식",
                "price_range": "8,000-10,000원"
            },
            {
                "type": "날씨기반",
                "menu": "냉면" if temp > 25 else "칼국수",
                "category": "한식",
                "reason": f"{'더운' if temp > 25 else '쌀쌀한'} 날씨에 어울리는 메뉴",
                "price_range": "8,000-12,000원"
            }
        ]
        
        return {
            "cafeteria_menu": cafeteria_menu,
            "recommendations": recommendations,
            "weather_summary": f"{temp}°C, {weather.get('sky_condition', '맑음')}",
            "weather_info": {
                "location": weather.get("location"),
                "temperature": weather.get("temperature"),
                "condition": weather.get("sky_condition"),
                "precipitation": weather.get("precipitation")
            }
        }
    
    def _get_fallback_recommendation(self, weather: Dict) -> Dict:
        """API 오류 시 기본 추천 (간단 버전)"""
        temp = weather.get("temperature", 20)
        
        if temp < 10:
            menu = "김치찌개"
            reason = "추운 날씨에 따뜻한 국물 요리가 좋습니다."
        elif temp < 20:
            menu = "비빔밥"
            reason = "적당한 날씨에 영양 균형 잡힌 메뉴입니다."
        else:
            menu = "냉면"
            reason = "더운 날씨에 시원한 면 요리가 제격입니다."
        
        return {
            "menu": menu,
            "category": "한식",
            "reason": reason,
            "temperature_match": f"{temp}°C에 적합한 메뉴입니다.",
            "alternatives": ["불고기", "갈비탕"],
            "weather_info": weather
        }

