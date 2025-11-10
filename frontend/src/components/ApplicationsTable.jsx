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

export default function ApplicationsTable({ applications, isLoading, error, onApply }) {
  return (
    <div className="card">
      <div>
        <h2>Applications</h2>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
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
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={12} className="empty-state">
                  Loading applications…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={12} className="error-state" role="alert">
                  {error}
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={12} className="empty-state">
                  No applications found for the selected filters.
                </td>
              </tr>
            ) : (
              applications.map((application) => {
                const key = application.id ?? `${application.job_id}-${application.source ?? 'source'}`;
                return (
                  <tr key={key}>
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
