import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ApplicationsTable from './components/ApplicationsTable.jsx';
import AuthForm from './components/AuthForm.jsx';
import CompaniesTable from './components/CompaniesTable.jsx';
import Filters from './components/Filters.jsx';
import ResumeUpload from './components/ResumeUpload.jsx';
import {
  ApiError,
  clearStoredToken,
  getApplicationKeywords,
  getApplications,
  getCompanies,
  getResume,
  getStoredToken,
  login,
  markApplicationAsApplied,
  register,
  storeToken,
  uploadResume,
} from './services/api.js';

const DEFAULT_FILTERS = {
  status: 'not_applied',
  source: 'all',
  timeframe: 'all',
  sort: 'recent',
  keyword: 'all',
};

const APPLICATIONS_PER_PAGE = 10;
const COMPANIES_PER_PAGE = 10;
const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

export default function App() {
  const [authToken, setAuthTokenState] = useState(() => getStoredToken());
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState('');

  const [applicationsPage, setApplicationsPage] = useState(1);

  const [resume, setResume] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [resumeError, setResumeError] = useState('');
  const [resumeUploading, setResumeUploading] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState('');

  const [companiesPage, setCompaniesPage] = useState(1);
  const [companySearch, setCompanySearch] = useState('');

  const [keywordOptions, setKeywordOptions] = useState(['all']);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [keywordsError, setKeywordsError] = useState('');

  const [pendingApplication, setPendingApplication] = useState(null);
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);
  const [applyConfirmationLoading, setApplyConfirmationLoading] = useState(false);

  const pendingApplicationRef = useRef(null);
  useEffect(() => {
    pendingApplicationRef.current = pendingApplication;
  }, [pendingApplication]);

  useEffect(() => {
    if (!authToken) {
      return undefined;
    }

    const handleFocus = () => {
      if (pendingApplicationRef.current) {
        setShowApplyPrompt(true);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && pendingApplicationRef.current) {
        setShowApplyPrompt(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [authToken]);

  useEffect(() => {
    if (!showApplyPrompt) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowApplyPrompt(false);
        setPendingApplication(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showApplyPrompt]);

  const handleLogout = useCallback((message = '') => {
    clearStoredToken();
    setAuthTokenState(null);
    setAuthError(message);
    setAuthLoading(false);
    setFilters(DEFAULT_FILTERS);
    setApplications([]);
    setApplicationsError('');
    setApplicationsLoading(false);
    setApplicationsPage(1);
    setResume(null);
    setResumeError('');
    setResumeLoading(false);
    setResumeUploading(false);
    setCompanies([]);
    setCompaniesError('');
    setCompaniesLoading(false);
    setCompaniesPage(1);
    setCompanySearch('');
    setKeywordOptions(['all']);
    setKeywordsError('');
    setKeywordsLoading(false);
    setPendingApplication(null);
    pendingApplicationRef.current = null;
    setShowApplyPrompt(false);
    setApplyConfirmationLoading(false);
  }, []);

  const sourceOptions = useMemo(() => {
    const options = new Set(['all']);
    applications.forEach((application) => {
      if (application.source) {
        options.add(application.source);
      }
    });
    if (filters.source !== 'all' && filters.source) {
      options.add(filters.source);
    }
    return Array.from(options);
  }, [applications, filters.source]);

  const refreshKeywords = useCallback(async () => {
    setKeywordsLoading(true);
    setKeywordsError('');
    try {
      const data = (await getApplicationKeywords()) ?? [];
      const normalized = Array.isArray(data)
        ? data.filter((item) => typeof item === 'string' && item.trim().length > 0)
        : [];
      normalized.sort((a, b) => a.localeCompare(b));
      setKeywordOptions(['all', ...normalized]);
    } catch (error) {
      console.error(error);
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        handleLogout(SESSION_EXPIRED_MESSAGE);
        return;
      }
      setKeywordOptions(['all']);
      setKeywordsError('Unable to load keywords.');
    } finally {
      setKeywordsLoading(false);
    }
  }, [handleLogout]);

  const refreshApplications = useCallback(async () => {
    setApplicationsLoading(true);
    setApplicationsError('');
    try {
      const data = (await getApplications(filters)) ?? [];
      setApplications(Array.isArray(data) ? data : []);
      await refreshKeywords();
    } catch (error) {
      console.error(error);
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        handleLogout(SESSION_EXPIRED_MESSAGE);
        return;
      }
      setApplications([]);
      setApplicationsError(error instanceof Error ? error.message : 'Unable to load applications.');
    } finally {
      setApplicationsLoading(false);
    }
  }, [filters, refreshKeywords, handleLogout]);

  const refreshResume = useCallback(async () => {
    setResumeLoading(true);
    setResumeError('');
    try {
      const data = await getResume();
      setResume(data);
    } catch (error) {
      console.error(error);
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        handleLogout(SESSION_EXPIRED_MESSAGE);
        return;
      }
      setResume(null);
      setResumeError(error instanceof Error ? error.message : 'Unable to load resume details.');
    } finally {
      setResumeLoading(false);
    }
  }, [handleLogout]);

  const refreshCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    setCompaniesError('');
    try {
      const data = (await getCompanies()) ?? [];
      setCompanies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        handleLogout(SESSION_EXPIRED_MESSAGE);
        return;
      }
      setCompanies([]);
      setCompaniesError(error instanceof Error ? error.message : 'Unable to load companies.');
    } finally {
      setCompaniesLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    if (!authToken) {
      return;
    }
    refreshResume();
    refreshCompanies();
  }, [authToken, refreshResume, refreshCompanies]);

  useEffect(() => {
    if (!authToken) {
      return;
    }
    refreshApplications();
  }, [authToken, refreshApplications]);

  const handleFilterChange = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    if (name !== 'sort') {
      setApplicationsPage(1);
    }
  };

  const handleResumeUpload = async (file) => {
    setResumeUploading(true);
    setResumeError('');
    try {
      const data = await uploadResume(file);
      setResume(data);
      await refreshApplications();
    } catch (error) {
      console.error(error);
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        handleLogout(SESSION_EXPIRED_MESSAGE);
        return;
      }
      setResumeError(error instanceof Error ? error.message : 'Failed to upload resume.');
    } finally {
      setResumeUploading(false);
      setResumeLoading(false);
    }
  };

  const handleApply = (application) => {
    if (!application?.apply_link) {
      return;
    }

    window.open(application.apply_link, '_blank', 'noopener');
    setPendingApplication(application);
    setShowApplyPrompt(false);
  };

  const handleApplyConfirmation = async () => {
    if (!pendingApplication?.id) {
      setShowApplyPrompt(false);
      setPendingApplication(null);
      return;
    }

    setApplyConfirmationLoading(true);
    try {
      await markApplicationAsApplied(pendingApplication.id);
      await refreshApplications();
      await refreshCompanies();
      setShowApplyPrompt(false);
      setPendingApplication(null);
    } catch (error) {
      console.error(error);
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        handleLogout(SESSION_EXPIRED_MESSAGE);
      } else {
        window.alert(error instanceof Error ? error.message : 'Unable to mark application as applied. Please try again.');
      }
    } finally {
      setApplyConfirmationLoading(false);
    }
  };

  const handleApplyDismiss = () => {
    setShowApplyPrompt(false);
    setPendingApplication(null);
  };

  const handleAuthModeChange = () => {
    setAuthError('');
  };

  const handleAuthenticate = async (credentials, mode) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const action = mode === 'register' ? register : login;
      const response = await action(credentials);
      if (!response || typeof response.token !== 'string') {
        throw new Error('Authentication response did not include a token.');
      }

      storeToken(response.token);
      setAuthTokenState(response.token);
      setFilters(DEFAULT_FILTERS);
      setApplicationsPage(1);
      setCompaniesPage(1);
      setCompanySearch('');
      setKeywordOptions(['all']);
      setKeywordsError('');
      setApplications([]);
      setApplicationsError('');
      setApplicationsLoading(true);
      setCompanies([]);
      setCompaniesError('');
      setCompaniesLoading(true);
      setResume(null);
      setResumeError('');
      setResumeLoading(true);
      setKeywordsLoading(true);
      setResumeUploading(false);
      setApplyConfirmationLoading(false);
      pendingApplicationRef.current = null;
      setPendingApplication(null);
      setShowApplyPrompt(false);
    } catch (error) {
      console.error(error);
      clearStoredToken();
      setAuthTokenState(null);
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setAuthError('Invalid username or password.');
        } else if (error.status === 409) {
          setAuthError('Username already exists.');
        } else if (error.status === 400) {
          setAuthError(error.message || 'Please provide a username and password.');
        } else {
          setAuthError(error.message || 'Authentication failed. Please try again.');
        }
      } else if (error instanceof Error) {
        setAuthError(error.message);
      } else {
        setAuthError('Authentication failed. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (filters.keyword !== 'all' && !keywordOptions.some((keyword) => keyword.toLowerCase() === filters.keyword.toLowerCase())) {
      setFilters((current) => ({ ...current, keyword: 'all' }));
      setApplicationsPage(1);
    }
  }, [filters.keyword, keywordOptions]);

  const applicationPageCount = useMemo(() => {
    return Math.max(1, Math.ceil(applications.length / APPLICATIONS_PER_PAGE));
  }, [applications.length]);

  useEffect(() => {
    if (applicationsPage > applicationPageCount) {
      setApplicationsPage(applicationPageCount);
    }
  }, [applicationsPage, applicationPageCount]);

  const paginatedApplications = useMemo(() => {
    if (!applications.length) {
      return [];
    }
    const start = (applicationsPage - 1) * APPLICATIONS_PER_PAGE;
    return applications.slice(start, start + APPLICATIONS_PER_PAGE);
  }, [applications, applicationsPage]);

  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) {
      return companies;
    }
    const search = companySearch.trim().toLowerCase();
    return companies.filter((company) => {
      const name = company.company?.toLowerCase() ?? '';
      const career = company.career_site?.toLowerCase() ?? '';
      return name.includes(search) || career.includes(search);
    });
  }, [companies, companySearch]);

  const companyPageCount = useMemo(() => {
    return Math.max(1, Math.ceil(filteredCompanies.length / COMPANIES_PER_PAGE));
  }, [filteredCompanies.length]);

  useEffect(() => {
    if (companiesPage > companyPageCount) {
      setCompaniesPage(companyPageCount);
    }
  }, [companiesPage, companyPageCount]);

  useEffect(() => {
    setCompaniesPage(1);
  }, [companySearch]);

  const paginatedCompanies = useMemo(() => {
    if (!filteredCompanies.length) {
      return [];
    }
    const start = (companiesPage - 1) * COMPANIES_PER_PAGE;
    return filteredCompanies.slice(start, start + COMPANIES_PER_PAGE);
  }, [filteredCompanies, companiesPage]);

  if (!authToken) {
    return (
      <div className="app-shell unauthenticated">
        <header className="app-header">
          <h1>HiringCafe Job Watcher</h1>
        </header>
        <main className="app-main narrow">
          <AuthForm
            onAuthenticate={handleAuthenticate}
            onModeChange={handleAuthModeChange}
            isLoading={authLoading}
            error={authError}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>HiringCafe Job Watcher</h1>
        <div className="header-actions">
          <button type="button" className="button secondary" onClick={() => handleLogout()}>
            Sign out
          </button>
        </div>
      </header>
      <main className="app-main">
        <ResumeUpload
          resume={resume}
          isLoading={resumeLoading}
          isUploading={resumeUploading}
          error={resumeError}
          onUpload={handleResumeUpload}
        />
        <div className="card">
          <Filters
            filters={filters}
            sourceOptions={sourceOptions}
            keywordOptions={keywordOptions}
            keywordsLoading={keywordsLoading}
            keywordsError={keywordsError}
            onChange={handleFilterChange}
          />
        </div>
        <ApplicationsTable
          applications={paginatedApplications}
          totalCount={applications.length}
          isLoading={applicationsLoading}
          error={applicationsError}
          currentPage={applicationsPage}
          pageCount={applicationPageCount}
          pageSize={APPLICATIONS_PER_PAGE}
          onPageChange={setApplicationsPage}
          onApply={handleApply}
        />
        <CompaniesTable
          companies={paginatedCompanies}
          totalCount={filteredCompanies.length}
          isLoading={companiesLoading}
          error={companiesError}
          search={companySearch}
          onSearchChange={setCompanySearch}
          currentPage={companiesPage}
          pageCount={companyPageCount}
          pageSize={COMPANIES_PER_PAGE}
          onPageChange={setCompaniesPage}
        />
      </main>
      {showApplyPrompt && pendingApplication ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="apply-prompt-title">
            <h3 id="apply-prompt-title">Have you applied?</h3>
            <p>
              Mark <strong>{pendingApplication.job_title}</strong>
              {pendingApplication.company ? ` at ${pendingApplication.company}` : ''} as applied?
            </p>
            <div className="modal-actions">
              <button type="button" className="button secondary" onClick={handleApplyDismiss}>
                Not yet
              </button>
              <button
                type="button"
                className="button primary"
                onClick={handleApplyConfirmation}
                disabled={applyConfirmationLoading}
              >
                {applyConfirmationLoading ? 'Saving…' : 'Yes, mark as applied'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
