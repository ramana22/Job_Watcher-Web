export default function CompaniesTable({ companies, isLoading, error }) {
  return (
    <div className="card">
      <div>
        <h2>Companies</h2>
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
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={2} className="empty-state">
                  No companies available.
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
    </div>
  );
}
