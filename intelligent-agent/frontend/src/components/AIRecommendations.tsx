import React, { useState, useEffect } from 'react';
import AIClient from '../services/AIClient';

interface AIRecommendation {
  suggestion?: string;
  prediction?: string;
  riskLevel?: string;
  recommendation?: string;
  score?: string;
  automationOpportunities?: string[];
  smartTasks?: Array<{ task: string; priority: string }>;
}

const AIRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<AIRecommendation>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('suggestions');

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const [
          suggestion,
          prediction,
          riskClass,
          recommendation,
          score,
          automation,
          tasks
        ] = await Promise.all([
          AIClient.suggestNextStep(),
          AIClient.predictNextStep(),
          AIClient.classifyRisk(),
          AIClient.getRecommendation(),
          AIClient.getProcessScore(),
          AIClient.automationOpportunities(),
          AIClient.smartTasks()
        ]);

        setRecommendations({
          suggestion: suggestion.suggestion,
          prediction: prediction.prediction,
          riskLevel: riskClass.riskLevel,
          recommendation: recommendation.recommendation,
          score: score.score,
          automationOpportunities: automation.opportunities || [],
          smartTasks: tasks.tasks || []
        });
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (loading) return <div className="p-8 text-center text-white">جاري تحميل التوصيات الذكية...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">التوصيات والاقتراحات الذكية</h1>

        {/* تبويبات */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'suggestions', label: 'الاقتراحات' },
            { id: 'predictions', label: 'التنبؤات' },
            { id: 'automation', label: 'الأتمتة' },
            { id: 'tasks', label: 'المهام' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* محتوى التبويبات */}
        <div className="space-y-4">
          {/* الاقتراحات */}
          {activeTab === 'suggestions' && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">اقتراح الخطوة التالية</h2>
              <div className="bg-slate-900 rounded p-4 border-l-4 border-green-500">
                <p className="text-lg text-green-400">{recommendations.suggestion || 'لا توجد اقتراحات حالياً'}</p>
              </div>

              <h2 className="text-xl font-bold text-white mt-6 mb-4">درجة الأداء</h2>
              <div className="bg-slate-900 rounded p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">النقاط الكلية</span>
                  <span className="text-3xl font-bold text-blue-400">{recommendations.score}</span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mt-6 mb-4">درجة المخاطر</h2>
              <div className={`bg-slate-900 rounded p-4 border-l-4 ${
                recommendations.riskLevel === 'high' ? 'border-red-500' :
                recommendations.riskLevel === 'medium' ? 'border-yellow-500' :
                'border-green-500'
              }`}>
                <p className={`text-lg font-semibold ${
                  recommendations.riskLevel === 'high' ? 'text-red-400' :
                  recommendations.riskLevel === 'medium' ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {recommendations.riskLevel === 'high' ? 'خطر عالي' :
                   recommendations.riskLevel === 'medium' ? 'خطر متوسط' :
                   'خطر منخفض'}
                </p>
              </div>
            </div>
          )}

          {/* التنبؤات */}
          {activeTab === 'predictions' && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">التنبؤ الذكي</h2>
              <div className="bg-slate-900 rounded p-4 border-l-4 border-purple-500">
                <p className="text-lg text-purple-400">{recommendations.prediction || 'لا توجد تنبؤات حالياً'}</p>
              </div>

              <h2 className="text-xl font-bold text-white mt-6 mb-4">التوصية الرئيسية</h2>
              <div className="bg-slate-900 rounded p-4 border-l-4 border-yellow-500">
                <p className="text-base text-yellow-300">{recommendations.recommendation || 'لا توجد توصيات'}</p>
              </div>
            </div>
          )}

          {/* الأتمتة */}
          {activeTab === 'automation' && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">فرص الأتمتة</h2>
              <div className="space-y-2">
                {recommendations.automationOpportunities?.length ? (
                  recommendations.automationOpportunities.map((opp, idx) => (
                    <div key={idx} className="bg-slate-900 rounded p-3 flex items-start">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-2 ml-3 flex-shrink-0"></span>
                      <span className="text-green-300">{opp}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400">لا توجد فرص أتمتة متاحة</p>
                )}
              </div>
            </div>
          )}

          {/* المهام الذكية */}
          {activeTab === 'tasks' && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">المهام الذكية المقترحة</h2>
              <div className="space-y-2">
                {recommendations.smartTasks?.length ? (
                  recommendations.smartTasks.map((task, idx) => (
                    <div key={idx} className="bg-slate-900 rounded p-3">
                      <div className="flex justify-between items-start">
                        <span className="text-slate-200">{task.task}</span>
                        <span className={`px-2 py-1 text-xs rounded font-medium ${
                          task.priority === 'عالية' ? 'bg-red-500 text-white' :
                          task.priority === 'متوسطة' ? 'bg-yellow-500 text-white' :
                          'bg-blue-500 text-white'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400">لا توجد مهام</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIRecommendations;
