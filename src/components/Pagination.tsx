import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  isLoading?: boolean;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  isLoading = false
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  // Generate page numbers to show (current ± 2)
  const getPageNumbers = () => {
    const pages = [];
    const delta = 2; // Number of pages to show before and after current page

    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
      pages.push(i);
    }

    // Add first page if not included
    if (pages[0] > 1) {
      if (pages[0] > 2) {
        pages.unshift(-1); // Add ellipsis
      }
      pages.unshift(1);
    }

    // Add last page if not included
    if (pages[pages.length - 1] < totalPages) {
      if (pages[pages.length - 1] < totalPages - 1) {
        pages.push(-1); // Add ellipsis
      }
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-gray-800">
      <div className="flex items-center gap-2">
        <label htmlFor="itemsPerPage" className="text-sm text-gray-400">
          Show
        </label>
        <select
          id="itemsPerPage"
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-200"
          aria-label="Items per page"
        >
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <span className="text-sm text-gray-400">
          items per page
        </span>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center">
          <button
            onClick={() => onPageChange(1)}
            disabled={isFirstPage || isLoading}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={isFirstPage || isLoading}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((pageNum, idx) => (
            pageNum === -1 ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">...</span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  pageNum === currentPage
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label={`Page ${pageNum}`}
                aria-current={pageNum === currentPage ? 'page' : undefined}
              >
                {pageNum}
              </button>
            )
          ))}
        </div>

        <div className="flex items-center">
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={isLastPage || isLoading}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={isLastPage || isLoading}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-400">
        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{' '}
        {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
      </div>
    </div>
  );
}