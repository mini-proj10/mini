import React, { useState } from 'react';

const CafeteriaInput = ({ onSubmit, weather, location }) => {
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
    if (menuText.trim()) {
      onSubmit({ method: 'text', content: menuText });
    }
  };

  return (
    <div className="min-h-screen">
      {/* 상단 날씨 정보 */}
      {weather && (
        <div className="absolute top-4 right-4 glass rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-yellow-300/80 flex items-center justify-center">
              <span className="text-xl">
                {weather.sky_condition === '맑음' ? '☀️' : 
                 weather.sky_condition === '구름많음' ? '⛅' : 
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

      {/* 메인 컨텐츠 */}
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="glass rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-amber-400 flex items-center justify-center">
                <span className="text-xl">🍱</span>
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">오늘의 구내식당 메뉴를 입력해주세요</h2>
              </div>
            </div>
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
                {imageFile && (
                  <p className="mt-2 text-xs text-green-600">✓ {imageFile.name}</p>
                )}
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInput}
                />
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
                  <span className="chip rounded-lg px-2 py-0.5 text-xs text-slate-700">
                    {menuList.length}개
                  </span>
                </div>
                <ul className="max-h-64 overflow-auto space-y-1.5 text-sm text-slate-700">
                  {menuList.length === 0 ? (
                    <li className="text-slate-400">여기에 메뉴가 표시됩니다.</li>
                  ) : (
                    menuList.map((menu, index) => (
                      <li key={index} className="rounded-lg bg-slate-50 px-3 py-2">
                        {menu}
                      </li>
                    ))
                  )}
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
              disabled={!menuText.trim()}
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
