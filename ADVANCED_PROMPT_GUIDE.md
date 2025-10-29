# 🤖 고급 프롬프트 시스템 가이드

## 개요
"밥뭇나?!" 애플리케이션은 Gemini 2.0 Flash의 고급 프롬프트 시스템을 활용하여 구조화되고 일관성 있는 AI 응답을 제공합니다.

## 핵심 기능

### 1. CAM 모드 (Cafeteria Avoidance Mode)
구내식당을 피하고 싶을 때 자동으로 외부 식당을 우선 추천하는 모드입니다.

#### 발동 조건
- `prefer_external: true` 설정
- 사용자가 "구내식당", "사내식당" 등의 회피 키워드 포함

#### 특징
- 외부 식당 최소 2개 이상 추천
- 도보 15분 이내 제한
- Practicality 가중치 증가

### 2. 스코어링 시스템

각 메뉴는 3가지 기준으로 평가됩니다:

#### 기본 모드 가중치
```
Taste (맛)        : 3
Nutrition (영양)  : 4
Practicality (실용성) : 3
```

#### CAM 모드 가중치
```
Taste (맛)        : 3
Nutrition (영양)  : 3
Practicality (실용성) : 4
```

### 3. 거리 정책

**near (가까움)**: 0~5분 도보 거리
**mid (중간)**: 6~15분 도보 거리
**far (먼)**: 15분 초과 (추천하지 않음)

### 4. 추천 카테고리

#### 상위호환 (Upgrade)
- 구내식당 메뉴의 고급/프리미엄 버전
- 같은 요리의 더 맛있는 버전
- 예: 구내식당 김치찌개 → 프리미엄 김치찌개 정식

#### 비슷한 카테고리 (Alternative)
- 같은 계열이지만 다른 음식
- 비슷한 맛이나 조리법
- 예: 김치찌개 → 순두부찌개

#### 날씨 기반 예외 (Wildcard)
- 현재 날씨에 최적화된 메뉴
- 완전히 다른 종류의 음식
- 예: 더운 날 → 냉면, 추운 날 → 국밥

## 응답 데이터 구조

### 전체 응답 형태

```json
{
  "mode": {
    "name": "CAM" | "default",
    "reason": "모드 선택 이유"
  },
  "cafeteria_menu": "구내식당 메뉴",
  "recommendations": [
    // 추천 항목 배열 (3개)
  ],
  "weather_summary": "날씨 요약",
  "weather_info": {
    "location": "서울",
    "temperature": 15,
    "condition": "맑음",
    "precipitation": "없음"
  }
}
```

### 추천 항목 구조

```json
{
  "type": "상위호환" | "비슷한카테고리" | "날씨기반",
  "menu": "메뉴명",
  "category": "음식 카테고리",
  "reason": "추천 이유 (50자 이내)",
  "price_range": "가격대",
  
  "distance": {
    "walking_min": 7,
    "bucket": "near" | "mid",
    "policy_fit": true
  },
  
  "score": {
    "taste": 8,         // 1-10
    "nutrition": 7,     // 1-10
    "practicality": 9,  // 1-10
    "total": 8.0        // 가중 평균
  },
  
  "meta": {
    "source": "nearby" | "inhouse",
    "priceLevel": "₩" | "₩₩" | "₩₩₩",
    "openNow": true
  }
}
```

## 시스템 인스트럭션

백엔드의 `AIService` 클래스는 다음과 같은 시스템 인스트럭션을 사용합니다:

```python
def _get_system_instruction(self) -> str:
    return """
당신은 "밥뭇나?! - 직장인 점심 추천 AI"입니다. 아래 규칙에 따라 메뉴를 추천합니다.

## 핵심 규칙
1. **입력 데이터**: 오늘자 구내식당 메뉴는 참고 자료입니다.
2. **CAM 모드**: 사용자가 구내식당 회피 의사를 보이면 외부식당 우선
3. **CAM 모드 원칙**: 근처 외부 음식점(도보 0~15분) 추천 최우선
4. **거리 정책**: 도보 0~15분 범위 내만 추천
5. **스코어링 가중치**: 기본 3:4:3, CAM 3:3:4
6. **예외(Wildcard)**: CAM 무관 외부 식당 위주
7. **날씨 고려**: 현재 날씨에 맞는 메뉴 추천

## 추천 카테고리
1. **상위호환(upgrade)**: 구내식당 메뉴의 고급/프리미엄 버전
2. **비슷한 카테고리(alternative)**: 같은 계열이지만 다른 음식
3. **예외(wildcard)**: 날씨 기반, 완전히 다른 종류의 음식
"""
```

## 날씨 기반 추천 로직

### 더운 날씨 (25℃ 이상)
- 시원한 메뉴 우선
- 냉면, 샐러드, 차가운 면 요리
- 선호 맛: "시원함, 깔끔함, 상큼함"

### 추운 날씨 (10℃ 이하)
- 따뜻한 국물 요리
- 찌개, 국밥, 탕류
- 선호 맛: "따뜻함, 든든함, 얼큰함"

### 비/눈 오는 날
- 실내 음식, 따뜻한 메뉴
- 부침개, 전골, 찜요리
- 선호 맛: "따뜻함, 부드러움, 위로"

## 프론트엔드 표시

### 카드 디자인
- **상위호환**: 노란색~주황색 그라데이션 (⭐)
- **비슷한카테고리**: 초록색~청록색 그라데이션 (🍽️)
- **날씨기반**: 파란색~보라색 그라데이션 (🌤️)

### 정보 표시
1. **배지**:
   - 카테고리 (음식 종류)
   - 출처 (🏃 외부 / 🏢 사내)
   - 가격대 (₩, ₩₩, ₩₩₩)

2. **거리 정보**:
   - 🚶 도보 X분
   - 거리 표시 (가까움/중간)

3. **스코어 그리드**:
   - 맛 (노란색)
   - 영양 (초록색)
   - 실용 (파란색)
   - 총점 (배지)

## API 사용 예시

### Python (백엔드)
```python
recommendation = await ai_service.recommend_from_cafeteria_menu(
    weather_data,
    "김치찌개, 된장찌개, 비빔밥",
    user_location={"latitude": 37.5665, "longitude": 126.9780},
    prefer_external=True  # CAM 모드 활성화
)
```

### JavaScript (프론트엔드)
```javascript
const result = await cafeteriaAPI.getRecommendation(
  "서울",
  "김치찌개, 된장찌개, 비빔밥",
  { latitude: 37.5665, longitude: 126.9780 },
  true  // CAM 모드
);
```

## 개발자 노트

### Gemini API 설정
- 모델: `gemini-2.0-flash-exp`
- System Instruction 사용
- JSON 응답 강제 (`response_mime_type: "application/json"`)
- Temperature: 0.8 (창의적 추천)

### 폴백 로직
AI API 실패 시 규칙 기반 추천 시스템으로 자동 전환:
```python
def _get_fallback_cafeteria_recommendation(self, weather: Dict, cafeteria_menu: str) -> Dict:
    # 날씨와 메뉴 기반 규칙 적용
    # 항상 안정적인 응답 보장
```

## 참고 문서
- [Gemini API 문서](https://ai.google.dev/docs)
- [Open-Meteo 날씨 API](https://open-meteo.com/en/docs)
- [DaisyUI 컴포넌트](https://daisyui.com/)

