# 프롬프트 정책 문서

## 개요

이 프로젝트는 **영양·맛·날씨·거리**를 함께 고려하여 점심 메뉴를 추천하는 AI 시스템입니다.

## 시스템 프롬프트 규칙

### 목표
사용자의 입력(구내식당 금일 메뉴, 위치, 선호 이동 거리, 날씨)을 바탕으로 **카카오맵에 실제 등록된 인근 음식점**만 사용하여 **최대 3개**의 대안을 추천합니다.

### 출력 형식
- **유효한 JSON만** 허용
- 코드블록·여분 텍스트·이모지 금지
- 각 추천의 설명은 **1–2문장**, **반말 금지**, **친근하지만 부드러운 톤**
- 추천 이유에는 **맛·재료·영양·날씨** 중 **최소 2개**의 근거를 반드시 포함

### 추천 카테고리
1. **상위 호환 메뉴**: 구내식당 메뉴의 고급/프리미엄 버전
2. **대체 메뉴**: 같은 계열이지만 다른 음식
3. **예외 메뉴**: 날씨 기반, 완전히 다른 종류의 음식

## 입력 스키마

```json
{
  "menuToday": ["string", "..."],
  "location": { "lat": 0, "lng": 0 },
  "distancePref": "0-5 | 5-15",
  "weather": { 
    "tempC": 0, 
    "condition": "맑음|비|흐림|눈|무덥다|쌀쌀" 
  },
  "nearbyCandidates": [
    {
      "placeId": "string",
      "name": "string",
      "category": "한식|중식|일식|양식|분식|카페|기타",
      "minutesAway": 0,
      "menuExamples": ["string", "..."]
    }
  ]
}
```

## 출력 스키마

```json
{
  "recommendations": [
    {
      "type": "상위 호환 메뉴 | 대체 메뉴 | 예외 메뉴",
      "restaurant_name": "string",
      "place_id": "string",
      "minutes_away": 0,
      "menu_name": "string",
      "reason": "string (1-2문장, 맛/재료/영양/날씨 중 최소 2개 근거 포함)",
      "normalized_search_query": "string (대표 키워드 1개)",
      "alt_queries": ["string", "..."],
      "category_group_code": "FD6"
    }
  ],
  "brief_rationale": "string (1-2문장)",
  "need_more_info": false,
  "missing": []
}
```

## 필수 제약

### 데이터 소스
- 반드시 `nearbyCandidates`에 포함된 가게만 사용 (카카오맵 등록 보장)

### 거리 제약
- `distancePref`를 초과하는 후보는 제외
- `0-5`분 → 반경 약 **400m** 가정
- `5-15`분 → 반경 약 **1200m** 가정 (보행 80m/분)

### 정렬 기준
- 거리 우선 (가까운 순)
- 동률 시 품질 지표 (평점/리뷰수) 보조 고려

### 중복 방지
- 동일 가게/메뉴 중복 금지
- **최대 3개** 추천

### 톤/길이
- 사유는 1–2문장
- 반말 금지, 친근하지만 부드럽게

### 정합성
- 추천 메뉴는 해당 가게의 `menuExamples` 또는 합리적 범주의 대표 메뉴
- 과도한 추측 금지

## 카카오맵 검색 정규화 규칙

### 목표
추천된 **구체 메뉴명 → 실제 검색 가능한 대표 키워드**로 변환하여 카카오맵 검색 적합성을 보장

### 변환 파이프라인

1. **불용어/수식어 제거**
   - 제거 예: `런치/세트/정식/특/곱빼기/추천/한정/든든한/가성비/프로모션`
   - 예) `런치 초밥세트` → `초밥`

2. **형태 통일**
   - 예) `함박 스테이크` → `함박스테이크`, `돈-카츠` → `돈까스`

3. **대표 키워드 선택**
   - 가장 일반적·범용적인 **대표 1어**를 `normalized_search_query`로 지정
   - 예) `모둠초밥` → `초밥`

4. **보조 키워드 구성**
   - 검색 실패 대비 **1–3개 동의어/상하위 카테고리**를 `alt_queries`에 제공
   - 예) `초밥`의 보조: `스시`, `모둠초밥`

