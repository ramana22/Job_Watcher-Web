import { useState } from 'react';

function formatTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function ResumeUpload({ resume, isLoading, isUploading, error, onUpload }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }
    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
    } catch (uploadError) {
      // Allow retry without clearing the selected file when an error occurs
      console.error(uploadError);
    }
  };

  return (
    <div className="card">
      <div>
        <h2>Resume</h2>
        {isLoading ? (
          <p className="status-message">Loading resume information…</p>
        ) : resume ? (
          <p className="status-message">
            Active resume: <strong>{resume.filename}</strong>
            {resume.uploaded_at && ` (uploaded ${formatTimestamp(resume.uploaded_at)})`}
          </p>
        ) : (
          <p className="status-message">No resume uploaded yet.</p>
        )}
        {error && (
          <p className="error-state" role="alert">
            {error}
          </p>
        )}
      </div>
      <form className="resume-upload" onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".txt"
          disabled={isUploading}
          onChange={(event) => {
            setSelectedFile(event.target.files?.[0] ?? null);
          }}
        />
        <button type="submit" disabled={!selectedFile || isUploading}>
          {isUploading ? 'Uploading…' : 'Upload Resume'}
        </button>
      </form>
    </div>
  );
}
