'use client';

import { Trophy, AlertCircle } from 'lucide-react';
import { MatchResponse } from '@/types';
import JobCard from './JobCard';

interface MatchingResultsProps {
  results: MatchResponse;
}

export default function MatchingResults({ results }: MatchingResultsProps) {
  if (!results.matches || results.matches.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="text-center mb-6">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No Matches Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
            No suitable jobs were found for this resume above the similarity threshold.
          </p>
        </div>
        
        {/* Debug Information */}
        {results.metadata && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-3 font-semibold text-blue-900">Debug Information</h4>
            <div className="space-y-3 text-sm">
              {results.metadata.resume_metadata_extracted && (
                <div>
                  <span className="font-medium text-blue-800">Extracted Resume Metadata:</span>
                  <pre className="mt-1 p-2 bg-blue-100 rounded text-xs overflow-auto">
                    {JSON.stringify(results.metadata.resume_metadata_extracted, null, 2)}
                  </pre>
                </div>
              )}
              {results.metadata.filters_applied && (
                <div>
                  <span className="font-medium text-blue-800">Filters Applied:</span>
                  <pre className="mt-1 p-2 bg-blue-100 rounded text-xs overflow-auto">
                    {JSON.stringify(results.metadata.filters_applied, null, 2)}
                  </pre>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-medium text-blue-800">Similarity Threshold:</span>
                  <span className="ml-2">{(results.metadata.similarity_threshold * 100).toFixed(0)}%</span>
                </div>
                {results.metadata.query_results_count !== undefined && (
                  <div>
                    <span className="font-medium text-blue-800">Query Results:</span>
                    <span className="ml-2">{results.metadata.query_results_count}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-blue-700 mt-2">
                💡 Tip: If query_results_count is 0, the metadata filters might be too restrictive. 
                If it&apos;s &gt; 0 but matches_returned is 0, try lowering the similarity threshold.
        </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center space-x-2 rounded-full bg-yellow-100 px-4 py-2">
          <Trophy className="h-5 w-5 text-yellow-700" />
          <span className="font-semibold text-yellow-900">
            Top {results.matches.length} Matching Jobs
          </span>
        </div>
      </div>

      {/* Job Matches */}
      <div className="space-y-4">
        {results.matches.map((match, index) => (
          <JobCard key={match.job_id || index} match={match} rank={index + 1} />
        ))}
      </div>

      {/* Metadata Footer */}
      {results.metadata && (
        <div className="mt-8 rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="mb-4 font-semibold">Matching Pipeline Details</h4>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            {results.metadata.retrieval_method && (
              <div className="min-w-0">
                <span className="block font-medium text-muted-foreground mb-1">Retrieval Method:</span>
                <p className="break-words text-foreground">{results.metadata.retrieval_method}</p>
              </div>
            )}
            {results.metadata.reranking_method && (
              <div className="min-w-0">
                <span className="block font-medium text-muted-foreground mb-1">Reranking Method:</span>
                <p className="break-words text-foreground">{results.metadata.reranking_method}</p>
              </div>
            )}
            {results.metadata.processing_time_ms && (
              <div className="min-w-0">
                <span className="block font-medium text-muted-foreground mb-1">Processing Time:</span>
                <p className="text-foreground">{results.metadata.processing_time_ms}ms</p>
              </div>
            )}
          </div>
          
          {/* Debug Info */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              ▼ Show Debug Information
            </summary>
            <div className="mt-3 space-y-3 text-xs">
              {results.metadata.resume_metadata_extracted && (
                <div>
                  <span className="block font-medium mb-1">Extracted Metadata:</span>
                  <pre className="mt-1 p-3 bg-muted rounded overflow-auto max-h-60 text-xs font-mono">
                    {JSON.stringify(results.metadata.resume_metadata_extracted, null, 2)}
                  </pre>
                </div>
              )}
              {results.metadata.filters_applied && (
                <div>
                  <span className="block font-medium mb-1">Filters Applied:</span>
                  <pre className="mt-1 p-3 bg-muted rounded overflow-auto max-h-60 text-xs font-mono">
                    {JSON.stringify(results.metadata.filters_applied, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
