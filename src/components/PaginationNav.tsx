import React from "react";
import { Link } from "react-router-dom";

interface PaginationNavProps {
  currentPage: number;
  totalPages: number;
  getPagePath: (page: number) => string;
  onPageClick: React.MouseEventHandler<HTMLAnchorElement>;
}

const PaginationNav: React.FC<PaginationNavProps> = ({
  currentPage,
  totalPages,
  getPagePath,
  onPageClick,
}) => {
  return (
    <div className="stories-nav">
      {currentPage > 0 && (
        <Link to={getPagePath(currentPage - 1)} onClick={onPageClick}>
          ← Previous
        </Link>
      )}
      {currentPage < totalPages - 1 && (
        <Link to={getPagePath(currentPage + 1)} onClick={onPageClick}>
          Next →
        </Link>
      )}
    </div>
  );
};

export default PaginationNav;
