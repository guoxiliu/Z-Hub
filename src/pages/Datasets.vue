<script setup>
import { ref, onMounted } from 'vue';

const datasets = ref([]);
const loading = ref(false);
const error = ref('');

function repoFromEnvOrGuess() {
  // Accept full URL or owner/repo in VITE_GITHUB_REPO
  const raw = import.meta.env.VITE_GITHUB_REPO;
  if (raw) {
    if (/^https?:\/\//i.test(raw)) {
      try {
        const u = new URL(raw);
        const parts = u.pathname.split('/').filter(Boolean);
        if (u.hostname.includes('github.com') && parts.length >= 2) {
          return `${parts[0]}/${parts[1]}`;
        }
      } catch {}
    }
    if (/^[^/]+\/[^/]+$/.test(raw)) return raw;
  }
  try {
    const { hostname, pathname } = window.location;
    if (hostname.endsWith('github.io')) {
      const owner = hostname.split('.')[0];
      const parts = (import.meta.env.BASE_URL || pathname).split('/').filter(Boolean);
      const repo = parts[0];
      if (owner && repo) return `${owner}/${repo}`;
    }
  } catch {}
  return '';
}

const repoSlug = ref(repoFromEnvOrGuess());

async function loadDatasets() {
  loading.value = true;
  error.value = '';

  // Build candidate URLs that work in dev and on GitHub Pages
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$|^$/, '/');
  const candidates = Array.from(
    new Set([
      `${base}datasets.json`, // preferred (respects Vite base)
      '/datasets.json', // absolute root fallback
      'datasets.json', // relative fallback
    ]),
  ).map((u) => `${u}${u.includes('?') ? '' : `?ts=${Date.now()}`}`); // cache-bust

  const tryFetch = (url, ms = 6000) =>
    new Promise(async (resolve, reject) => {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), ms);
      try {
        const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
        if (!res.ok) return reject(new Error(`HTTP ${res.status} @ ${url}`));
        const data = await res.json().catch(() => reject(new Error(`Invalid JSON @ ${url}`)));
        clearTimeout(to);
        resolve(data);
      } catch (e) {
        clearTimeout(to);
        reject(e);
      }
    });

  let lastErr;
  for (const url of candidates) {
    try {
      const data = await tryFetch(url);
      datasets.value = Array.isArray(data) ? data : [];
      lastErr = undefined;
      break;
    } catch (e) {
      console.warn('datasets.json fetch failed:', e);
      lastErr = e;
    }
  }

  if (lastErr) {
    error.value = 'Failed to load datasets. Please try again later.';
  }

  loading.value = false;
}

onMounted(loadDatasets);

const uploadForm = ref({ name: '', description: '', tags: '', links: '', size: '' });

function buildIssueUrl() {
  const repo = repoSlug.value;
  const base = repo ? `https://github.com/${repo}/issues/new` : 'https://github.com/new';
  const title = `[Dataset] Contributing ${uploadForm.value.name || ''}`;
  const body = [
    '### Dataset name',
    uploadForm.value.name || '',
    '',
    '### Description',
    uploadForm.value.description || '',
    '',
    '### Data URL(s)',
    uploadForm.value.links || '',
    '',
    '### Size',
    uploadForm.value.size || '',
    '',
    '### Tags',
    uploadForm.value.tags || '',
    '',
    '_Submitted via Z-Hub site_',
  ].join('\n');
  const params = new URLSearchParams({
    title,
    body,
    labels: 'dataset',
  });
  return `${base}?${params.toString()}`;
}

function resetForm() {
  uploadForm.value = { name: '', description: '', tags: '', links: '', size: '' };
}

function openIssue() {
  const url = buildIssueUrl();
  // Immediately open in a new tab from the user gesture and then reset form
  window.open(url, '_blank', 'noopener');
  resetForm();
}

function hostname(lnk) {
  try {
    return new URL(lnk).hostname;
  } catch {
    try {
      // Fallback: extract host-like part
      const m = String(lnk).match(/^[a-z]+:\/\/([^\/]+)/i);
      return m ? m[1] : lnk;
    } catch {
      return lnk;
    }
  }
}
</script>

