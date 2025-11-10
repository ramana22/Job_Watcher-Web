const STATUS_OPTIONS = [
  { value: 'not_applied', label: 'Not Applied' },
  { value: 'applied', label: 'Applied' },
  { value: 'all', label: 'All' },
];

const TIMEFRAME_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '3d', label: 'Past 3 days' },
  { value: '5d', label: 'Past 5 days' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'oldest', label: 'Oldest First' },
];

export default function Filters({ filters, sourceOptions, keywordOptions, keywordsLoading, keywordsError, onChange }) {
  const keywordList = Array.isArray(keywordOptions) && keywordOptions.length > 0 ? keywordOptions : ['all'];

  return (
    <div className="filters">
      <label className="filter-group">
        Status
        <select value={filters.status} onChange={(event) => onChange('status', event.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-group">
        Source
        <select value={filters.source} onChange={(event) => onChange('source', event.target.value)}>
          {sourceOptions.map((source) => (
            <option key={source} value={source}>
              {source === 'all' ? 'All Sources' : source}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-group">
        Keyword
        <select value={filters.keyword ?? 'all'} onChange={(event) => onChange('keyword', event.target.value)}>
          {keywordList.map((keyword) => (
            <option key={keyword} value={keyword}>
              {keyword === 'all' ? 'All Keywords' : keyword}
            </option>
          ))}
        </select>
        {keywordsLoading ? <span className="helper-text">Loading keywords…</span> : null}
        {keywordsError ? (
          <span className="helper-text" role="alert">
            {keywordsError}
          </span>
        ) : null}
      </label>
      <label className="filter-group">
        Posted
        <select value={filters.timeframe} onChange={(event) => onChange('timeframe', event.target.value)}>
          {TIMEFRAME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-group">
        Sort
        <select value={filters.sort} onChange={(event) => onChange('sort', event.target.value)}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
