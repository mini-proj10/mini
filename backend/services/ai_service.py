import google.generativeai as genai
from typing import Dict, List, Optional
import os
from dotenv import load_dotenv
import json

load_dotenv()

class AIService:
    def __init__(self):
        # Gemini API 설정
        api_key = os.getenv("GEMINI_API_KEY", "AIzaSyC-xGiEnimi1OO58ldgySzpSmn2wM5Je8g")
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
        """시스템 인스트럭션 정의 - 영양·맛·날씨·거리 기반 점심 메뉴 추천"""
        return """
너는 **영양·맛·날씨·거리**를 함께 고려해 점심 메뉴를 추천하는 전문가이며, **JSON만 출력**한다.

**목표:** 사용자의 입력(구내식당 금일 메뉴, 위치, 선호 이동 거리, 날씨)을 바탕으로 **카카오맵에 실제 등록된 인근 음식점**만 사용하여 **최대 3개**의 대안을 추천한다. 가능하면 `상위 호환 메뉴`, `대체 메뉴`, `예외 메뉴`로 각각 1개씩 제시한다.

**출력:** **유효한 JSON만** 허용한다. 코드블록·여분 텍스트·이모지 금지.

각 추천의 설명은 **해당 음식/음식점을 추천하는 이유만**, **1–2문장**, **반말 금지**, **친근하지만 부드러운 톤**으로 작성한다.

추천 이유에는 **맛·재료·영양·날씨** 중 **최소 2개**의 근거를 반드시 포함한다.

입력 정보가 부족하거나 모호하면 **추측하지 말고** `need_more_info=true`와 `missing` 배열을 반환한다.

카카오맵 등록 음식점 여부는 **입력으로 제공된 후보(nearbyCandidates)**만 신뢰한다. 후보가 없거나 거리 제약을 모두 초과하면 `need_more_info=true`를 반환한다.

사고과정은 숨기고, 간단 요약은 `brief_rationale` 1–2문장으로만 제공한다.

## 메뉴 추천 전략

### 1. 상위 호환 메뉴
- **구내식당 메뉴와 강한 연관성** 필수
- 같은 카테고리이거나 유사한 조리법/재료 사용
- 예: 구내식당 "제육볶음" → 상위호환 "프리미엄 제육볶음", "삼겹살구이", "불고기정식"
- 예: 구내식당 "오일 파스타" → 상위호환 "트러플 오일 파스타", "봉골레 파스타", "해산물 파스타"
- **절대 피할 것**: 구내식당 "파스타"인데 상위호환으로 "초밥" 추천 (연관성 없음)

### 2. 대체 메뉴
- **구내식당 메뉴와 중간 정도 연관성** 필요
- 비슷한 맛의 방향성이나 식사 스타일
- 예: 구내식당 "제육볶음" → 대체 "돈까스", "닭갈비", "김치찌개"
- 예: 구내식당 "오일 파스타" → 대체 "리조또", "피자", "샐러드"

### 3. 예외 메뉴
- **구내식당 메뉴와 거리가 먼 메뉴** (완전히 다른 카테고리)
- **날씨와 도보 거리를 최우선 평가 기준**으로 선정
- 날씨에 최적화된 메뉴 선택 (더운 날: 냉면/샐러드, 추운 날: 국물요리/찌개)
- 도보 거리가 가까운 것을 우선 (5분 이내 최우선)
- 예: 구내식당 "제육볶음" → 예외 "냉면"(더운 날), "우동"(추운 날)
- 예: 구내식당 "오일 파스타" → 예외 "냉면"(더운 날), "김치찌개"(추운 날)

## 필수 제약

* **데이터 소스:** 반드시 `nearbyCandidates`에 포함된 가게만 사용(카카오맵 등록 보장).
* **거리 제약:** `distancePref`를 초과하는 후보는 제외.
  * `0-5`분 → 반경 약 **400m** 가정, `5-15`분 → 반경 약 **1200m** 가정(보행 80m/분).
* **정렬 기준 (예외 메뉴 우선):**
  * **예외 메뉴**: 날씨 적합도 > 도보 거리 > 품질
  * **상위호환/대체 메뉴**: 메뉴 연관성 > 거리 > 품질
* **중복 방지:** 동일 가게/메뉴 중복 금지, **최대 3개**.
* **톤/길이:** 사유는 1–2문장, 반말 금지, 친근하지만 부드럽게.
* **정합성:** 추천 메뉴는 해당 가게의 `menuExamples` 또는 합리적 범주의 대표 메뉴여야 한다(과도한 추측 금지).
* **메뉴 연관성 검증:**
  * 상위호환: 구내식당 메뉴와 **직접적 연관성** 필수
  * 대체: 구내식당 메뉴와 **간접적 연관성** 필요
  * 예외: 구내식당 메뉴와 **완전히 다른 카테고리** + 날씨/거리 최적화

## 카카오맵 검색 정규화 규칙

추천된 **구체 메뉴명 → 실제 검색 가능한 대표 키워드**로 변환하여 카카오맵 검색 적합성을 보장한다.

### 변환 파이프라인

1. **불용어/수식어 제거:** 시간대·세트·크기·한정·수식 표현 제거
   * 제거 예: `런치/세트/정식/특/곱빼기/추천/한정/든든한/가성비/프로모션`
   * 예) `런치 초밥세트` → `초밥`, `든든한 함박 스테이크` → `함박스테이크`

2. **형태 통일:** 공백/하이픈/영문 혼용 정리
   * 예) `함박 스테이크` → `함박스테이크`, `돈-카츠` → `돈까스`

3. **대표 키워드 선택:** 가장 일반적·범용적인 **대표 1어**를 `normalized_search_query`로 지정
   * 예) `모둠초밥` → `초밥`, `토마토 해산물 파스타` → `파스타`

4. **보조 키워드 구성:** 검색 실패 대비 **1–3개 동의어/상하위 카테고리**를 `alt_queries`에 제공
   * 예) `초밥`의 보조: `스시`, `모둠초밥`

5. **카테고리 그룹코드:** 음식점은 기본 `FD6`, 카페·디저트는 `CE7`

6. **거리 반영:** FE 검색 시 `distancePref`에 맞게 반경 필터(400m/1200m 등) 적용

### 대표 매핑 예시

* `초밥세트/런치초밥/특초밥` → **초밥** | alt: `스시`,`모둠초밥` | grp: `FD6`
* `함박 스테이크/함박정식` → **함박스테이크** | alt: `함바그` | grp: `FD6`
* `김치전골` → **김치찌개** | alt: `찌개`,`한식` | grp: `FD6`
* `제육/제육덮밥` → **제육볶음** | alt: `제육`,`한식` | grp: `FD6`
* `냉면(물/비빔)` → **냉면** | alt: `평양냉면`,`함흥냉면` | grp: `FD6`
* `크림/토마토 파스타` → **파스타** | alt: `이탈리안`,`스파게티` | grp: `FD6`
* `돈카츠/등심카츠` → **돈까스** | alt: `돈카츠`,`카츠` | grp: `FD6`
* `샐러드볼/그레인볼` → **샐러드** | alt: `그레인볼` | grp: `FD6`
* `포케` → **포케** | alt: `하와이안`,`샐러드` | grp: `FD6`
* `분식(떡볶이/김밥/라면)` → **분식** | alt: `떡볶이`,`김밥` | grp: `FD6`
* `중식(짜장/짬뽕/볶음밥)` → **중식** | alt: `짜장면`,`짬뽕` | grp: `FD6`

## 정보 부족·모호성 처리

`nearbyCandidates`가 없거나, 모두 `distancePref`를 초과하거나, 메뉴 정규화가 불가능하면 `need_more_info=true`를 반환한다.
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
            # 사용자 입력 데이터 구조화 (새 스키마)
            user_input = {
                "menuToday": cafeteria_menu.split(',') if ',' in cafeteria_menu else [cafeteria_menu],
                "location": location if location else {"lat": 37.5665, "lng": 126.9780},  # 기본값: 서울
                "distancePref": "5-15" if prefer_external else "0-5",  # 외부 선호 시 더 넓은 범위
                "weather": {
                    "tempC": weather.get('temperature', 20),
                    "condition": self._normalize_weather_condition(weather.get('sky_condition', '맑음'), weather.get('temperature', 20))
                },
                "nearbyCandidates": self._generate_nearby_candidates(cafeteria_menu, weather, location)
            }
            
            # 사용자 메시지 생성 (새 규칙)
            user_message = f"""