<template>
  <div class="container py-5">
    <h2 class="mb-3">Datasets</h2>
    <p class="text-muted mb-3">
      Explore datasets for testing, benchmarking, and experimentation. Community submissions are
      handled via GitHub Issues. <br />
      Note: Please host your files externally (e.g., OneDrive, Google Drive, OSF, S3) and share the
      links.
    </p>

    <div class="row g-4 mb-5">
      <div class="col-lg-8">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h4 class="mb-0">Community datasets</h4>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-secondary" :disabled="loading" @click="loadDatasets">
              <span v-if="!loading">Reload list</span>
              <span
                v-else
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
            </button>
            <button
              class="btn btn-primary"
              data-bs-toggle="modal"
              data-bs-target="#uploadDatasetModal"
            >
              Submit a dataset
            </button>
          </div>
        </div>

        <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

        <div v-if="datasets.length" class="list-group">
          <div class="list-group-item" v-for="d in datasets" :key="d.id || d.name">
            <div class="d-flex w-100 justify-content-between">
              <h5 class="mb-1">{{ d.name }}</h5>
              <small class="text-muted" v-if="d.size">{{ d.size }}</small>
            </div>
            <p class="mb-2" v-if="d.description">{{ d.description }}</p>
            <div class="mb-2" v-if="d.links && d.links.length">
              <span class="me-2 fw-semibold">Links:</span>
              <span v-for="(lnk, idx) in d.links" :key="idx">
                <a :href="lnk" target="_blank" rel="noopener">{{ hostname(lnk) }}</a>
                <span v-if="idx < d.links.length - 1" class="text-muted"> | </span>
              </span>
            </div>
            <div>
              <span v-for="t in d.tags || []" :key="t" class="badge bg-secondary me-1">{{
                t
              }}</span>
            </div>
          </div>
        </div>
        <div v-else-if="!loading" class="alert alert-info" role="alert">
          No community datasets yet. Be the first to share yours!
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card shadow-sm sdrbench-card">
          <div class="card-body">
            <h5 class="card-title">SDRBench</h5>
            <p class="card-text">
              Browse a large collection of scientific datasets curated for compression research.
            </p>
            <a
              href="https://sdrbench.github.io/"
              target="_blank"
              rel="noopener"
              class="btn btn-outline-success"
              >Open SDRBench</a
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Submit Modal (GitHub Issue powered) -->
    <div
      class="modal fade"
      id="uploadDatasetModal"
      tabindex="-1"
      aria-labelledby="uploadDatasetModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="uploadDatasetModalLabel">Submit a dataset (via GitHub)</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <form @submit.prevent="submitUpload">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Dataset name</label>
                <input
                  v-model="uploadForm.name"
                  type="text"
                  class="form-control"
                  placeholder="e.g., Climate-ERA5-Subset"
                  required
                />
              </div>
              <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea
                  v-model="uploadForm.description"
                  rows="3"
                  class="form-control"
                  placeholder="Short description..."
                  required
                ></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label">Data URL(s)</label>
                <textarea
                  v-model="uploadForm.links"
                  rows="2"
                  class="form-control"
                  placeholder="One or more URLs, separated by spaces or new lines"
                  required
                ></textarea>
                <div class="form-text">
                  Host on Box, OneDrive, Google Drive, OSF, S3, etc. We will link to your data;
                  files are not uploaded here.
                </div>
              </div>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Size</label>
                  <input
                    v-model="uploadForm.size"
                    type="text"
                    class="form-control"
                    placeholder="e.g., 2.1 GB"
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Tags</label>
                  <input
                    v-model="uploadForm.tags"
                    type="text"
                    class="form-control"
                    placeholder="comma,separated,tags"
                  />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <a
                v-if="repoSlug"
                class="me-auto small"
                :href="`https://github.com/${repoSlug}/issues/new?template=dataset_submission.yml`"
                target="_blank"
                rel="noopener"
                >Create an issue on GitHub instead</a
              >
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-success"
                data-bs-dismiss="modal"
                @click="openIssue"
              >
                Open GitHub Issue
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sdrbench-card {
  height: 200px; /* reasonable fixed height */
  overflow: auto; /* scroll if content exceeds */
}
</style>
