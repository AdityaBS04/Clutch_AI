import React, { useState } from 'react';
import { Upload, FileText, Brain, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import "./DocumentUpload.css";

const DocumentUploader = ({ 
  step, 
  onUploadSuccess, 
  allowMultiple = false 
}) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (event) => {
    const uploadedFiles = allowMultiple 
      ? Array.from(event.target.files)
      : [event.target.files[0]];
      
    const validFiles = uploadedFiles.filter(file => file.type === 'application/pdf');
    
    if (validFiles.length === 0) {
      setError('Please upload PDF files only');
      return;
    }
    
    setFiles(validFiles);
    setError('');
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError('Please select files first');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('file', file);
    });

    try {
      const endpoint = step === 1 ? '/analyze-reference' : '/analyze';
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      onUploadSuccess(data);
      setFiles([]);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
        onClick={() => document.getElementById('file-input').click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {allowMultiple 
            ? 'Drop your PDF files here or click to upload' 
            : 'Upload your document for analysis'}
        </p>
        <input
          id="file-input"
          type="file"
          onChange={handleFileUpload}
          accept=".pdf"
          multiple={allowMultiple}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{file.name}</span>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-gray-200 rounded-full"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <button
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        onClick={handleSubmit}
        disabled={files.length === 0 || loading}
      >
        {loading ? (
          <>
            <Brain className="animate-spin h-5 w-5" />
            <span>Processing...</span>
          </>
        ) : (
          <span>
            {step === 1 ? 'Process Reference Documents' : 'Analyze Document'}
          </span>
        )}
      </button>
    </div>
  );
};

export default DocumentUploader;