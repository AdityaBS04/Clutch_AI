import React, { useState } from "react";
import { Upload, FileText, Book, Brain, X } from "lucide-react";
import "./styles/App.css";
import Quiz from "./components/quiz";

const App = () => {
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [analysisFile, setAnalysisFile] = useState(null);
  const [summary, setSummary] = useState("");
  const [matchingTerms, setMatchingTerms] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  const handleGenerateQuiz = async () => {
    setQuizLoading(true);
    setError("");
    try {
      console.log("Generating quiz...");
      const response = await fetch("http://localhost:5000/generate-quiz");
      console.log("Response status:", response.status);

      const data = await response.json();
      console.log("Received data:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quiz");
      }

      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions could be generated");
      }

      setQuizQuestions(data.questions);
      setShowQuiz(true);
    } catch (err) {
      console.error("Quiz generation error:", err);
      setError(err.message);
    } finally {
      setQuizLoading(false);
    }
  };
  const handleReferenceUpload = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter((file) => file.type === "application/pdf");

    if (validFiles.length === 0) {
      setError("Please upload PDF files only");
      return;
    }

    setReferenceFiles(validFiles);
    setError("");
  };

  const handleAnalysisFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      setAnalysisFile(file);
      setError("");
    } else {
      setError("Please upload a PDF file");
      setAnalysisFile(null);
    }
  };

  const removeReferenceFile = (index) => {
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeAnalysisFile = () => {
    setAnalysisFile(null);
  };

  const handleReferenceSubmit = async () => {
    if (referenceFiles.length === 0) {
      setError("Please select files first");
      return;
    }

    setLoading(true);
    setError("");
    const formData = new FormData();
    referenceFiles.forEach((file) => {
      formData.append("file", file);
    });

    try {
      const response = await fetch("http://localhost:5000/analyze-reference", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze reference documents");
      }

      await response.json();
      setStep(2);
      setReferenceFiles([]);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisSubmit = async () => {
    if (!analysisFile) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", analysisFile);

    try {
      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze document");
      }

      const data = await response.json();
      setSummary(data.summary || "");
      setMatchingTerms(data.matching_terms || []);
      setAnalysisFile(null);
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Document Analysis System</h1>
        <p>Upload your documents and get smart analysis</p>
      </div>

      {step === 1 ? (
        <div className="upload-card">
          <h2>Step 1: Upload Reference Documents</h2>
          <div
            className="upload-area"
            onClick={() => document.getElementById("reference-input").click()}
          >
            <Upload size={32} />
            <p>Drop your PDF files here or click to upload</p>
            <input
              id="reference-input"
              type="file"
              multiple
              onChange={handleReferenceUpload}
              accept=".pdf"
              style={{ display: "none" }}
            />
          </div>

          {referenceFiles.length > 0 && (
            <div className="file-list">
              <h3>Selected Files:</h3>
              {referenceFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="file-info">
                    <FileText size={16} />
                    <span>{file.name}</span>
                  </div>
                  <button
                    className="remove-file"
                    onClick={() => removeReferenceFile(index)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button
            className="submit-button"
            onClick={handleReferenceSubmit}
            disabled={referenceFiles.length === 0 || loading}
          >
            {loading ? (
              <>
                <Brain className="spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Process Reference Documents</span>
            )}
          </button>
        </div>
      ) : (
        <div className="upload-card">
          <h2>Step 2: Analyze Document</h2>
          <div
            className="upload-area"
            onClick={() => document.getElementById("analysis-input").click()}
          >
            <Upload size={32} />
            <p>Upload your document for analysis</p>
            <input
              id="analysis-input"
              type="file"
              onChange={handleAnalysisFileUpload}
              accept=".pdf"
              style={{ display: "none" }}
            />
          </div>

          {analysisFile && (
            <div className="file-info">
              <div className="file-details">
                <FileText size={16} />
                <span>{analysisFile.name}</span>
              </div>
              <button className="remove-file" onClick={removeAnalysisFile}>
                <X size={16} />
              </button>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button
            className="submit-button"
            onClick={handleAnalysisSubmit}
            disabled={!analysisFile || loading}
          >
            {loading ? (
              <>
                <Brain className="spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <span>Analyze Document</span>
            )}
          </button>

          {summary && (
            <div className="summary-section">
              <h3>Analysis Results</h3>
              {matchingTerms && matchingTerms.length > 0 && (
                <div className="matching-terms">
                  <h4>Matching Terms:</h4>
                  <div className="terms-container">
                    {matchingTerms.map((term, index) => (
                      <span key={index} className="term-tag">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="summary-content">
                <h4>Summary:</h4>
                <ul className="summary-list">
                  {Array.isArray(summary)
                    ? summary.map((point, index) => (
                        <li key={index} className="summary-point">
                          {point.startsWith("-")
                            ? point.substring(1).trim()
                            : point}
                        </li>
                      ))
                    : // Fallback for string summary
                      summary.split("\n").map(
                        (point, index) =>
                          point.trim() && (
                            <li key={index} className="summary-point">
                              {point.startsWith("-")
                                ? point.substring(1).trim()
                                : point}
                            </li>
                          )
                      )}
                </ul>
              </div>

              <button
                className="quiz-button"
                onClick={handleGenerateQuiz}
                disabled={quizLoading}
              >
                {quizLoading ? (
                  <>
                    <Brain className="spin" />
                    <span>Generating Quiz...</span>
                  </>
                ) : (
                  <>
                    <Brain size={20} />
                    <span>Take Quiz</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {showQuiz && quizQuestions && (
        <Quiz
          questions={quizQuestions}
          onClose={() => {
            setShowQuiz(false);
            setQuizQuestions(null);
          }}
        />
      )}
    </div>
  );
};

export default App;
