'use client';

import { useState, useCallback } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2, Search, FileText } from 'lucide-react';

interface PDFUploaderProps {
  onMatchesFound?: (matches: any) => void;
  onNewUpload?: () => void; // Callback when user wants to upload a new resume
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function PDFUploader({ onMatchesFound, onNewUpload }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFindingMatches, setIsFindingMatches] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [resumeMetadata, setResumeMetadata] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleNewUpload = useCallback(() => {
    // Clear all state
    setUploadResult(null);
    setResumeText(null);
    setResumeMetadata(null);
    setError(null);
    setIsFindingMatches(false);
    
    // Notify parent to clear match results
    if (onNewUpload) {
      onNewUpload();
    }
  }, [onNewUpload]);

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    const fileExt = file.name.toLowerCase().split('.').pop();
    if (fileExt !== 'pdf' && fileExt !== 'txt') {
      setError('Please upload a PDF or TXT file only.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${formatFileSize(file.size)}). Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}.`);
      return;
    }

    if (file.size === 0) {
      setError('File is empty. Please upload a valid PDF file.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/embed-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process PDF');
      }

      const result = await response.json();
      setUploadResult(result);
      setResumeText(result.resume_text || null);
      // Store metadata for matching
      if (result.resume_metadata) {
        setResumeMetadata(result.resume_metadata);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFindMatches = useCallback(async () => {
    if (!resumeText) {
      setError('No resume text available. Please upload a PDF first.');
      return;
    }

    setIsFindingMatches(true);
    setError(null);

    try {
      const requestBody: any = {
        resume: {
          content: resumeText,
          filename: uploadResult?.filename || 'resume.pdf',
          format: 'txt',
        },
      };

      // Include metadata if available
      if (resumeMetadata) {
        requestBody.resume_metadata = resumeMetadata;
      }

      const response = await fetch('/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to find matches');
      }

      const data = await response.json();
      
      if (onMatchesFound) {
        onMatchesFound(data);
      }
    } catch (err) {
      console.error('Match error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsFindingMatches(false);
    }
  }, [resumeText, uploadResult, onMatchesFound]);

  return (
    <div className="w-full">
      {/* Upload Area - Only show if no upload result yet */}
      {!uploadResult && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative rounded-lg border-2 border-dashed p-12 text-center transition-colors
            ${isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
            }
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileInput}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            id="resume-upload"
          />
          
          <div className="flex flex-col items-center space-y-4">
            {isUploading ? (
              <>
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Processing resume...</p>
                  <p className="text-sm text-gray-600 mt-1">Extracting text and creating embedding</p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-full bg-primary/10 p-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    Upload your resume (PDF or TXT)
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Drag and drop your resume here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Maximum file size: 10MB • PDF: up to 10 pages • TXT: UTF-8 encoded
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message - Show when resume is uploaded */}
      {uploadResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-green-900">Resume Ready!</p>
                <button
                  onClick={handleNewUpload}
                  className="flex items-center space-x-1 text-xs text-green-700 hover:text-green-900 underline"
                >
                  <FileText className="h-3 w-3" />
                  <span>Upload New Resume</span>
                </button>
              </div>
              
              <div className="text-sm text-green-800 space-y-1">
                <p>✓ Resume processed: {uploadResult.filename}</p>
                {uploadResult.file_size_bytes && (
                  <p>✓ File size: {formatFileSize(uploadResult.file_size_bytes)}</p>
                )}
                <p>✓ Text extracted: {uploadResult.text_length.toLocaleString()} characters</p>
                <p>✓ Embedding created: {uploadResult.embedding_dimension} dimensions</p>
                {uploadResult.resume_metadata && (
                  <>
                    <p className="mt-2 font-medium">Extracted Preferences:</p>
                    {uploadResult.resume_metadata.h1b_sponsorship_needed && (
                      <p>  • H1B Sponsorship needed</p>
                    )}
                    {uploadResult.resume_metadata.preferred_location && (
                      <p>  • Location: {uploadResult.resume_metadata.preferred_location}</p>
                    )}
                    {uploadResult.resume_metadata.preferred_job_categories?.length > 0 && (
                      <p>  • Categories: {uploadResult.resume_metadata.preferred_job_categories.join(', ')}</p>
                    )}
                    {uploadResult.resume_metadata.preferred_employment_type?.length > 0 && (
                      <p>  • Employment: {uploadResult.resume_metadata.preferred_employment_type.join(', ')}</p>
                    )}
                    {uploadResult.resume_metadata.ideal_companies?.length > 0 && (
                      <p>  • Ideal Companies: {uploadResult.resume_metadata.ideal_companies.join(', ')}</p>
                    )}
                    {uploadResult.resume_metadata.equity_preference !== null && uploadResult.resume_metadata.equity_preference !== undefined && (
                      <p>  • Equity Preference: {(uploadResult.resume_metadata.equity_preference * 100).toFixed(1)}%</p>
                    )}
                  </>
                )}
                <p>✓ Processing time: {uploadResult.processing_time_ms}ms</p>
              </div>
              
              <p className="text-sm text-green-700 mt-3 font-medium">
                {uploadResult.message}
              </p>
              
              {/* Find Matches Button */}
              <div className="mt-4">
                <button
                  onClick={handleFindMatches}
                  disabled={isFindingMatches}
                  className="w-full flex items-center justify-center space-x-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isFindingMatches ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Finding Matches...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      <span>Find Matches</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

