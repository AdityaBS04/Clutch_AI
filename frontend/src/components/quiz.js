import React, { useState } from 'react';
import { Brain, Check, X } from 'lucide-react';
import "./quiz.css";

const Quiz = ({ questions, onClose }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!questions || questions.length === 0) {
    return (
      <div className="quiz-overlay">
        <div className="quiz-container">
          <h2>No questions available</h2>
          <button className="close-button" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const handleAnswer = async (selectedAnswer) => {
    const currentQ = questions[currentQuestion];
    const newAnswer = {
      question_id: currentQ.id,
      selected_answer: selectedAnswer,
      correct_answer: currentQ.correct_answer,
      type: currentQ.type,
      topic: currentQ.topic
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:5000/submit-quiz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ answers: newAnswers }),
        });

        if (!response.ok) {
          throw new Error('Failed to submit quiz');
        }

        const results = await response.json();
        setQuizResults(results);
        setShowResults(true);
      } catch (error) {
        console.error('Error submitting quiz:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const renderQuestion = (question) => {
    if (question.type === 'mcq') {
      return (
        <div className="options">
          {question.options.map((option, index) => (
            <button
              key={index}
              className="option-button"
              onClick={() => handleAnswer(option)}
            >
              {option}
            </button>
          ))}
        </div>
      );
    } else if (question.type === 'true_false') {
      return (
        <div className="options true-false">
          <button
            className="option-button true"
            onClick={() => handleAnswer(true)}
          >
            True
          </button>
          <button
            className="option-button false"
            onClick={() => handleAnswer(false)}
          >
            False
          </button>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="quiz-overlay">
        <div className="quiz-container">
          <div className="loading">
            <Brain className="spin" />
            <p>Processing your answers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="quiz-overlay">
        <div className="quiz-container">
          <div className="quiz-results">
            <h2>Quiz Results</h2>
            <p className="score">
              Score: {quizResults.score}/{quizResults.total} ({quizResults.percentage}%)
            </p>
            
            {quizResults.topics_to_review && quizResults.topics_to_review.length > 0 && (
              <div className="topics-to-review">
                <h3>Topics to Review:</h3>
                <ul>
                  {quizResults.topics_to_review.map((topic, index) => (
                    <li key={index}>
                      <X className="icon-alert" />
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <button className="close-button" onClick={onClose}>
              Close Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="quiz-overlay">
      <div className="quiz-container">
        <div className="quiz-content">
          <div className="quiz-header">
            <h2>Question {currentQuestion + 1} of {questions.length}</h2>
            <p className="quiz-type">
              {currentQ.type === 'mcq' ? 'Multiple Choice' : 'True or False'}
            </p>
          </div>

          <div className="question">
            <p>{currentQ.question}</p>
          </div>

          {renderQuestion(currentQ)}
        </div>
      </div>
    </div>
  );
};

export default Quiz;