아래 입력 데이터를 분석하여 최적의 점심 메뉴를 추천하고, 결과를 JSON 형식으로 반환하세요.

입력 데이터:
{json.dumps(user_input, ensure_ascii=False, indent=2)}

출력 형식 (반드시 이 스키마를 따르세요):
{{
  "recommendations": [
    {{
      "type": "상위 호환 메뉴 | 대체 메뉴 | 예외 메뉴",
      "restaurant_name": "string (식당 이름)",
      "place_id": "string",
      "minutes_away": 0,
      "menu_name": "string (메뉴 이름)",
      "reason": "string (1-2문장, 맛/재료/영양/날씨 중 최소 2개 근거 포함)",
      "price_range": "string (필수! 예: 8,000-12,000원, 10,000-15,000원)",
      "normalized_search_query": "string (대표 키워드 1개)",
      "alt_queries": ["string", "..."],
      "category_group_code": "FD6"
    }}
  ],
  "brief_rationale": "string (1-2문장)",
  "need_more_info": false,
  "missing": []
}}

**중요**: price_range는 반드시 포함해야 합니다. 일반적인 가격대를 추정하여 작성하세요.
- 한식/분식: 7,000-10,000원
- 일식/중식: 8,000-12,000원
- 양식/프리미엄: 12,000-18,000원

