import { Button } from "@/shared/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const createPageRange = () => {
    const maxVisible = 10;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const pages = createPageRange();

  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {/* Jump to first page */}
      <Button
        variant="outline"
        disabled={currentPage === 1}
        onClick={() => onPageChange(1)}
        className="w-10 h-10 rounded-xl"
      >
        {"<<"}
      </Button>

      {/* Back by 3 pages */}
      <Button
        variant="outline"
        disabled={currentPage <= 3}
        onClick={() => onPageChange(Math.max(1, currentPage - 3))}
        className="w-10 h-10 rounded-xl"
      >
        {"<"}
      </Button>

      {/* Visible page buttons */}
      {pages.map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? "default" : "outline"}
          onClick={() => onPageChange(page)}
          className="w-10 h-10 rounded-xl"
        >
          {page}
        </Button>
      ))}

      {/* Forward by 3 pages */}
      <Button
        variant="outline"
        disabled={currentPage >= totalPages - 2}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 3))}
        className="w-10 h-10 rounded-xl"
      >
        {">"}
      </Button>

      {/* Jump to last page */}
      <Button
        variant="outline"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(totalPages)}
        className="w-10 h-10 rounded-xl"
      >
        {">>"}
      </Button>
    </div>
  );
}
