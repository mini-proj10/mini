import React, { useState } from 'react';

const PreferenceSelection = ({ mode, onSubmit, onBack, weather }) => {
  const [numPeople, setNumPeople] = useState(2);
  const [foodType, setFoodType] = useState('상관없음');
  const [moods, setMoods] = useState(['평범한']);

  const foodTypes = ['상관없음', '한식', '중식', '일식', '양식', '분식'];
  const moodOptions = ['평범한', '기쁜', '슬픈', '화난', '피곤한', '스트레스'];

  const handleMoodChange = (index, value) => {
    const newMoods = [...moods];
    newMoods[index] = value;
    setMoods(newMoods);
  };

  const handleNumPeopleChange = (num) => {
    setNumPeople(num);
    const newMoods = Array(num).fill('평범한');
    setMoods(newMoods);
  };

  const handleSubmit = () => {
    onSubmit({
      foodType,
      mood: moods[0],
      numPeople: mode === 'single' ? 1 : numPeople,
      moods: mode === 'multiple' ? moods : null
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      {/* 우측 상단 날씨 */}
      {weather && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="text-4xl">
              {weather.sky_condition === '맑음' ? '☀️' : '🌤️'}
            </div>
            <div>
              <p className="text-sm text-gray-600">{weather.location}</p>
              <p className="text-2xl font-bold text-gray-800">{weather.temperature}°C</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <button
          onClick={onBack}
          className="mb-4 text-gray-600 hover:text-gray-800 flex items-center"
        >
          <span className="mr-2">←</span> 뒤로가기
        </button>

        <h2 className="text-3xl font-bold text-gray-800 mb-6">
          {mode === 'single' ? '🙂 나의 선호도' : '👥 우리들의 선호도'}
        </h2>

        {/* 다인 모드일 때 인원 선택 */}
        {mode === 'multiple' && (
          <div className="mb-6">
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              인원 수 (최대 10명)
            </label>
            <div className="flex flex-wrap gap-2">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumPeopleChange(num)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    numPeople === num
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {num}명
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 음식 종류 선택 */}
        <div className="mb-6">
          <label className="block text-lg font-semibold text-gray-700 mb-3">
            🍽️ 음식 종류
          </label>
          <div className="grid grid-cols-3 gap-3">
            {foodTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFoodType(type)}
                className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                  foodType === type
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* 기분 선택 */}
        <div className="mb-8">
          {mode === 'single' ? (
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                😊 오늘 기분은?
              </label>
              <div className="grid grid-cols-3 gap-3">
                {moodOptions.map((mood) => (
                  <button
                    key={mood}
                    onClick={() => setMoods([mood])}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                      moods[0] === mood
                        ? 'bg-pink-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                😊 각자의 기분은?
              </label>
              <div className="space-y-4">
                {Array.from({ length: numPeople }).map((_, index) => (
                  <div key={index}>
                    <p className="text-sm text-gray-600 mb-2">{index + 1}번째 사람</p>
                    <div className="grid grid-cols-3 gap-2">
                      {moodOptions.map((mood) => (
                        <button
                          key={mood}
                          onClick={() => handleMoodChange(index, mood)}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                            moods[index] === mood
                              ? 'bg-pink-500 text-white shadow-lg'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {mood}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 추천 받기 버튼 */}
        <button
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-lg font-bold text-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
        >
          메뉴 추천 받기 🎯
        </button>
      </div>
    </div>
  );
};

export default PreferenceSelection;

