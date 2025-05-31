import { useState } from 'react';
import { useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Bot, Search, CheckCircle, XCircle, Loader2, AlertCircle, Clock, CheckSquare, Square } from 'lucide-react';
import { GlobalNav } from '../components/GlobalNav';
import { Footer } from '../components/Footer';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const EMBEDDING_TIMEOUT = 30000; // 30 seconds

interface CandidateBrand {
  name: string;
  creators: string;
  description: string;
  id?: number;
  isProcessing?: boolean;
  isAdded?: boolean;
  error?: string;
  isUpdatingEmbedding?: boolean;
  embeddingError?: string;
}

export function AgentBossControlCenter() {
  const [instructions, setInstructions] = useState('');
  const [petraStatus, setPetraStatus] = useState<'ready' | 'executing' | 'error'>('ready');
  const [petraError, setPetraError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateBrand[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);

  const updateCandidateStatus = useCallback((index: number, updates: Partial<CandidateBrand>) => {
    setCandidates(prev => prev.map((c, i) => 
      i === index ? { ...c, ...updates } : c
    ));
  }, []);

  const handleLaunchPetra = async () => {
    if (!instructions.trim()) return;

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-agent-petra`;
    console.log('Calling Edge Function:', apiUrl);

    setPetraStatus('executing');
    setPetraError(null);
    setCandidates([]);
    setSelectedCandidates([]);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ instructions: instructions.trim() })
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format from server');
      }

      setCandidates(data);
      setPetraStatus('ready');
    } catch (err: any) {
      console.error('Petra research error:', err);
      setPetraError(
        err.message === 'Failed to fetch' 
          ? 'Unable to connect to research service. Please try again.' 
          : err.message || 'Failed to complete research'
      );
      setPetraStatus('error');
    }
  };

  const handleUpdateEmbeddings = async (brandId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/queue-brand-embeddings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ brandId })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to queue embedding: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to queue embedding');
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleAddBrand = async (candidate: CandidateBrand, index: number): Promise<CandidateBrand> => {
    try {
      // Get the next ID from the brands_id_seq sequence
      const { data: seqData, error: seqError } = await supabase
        .rpc('next_brand_id');

      if (seqError) {
        throw new Error(`Failed to get next brand ID: ${seqError.message}`); 
      }
      if (!seqData) throw new Error('Failed to get next brand ID');

      const nextId = seqData;

      // Now insert the brand with the next available ID
      const { data: newBrand, error: insertError } = await supabase
        .from('brands')
        .insert([{
          id: nextId,
          name: candidate.name,
          creators: candidate.creators,
          description: candidate.description,
          approval_status: 'approved'
        }])
        .select()
        .single();
      
      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          throw new Error('Brand ID conflict detected. Please try again.');
        }
        throw insertError;
      }

      if (!newBrand) {
        throw new Error('Failed to create brand');
      }

      // Try to generate embeddings with a timeout
      const embeddingPromise = handleUpdateEmbeddings(newBrand.id);
      const timeoutPromise = new Promise<{ success: false, error: string }>(
        (_, reject) => setTimeout(() => reject({ 
          success: false, 
          error: 'Embedding generation timed out' 
        }), 30000)
      );

      const embeddingResult = await Promise.race([embeddingPromise, timeoutPromise])
        .catch(err => ({ success: false, error: err.message }));

      return {
        ...candidate,
        id: newBrand.id,
        isAdded: true,
        isProcessing: false,
        embeddingError: embeddingResult.success ? undefined : embeddingResult.error
      };
    } catch (err: any) {
      return {
        ...candidate,
        isProcessing: false,
        error: err.message || 'Failed to add brand'
      };
    }
  };

  const handleRejectCandidate = (index: number) => {
    setCandidates(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkAdd = async () => {
    if (selectedCandidates.length === 0) return;
    
    setQueueError(null);
    setIsProcessingBulk(true);
    
    try {
      // Process selected candidates sequentially
      for (const index of selectedCandidates) {
        const candidate = candidates[index];
        if (!candidate.isAdded && !candidate.isProcessing) {
          updateCandidateStatus(index, { isProcessing: true });
          const updatedCandidate = await handleAddBrand(candidate, index);
          updateCandidateStatus(index, updatedCandidate);
        }
      }
      
      // Clear selection after processing
      setSelectedCandidates([]);
    } catch (err: any) {
      console.error('Error in bulk processing:', err);
      setQueueError(err.message);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleToggleSelect = (index: number) => {
    setSelectedCandidates(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleSelectAll = () => {
    const availableCandidates = candidates
      .map((_, index) => index)
      .filter(index => !candidates[index].isAdded && !candidates[index].isProcessing);
    
    setSelectedCandidates(prev => 
      prev.length === availableCandidates.length ? [] : availableCandidates
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Helmet>
        <title>Agent Boss Control Center | Celebrity Brands</title>
      </Helmet>

      <GlobalNav />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Bot className="w-8 h-8 text-teal-400" />
          <h1 className="text-3xl font-bold text-gray-100">
            Agent Boss Control Center
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Petra Agent Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-100">
                  Petra: Research Agent
                </h2>
                <div className={`w-2 h-2 rounded-full ${
                  petraStatus === 'ready' ? 'bg-green-500' :
                  petraStatus === 'executing' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label 
                  htmlFor="instructions"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Research Instructions for Petra:
                </label>
                <textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g., Find beverage brands by pop singers not already in our database"
                  className="w-full h-32 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <Button
                  onClick={handleLaunchPetra}
                  disabled={!instructions.trim() || petraStatus === 'executing'}
                  className="flex items-center gap-2"
                >
                  {petraStatus === 'executing' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {petraStatus === 'executing' ? 'Researching...' : '🚀 Launch Petra'}
                </Button>
              </div>

              {petraError && (
                <div className="p-4 bg-red-900/50 text-red-200 rounded-lg border border-red-700/50">
                  {petraError}
                </div>
              )}

              {processingError && (
                <div className="p-4 bg-red-900/50 text-red-200 rounded-lg border border-red-700/50 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{processingError}</span>
                </div>
              )}

              {candidates.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-200">
                      Research Results
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 text-gray-400 hover:text-gray-300"
                      >
                        {selectedCandidates.length === candidates.filter(c => !c.isAdded && !c.isProcessing).length ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                        Select All
                      </button>
                      {selectedCandidates.length > 0 && (
                        <Button
                          onClick={handleBulkAdd}
                          disabled={isProcessingBulk}
                          className={`flex items-center gap-2 ${queueError ? 'bg-red-600 hover:bg-red-700' : ''}`}
                        >
                          {isProcessingBulk ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Add Selected ({selectedCandidates.length})
                        </Button>
                      )}
                      {queueError && (
                        <div className="absolute top-full left-0 mt-2 p-2 bg-red-900/50 text-red-200 text-sm rounded-lg border border-red-700/50 whitespace-nowrap">
                          {queueError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {candidates.map((candidate, index) => (
                      <div 
                        key={index}
                        className={`bg-gray-700/50 rounded-lg p-4 border border-gray-600/50 ${
                          candidate.isAdded ? 'opacity-75' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {!candidate.isAdded && !candidate.isProcessing && (
                            <button
                              onClick={() => handleToggleSelect(index)}
                              className="flex-shrink-0 mt-1"
                            >
                              {selectedCandidates.includes(index) ? (
                                <CheckSquare className="w-5 h-5 text-teal-400" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          )}
                          <div>
                            <h4 className="text-lg font-medium text-gray-200">
                              {candidate.name}
                            </h4>
                            <p className="text-sm text-gray-400 mb-2">
                              {candidate.creators}
                            </p>
                            <p className="text-gray-300">
                              {candidate.description}
                            </p>
                            {candidate.error && (
                              <p className="text-sm text-red-400 mt-2">
                                {candidate.error}
                              </p>
                            )}
                            {candidate.embeddingError && (
                              <p className="text-sm text-red-400 mt-2">
                                {candidate.embeddingError}
                              </p>
                            )}
                          </div>                          
                        </div>
                        <div className="flex justify-end mt-4">
                          <div className="flex items-center gap-2">
                            {!candidate.isAdded ? (
                              <>
                                <Button
                                  onClick={() => handleAddBrand(candidate, index)}
                                  disabled={candidate.isProcessing}
                                  className="flex items-center gap-1"
                                >
                                  {candidate.isProcessing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                  {candidate.isProcessing ? (
                                    'Processing...'
                                  ) : (
                                    'Add Brand'
                                  )}
                                </Button>
                                <button
                                  onClick={() => handleRejectCandidate(index)}
                                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                  title="Reject"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-sm text-green-400">
                                {candidate.isUpdatingEmbedding ? (
                                  <span className="flex items-center gap-1">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Updating Embedding...
                                  </span>
                                ) : candidate.embeddingError ? (
                                  'Added with Limited Search'
                                ) : (
                                  'Added Successfully'
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}