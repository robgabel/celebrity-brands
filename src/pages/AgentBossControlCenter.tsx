import { useState } from 'react';
import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Bot, Search, CheckCircle, XCircle, Loader2, AlertCircle, Clock } from 'lucide-react';
import { GlobalNav } from '../components/GlobalNav';
import { Footer } from '../components/Footer';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const ANALYSIS_TIMEOUT = 45000; // 45 seconds
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
  const [timeouts, setTimeouts] = useState<{ [key: number]: NodeJS.Timeout }>({});
  const [analysisStatus, setAnalysisStatus] = useState<{ [key: number]: string }>({});

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [timeouts]);

  // Poll for analysis status updates
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const pendingBrands = candidates.filter(c => c.isProcessing || c.isUpdatingEmbedding);
      
      if (pendingBrands.length === 0) {
        return;
      }

      try {
        const { data: statusData, error: statusError } = await supabase
          .from('brand_analysis_status')
          .select('brand_id, status, error')
          .in('brand_id', pendingBrands.map(b => b.id!))
          .not('status', 'eq', 'completed');

        if (statusError) throw statusError;

        if (statusData) {
          statusData.forEach(status => {
            if (status.status === 'error' || status.status === 'timeout') {
              setCandidates(prev => prev.map(c => 
                c.id === status.brand_id 
                  ? { ...c, error: status.error || 'Analysis failed', isProcessing: false }
                  : c
              ));
            }
          });
        }
      } catch (err) {
        console.error('Error polling analysis status:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [candidates]);

  // Set up Realtime subscription for brand updates
  useEffect(() => {
    const subscription = supabase
      .channel('brand-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'brands'
        },
        async (payload) => {
          // Find the candidate that matches this brand
          const brandId = payload.new.id;
          const candidateIndex = candidates.findIndex(c => !c.isAdded);
          
          if (candidateIndex !== -1) {
            // Queue embedding update for the new brand
            await handleUpdateEmbeddings(brandId, candidateIndex);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [candidates]);

  const handleLaunchPetra = async () => {
    if (!instructions.trim()) return;

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-agent-petra`;
    console.log('Calling Edge Function:', apiUrl);

    setPetraStatus('executing');
    setPetraError(null);
    setCandidates([]);

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

  const handleTimeout = (index: number, type: 'analysis' | 'embedding') => {
    setCandidates(prev => prev.map((c, i) => 
      i === index ? {
        ...c,
        isProcessing: false,
        error: type === 'analysis' 
          ? 'Analysis timed out. The brand was added but analysis is still pending.'
          : 'Embedding generation timed out. The brand was added but semantic search may be limited.'
      } : c
    ));
  };

  const checkAnalysisStatus = async (brandId: number) => {
    try {
      const { data, error } = await supabase
        .from('brand_analysis_status')
        .select('status, error')
        .eq('brand_id', brandId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error checking analysis status:', err);
      return null;
    }
  };

  const handleAddBrand = async (candidate: CandidateBrand, index: number) => {
    // Update candidate status
    setCandidates(prev => prev.map((c, i) => 
      i === index ? { ...c, isProcessing: true, error: null, isAdded: false } : c
    ));
    setProcessingError(null);
    
    // Set analysis timeout
    const startTime = Date.now();
    const analysisTimeout = setTimeout(() => handleTimeout(index, 'analysis'), ANALYSIS_TIMEOUT);
    setTimeouts(prev => ({ ...prev, [`analysis-${index}`]: analysisTimeout }));

    try {
      // Get the next ID from the brands_id_seq sequence
      const { data: seqData, error: seqError } = await supabase
        .rpc('next_brand_id');

      if (seqError) {
        throw new Error(`Failed to get next brand ID: ${seqError.message}`);
      }
      if (!seqData) throw new Error('Failed to get next brand ID');

      const nextId = seqData;

      // Verify the ID is available
      const { error: checkError } = await supabase
        .from('brands')
        .select('id')
        .eq('id', nextId);

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
        throw new Error('ID conflict detected');
      }

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
        .select();
      
      if (insertError) throw insertError;
      if (!newBrand?.[0]) throw new Error('Failed to create brand');

      // Store the brand ID for embedding updates
      const brandId = newBrand[0].id;

      // Clear analysis timeout since brand was added successfully
      clearTimeout(timeouts[`analysis-${index}`]);
      setTimeouts(prev => {
        const { [`analysis-${index}`]: _, ...rest } = prev;
        return rest;
      });

      // Update candidate status to added
      setCandidates(prev => prev.map((c, i) =>
        i === index ? {
          ...c,
          isProcessing: false,
          isAdded: true,
          id: brandId
        } : c
      ));

      // Call analyze-brands function
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-brands`,
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
          throw new Error(error.error || `Failed to analyze brand: ${response.status}`);
        }
      } catch (analyzeError: any) {
        console.error('Error analyzing brand:', analyzeError);
        // Don't fail the whole operation, just show a warning
        setCandidates(prev => prev.map((c, i) => 
          i === index ? { 
            ...c,
            error: `Brand added but analysis failed: ${analyzeError.message}`
          } : c
        ));
      }
    } catch (err: any) {
      console.error('Error adding brand:', err);
      
      // Clear analysis timeout
      clearTimeout(timeouts[`analysis-${index}`]);
      
      setProcessingError(err.message || 'Failed to process brand');
      
      // Update candidate status to error
      setCandidates(prev => prev.map((c, i) => 
        i === index ? { 
          ...c, 
          isProcessing: false, 
          error: err.message || 'Failed to add brand'
        } : c
      ));
    }
  };

  const handleRejectCandidate = (index: number) => {
    setCandidates(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmbeddingTimeout = (index: number) => {
    setCandidates(prev => prev.map((c, i) => 
      i === index ? {
        ...c,
        isUpdatingEmbedding: false,
        embeddingError: 'Embedding generation timed out. Semantic search may be limited.'
      } : c
    ));
  };

  const handleUpdateEmbeddings = async (brandId: number, index: number) => {
    // Update candidate status
    setCandidates(prev => prev.map((c, i) => 
      i === index ? { ...c, isUpdatingEmbedding: true, embeddingError: null } : c
    ));

    // Set embedding timeout
    const embeddingTimeout = setTimeout(() => handleEmbeddingTimeout(index), EMBEDDING_TIMEOUT);
    setTimeouts(prev => ({ ...prev, [`embedding-${index}`]: embeddingTimeout }));

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

      // Clear embedding timeout on success
      clearTimeout(timeouts[`embedding-${index}`]);
      setTimeouts(prev => {
        const { [`embedding-${index}`]: _, ...rest } = prev;
        return rest;
      });
    } catch (err: any) {
      console.error('Error updating embeddings:', err);
      
      // Clear embedding timeout
      clearTimeout(timeouts[`embedding-${index}`]);
      
      setCandidates(prev => prev.map((c, i) => 
        i === index ? { ...c, embeddingError: err.message } : c
      ));
    } finally {
      setCandidates(prev => prev.map((c, i) => 
        i === index ? { ...c, isUpdatingEmbedding: false } : c
      ));
    }
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
                  <h3 className="text-lg font-medium text-gray-200 mb-4">
                    Research Results
                  </h3>
                  <div className="space-y-4">
                    {candidates.map((candidate, index) => (
                      <div 
                        key={index}
                        className={`bg-gray-700/50 rounded-lg p-4 border border-gray-600/50 ${
                          candidate.isAdded ? 'opacity-75' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
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
                                    candidate.error ? (
                                      <Clock className="w-4 h-4" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4" />
                                    )
                                  )}
                                  {candidate.isProcessing ? 'Adding...' : 'Add & Analyze'}
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
                                  'Added - Pending Approval'
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