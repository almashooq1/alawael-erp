/**
 * Surveys.jsx
 * مكون استطلاعات الرضا
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Surveys() {
  const { token } = useAuth();
  const [surveys, setSurveys] = useState([]);
  const [completedSurveys, setCompletedSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beneficiary/surveys', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setSurveys(data.data.surveys || []);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('فشل في تحميل الاستطلاعات');
      console.error('Error fetching surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  if (selectedSurvey) {
    return (
      <SurveyForm
        survey={selectedSurvey}
        onBack={() => setSelectedSurvey(null)}
        onSubmit={() => {
          setSelectedSurvey(null);
          fetchSurveys();
        }}
      />
    );
  }

  return (
    <div className="surveys-container">
      <h2>استطلاعات الرضا</h2>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {surveys.length === 0 ? (
        <div className="empty-state">
          <Clock size={48} />
          <p>لا توجد استطلاعات متاحة حالياً</p>
        </div>
      ) : (
        <div className="surveys-grid">
          {surveys.map(survey => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              onStart={() => setSelectedSurvey(survey)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Survey Card Component
function SurveyCard({ survey, onStart }) {
  const estimatedTime = survey.questionsCount * 2;

  return (
    <div className="survey-card card">
      <div className="card-header">
        <h3>{survey.title}</h3>
      </div>

      <div className="card-body">
        {survey.description && (
          <p className="survey-description">{survey.description}</p>
        )}

        <div className="survey-details">
          <div className="detail-item">
            <span className="label">عدد الأسئلة:</span>
            <span className="value">{survey.questionsCount}</span>
          </div>
          <div className="detail-item">
            <span className="label">الوقت المتوقع:</span>
            <span className="value">{estimatedTime} دقيقة</span>
          </div>
        </div>
      </div>

      <div className="card-footer">
        <button className="start-btn" onClick={onStart}>
          ابدأ الاستطلاع
        </button>
      </div>
    </div>
  );
}

// Survey Form Component
function SurveyForm({ survey, onBack, onSubmit }) {
  const { token } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startTime] = useState(Date.now());

  const currentQuestion = survey.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / survey.questions.length) * 100;

  const handleAnswer = (answer) => {
    setResponses({
      ...responses,
      [currentQuestion.id]: answer
    });
  };

  const handleNext = () => {
    if (currentQuestion.required && !responses[currentQuestion.id]) {
      setError('يرجى الإجابة على هذا السؤال');
      return;
    }
    
    if (currentQuestionIndex < survey.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setError('');
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (currentQuestion.required && !responses[currentQuestion.id]) {
      setError('يرجى الإجابة على جميع الأسئلة المطلوبة');
      return;
    }

    setLoading(true);
    try {
      const completionTime = Math.floor((Date.now() - startTime) / 1000);
      
      const formattedResponses = survey.questions.map(q => ({
        questionId: q.id,
        answer: responses[q.id]
      }));

      const response = await fetch(`/api/beneficiary/surveys/${survey.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          responses: formattedResponses,
          completionTime
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('شكراً لإجابتك على الاستطلاع');
        onSubmit();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('فشل في إرسال الاستطلاع');
      console.error('Error submitting survey:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="survey-form-container">
      {/* Progress Bar */}
      <div className="form-header">
        <button className="back-btn" onClick={onBack}>
          ← رجوع
        </button>
        <h2>{survey.title}</h2>
        <div className="progress-info">
          {currentQuestionIndex + 1} / {survey.questions.length}
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Question */}
      <div className="form-body card">
        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="question-container">
          <h3>{currentQuestion.question}</h3>
          {currentQuestion.required && <span className="required">*</span>}

          {/* Question Types */}
          {currentQuestion.type === 'rating' && (
            <RatingQuestion
              question={currentQuestion}
              value={responses[currentQuestion.id]}
              onChange={handleAnswer}
            />
          )}

          {currentQuestion.type === 'multiple_choice' && (
            <MultipleChoiceQuestion
              question={currentQuestion}
              value={responses[currentQuestion.id]}
              onChange={handleAnswer}
            />
          )}

          {currentQuestion.type === 'text' && (
            <TextQuestion
              question={currentQuestion}
              value={responses[currentQuestion.id] || ''}
              onChange={handleAnswer}
            />
          )}

          {currentQuestion.type === 'nps' && (
            <NPSQuestion
              question={currentQuestion}
              value={responses[currentQuestion.id]}
              onChange={handleAnswer}
            />
          )}

          {currentQuestion.type === 'likert' && (
            <LikertQuestion
              question={currentQuestion}
              value={responses[currentQuestion.id]}
              onChange={handleAnswer}
            />
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="form-footer">
        <button
          className="nav-btn"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          السابق
        </button>

        <div className="form-actions">
          {currentQuestionIndex === survey.questions.length - 1 ? (
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'جاري الإرسال...' : 'إرسال الاستطلاع'}
            </button>
          ) : (
            <button
              className="nav-btn"
              onClick={handleNext}
            >
              التالي
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Question Type Components
function RatingQuestion({ question, value, onChange }) {
  const scale = question.scale || 5;
  
  return (
    <div className="question-type rating">
      <div className="rating-options">
        {Array.from({ length: scale }).map((_, index) => (
          <button
            key={index}
            className={`rating-option ${value === index + 1 ? 'selected' : ''}`}
            onClick={() => onChange(index + 1)}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <div className="rating-labels">
        <span>ضعيف جداً</span>
        <span>ممتاز جداً</span>
      </div>
    </div>
  );
}

function MultipleChoiceQuestion({ question, value, onChange }) {
  return (
    <div className="question-type multiple-choice">
      {question.options.map((option, index) => (
        <label key={index} className="option">
          <input
            type="radio"
            name={question.id}
            value={option}
            checked={value === option}
            onChange={(e) => onChange(e.target.value)}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function TextQuestion({ question, value, onChange }) {
  return (
    <div className="question-type text">
      <textarea
        placeholder="اكتب إجابتك هنا..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
      />
    </div>
  );
}

function NPSQuestion({ question, value, onChange }) {
  return (
    <div className="question-type nps">
      <div className="nps-scale">
        {Array.from({ length: 11 }).map((_, index) => (
          <button
            key={index}
            className={`nps-option ${value === index ? 'selected' : ''}`}
            onClick={() => onChange(index)}
          >
            {index}
          </button>
        ))}
      </div>
      <div className="nps-labels">
        <span>غير محتمل جداً</span>
        <span>محتمل جداً</span>
      </div>
    </div>
  );
}

function LikertQuestion({ question, value, onChange }) {
  const options = ['غير متفق تماماً', 'غير متفق', 'محايد', 'متفق', 'متفق تماماً'];
  
  return (
    <div className="question-type likert">
      <div className="likert-options">
        {options.map((option, index) => (
          <label key={index} className="option">
            <input
              type="radio"
              name={question.id}
              value={index + 1}
              checked={value === index + 1}
              onChange={() => onChange(index + 1)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
