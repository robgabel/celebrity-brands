import { useState } from 'react';
import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Bot, Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { GlobalNav } from '../components/GlobalNav';
import { Footer } from '../components/Footer';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

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

    setPetraStatus('executing');
    setPetraError(null);
    setCandidates([]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-agent-petra`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ instructions: instructions.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setCandidates(data);
      setPetraStatus('ready');
    } catch (err: any) {
      console.error('Petra research error:', err);
      setPetraError(err.message || 'Failed to complete research');
      setPetraStatus('error');
    }
  };

  const handleAddBrand = async (candidate: CandidateBrand, index: number) => {
    // Update candidate status
    setCandidates(prev => prev.map((c, i) => 
      i === index ? { ...c, isProcessing: true, error: null } : c
    ));

    try {
      // Get the next ID from the brands_id_seq sequence
      const { data: seqData, error: seqError } = await supabase
        .rpc('next_brand_id');

      if (seqError) throw seqError;
      if (!seqData) throw new Error('Failed to get next brand ID');

      const nextId = seqData;

      // Verify the ID is available
      const { data: existingBrand, error: checkError } = await supabase
        .from('brands')
        .select('id')
        .eq('id', nextId)
        .single();

      if (checkError?.code !== 'PGRST116') { // PGRST116 means no rows returned
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
          approval_status: 'pending'
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newBrand) throw new Error('Failed to create brand');

      // Update candidate status to added
      setCandidates(prev => prev.map((c, i) =>
        i === index ? {
          ...c,
          isProcessing: false,
          isAdded: true
        } : c
      ));

      // Call analyze-brands function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-brands`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ brandId: newBrand.id })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to analyze brand: ${response.status}`);
      }
    } catch (err: any) {
      console.error('Error adding brand:', err);
      
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

  const handleUpdateEmbeddings = async (brandId: number, index: number) => {
    // Update candidate status
    setCandidates(prev => prev.map((c, i) => 
      i === index ? { ...c, isUpdatingEmbedding: true, embeddingError: null } : c
    ));

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
    } catch (err: any) {
      console.error('Error updating embeddings:', err);
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
                                    <CheckCircle className="w-4 h-4" />
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
                                {candidate.isUpdatingEmbedding ? 'Updating Embedding...' : 'Added - Pending Approval'}
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