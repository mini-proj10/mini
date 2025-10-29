import React, { useState, useMemo } from 'react';

const NEG = new Set([
  "그림","사진","이미지","파일","텍스트","문장","단어","테스트",
  "후회돼","그렇게","뭐라도","아무거나","추천","메뉴","배고파"
]);
const SUFFIX = [
  "찌개","국","탕","전골","덮밥","비빔밥","볶음밥","죽","면","라면","우동","냉면","칼국수","쌀국수","수제비","소바",
  "구이","볶음","조림","찜","튀김","전","파스타","리조또","피자","스테이크","함박","돈까스","카츠",
  "초밥","스시","사시미","회","동","규동","가츠동","마라탕","훠궈","짬뽕","짜장면","탕수육","유산슬","깐풍기",
  "샐러드","포케","샌드위치","버거","토스트","빵","갈비탕","설렁탕","육개장","감자탕","해장국","곰탕"
];
const KEYWORDS = new Set([
  "김치찌개","된장찌개","부대찌개","순두부찌개","갈비탕","육개장","삼계탕","감자탕","해장국","곰탕",
  "비빔밥","제육볶음","불고기","닭갈비","카레","쭈꾸미","보쌈","족발","칼국수","콩국수","막국수",
  "냉면","비빔냉면","평양냉면","함흥냉면","잔치국수","우동","라면","쌀국수","소바",
  "파스타","리조또","피자","스테이크","함박스테이크","돈까스","치즈돈까스","규카츠",
  "초밥","스시","연어덮밥","사시미","회덮밥","가츠동","규동",
  "마라탕","마라샹궈","꿔바로우","짜장면","짬뽕","볶음밥","탕수육",
  "떡볶이","김밥","라볶이","순대","튀김","분식","샐러드","포케","그레인볼","샌드위치","버거","토스트"
]);
const EN_HINTS = ["pasta","pizza","steak","ramen","soba","udon","sushi","donburi","risotto","burger","sandwich","poke","salad","noodle","noodles","curry","maratang"];
const JAMO_ONLY = /^[\u3131-\u318E]+$/; // ㄱ~ㅣ
const KOR2 = /[가-힣]{2,}/;
const ALNUM2 = /[A-Za-z0-9]{2,}/;

function parseMenus(raw) {
  return Array.from(
    new Set(String(raw || '')
      .split(/[\n,;|]/)
      .map(s => s.trim())
      .filter(Boolean))
  );
}
function isFoodLike(t) {
  if (NEG.has(t)) return false;
  if (KEYWORDS.has(t)) return true;
  if (SUFFIX.some(s => t.endsWith(s))) return true;
  const low = t.toLowerCase();
  if (EN_HINTS.some(k => low.includes(k))) return true;
  return false;
}
function isValidToken(t) {
  const s = (t || '').trim();
  if (!s || NEG.has(s)) return false;
  if (JAMO_ONLY.test(s)) return false;            // ㅇ, ㅐ 등
  if (!(KOR2.test(s) || ALNUM2.test(s))) return false; // 최소 2자
  return isFoodLike(s);
}