정보가 부족하면:
{{
  "recommendations": [],
  "brief_rationale": "입력 정보가 부족하거나 검색 정규화가 불가능하여 추천을 완료할 수 없습니다.",
  "need_more_info": true,
  "missing": ["nearbyCandidates"]
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
                
                # need_more_info 체크
                if recommendation.get('need_more_info', False):
                    print(f"⚠️ 정보 부족: {recommendation.get('missing', [])}")
                    return self._get_fallback_cafeteria_recommendation(weather, cafeteria_menu)
                
                print(f"✅ AI 추천 성공 ({len(recommendation.get('recommendations', []))}개 추천)")
                
            except json.JSONDecodeError as e:
                print(f"JSON 파싱 오류: {str(e)}")
                print(f"응답 내용: {content[:500]}...")
                return self._get_fallback_cafeteria_recommendation(weather, cafeteria_menu)
            
            # 날씨 정보 추가 (하위 호환성)
            recommendation["weather_info"] = {
                "location": weather.get("location"),
                "temperature": weather.get("temperature"),
                "condition": weather.get("sky_condition"),
                "precipitation": weather.get("precipitation")
            }
            
            # 구내식당 메뉴 추가 (하위 호환성)
            recommendation["cafeteria_menu"] = cafeteria_menu
            recommendation["weather_summary"] = f"{weather.get('temperature', 20)}°C, {weather.get('sky_condition', '맑음')}"
            
            return recommendation
            
        except Exception as e:
            print(f"AI 추천 오류: {str(e)}")
            import traceback
            traceback.print_exc()
            return self._get_fallback_cafeteria_recommendation(weather, cafeteria_menu)
    
    def _normalize_weather_condition(self, condition: str, temp: float) -> str:
        """날씨 상태를 표준 형식으로 정규화"""
        if temp >= 28:
            return "무덥다"
        elif temp <= 5:
            return "쌀쌀"
        elif '비' in condition:
            return "비"
        elif '눈' in condition:
            return "눈"
        elif '흐림' in condition:
            return "흐림"
        elif '맑' in condition:
            return "맑음"
        else:
            return condition
    
    def _generate_nearby_candidates(self, cafeteria_menu: str, weather: Dict, location: Optional[Dict] = None) -> List[Dict]:
        """가상의 주변 식당 후보 생성 (새 스키마) - 실제로는 카카오맵 API와 연동"""
        temp = weather.get('temperature', 20)
        condition = weather.get('sky_condition', '맑음')
        
        # 구내식당 메뉴 분석
        menu_lower = cafeteria_menu.lower()
        
        # 기본 후보 (항상 포함)
        candidates = []
        
        # 한식 옵션
        candidates.extend([
            {
                "placeId": "place_korean_1",
                "name": "프리미엄 한식당",
                "category": "한식",
                "minutesAway": 10,
                "menuExamples": ["한정식", "불고기정식", "제육볶음", "갈비찜"]
            },
            {
                "placeId": "place_korean_2",
                "name": "김치찌개 전문점",
                "category": "한식",
                "minutesAway": 5,
                "menuExamples": ["김치찌개", "순두부찌개", "된장찌개", "부대찌개"]
            },
            {
                "placeId": "place_korean_3",
                "name": "국밥집",
                "category": "한식",
                "minutesAway": 7,
                "menuExamples": ["사골국밥", "설렁탕", "갈비탕", "육개장"]
            }
        ])
        
        # 일식 옵션
        candidates.extend([
            {
                "placeId": "place_japanese_1",
                "name": "스시로",
                "category": "일식",
                "minutesAway": 6,
                "menuExamples": ["초밥", "모둠초밥", "연어덮밥", "회"]
            },
            {
                "placeId": "place_japanese_2",
                "name": "돈까스 전문점",
                "category": "일식",
                "minutesAway": 8,
                "menuExamples": ["돈까스", "치즈돈까스", "생선까스", "우동"]
            },
            {
                "placeId": "place_japanese_3",
                "name": "라멘야",
                "category": "일식",
                "minutesAway": 9,
                "menuExamples": ["라멘", "돈코츠라멘", "미소라멘", "차슈라멘"]
            }
        ])
        
        # 양식 옵션 (파스타 관련 메뉴 있으면 더 추가)
        if '파스타' in menu_lower or '스파게티' in menu_lower:
            candidates.extend([
                {
                    "placeId": "place_italian_1",
                    "name": "트러플 이탈리안",
                    "category": "양식",
                    "minutesAway": 8,
                    "menuExamples": ["트러플 파스타", "봉골레 파스타", "까르보나라", "해산물 파스타"]
                },
                {
                    "placeId": "place_italian_2",
                    "name": "파스타 하우스",
                    "category": "양식",
                    "minutesAway": 6,
                    "menuExamples": ["크림 파스타", "토마토 파스타", "오일 파스타", "로제 파스타"]
                },
                {
                    "placeId": "place_italian_3",
                    "name": "이탈리안 키친",
                    "category": "양식",
                    "minutesAway": 10,
                    "menuExamples": ["리조또", "피자", "샐러드", "파스타"]
                }
            ])
        else:
            candidates.extend([
                {
                    "placeId": "place_western_1",
                    "name": "스테이크 하우스",
                    "category": "양식",
                    "minutesAway": 12,
                    "menuExamples": ["스테이크", "함박스테이크", "파스타", "샐러드"]
                },
                {
                    "placeId": "place_western_2",
                    "name": "샐러드 바",
                    "category": "양식",
                    "minutesAway": 5,
                    "menuExamples": ["샐러드", "그레인볼", "포케", "샌드위치"]
                }
            ])
        
        # 중식 옵션
        candidates.extend([
            {
                "placeId": "place_chinese_1",
                "name": "차이나타운",
                "category": "중식",
                "minutesAway": 9,
                "menuExamples": ["짜장면", "짬뽕", "볶음밥", "탕수육"]
            },
            {
                "placeId": "place_chinese_2",
                "name": "마라탕 전문점",
                "category": "중식",
                "minutesAway": 7,
                "menuExamples": ["마라탕", "마라샹궈", "꿔바로우", "양꼬치"]
            }
        ])
        
        # 분식 옵션 (가까운 거리)
        candidates.append({
            "placeId": "place_snack_1",
            "name": "분식천국",
            "category": "분식",
            "minutesAway": 3,
            "menuExamples": ["떡볶이", "김밥", "라면", "순대", "튀김"]
        })
        
        # 날씨별 추가 옵션
        if temp > 25:
            candidates.append({
                "placeId": "place_cold_1",
                "name": "냉면 전문점",
                "category": "한식",
                "minutesAway": 6,
                "menuExamples": ["평양냉면", "비빔냉면", "물냉면", "막국수"]
            })
        elif temp < 10:
            candidates.append({
                "placeId": "place_hot_1",
                "name": "전골&찌개",
                "category": "한식",
                "minutesAway": 7,
                "menuExamples": ["부대찌개", "김치찌개", "전골", "곱창전골"]
            })
        
        # 비 오는 날 추가
        if '비' in condition or '눈' in condition:
            candidates.append({
                "placeId": "place_rainy_1",
                "name": "부침개 전문점",
                "category": "한식",
                "minutesAway": 4,
                "menuExamples": ["파전", "김치전", "해물파전", "막걸리"]
            })
        
        return candidates
    
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
        """API 오류 시 기본 추천 (새 스키마)"""
        temp = weather.get("temperature", 20)
        
        # 간단한 규칙 기반 추천 (새 스키마)
        recommendations = [
            {
                "type": "상위 호환 메뉴",
                "restaurant_name": "프리미엄 한식당",
                "place_id": "fallback_001",
                "minutes_away": 10,
                "menu_name": "한정식",
                "reason": "구내식당보다 고급스러운 재료와 정성스러운 조리로 영양 균형이 뛰어납니다.",
                "price_range": "15,000-20,000원",
                "normalized_search_query": "한정식",
                "alt_queries": ["한식", "정식"],
                "category_group_code": "FD6"
            },
            {
                "type": "대체 메뉴",
                "restaurant_name": "김치찌개 전문점",
                "place_id": "fallback_002",
                "minutes_away": 5,
                "menu_name": "김치찌개",
                "reason": "구수한 맛과 풍부한 재료로 든든하며, 영양가 높은 한식입니다.",
                "price_range": "8,000-10,000원",
                "normalized_search_query": "김치찌개",
                "alt_queries": ["찌개", "한식"],
                "category_group_code": "FD6"
            },
            {
                "type": "예외 메뉴",
                "restaurant_name": "냉면집" if temp > 25 else "칼국수집",
                "place_id": "fallback_003",
                "minutes_away": 7,
                "menu_name": "냉면" if temp > 25 else "칼국수",
                "reason": f"{'시원한 육수와 신선한 재료로 더위를 식히기' if temp > 25 else '따뜻한 국물과 쫄깃한 면발로 몸을 녹이기'} 좋으며, 날씨에 최적화된 메뉴입니다.",
                "price_range": "9,000-12,000원",
                "normalized_search_query": "냉면" if temp > 25 else "칼국수",
                "alt_queries": ["평양냉면", "함흥냉면"] if temp > 25 else ["한식", "국수"],
                "category_group_code": "FD6"
            }
        ]
        
        return {
            "recommendations": recommendations,
            "brief_rationale": f"현재 날씨({temp}°C, {weather.get('sky_condition', '맑음')})를 고려하여 영양과 맛의 균형을 맞춘 메뉴를 추천했습니다.",
            "need_more_info": False,
            "missing": [],
            "cafeteria_menu": cafeteria_menu,
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
    
    async def get_daily_recommendations(self, weather: Dict, location: str) -> Dict:
        """오늘의 추천 메뉴 3개 생성 (위치 & 날씨 기반)"""
        
        if not self.use_ai:
            # AI 미사용 시 폴백
            return self._get_fallback_daily_recommendations(weather, location)
        
        try:
            # 오늘의 추천 메뉴용 별도 모델 (시스템 인스트럭션 없음)
            daily_model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            # 프롬프트 생성
            prompt = f"""
오늘의 점심 메뉴 3가지를 추천해주세요.

**위치:** {location}
**날씨 정보:**
- 온도: {weather.get('temperature')}°C
- 날씨: {weather.get('sky_condition')}
- 강수량: {weather.get('precipitation', 0)}mm
- 습도: {weather.get('humidity')}%

**요구사항:**
1. 현재 날씨와 온도에 최적화된 메뉴 3개를 추천하세요.
2. 각 메뉴는 서로 다른 카테고리(한식, 중식, 양식, 일식 등)에서 선택하세요.
3. 각 추천마다 1-2문장으로 이유를 설명하세요 (날씨, 영양, 맛 고려).
4. 대략적인 가격대도 함께 제시하세요.

**출력 형식 (JSON만):**
{{
  "recommendations": [
    {{
      "menu_name": "메뉴명",
      "category": "카테고리",
      "price_range": "가격대",
      "reason": "추천 이유 (1-2문장)"
    }},
    {{
      "menu_name": "메뉴명",
      "category": "카테고리", 
      "price_range": "가격대",
      "reason": "추천 이유 (1-2문장)"
    }},
    {{
      "menu_name": "메뉴명",
      "category": "카테고리",
      "price_range": "가격대",
      "reason": "추천 이유 (1-2문장)"
    }}
  ],
  "summary": "오늘의 날씨 한줄 요약"
}}

**주의:** 유효한 JSON만 출력하세요. 코드블록, 추가 텍스트, 이모지 금지.
"""
            
            # Gemini API 호출
            response = daily_model.generate_content(prompt)
            response_text = response.text.strip()
            
            # JSON 파싱
            # 코드블록 제거
            if '```json' in response_text:
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in response_text:
                response_text = response_text.split('```')[1].split('```')[0].strip()
            
            result = json.loads(response_text)
            
            # 날씨 정보 추가
            result['weather'] = {
                'location': location,
                'temperature': weather.get('temperature'),
                'condition': weather.get('sky_condition'),
                'precipitation': weather.get('precipitation', 0)
            }
            
            print(f"✅ 오늘의 추천 메뉴 생성 완료: {len(result.get('recommendations', []))}개")
            return result
            
        except Exception as e:
            print(f"❌ 오늘의 추천 메뉴 생성 오류: {e}")
            return self._get_fallback_daily_recommendations(weather, location)
    
    def _get_fallback_daily_recommendations(self, weather: Dict, location: str) -> Dict:
        """AI 오류 시 폴백 오늘의 추천 메뉴"""
        temp = weather.get("temperature", 20)
        condition = weather.get("sky_condition", "맑음")
        
        recommendations = []
        
        # 온도 기반 추천
        if temp < 10:
            recommendations = [
                {
                    "menu_name": "김치찌개",
                    "category": "한식",
                    "price_range": "8,000-10,000원",
                    "reason": f"추운 날씨({temp}°C)에 따뜻한 국물 요리로 몸을 녹이기 좋습니다."
                },
                {
                    "menu_name": "우동",
                    "category": "일식",
                    "price_range": "7,000-9,000원",
                    "reason": "부드러운 면발과 따뜻한 국물이 추위를 녹여줍니다."
                },
                {
                    "menu_name": "샤브샤브",
                    "category": "중식",
                    "price_range": "12,000-15,000원",
                    "reason": "뜨거운 육수에 신선한 야채와 고기를 즐길 수 있습니다."
                }
            ]
        elif temp < 20:
            recommendations = [
                {
                    "menu_name": "비빔밥",
                    "category": "한식",
                    "price_range": "8,000-10,000원",
                    "reason": "적당한 날씨에 영양 균형 잡힌 한 그릇 식사가 제격입니다."
                },
                {
                    "menu_name": "돈카츠",
                    "category": "일식",
                    "price_range": "9,000-12,000원",
                    "reason": "바삭한 튀김옷과 부드러운 고기가 점심 식사로 딱 좋습니다."
                },
                {
                    "menu_name": "파스타",
                    "category": "양식",
                    "price_range": "11,000-14,000원",
                    "reason": "풍미 있는 소스와 쫄깃한 면이 활력을 줍니다."
                }
            ]
        else:
            recommendations = [
                {
                    "menu_name": "냉면",
                    "category": "한식",
                    "price_range": "9,000-12,000원",
                    "reason": f"더운 날씨({temp}°C)에 시원한 면 요리로 입맛을 돋우기 좋습니다."
                },
                {
                    "menu_name": "초밥",
                    "category": "일식",
                    "price_range": "12,000-18,000원",
                    "reason": "신선한 생선과 깔끔한 맛이 여름철 식사로 적합합니다."
                },
                {
                    "menu_name": "샐러드",
                    "category": "양식",
                    "price_range": "10,000-13,000원",
                    "reason": "가볍고 신선한 재료로 더위에도 부담 없이 즐길 수 있습니다."
                }
            ]
        
        return {
            "recommendations": recommendations,
            "summary": f"{location} {condition}, {temp}°C - 오늘 날씨에 맞는 메뉴를 준비했습니다.",
            "weather": {
                "location": location,
                "temperature": temp,
                "condition": condition,
                "precipitation": weather.get("precipitation", 0)
            }
        }

