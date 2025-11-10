import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ApplicationsTable from './components/ApplicationsTable.jsx';
import CompaniesTable from './components/CompaniesTable.jsx';
import Filters from './components/Filters.jsx';
import ResumeUpload from './components/ResumeUpload.jsx';
import {
  getApplications,
  getCompanies,
  getResume,
  markApplicationAsApplied,
  uploadResume,
} from './services/api.js';

const DEFAULT_FILTERS = {
  status: 'not_applied',
  source: 'all',
  timeframe: 'all',
  sort: 'recent',
};

export default function App() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState('');

  const [resume, setResume] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [resumeError, setResumeError] = useState('');
  const [resumeUploading, setResumeUploading] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState('');

  const [pendingApplication, setPendingApplication] = useState(null);
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);
  const [applyConfirmationLoading, setApplyConfirmationLoading] = useState(false);

  const pendingApplicationRef = useRef(null);
  useEffect(() => {
    pendingApplicationRef.current = pendingApplication;
  }, [pendingApplication]);

  useEffect(() => {
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
  }, []);

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

  const refreshApplications = useCallback(async () => {
    setApplicationsLoading(true);
    setApplicationsError('');
    try {
      const data = (await getApplications(filters)) ?? [];
      setApplications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setApplications([]);
      setApplicationsError(error instanceof Error ? error.message : 'Unable to load applications.');
    } finally {
      setApplicationsLoading(false);
    }
  }, [filters]);

  const refreshResume = useCallback(async () => {
    setResumeLoading(true);
    setResumeError('');
    try {
      const data = await getResume();
      setResume(data);
    } catch (error) {
      console.error(error);
      setResume(null);
      setResumeError(error instanceof Error ? error.message : 'Unable to load resume details.');
    } finally {
      setResumeLoading(false);
    }
  }, []);

  const refreshCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    setCompaniesError('');
    try {
      const data = (await getCompanies()) ?? [];
      setCompanies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setCompanies([]);
      setCompaniesError(error instanceof Error ? error.message : 'Unable to load companies.');
    } finally {
      setCompaniesLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshResume();
    refreshCompanies();
  }, [refreshResume, refreshCompanies]);

  useEffect(() => {
    refreshApplications();
  }, [refreshApplications]);

  const handleFilterChange = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
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
      setResumeError(error instanceof Error ? error.message : 'Failed to upload resume.');
      throw error;
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
      window.alert('Unable to mark application as applied. Please try again.');
    } finally {
      setApplyConfirmationLoading(false);
    }
  };

  const handleApplyDismiss = () => {
    setShowApplyPrompt(false);
    setPendingApplication(null);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>HiringCafe Job Watcher</h1>
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
          <Filters filters={filters} sourceOptions={sourceOptions} onChange={handleFilterChange} />
        </div>
        <ApplicationsTable
          applications={applications}
          isLoading={applicationsLoading}
          error={applicationsError}
          onApply={handleApply}
        />
        <CompaniesTable companies={companies} isLoading={companiesLoading} error={companiesError} />
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