5. **카테고리 그룹코드**
   - 음식점: `FD6`
   - 카페·디저트: `CE7`

### 대표 매핑 예시

| 입력 메뉴 | normalized_search_query | alt_queries | category_group_code |
|----------|------------------------|-------------|---------------------|
| 초밥세트/런치초밥 | 초밥 | 스시, 모둠초밥 | FD6 |
| 함박 스테이크 | 함박스테이크 | 함바그 | FD6 |
| 김치전골 | 김치찌개 | 찌개, 한식 | FD6 |
| 제육/제육덮밥 | 제육볶음 | 제육, 한식 | FD6 |
| 냉면(물/비빔) | 냉면 | 평양냉면, 함흥냉면 | FD6 |
| 크림/토마토 파스타 | 파스타 | 이탈리안, 스파게티 | FD6 |
| 돈카츠/등심카츠 | 돈까스 | 돈카츠, 카츠 | FD6 |
| 샐러드볼/그레인볼 | 샐러드 | 그레인볼 | FD6 |
| 포케 | 포케 | 하와이안, 샐러드 | FD6 |
| 분식(떡볶이/김밥) | 분식 | 떡볶이, 김밥 | FD6 |
| 중식(짜장/짬뽕) | 중식 | 짜장면, 짬뽕 | FD6 |

## 정보 부족·모호성 처리

`nearbyCandidates`가 없거나, 모두 `distancePref`를 초과하거나, 메뉴 정규화가 불가능하면:

```json
{
  "recommendations": [],
  "brief_rationale": "입력 정보가 부족하거나 검색 정규화가 불가능하여 추천을 완료할 수 없습니다.",
  "need_more_info": true,
  "missing": ["nearbyCandidates"]
}
```

## 품질 체크리스트

- [ ] `recommendations`가 **0–3개** 범위이고 중복이 없는가?
- [ ] 각 항목의 `reason`이 **1–2문장**이고 **맛/재료/영양/날씨 중 ≥2 근거**를 포함하는가?
- [ ] `normalized_search_query`가 **대표 1어**, `alt_queries`가 **1–3개 동의어**인가?
- [ ] `category_group_code`가 상황에 맞게 `FD6/CE7`로 설정되었는가?
- [ ] `minutes_away`가 `distancePref` 내인가?
- [ ] `need_more_info` 사용 조건이 지켜졌는가?

## API 사용 예시

### 요청

```bash
POST /api/recommend-from-cafeteria
Content-Type: application/json

{
  "location": "서울",
  "cafeteria_menu": "제육볶음, 된장찌개, 비빔밥",
  "prefer_external": true
}
```

### 응답

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "type": "상위 호환 메뉴",
        "restaurant_name": "프리미엄 한식당",
        "place_id": "place_007",
        "minutes_away": 10,
        "menu_name": "제육볶음",
        "reason": "퀄리티가 더 좋은 프리미엄 한식당에서 제육볶음을 즐기는 것을 추천합니다. 맑은 날씨에 매콤달콤한 제육볶음은 입맛을 돋우고 기분 좋게 만들어 줄 것입니다.",
        "normalized_search_query": "제육볶음",
        "alt_queries": ["제육", "한식"],
        "category_group_code": "FD6"
      }
    ],
    "brief_rationale": "구내식당 메뉴를 고려하여 상위 호환, 대체, 예외 메뉴를 각각 추천했습니다.",
    "need_more_info": false,
    "missing": []
  }
}
```

## 구현 위치

- **시스템 프롬프트**: `backend/services/ai_service.py` - `_get_system_instruction()` 메서드
- **입력 데이터 구조화**: `backend/services/ai_service.py` - `recommend_from_cafeteria_menu()` 메서드
- **후보 생성**: `backend/services/ai_service.py` - `_generate_nearby_candidates()` 메서드
- **날씨 정규화**: `backend/services/ai_service.py` - `_normalize_weather_condition()` 메서드

## 업데이트 이력

- **2025-10-29**: 새로운 프롬프트 정책 적용
  - 영양·맛·날씨·거리 기반 추천 시스템
  - 카카오맵 검색 정규화 규칙 추가
  - 입력/출력 스키마 표준화
  - need_more_info 처리 로직 추가

