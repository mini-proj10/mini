import React from 'react';

const RecipePage = ({ recipe, onBack }) => {
  if (!recipe) return null;

  const getDifficultyColor = (difficulty) => {
    const colors = {
      '쉬움': 'text-green-600',
      '보통': 'text-yellow-600',
      '어려움': 'text-red-600',
    };
    return colors[difficulty] || 'text-gray-600';
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="mb-4 text-white hover:text-gray-200 flex items-center bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm"
        >
          <span className="mr-2">←</span> 뒤로가기
        </button>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">👨‍🍳</div>
            <h2 className="text-4xl font-bold text-gray-800 mb-2">
              {recipe.menu_name}
            </h2>
            <div className="flex justify-center items-center space-x-4 text-sm text-gray-600">
              <span>👥 {recipe.servings}인분</span>
              <span>⏱️ {recipe.cooking_time}</span>
              <span className={`font-semibold ${getDifficultyColor(recipe.difficulty)}`}>
                난이도: {recipe.difficulty}
              </span>
            </div>
          </div>

          {/* 재료 */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              🛒 재료
            </h3>
            <div className="bg-orange-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex justify-between items-center bg-white px-4 py-3 rounded-lg">
                    <span className="font-medium text-gray-700">{ingredient.name}</span>
                    <span className="text-gray-600">{ingredient.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 조리 과정 */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
              👨‍🍳 조리 과정
            </h3>
            <div className="space-y-4">
              {recipe.steps.map((step, index) => (
                <div key={index} className="flex items-start space-x-4 bg-blue-50 p-4 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 flex-1 pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 노트 */}
          {recipe.note && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">💡 Tip:</span> {recipe.note}
              </p>
            </div>
          )}

          {/* 다시 추천받기 버튼 */}
          <button
            onClick={onBack}
            className="w-full mt-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-lg font-bold text-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
          >
            다른 메뉴 추천받기 🔄
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipePage;

