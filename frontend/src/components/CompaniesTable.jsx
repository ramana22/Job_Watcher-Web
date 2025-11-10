export default function CompaniesTable({
  companies,
  totalCount,
  isLoading,
  error,
  search,
  onSearchChange,
  currentPage,
  pageCount,
  pageSize,
  onPageChange,
}) {
  const hasResults = totalCount > 0;
  const displayStart = hasResults ? (currentPage - 1) * pageSize + 1 : 0;
  const displayEnd = hasResults ? Math.min(currentPage * pageSize, totalCount) : 0;
  const showSummary = hasResults && !isLoading;

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < pageCount) {
      onPageChange(currentPage + 1);
    }
  };

  const emptyMessage = search?.trim()
    ? 'No companies match your search.'
    : 'No companies available.';

  return (
    <div className="card">
      <div className="table-header">
        <h2>Companies</h2>
        <div className="table-header-actions">
          <input
            type="search"
            className="search-input"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search companies or URLs"
            aria-label="Search companies"
          />
          {showSummary ? (
            <span className="helper-text">
              Showing {displayStart}–{displayEnd} of {totalCount}
            </span>
          ) : null}
        </div>
      </div>
      <div className="table-wrapper company-table">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Career Site</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={2} className="empty-state">
                  Loading companies…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={2} className="error-state" role="alert">
                  {error}
                </td>
              </tr>
            ) : !hasResults ? (
              <tr>
                <td colSpan={2} className="empty-state">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company.company}>
                  <td>{company.company}</td>
                  <td>
                    {company.career_site ? (
                      <a href={company.career_site} target="_blank" rel="noreferrer noopener">
                        {company.career_site}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <button type="button" className="button secondary" onClick={handlePrevious} disabled={currentPage <= 1 || !hasResults}>
          Previous
        </button>
        <span className="helper-text">
          Page {Math.min(currentPage, pageCount)} of {pageCount}
        </span>
        <button
          type="button"
          className="button secondary"
          onClick={handleNext}
          disabled={currentPage >= pageCount || !hasResults}
        >
          Next
        </button>
      </div>
    </div>
  );
}
