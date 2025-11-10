const API_BASE_URL = (window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1"))
  ? "http://localhost:5000"
  : window.location.origin;

const tableBody = document.querySelector("#applications-table tbody");
const companiesBody = document.querySelector("#companies-table tbody");
const statusFilter = document.querySelector("#status-filter");
const sourceFilter = document.querySelector("#source-filter");
const timeframeFilter = document.querySelector("#timeframe-filter");
const sortFilter = document.querySelector("#sort-filter");
const resumeInfo = document.querySelector("#resume-info");
const resumeForm = document.querySelector("#resume-form");
const resumeFileInput = document.querySelector("#resume-file");

let currentApplications = [];

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function truncate(text, length = 160) {
  if (!text) return "—";
  return text.length > length ? `${text.substring(0, length)}…` : text;
}

function renderApplications() {
  tableBody.innerHTML = "";
  currentApplications.forEach((application) => {
    const row = document.createElement("tr");
    const score =
      typeof application.matching_score === "number" && !Number.isNaN(application.matching_score)
        ? application.matching_score.toFixed(2)
        : "0.00";
    row.innerHTML = `
      <td>${application.job_id}</td>
      <td>${application.job_title}</td>
      <td>${application.company}</td>
      <td>${application.location ?? "—"}</td>
      <td>${application.salary ?? "—"}</td>
      <td>${truncate(application.description)}</td>
      <td class="apply-cell"></td>
      <td>${application.search_key ?? "—"}</td>
      <td>${formatDate(application.posted_time)}</td>
      <td>${application.source}</td>
      <td>${score}%</td>
      <td><span class="badge ${application.status}">${application.status.replace("_", " ")}</span></td>
    `;

    const applyCell = row.querySelector(".apply-cell");
    if (application.apply_link) {
      const link = document.createElement("a");
      link.href = application.apply_link;
      link.textContent = "Apply";
      link.target = "_blank";
      link.rel = "noopener";
      link.className = "button-link";
      link.addEventListener("click", async (event) => {
        event.preventDefault();
        const proceed = window.confirm("Open the apply link and move this job to the applied list?");
        if (!proceed) return;
        try {
          await markApplicationAsApplied(application.id);
          window.open(application.apply_link, "_blank", "noopener");
        } catch (error) {
          console.error(error);
          alert("Unable to mark application as applied. Please try again.");
        }
      });
      applyCell.appendChild(link);
    } else {
      applyCell.textContent = "—";
    }

    tableBody.appendChild(row);
  });
}

function populateSourceFilter(applications) {
  const uniqueSources = new Set(["all"]);
  applications.forEach((app) => {
    if (app.source) uniqueSources.add(app.source);
  });
  const previousValue = sourceFilter.value;
  sourceFilter.innerHTML = "";
  uniqueSources.forEach((source) => {
    const option = document.createElement("option");
    option.value = source;
    option.textContent = source === "all" ? "All Sources" : source;
    sourceFilter.appendChild(option);
  });
  if (uniqueSources.has(previousValue)) {
    sourceFilter.value = previousValue;
  }
}

async function fetchApplications() {
  const params = new URLSearchParams({
    status: statusFilter.value,
    source: sourceFilter.value,
    timeframe: timeframeFilter.value,
    sort: sortFilter.value,
  });
  const response = await fetch(`${API_BASE_URL}/api/applications?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch applications");
  }
  const data = await response.json();
  currentApplications = Array.isArray(data) ? data : [];
  populateSourceFilter(currentApplications);
  renderApplications();
  await fetchCompanies();
}

async function fetchResume() {
  const response = await fetch(`${API_BASE_URL}/api/resume`);
  if (!response.ok) {
    resumeInfo.textContent = "Unable to load resume details.";
    return;
  }
  const data = await response.json();
  if (!data) {
    resumeInfo.textContent = "No resume uploaded yet.";
  } else {
    resumeInfo.textContent = `Active resume: ${data.filename} (uploaded ${new Date(data.uploaded_at).toLocaleString()})`;
  }
}

async function fetchCompanies() {
  const response = await fetch(`${API_BASE_URL}/api/companies`);
  if (!response.ok) {
    companiesBody.innerHTML = '<tr><td colspan="2">Unable to load companies.</td></tr>';
    return;
  }
  const companies = await response.json();
  companiesBody.innerHTML = "";
  companies.forEach((company) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${company.company}</td>
      <td>${company.career_site ? `<a href="${company.career_site}" target="_blank" rel="noopener">${company.career_site}</a>` : "—"}</td>
    `;
    companiesBody.appendChild(row);
  });
}

async function markApplicationAsApplied(id) {
  const response = await fetch(`${API_BASE_URL}/api/applications/${id}/apply`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to mark application as applied");
  }
  await fetchApplications();
}

resumeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = resumeFileInput.files?.[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);
  const button = resumeForm.querySelector("button");
  button.disabled = true;
  button.textContent = "Uploading...";
  try {
    const response = await fetch(`${API_BASE_URL}/api/resume`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error("Failed to upload resume");
    }
    await fetchResume();
    await fetchApplications();
    resumeFileInput.value = "";
  } catch (error) {
    console.error(error);
    alert("Unable to upload resume. Only UTF-8 text files are supported in this demo.");
  } finally {
    button.disabled = false;
    button.textContent = "Upload Resume";
  }
});

[statusFilter, sourceFilter, timeframeFilter, sortFilter].forEach((filter) => {
  filter.addEventListener("change", () => {
    fetchApplications().catch((error) => console.error(error));
  });
});

fetchResume().catch((error) => console.error(error));
fetchApplications().catch((error) => {
  console.error(error);
  tableBody.innerHTML = '<tr><td colspan="12">Unable to load applications.</td></tr>';
});
fetchCompanies().catch((error) => console.error(error));
