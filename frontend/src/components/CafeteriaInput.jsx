import React, { useState } from 'react';
import { validateMenuTokens } from '../utils/menuValidation';

const CafeteriaInput = ({ onSubmit, onValidationError, onBack, weather, location }) => {
  const [menuText, setMenuText] = useState('');
  const [menuList, setMenuList] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // 메뉴 파싱
  const parseMenus = (raw) => {
    return Array.from(new Set(String(raw || '').split(/[\n,;|]/).map(s => s.trim()).filter(Boolean)));
  };

  // 텍스트 입력 변경
  const handleTextChange = (e) => {
    const text = e.target.value;
    setMenuText(text);
    setMenuList(parseMenus(text));
  };

  // 목록 비우기
  const handleClearList = () => {
    setMenuText('');
    setMenuList([]);
  };

  // 드롭존 이벤트
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 최대 크기는 5MB입니다.');
      return;
    }
    setImageFile(file);
    // 파일명에서 메뉴 추출 시도
    const name = file.name.replace(/\.[^.]+$/, '');
    const guess = name.replace(/[_.-]+/g, ', ');
    const merged = [...new Set([...parseMenus(menuText), ...parseMenus(guess)])];
    setMenuText(merged.join(', '));
    setMenuList(merged);
  };

  // 제출
  const handleRecommend = () => {
    // 프론트엔드 검증
    const validation = validateMenuTokens(menuText, !!imageFile);
    
    if (!validation.ok) {
      // 검증 실패 시 Alert 표시
      if (onValidationError) {
        onValidationError(validation.title, validation.desc);
      }
      return;
    }
    
    // 검증 성공 시 제출
    if (menuText.trim()) {
      onSubmit({ method: 'text', content: menuText });
    }
  };

  return (
    <div className="min-h-screen">
      {/* 상단 뒤로가기 버튼과 날씨 정보 */}
      <div className="w-full pt-3 sm:pt-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="glass rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-white/90 text-sm sm:text-base flex-shrink-0"
            >
              ← 뒤로
            </button>
          )}
          
          {weather && (
            <div className="glass rounded-lg sm:rounded-xl shadow-lg p-2 sm:p-3 flex-shrink min-w-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-yellow-300/80 flex items-center justify-center flex-shrink-0">
                  <span className="text-base sm:text-xl">
                    {weather.sky_condition === '맑음' ? '☀️' : 
                     weather.sky_condition === '구름많음' ? '⛅' : 
                     weather.sky_condition === '흐림' ? '☁️' : '🌤️'}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-[13px] text-slate-500">현재 위치</div>
                  <div className="font-semibold text-xs sm:text-sm truncate">{location || weather.location || '서울시'}</div>
                </div>
                <div className="chip rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-slate-700 flex-shrink-0">
                  {weather.temperature}°C
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="w-full pb-6 sm:pb-10">
        <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl">
          <div className="flex items-center justify-between gap-2 sm:gap-4 border-b border-black/5 pb-3 sm:pb-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-fuchsia-500 to-amber-400 flex items-center justify-center flex-shrink-0">
                <span className="text-lg sm:text-xl">🍱</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl md:text-2xl font-extrabold text-slate-800 break-keep">오늘의 구내식당 메뉴를 입력해주세요</h2>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 md:mt-8 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4 sm:space-y-6">
              <div>
                <label className="mb-2 block text-xs sm:text-sm font-semibold text-slate-700">🍱 식단표 이미지 업로드</label>
                <div
                  id="dropzone"
                  className={`dropzone rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 text-center cursor-pointer ${dragOver ? 'dragover' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input').click()}
                >
                  <div className="mx-auto mb-2 sm:mb-3 flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-lg sm:rounded-xl bg-slate-100">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#64748b" className="h-6 w-6 sm:h-8 sm:w-8">
                      <path d="M12 3a7 7 0 0 0-7 7v3H3l4 4 4-4H8v-3a4 4 0 1 1 8 0v1h2v-1a7 7 0 0 0-7-7Z"/>
                      <path d="M17 14h-2v6h2v-6Zm-4 3h-2v3h2v-3Zm-4-2H7v5h2v-5Z"/>
                    </svg>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    클릭하거나 이미지를 드래그하세요<br/>
                    <span className="text-slate-400">JPG, PNG 파일 (최대 5MB)</span>
                  </p>
                  {imageFile && (
                    <p className="mt-2 text-xs text-green-600 truncate px-2">✓ {imageFile.name}</p>
                  )}
                  <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>
              </div>

              <div className="relative my-4 sm:my-6 text-center text-slate-500">
                <span className="relative z-10 bg-white/70 px-2 sm:px-3 py-0.5 text-[10px] sm:text-xs font-medium rounded-full">또는</span>
                <div className="absolute left-0 right-0 top-1/2 -z-0 h-px -translate-y-1/2 bg-slate-200"></div>
              </div>

              <div>
                <label className="mb-2 block text-xs sm:text-sm font-semibold text-slate-700">✏️ 금일 메뉴 텍스트 입력</label>
                <textarea
                  value={menuText}
                  onChange={handleTextChange}
                  className="h-32 sm:h-36 w-full resize-none rounded-xl sm:rounded-2xl border border-slate-200 bg-white/90 p-3 sm:p-4 text-sm sm:text-[15px] shadow-inner outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-200"
                  placeholder="예: 김치찌개, 된장찌개, 불고기 덮밥"
                />
                <p className="mt-2 text-[10px] sm:text-xs text-slate-400">
                  쉼표(,), 세미콜론(;), 파이프(|), 줄바꿈으로 구분해 입력하면 오른쪽 목록이 자동 정리됩니다.
                </p>
              </div>
            </div>

            <aside className="md:col-span-1 order-first md:order-last">
              <div className="rounded-xl sm:rounded-2xl border border-black/5 bg-white/90 p-3 sm:p-4 shadow">
                <div className="mb-2 sm:mb-3 flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-bold text-slate-700">메뉴 목록</h3>
                  <span className="chip rounded-lg px-2 py-0.5 text-[10px] sm:text-xs text-slate-700">
                    {menuList.length}개
                  </span>
                </div>
                <ul className="max-h-48 sm:max-h-64 overflow-auto space-y-1 sm:space-y-1.5 text-xs sm:text-sm text-slate-700">
                  {menuList.length === 0 ? (
                    <li className="text-slate-400 text-center py-4">여기에 메뉴가 표시됩니다.</li>
                  ) : (
                    menuList.map((menu, index) => (
                      <li key={index} className="rounded-lg bg-slate-50 px-2 sm:px-3 py-1.5 sm:py-2">
                        {menu}
                      </li>
                    ))
                  )}
                </ul>
                <button
                  onClick={handleClearList}
                  className="mt-3 sm:mt-4 w-full rounded-lg sm:rounded-xl border border-slate-200 px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  목록 비우기
                </button>
              </div>
            </aside>
          </div>

          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleRecommend}
              disabled={!menuText.trim()}
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-[15px] font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <span>메뉴 추천받기</span> <span>🎯</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CafeteriaInput;
