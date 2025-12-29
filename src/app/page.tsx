'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import PDFUploader from '@/components/PDFUploader';
import MatchingResults from '@/components/MatchingResults';
import { MatchResponse } from '@/types';

export default function Home() {
  const [matchResults, setMatchResults] = useState<MatchResponse | null>(null);

  const handleMatchesFound = (matches: MatchResponse) => {
    setMatchResults(matches);
  };

  const handleNewUpload = () => {
    // Clear match results when user wants to upload a new resume
    setMatchResults(null);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center space-x-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          <span>AI-Powered Resume Matching</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Find Your Perfect Job Match
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Upload your resume and let AI match you with the best fitting opportunities
        </p>
      </div>

      {/* PDF Upload Section */}
      <div className="mb-8">
        <PDFUploader onMatchesFound={handleMatchesFound} onNewUpload={handleNewUpload} />
      </div>

      {/* Matching Results */}
      {matchResults && <MatchingResults results={matchResults} />}

      {/* Footer */}
      <footer className="mt-16 border-t border-border pt-8 text-center text-sm text-muted-foreground">
        <p>Built with Next.js, FastAPI, OpenAI, and Pinecone</p>
      </footer>
    </div>
  );
}
