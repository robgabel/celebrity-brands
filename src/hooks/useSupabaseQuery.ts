import { useState, useEffect } from 'react';
import { PostgrestError } from '@supabase/supabase-js';
import { supabase, handleSupabaseError } from '../lib/supabase';

interface QueryConfig<T> {
  query: string;
  params?: any[];
  dependencies?: any[];
  transform?: (data: any) => T;
  onError?: (error: PostgrestError) => void;
}

export function useSupabaseQuery<T>({
  query,
  params = [],
  dependencies = [],
  transform,
  onError
}: QueryConfig<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data: result, error } = await supabase.rpc(query, ...params);

        if (error) throw error;

        if (isMounted) {
          setData(transform ? transform(result) : result);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err);
          onError?.(err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return { data, error, isLoading };
}

export function useBatchQuery<T>(queries: QueryConfig<T>[]) {
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const results = await Promise.all(
          queries.map(async ({ query, params = [] }) => {
            const { data, error } = await supabase.rpc(query, ...params);
            if (error) throw error;
            return data;
          })
        );

        if (isMounted) {
          setData(results);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, error, isLoading };
}

export function useSupabaseMutation<T, R = any>(
  query: string,
  options: {
    onSuccess?: (data: R) => void;
    onError?: (error: PostgrestError) => void;
    transform?: (data: any) => R;
  } = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PostgrestError | null>(null);

  const mutate = async (variables: T) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: result, error } = await supabase.rpc(query, variables);

      if (error) throw error;

      const transformedData = options.transform ? options.transform(result) : result;
      options.onSuccess?.(transformedData);

      return transformedData;
    } catch (err: any) {
      setError(err);
      options.onError?.(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}