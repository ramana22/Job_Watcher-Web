function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function truncate(text, length = 200) {
  if (!text) return '—';
  return text.length > length ? `${text.substring(0, length)}…` : text;
}

function formatScore(score) {
  if (typeof score === 'number' && !Number.isNaN(score)) {
    return `${score.toFixed(2)}%`;
  }
  return '0.00%';
}

export default function ApplicationsTable({
  applications,
  totalCount,
  isLoading,
  error,
  currentPage,
  pageCount,
  pageSize,
  onPageChange,
  onApply,
  onDelete,
  selectedIds,
  onSelect,
  onSelectAll,
  onBulkDelete,
  onBulkApply,
  onBulkArchive,
  onMarkAllApplied,
  onDeleteAll,
  bulkActionLoading,
}) {
  const hasResults = totalCount > 0;
  const displayStart = hasResults ? (currentPage - 1) * pageSize + 1 : 0;
  const displayEnd = hasResults ? Math.min(currentPage * pageSize, totalCount) : 0;
  const showSummary = hasResults && !isLoading;
  const currentPageIds = hasResults ? applications.map((application) => application.id).filter(Boolean) : [];
  const pageSelectedCount = currentPageIds.filter((id) => selectedIds?.has(id)).length;
  const allPageSelected = currentPageIds.length > 0 && pageSelectedCount === currentPageIds.length;
  const somePageSelected = pageSelectedCount > 0 && pageSelectedCount < currentPageIds.length;

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

  return (
    <div className="card">
      <div className="table-header">
        <h2>Applications</h2>
        {showSummary ? (
          <span className="helper-text">
            Showing {displayStart}–{displayEnd} of {totalCount}
          </span>
        ) : null}
      </div>
      <div className="table-actions" role="group" aria-label="Application bulk actions">
        <button type="button" className="button secondary" onClick={onBulkApply} disabled={bulkActionLoading}>
          Mark selected applied
        </button>
        <button type="button" className="button secondary" onClick={onBulkArchive} disabled={bulkActionLoading}>
          Archive selected
        </button>
        <button type="button" className="button secondary" onClick={onBulkDelete} disabled={bulkActionLoading}>
          Delete selected
        </button>
        <button type="button" className="button secondary" onClick={onMarkAllApplied} disabled={bulkActionLoading}>
          Mark all applied
        </button>
        <button type="button" className="button secondary" onClick={onDeleteAll} disabled={bulkActionLoading}>
          Delete all
        </button>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th className="cell-small">
                <input
                  type="checkbox"
                  aria-label={allPageSelected ? 'Deselect all on this page' : 'Select all on this page'}
                  checked={allPageSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = somePageSelected;
                    }
                  }}
                  onChange={(event) => onSelectAll(currentPageIds, event.target.checked)}
                />
              </th>
              {/* <th className="cell-small">Job ID</th> */}
              <th>Job Title</th>
              <th>Company</th>
              <th>Location</th>
              <th>Salary</th>
              <th className="description-cell">Description</th>
              <th className="cell-small">Apply</th>
              <th>Search Key</th>
              <th className="cell-small">Posted</th>
              <th className="cell-small">Source</th>
              <th className="cell-small">Matching Score</th>
              <th className="cell-small">Status</th>
              <th className="cell-small">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={13} className="empty-state">
                  Loading applications…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={13} className="error-state" role="alert">
                  {error}
                </td>
              </tr>
            ) : !hasResults ? (
              <tr>
                <td colSpan={13} className="empty-state">
                  No applications found for the selected filters.
                </td>
              </tr>
            ) : (
              applications.map((application) => {
                const key = application.id ?? `${application.job_id}-${application.source ?? 'source'}`;
                return (
                  <tr key={key}>
                    <td className="cell-small">
                      <input
                        type="checkbox"
                        aria-label={`Select ${application.job_title} at ${application.company}`}
                        checked={selectedIds?.has(application.id)}
                        onChange={() => onSelect(application.id)}
                      />
                    </td>
                    {/* <td className="cell-small">{application.job_id}</td> */}
                    <td>{application.job_title}</td>
                    <td>{application.company}</td>
                    <td>{application.location ?? '—'}</td>
                    <td>{application.salary ?? '—'}</td>
                    <td className="description-cell">
                      <p title={application.description}>{truncate(application.description)}</p>
                    </td>
                    <td className="cell-small">
                      {application.apply_link ? (
                        <button
                          type="button"
                          className="button-link"
                          onClick={() => onApply(application)}
                        >
                          Apply
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{application.search_key ?? '—'}</td>
                    <td className="cell-small">{formatDate(application.posted_time)}</td>
                    <td className="cell-small">{application.source ?? '—'}</td>
                    <td className="cell-small">{formatScore(application.matching_score)}</td>
                    <td className="cell-small">
                      <span className={`badge ${application.status}`}>
                        {application.status?.replace('_', ' ') ?? '—'}
                      </span>
                    </td>
                    <td className="cell-small">
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => onDelete(application)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
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
