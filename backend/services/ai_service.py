import google.generativeai as genai
from typing import Dict, List, Optional
import os
from dotenv import load_dotenv
import json
import random

load_dotenv()


class AIService:
    def __init__(self):
        # Gemini API 설정
        api_key = os.getenv(
            "GEMINI_API_KEY",
            "AIzaSyC-xGiEnimi1OO58ldgySzpSmn2wM5Je8g"
        )

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

        # ✅ 이전 추천 기억 → 같은 입력 여러 번 넣어도 맨날 똑같이 안 나오게
        self.last_recommendations: List[Dict] = []

    # =======================================================================
    # 1) 시스템 인스트럭션
    #    - 찌개/국/탕 → 상위호환도 찌개/국/탕
    #    - 볶음/구이/덮밥 → 상위호환도 같은 계열
    #    - avoidList 들어오면 최대한 피하기
    #    - 한국 국물일 때 중국 마라계열은 상위호환에 두지 말기
    # =======================================================================
    def _get_system_instruction(self) -> str:
        return """
너는 **영양·맛·날씨·거리**를 함께 고려해 점심 메뉴를 추천하는 전문가이며, **JSON만 출력**한다.

**목표:** 사용자의 입력(구내식당 금일 메뉴, 위치, 선호 이동 거리, 날씨)을 바탕으로 **카카오맵에 실제 등록된 인근 음식점**만 사용하여 **최대 3개**의 대안을 추천한다. 가능하면 `상위 호환 메뉴`, `대체 메뉴`, `예외 메뉴`로 각각 1개씩 제시한다.

**매우 중요한 분류 규칙 (이걸 제일 먼저 따른다):**
1. 원 메뉴가 **찌개/국/탕/전골/국밥/설렁탕/곰탕** 계열(김치찌개, 된장찌개, 순두부, 부대찌개, 감자탕, 설렁탕, 곰탕, 국밥, 육개장 등)이면,
   - **상위 호환 메뉴도 반드시 찌개/국/탕/전골/국밥 안에서만 뽑는다.**
   - 예: 김치찌개 → 김치전골, 차돌김치찌개, 부대찌개, 전골 전문점, 한식 정식(김치찌개 포함)
   - ❌ 김치찌개 → 제육볶음, 돈까스, 닭갈비 → 이건 상위호환이 아니라 **대체 메뉴**로 보내야 한다.
   - ❌ 김치찌개 → 마라탕/마라샹궈/훠궈 → 이것도 상위호환이 아니라 **대체 메뉴**로 내려야 한다.
2. 원 메뉴가 **볶음/구이/덮밥** 계열(제육볶음, 닭갈비, 불고기, 돈까스, 카츠, 덮밥 등)이면,
   - 상위호환은 같은 단백질/같은 조리축에서 한 단계 위(재료↑, 가격↑, 전문점↑)로 올린다.
   - ❌ 제육볶음 → 김치찌개처럼 국물로 내려가지 않는다.
3. “예외 메뉴”는 원래 메뉴랑 멀어도 되지만, “대체 메뉴”랑 같은 걸 두 번 내보내지 않는다.
4. 입력에 `avoidList`가 들어오면 그 안의 `(restaurant_name, menu_name)`은 가능하면 다시 추천하지 않는다. 진짜 후보가 없을 때만 중복을 허용한다.

**추가 금지 규칙 (국물 계열):**
- 원 메뉴가 한국식 국물(김치찌개, 된장찌개, 순두부, 부대찌개, 감자탕, 설렁탕, 곰탕, 국밥 등)이면
  상위 호환에 중국식 얼얼한 탕류(마라탕, 마라샹궈, 훠궈 등)를 넣지 않는다.
  그런 메뉴는 있더라도 **대체 메뉴**나 **예외 메뉴**로만 넣는다.

**출력:** **유효한 JSON만** 허용한다. 코드블록·여분 텍스트·이모지 금지.

각 추천의 설명은 **해당 음식/음식점을 추천하는 이유만**, **1–2문장**, **반말 금지**, **친근하지만 부드러운 톤**으로 작성한다.
추천 이유에는 **맛·재료·영양·날씨** 중 **최소 2개**의 근거를 반드시 포함한다.

입력 정보가 부족하거나 모호하면 **추측하지 말고** `need_more_info=true`와 `missing` 배열을 반환한다.

카카오맵 등록 음식점 여부는 **입력으로 제공된 후보(nearbyCandidates)**만 신뢰한다.

## 입력 검증 규칙
- 메뉴명은 **완성형 한글 2자 이상** 또는 **영문/숫자 2자 이상**이어야 한다.
- **한글 자모(ㄱ/ㄴ/ㅇ/ㅐ 등)**만으로 이루어진 입력은 무효다.
- 음식으로 보기 어려운 입력(“그림”, “사진”, “이미지”, “파일”, “메뉴”, “추천” 등)은 그대로 에러 JSON을 돌려준다.

## 메뉴 추천 전략

### 1. 상위 호환 메뉴
- 반드시 **같은 조리축** 안에서만 올린다.
- 찌개/국/탕 → 찌개/국/탕
- 볶음/구이/덮밥 → 볶음/구이/덮밥
- 면 → 면
- 예: 김치찌개 → 김치전골, 부대찌개, 차돌김치찌개
- 예: 제육볶음 → 흑돼지 제육, 불고기 정식, 삼겹살구이
- ❌ 김치찌개 → 제육볶음 (이건 밑에 대체로 내려라)
- ❌ 김치찌개 → 마라탕 (이것도 대체로 내려라)

### 2. 대체 메뉴
- 같은 한식 밥상 스타일이지만 조리법/메인재료가 다른 메뉴
- 김치찌개/된장찌개가 들어오면 여기에는 제육볶음/돈까스/순두부/국밥 같은 게 들어올 수 있다.
- avoidList 안에 있는 건 가능한 빼라.

### 3. 예외 메뉴
- 원래 메뉴와 카테고리가 달라도 된다.
- 날씨/거리 기반으로 “지금 먹기 제일 나은” 걸 고른다.
- 더울 때: 냉면/샐러드/포케
- 추울 때: 칼국수/우동/전골/라멘
- 비/눈: 파전/따뜻한 국물

## 필수 제약
* nearbyCandidates 안에서만 추천
* distancePref 넘는 건 제외
* 같은 식당/같은 메뉴 중복 금지
* 최대 3개
* avoidList는 최대한 피함
"""

    # =======================================================================
    # 2) 구내식당 메뉴 기반 추천
    # =======================================================================
    async def recommend_from_cafeteria_menu(
        self,
        weather: Dict,
        cafeteria_menu: str,
        location: Optional[Dict] = None,
        prefer_external: bool = True
    ) -> Dict:
        """
        고급 프롬프트 시스템으로 구내식당 메뉴 기반 추천
        + 이전 추천 내역을 보내서 중복을 줄이는 버전
        + (여기서 한 번 더) 찌개인데 상위호환이 볶음/마라탕으로 나온 걸 강제로 대체로 돌리는 후처리
        """
        if not self.use_ai:
            return self._get_fallback_cafeteria_recommendation(
                weather,
                cafeteria_menu
            )

        try:
            # ✅ 이전 호출에서 뭐 나왔는지 모델에 알려주기
            avoid_list = [
                {
                    "restaurant_name": r.get("restaurant_name"),
                    "menu_name": r.get("menu_name")
                }
                for r in self.last_recommendations
                if r.get("restaurant_name") or r.get("menu_name")
            ]

            user_input = {
                "menuToday": (
                    cafeteria_menu.split(',')
                    if ',' in cafeteria_menu
                    else [cafeteria_menu]
                ),
                "location": (
                    location
                    if location
                    else {"lat": 37.5665, "lng": 126.9780}
                ),
                "distancePref": (
                    "5-15" if prefer_external else "0-5"
                ),
                "weather": {
                    "tempC": weather.get('temperature', 20),
                    "condition": self._normalize_weather_condition(
                        weather.get('sky_condition', '맑음'),
                        weather.get('temperature', 20)
                    )
                },
                "nearbyCandidates": self._generate_nearby_candidates(
                    cafeteria_menu,
                    weather,
                    location
                ),
                # ✅ 이게 핵심
                "avoidList": avoid_list
            }

            user_message = f"""
아래 입력 데이터를 분석하여 최적의 점심 메뉴를 추천하고,
결과를 JSON 형식으로 반환하세요.

입력 데이터:
{json.dumps(user_input, ensure_ascii=False, indent=2)}

추가 규칙:
- 입력의 avoidList에 있는 (restaurant_name, menu_name) 조합은
  이번 추천에서 가능하면 제외하세요.
- 상위호환 1개, 대체 1개, 예외 1개를 우선 생성하되
  조건에 맞는 게 없으면 있는 것만 내보내세요.

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

정보가 부족하면:
{{
  "recommendations": [],
  "brief_rationale": "입력 정보가 부족하거나 검색 정규화가 불가능하여 추천을 완료할 수 없습니다.",
  "need_more_info": true,
  "missing": ["nearbyCandidates"]
}}
"""

            generation_config = genai.types.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.8,
            )

            response = self.model.generate_content(
                user_message,
                generation_config=generation_config
            )
            content = response.text

            try:
                recommendation = json.loads(content)

                if recommendation.get('need_more_info', False):
                    print("⚠️ 정보 부족:", recommendation.get('missing', []))
                    return self._get_fallback_cafeteria_recommendation(
                        weather,
                        cafeteria_menu
                    )

                print(
                    "✅ AI 추천 성공 (개수:",
                    len(recommendation.get('recommendations', [])),
                    ")"
                )

            except json.JSONDecodeError as e:
                print("JSON 파싱 오류:", str(e))
                print("응답 내용:", content[:500], "...")
                return self._get_fallback_cafeteria_recommendation(
                    weather,
                    cafeteria_menu
                )

            # ✅ 1차: 모델이 준 거 중복 제거
            deduped = self._dedupe_recommendations(
                recommendation.get("recommendations", [])
            )

            # ✅ 2차: "국물인데 상위호환이 제육/돈까스/마라탕으로 나왔다" → 강제 대체로 돌리기
            fixed = self._fix_wrong_hierarchy_for_soups(
                cafeteria_menu,
                deduped
            )

            # ✅ 저장 → 다음 호출에서 피하도록
            self.last_recommendations = fixed

            # 하위호환 필드들 추가
            recommendation["recommendations"] = fixed
            recommendation["weather_info"] = {
                "location": weather.get("location"),
                "temperature": weather.get("temperature"),
                "condition": weather.get("sky_condition"),
                "precipitation": weather.get("precipitation")
            }
            recommendation["cafeteria_menu"] = cafeteria_menu
            recommendation["weather_summary"] = (
                f"{weather.get('temperature', 20)}°C, "
                f"{weather.get('sky_condition', '맑음')}"
            )

            return recommendation

        except Exception as e:
            print("AI 추천 오류:", str(e))
            import traceback
            traceback.print_exc()
            return self._get_fallback_cafeteria_recommendation(
                weather,
                cafeteria_menu
            )

    # =======================================================================
    # 3) 중복 제거
    # =======================================================================
    def _dedupe_recommendations(
        self,
        recs: List[Dict]
    ) -> List[Dict]:
        """
        모델이 무시하고 똑같은 식당/메뉴를 다시 줬을 때
        파이썬단에서 한 번 더 걸러주는 함수
        """
        if not recs:
            return recs

        # 직전 호출에서 나왔던 (식당, 메뉴)
        prev_keys = {
            (
                r.get("restaurant_name", ""),
                r.get("menu_name", "")
            )
            for r in self.last_recommendations
        }

        seen_now = set()
        filtered = []

        for r in recs:
            key = (
                r.get("restaurant_name", ""),
                r.get("menu_name", "")
            )

            # 이번 응답 안에서 중복이면 스킵
            if key in seen_now:
                continue

            # 직전 응답과 중복이면 스킵
            if key in prev_keys:
                continue

            seen_now.add(key)
            filtered.append(r)

        # 혹시 다 빠져버리면 원본이라도 돌려주기
        return filtered or recs

    # =======================================================================
    # 4) 찌개인데 상위호환이 볶음 / 마라탕으로 나온 케이스 고치기
    # =======================================================================
    def _fix_wrong_hierarchy_for_soups(
        self,
        cafeteria_menu: str,
        recs: List[Dict]
    ) -> List[Dict]:
        """
        예) 급식: 김치찌개
            모델 응답:
              - 상위 호환 메뉴: 제육볶음 ❌
              - 상위 호환 메뉴: 마라탕 ❌
              - 대체 메뉴: 돈까스
        이런 거 들어오면
          → 제육볶음/마라탕은 '대체 메뉴'로 내려버리고
          → 이미 대체가 있으면 자리를 바꾸거나, 후순위로 보낸다
        """
        # 한국 국물로 취급할 키워드들 ↑ 여기 국밥/설렁탕/곰탕 추가
        soup_keywords = [
            "찌개", "국", "탕", "전골",
            "국밥", "설렁탕", "곰탕", "감자탕"
        ]
        # 원래 메뉴가 한국 국물 아니면 건드리지 않음
        is_soup_menu = any(k in cafeteria_menu for k in soup_keywords)
        if not is_soup_menu:
            return recs

        # 상위에 올라오면 안 되는 것들 (국물 아닌 애들)
        dry_keywords = ["볶음", "카츠", "까스", "돈까스", "제육", "덮밥", "구이"]
        # 한국식 상위 대신 튀어나오는 중국 얼큰 탕류
        chinese_spicy_soups = ["마라탕", "마라샹궈", "훠궈"]

        ups = []
        alts = []
        others = []
        for r in recs:
            t = (r.get("type") or "").strip()
            if "상위" in t:
                ups.append(r)
            elif "대체" in t:
                alts.append(r)
            else:
                others.append(r)

        fixed_ups = []
        for r in ups:
            mn = r.get("menu_name", "") or ""
            # 1) 상위인데 볶음/돈까스/덮밥 계열이면 → 대체로
            if any(k in mn for k in dry_keywords):
                r["type"] = "대체 메뉴"
                alts.append(r)
                continue
            # 2) 상위인데 마라탕/마라샹궈/훠궈면 → 대체로
            if any(k in mn for k in chinese_spicy_soups):
                r["type"] = "대체 메뉴"
                alts.append(r)
                continue
            # 3) 그 외는 정상 상위로 둔다
            fixed_ups.append(r)

        # 상위가 하나도 없으면, alts/others 중에서 국물 계열 하나 올려줌
        if not fixed_ups:
            promoted = None
            for cand in alts + others:
                name = cand.get("menu_name", "") or ""
                if any(k in name for k in soup_keywords):
                    cand["type"] = "상위 호환 메뉴"
                    promoted = cand
                    break
            if promoted:
                # alts/others에서 빼고 ups에 넣기
                new_alts = []
                for a in alts:
                    if a is promoted:
                        continue
                    new_alts.append(a)
                alts = new_alts
                fixed_ups.append(promoted)

        # 최종 합치기
        final_list = fixed_ups + alts + others

        # 최대 3개만
        return final_list[:3]

    # =======================================================================
    # 5) 날씨 정규화
    # =======================================================================
    def _normalize_weather_condition(
        self,
        condition: str,
        temp: float
    ) -> str:
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

    # =======================================================================
    # 6) 주변 식당 후보 만들기 (임시)
    # =======================================================================
    def _generate_nearby_candidates(
        self,
        cafeteria_menu: str,
        weather: Dict,
        location: Optional[Dict] = None
    ) -> List[Dict]:
        """
        가상의 주변 식당 후보 생성 (새 스키마)
        실제 서비스에서는 카카오맵 API와 붙을 자리
        """
        temp = weather.get('temperature', 20)
        condition = weather.get('sky_condition', '맑음')

        menu_lower = cafeteria_menu.lower()

        candidates: List[Dict] = []

        # === 한식 기본 후보 ===
        candidates.extend([
            {
                "placeId": "place_korean_1",
                "name": "프리미엄 한식당",
                "category": "한식",
                "minutesAway": 10,
                "menuExamples": [
                    "한정식",
                    "불고기정식",
                    "제육볶음",
                    "갈비찜"
                ]
            },
            {
                "placeId": "place_korean_2",
                "name": "김치찌개 전문점",
                "category": "한식",
                "minutesAway": 5,
                "menuExamples": [
                    "김치찌개",
                    "순두부찌개",
                    "된장찌개",
                    "부대찌개"
                ]
            },
            {
                "placeId": "place_korean_3",
                "name": "국밥집",
                "category": "한식",
                "minutesAway": 7,
                "menuExamples": [
                    "사골국밥",
                    "설렁탕",
                    "갈비탕",
                    "육개장"
                ]
            }
        ])

        # === 일식 후보 ===
        candidates.extend([
            {
                "placeId": "place_japanese_1",
                "name": "스시로",
                "category": "일식",
                "minutesAway": 6,
                "menuExamples": [
                    "초밥",
                    "모둠초밥",
                    "연어덮밥",
                    "회"
                ]
            },
            {
                "placeId": "place_japanese_2",
                "name": "돈까스 전문점",
                "category": "일식",
                "minutesAway": 8,
                "menuExamples": [
                    "돈까스",
                    "치즈돈까스",
                    "생선까스",
                    "우동"
                ]
            },
            {
                "placeId": "place_japanese_3",
                "name": "라멘야",
                "category": "일식",
                "minutesAway": 9,
                "menuExamples": [
                    "라멘",
                    "돈코츠라멘",
                    "미소라멘",
                    "차슈라멘"
                ]
            }
        ])

        # === 양식/이탈리안 ===
        if '파스타' in menu_lower or '스파게티' in menu_lower:
            candidates.extend([
                {
                    "placeId": "place_italian_1",
                    "name": "트러플 이탈리안",
                    "category": "양식",
                    "minutesAway": 8,
                    "menuExamples": [
                        "트러플 파스타",
                        "봉골레 파스타",
                        "까르보나라",
                        "해산물 파스타"
                    ]
                },
                {
                    "placeId": "place_italian_2",
                    "name": "파스타 하우스",
                    "category": "양식",
                    "minutesAway": 6,
                    "menuExamples": [
                        "크림 파스타",
                        "토마토 파스타",
                        "오일 파스타",
                        "로제 파스타"
                    ]
                },
                {
                    "placeId": "place_italian_3",
                    "name": "이탈리안 키친",
                    "category": "양식",
                    "minutesAway": 10,
                    "menuExamples": [
                        "리조또",
                        "피자",
                        "샐러드",
                        "파스타"
                    ]
                }
            ])
        else:
            candidates.extend([
                {
                    "placeId": "place_western_1",
                    "name": "스테이크 하우스",
                    "category": "양식",
                    "minutesAway": 12,
                    "menuExamples": [
                        "스테이크",
                        "함박스테이크",
                        "파스타",
                        "샐러드"
                    ]
                },
                {
                    "placeId": "place_western_2",
                    "name": "샐러드 바",
                    "category": "양식",
                    "minutesAway": 5,
                    "menuExamples": [
                        "샐러드",
                        "그레인볼",
                        "포케",
                        "샌드위치"
                    ]
                }
            ])

        # === 중식 ===
        candidates.extend([
            {
                "placeId": "place_chinese_1",
                "name": "차이나타운",
                "category": "중식",
                "minutesAway": 9,
                "menuExamples": [
                    "짜장면",
                    "짬뽕",
                    "볶음밥",
                    "탕수육"
                ]
            },
            {
                "placeId": "place_chinese_2",
                "name": "마라탕 전문점",
                "category": "중식",
                "minutesAway": 7,
                "menuExamples": [
                    "마라탕",
                    "마라샹궈",
                    "꿔바로우",
                    "양꼬치"
                ]
            }
        ])

        # === 분식(가까운 거) ===
        candidates.append(
            {
                "placeId": "place_snack_1",
                "name": "분식천국",
                "category": "분식",
                "minutesAway": 3,
                "menuExamples": [
                    "떡볶이",
                    "김밥",
                    "라면",
                    "순대",
                    "튀김"
                ]
            }
        )

        # === 날씨별 추가 ===
        if temp > 25:
            candidates.append(
                {
                    "placeId": "place_cold_1",
                    "name": "냉면 전문점",
                    "category": "한식",
                    "minutesAway": 6,
                    "menuExamples": [
                        "평양냉면",
                        "비빔냉면",
                        "물냉면",
                        "막국수"
                    ]
                }
            )
        elif temp < 10:
            candidates.append(
                {
                    "placeId": "place_hot_1",
                    "name": "전골&찌개",
                    "category": "한식",
                    "minutesAway": 7,
                    "menuExamples": [
                        "부대찌개",
                        "김치찌개",
                        "전골",
                        "곱창전골"
                    ]
                }
            )

        if '비' in condition or '눈' in condition:
            candidates.append(
                {
                    "placeId": "place_rainy_1",
                    "name": "부침개 전문점",
                    "category": "한식",
                    "minutesAway": 4,
                    "menuExamples": [
                        "파전",
                        "김치전",
                        "해물파전",
                        "막걸리"
                    ]
                }
            )

        # 섞어주기 → 매번 조금씩 다른 후보 나가게
        random.shuffle(candidates)

        return candidates

    # =======================================================================
    # 7) 옛날 프롬프트 (필요하면 쓰는 거)
    # =======================================================================
    def _build_prompt(
        self,
        weather: Dict,
        preferences: Optional[Dict]
    ) -> str:
        """(기존) 프롬프트 생성"""
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
                prompt += (
                    "\n        - 각 사람의 기분: "
                    + ", ".join(moods)
                )

        prompt += """
        위 정보를 바탕으로 직장인에게 적합한 점심 메뉴를 추천해주세요.
        날씨가 추우면 따뜻한 음식, 더우면 시원한 음식을 추천하고,
        비가 오면 국물 요리를, 맑은 날은 다양한 선택지를 제안해주세요.
        기분 상태도 고려해서 추천해주세요.
        """

        return prompt

    # =======================================================================
    # 9) 규칙 기반 추천 (fallback)
    # =======================================================================
    def _get_smart_recommendation(
        self,
        weather: Dict,
        preferences: Optional[Dict] = None
    ) -> Dict:
        """규칙 기반 스마트 추천"""
        temp = weather.get("temperature", 20)
        condition = weather.get("sky_condition", "맑음")
        precipitation = weather.get("precipitation", "없음")

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

        pref_type = (
            preferences.get("food_type", "상관없음")
            if preferences else "상관없음"
        )
        pref_mood = (
            preferences.get("mood", "평범한")
            if preferences else "평범한"
        )

        if temp < 10:
            temp_category = "따뜻한"
        elif temp > 25:
            temp_category = "시원한"
        else:
            temp_category = "중간"

        if precipitation != "없음":
            temp_category = "따뜻한"

        if pref_type != "상관없음":
            available_types = [pref_type]
        else:
            available_types = list(menu_db.keys())

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

        mood_preferences = {
            "기쁜": ["분식", "양식"],
            "슬픈": ["한식", "중식"],
            "화난": ["한식", "중식"],
            "피곤한": ["한식", "일식"],
            "스트레스": ["중식", "한식"],
            "평범한": None
        }

        if pref_mood in mood_preferences and mood_preferences[pref_mood]:
            mood_types = mood_preferences[pref_mood]
            mood_filtered = [
                c for c in candidates if c["category"] in mood_types
            ]
            if mood_filtered:
                candidates = mood_filtered

        if candidates:
            selected = random.choice(candidates)
        else:
            selected = {
                "name": "비빔밥",
                "category": "한식",
                "reason": "영양 균형이 잡힌 건강식입니다"
            }

        alternatives = [
            c["name"] for c in candidates
            if c["name"] != selected["name"]
        ][:3]

        if not alternatives:
            alternatives = ["김치찌개", "짜장면", "돈카츠"]

        if temp < 10:
            temp_match = (
                f"쌀쌀한 날씨({temp}°C)에 따뜻한 음식으로 몸을 녹이세요"
            )
        elif temp > 25:
            temp_match = (
                f"더운 날씨({temp}°C)에 시원한 음식으로 더위를 식히세요"
            )
        else:
            temp_match = (
                f"적당한 날씨({temp}°C)에 어떤 메뉴든 좋습니다"
            )

        if precipitation != "없음":
            temp_match += (
                f". {precipitation}가 내리니 따뜻한 국물 요리가 제격입니다"
            )

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

    # =======================================================================
    # 10) 폴백: AI가 실패했을 때
    # =======================================================================
    def _get_fallback_cafeteria_recommendation(
        self,
        weather: Dict,
        cafeteria_menu: str
    ) -> Dict:
        """API 오류 시 기본 추천 (새 스키마)"""
        temp = weather.get("temperature", 20)

        recommendations = [
            {
                "type": "상위 호환 메뉴",
                "restaurant_name": "프리미엄 한식당",
                "place_id": "fallback_001",
                "minutes_away": 10,
                "menu_name": "한정식",
                "reason": (
                    "구내식당보다 고급스러운 재료와 정성스러운 조리로 "
                    "영양 균형이 뛰어납니다."
                ),
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
                "reason": (
                    "구수한 맛과 풍부한 재료로 든든하며, 영양가 높은 한식입니다."
                ),
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
                "menu_name": (
                    "냉면" if temp > 25 else "칼국수"
                ),
                "reason": (
                    "시원한 육수와 신선한 재료로 더위를 식히기 좋습니다."
                    if temp > 25 else
                    "따뜻한 국물과 쫄깃한 면발로 몸을 녹이기 좋습니다."
                ),
                "price_range": "9,000-12,000원",
                "normalized_search_query": (
                    "냉면" if temp > 25 else "칼국수"
                ),
                "alt_queries": (
                    ["평양냉면", "함흥냉면"]
                    if temp > 25 else
                    ["한식", "국수"]
                ),
                "category_group_code": "FD6"
            }
        ]

        # ✅ 폴백도 저장해두면 다음 호출에서 이걸 피할 수 있음
        self.last_recommendations = recommendations

        return {
            "recommendations": recommendations,
            "brief_rationale": (
                f"현재 날씨({temp}°C, {weather.get('sky_condition', '맑음')})를 "
                "고려하여 영양과 맛의 균형을 맞춘 메뉴를 추천했습니다."
            ),
            "need_more_info": False,
            "missing": [],
            "cafeteria_menu": cafeteria_menu,
            "weather_summary": (
                f"{temp}°C, {weather.get('sky_condition', '맑음')}"
            ),
            "weather_info": {
                "location": weather.get("location"),
                "temperature": weather.get("temperature"),
                "condition": weather.get("sky_condition"),
                "precipitation": weather.get("precipitation")
            }
        }

    def _get_fallback_recommendation(
        self,
        weather: Dict
    ) -> Dict:
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

    # =======================================================================
    # 11) 오늘의 추천 3개
    # =======================================================================
    async def get_daily_recommendations(
        self,
        weather: Dict,
        location: str
    ) -> Dict:
        """오늘의 추천 메뉴 3개 생성 (위치 & 날씨 기반)"""
        if not self.use_ai:
            return self._get_fallback_daily_recommendations(weather, location)

        try:
            daily_model = genai.GenerativeModel('gemini-2.0-flash-exp')

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

            response = daily_model.generate_content(prompt)
            response_text = response.text.strip()

            if '```json' in response_text:
                response_text = (
                    response_text.split('```json')[1]
                    .split('```')[0]
                    .strip()
                )
            elif '```' in response_text:
                response_text = (
                    response_text.split('```')[1]
                    .split('```')[0]
                    .strip()
                )

            result = json.loads(response_text)

            result['weather'] = {
                'location': location,
                'temperature': weather.get('temperature'),
                'condition': weather.get('sky_condition'),
                'precipitation': weather.get('precipitation', 0)
            }

            print(
                "✅ 오늘의 추천 메뉴 생성 완료:",
                len(result.get('recommendations', [])),
                "개"
            )

            return result

        except Exception as e:
            print("❌ 오늘의 추천 메뉴 생성 오류:", e)
            return self._get_fallback_daily_recommendations(weather, location)

    def _get_fallback_daily_recommendations(
        self,
        weather: Dict,
        location: str
    ) -> Dict:
        """AI 오류 시 폴백 오늘의 추천 메뉴"""
        temp = weather.get("temperature", 20)
        condition = weather.get("sky_condition", "맑음")

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
            "summary": (
                f"{location} {condition}, {temp}°C - "
                "오늘 날씨에 맞는 메뉴를 준비했습니다."
            ),
            "weather": {
                "location": location,
                "temperature": temp,
                "condition": condition,
                "precipitation": weather.get("precipitation", 0)
            }
        }