const CafeteriaInput = ({
  onSubmit,
  weather,
  location,
  /** 선택: 전역 경고배너를 띄우는 핸들러 (App에서 내려주면 배너, 없으면 alert로 대체) */
  onShowAlert,
  /** 선택: “처음으로” 동작시 입력 초기화/페이지 이동용 */
  onResetToInput,
}) => {
  const [menuText, setMenuText] = useState('');
  const [menuList, setMenuList] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const tokens = useMemo(() => parseMenus(menuText), [menuText]);
  const validTokens = useMemo(() => tokens.filter(isValidToken), [tokens]);

  const raiseAlert = (title, desc) => {
    if (onShowAlert) onShowAlert({ title, desc });
    else window.alert(`${title}\n\n${desc}`);
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setMenuText(text);
    setMenuList(parseMenus(text));
  };

  const handleClearList = () => {
    setMenuText('');
    setMenuList([]);
    setImageFile(null);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };
  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { raiseAlert('용량 초과', '파일 최대 크기는 5MB입니다.'); return; }
    setImageFile(file);

    // 파일명에서 메뉴 추정 → 기존 텍스트와 병합
    const name = file.name.replace(/\.[^.]+$/, '');
    const guess = name.replace(/[_.-]+/g, ', ');
    const merged = [...new Set([...parseMenus(menuText), ...parseMenus(guess)])];
    setMenuText(merged.join(', '));
    setMenuList(merged);
  };

  // 검증 → 실패 시 전역 배너, 성공 시 onSubmit
  const handleRecommend = () => {
    const hasImage = !!imageFile;

    if (tokens.length === 0 && hasImage) {
      raiseAlert(
        '이미지만으로는 분석할 수 없어요',
        '현재 데모는 OCR을 지원하지 않습니다. 메뉴명을 텍스트로 함께 입력해주세요. 예: 김치찌개, 파스타, 초밥'
      );
      return;
    }
    if (tokens.length > 0 && validTokens.length === 0) {
      raiseAlert(
        '메뉴 인식 불가',
        '입력하신 단어가 음식명으로 인식되지 않았습니다. 예: 김치찌개, 파스타, 초밥처럼 실제 음식명을 입력해주세요.'
      );
      return;
    }
    if (!hasImage && validTokens.length === 0) {
      raiseAlert(
        '입력이 필요해요',
        '식단표 이미지를 업로드하거나 메뉴를 텍스트로 입력해주세요.'
      );
      return;
    }

    // 정상: 검증 통과 토큰만 서버로 보냄
    onSubmit({ method: 'text', content: validTokens.join(', ') });
  };

  const goHome = () => {
    handleClearList();
    onResetToInput && onResetToInput();
  };

  return (
    <div className="min-h-screen">
      {/* 상단 날씨 카드 */}
      {weather && (
        <div className="absolute top-4 right-4 glass rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-yellow-300/80 flex items-center justify-center">
              <span className="text-xl">
                {weather.sky_condition === '맑음' ? '☀️' :
                 weather.sky_condition?.includes('구름') ? '⛅' :
                 weather.sky_condition === '흐림' ? '☁️' : '🌤️'}
              </span>
            </div>
            <div>
              <div className="text-[13px] text-slate-500">현재 위치</div>
              <div className="font-semibold text-sm">{location || weather.location || '서울시'}</div>
            </div>
          </div>
          <div className="chip rounded-xl px-3 py-1.5 text-sm font-medium text-slate-700 mt-2">
            {weather.temperature}°C
          </div>
        </div>
      )}

      {/* 메인 */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="glass rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-amber-400 flex items-center justify-center">
                <span className="text-xl">🍱</span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">오늘의 구내식당 메뉴를 입력해주세요</h2>
            </div>
            <button
              type="button"
              onClick={goHome}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              title="처음으로"
            >
              처음으로
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">🍱 식단표 이미지 업로드</label>
              <div
                id="dropzone"
                className={`dropzone rounded-2xl bg-white p-6 text-center cursor-pointer ${dragOver ? 'dragover' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input').click()}
              >
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#64748b" className="h-8 w-8">
                    <path d="M12 3a7 7 0 0 0-7 7v3H3l4 4 4-4H8v-3a4 4 0 1 1 8 0v1h2v-1a7 7 0 0 0-7-7Z"/>
                    <path d="M17 14h-2v6h2v-6Zm-4 3h-2v3h2v-3Zm-4-2H7v5h2v-5Z"/>
                  </svg>
                </div>
                <p className="text-sm text-slate-600">
                  클릭하거나 이미지를 드래그하세요<br/>
                  <span className="text-slate-400">JPG, PNG 파일 (최대 5MB)</span>
                </p>
                {imageFile && <p className="mt-2 text-xs text-green-600">✓ {imageFile.name}</p>}
                <input id="file-input" type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
              </div>

              <div className="relative my-6 text-center text-slate-500">
                <span className="relative z-10 bg-white/70 px-3 py-0.5 text-xs font-medium rounded-full">또는</span>
                <div className="absolute left-0 right-0 top-1/2 -z-0 h-px -translate-y-1/2 bg-slate-200"></div>
              </div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">✏️ 금일 메뉴 텍스트 입력</label>
              <textarea
                value={menuText}
                onChange={handleTextChange}
                className="h-36 w-full resize-none rounded-2xl border border-slate-200 bg-white/90 p-4 text-[15px] shadow-inner outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
                placeholder="예: 김치찌개, 된장찌개, 불고기 덮밥"
              />
              <p className="mt-2 text-xs text-slate-400">
                쉼표(,), 세미콜론(;), 파이프(|), 줄바꿈으로 구분해 입력하면 오른쪽 목록이 자동 정리됩니다.
              </p>
            </div>

            <aside className="md:col-span-1">
              <div className="rounded-2xl border border-black/5 bg-white/90 p-4 shadow">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-slate-700">메뉴 목록</h3>
                  <span className="chip rounded-lg px-2 py-0.5 text-xs text-slate-700">{menuList.length}개</span>
                </div>
                <ul className="max-h-64 overflow-auto space-y-1.5 text-sm text-slate-700">
                  {menuList.length === 0
                    ? <li className="text-slate-400">여기에 메뉴가 표시됩니다.</li>
                    : menuList.map((menu, i) => (
                        <li key={`${menu}-${i}`} className="rounded-lg bg-slate-50 px-3 py-2">
                          {menu} {isValidToken(menu) ? '✓' : '✕'}
                        </li>
                      ))
                  }
                </ul>
                <button
                  onClick={handleClearList}
                  className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  목록 비우기
                </button>
              </div>
            </aside>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleRecommend}
              disabled={tokens.length === 0 && !imageFile}
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>메뉴 추천받기</span><span>🎯</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CafeteriaInput;
