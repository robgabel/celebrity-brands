import { useState, useEffect } from 'react';

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
}

const STORAGE_KEY = 'pagination_preferences';

export function usePagination(initialItemsPerPage: number = 25) {
  const [state, setState] = useState<PaginationState>(() => {
    const savedPreferences = localStorage.getItem(STORAGE_KEY);
    if (savedPreferences) {
      try {
        return JSON.parse(savedPreferences);
      } catch (e) {
        console.error('Error parsing pagination preferences:', e);
      }
    }
    return {
      currentPage: 1,
      itemsPerPage: initialItemsPerPage
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving pagination preferences:', e);
    }
  }, [state]);

  const setCurrentPage = (page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  };

  const setItemsPerPage = (itemsPerPage: number) => {
    setState(prev => ({ ...prev, itemsPerPage, currentPage: 1 }));
  };

  const resetPagination = () => {
    setState({ currentPage: 1, itemsPerPage: initialItemsPerPage });
  };

  return {
    currentPage: state.currentPage,
    itemsPerPage: state.itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    resetPagination
  };
}