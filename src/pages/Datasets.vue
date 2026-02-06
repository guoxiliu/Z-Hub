<script setup>
import { ref, onMounted, computed } from 'vue';

const communityDatasets = ref([]);
const sdrbenchDatasets = ref([]);

const loading = ref(false);
const error = ref(''); // community error
const sdrError = ref(''); // sdrbench error

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

async function loadCommunityDatasets() {
  // Load community datasets from public/datasets.json (with Vite base fallbacks)
  error.value = '';
  // Build candidate URLs that work in dev and on GitHub Pages
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/g, '/').replace(/^$/g, '/');
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
      communityDatasets.value = Array.isArray(data) ? data : [];
      lastErr = undefined;
      break;
    } catch (e) {
      console.warn('datasets.json fetch failed:', e);
      lastErr = e;
    }
  }

  if (lastErr) {
    error.value = 'Failed to load community datasets. Please try again later.';
  }
}

function slugifyId(s) {
  return `sdrgrp-${String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;
}
function safeGroupId(name) {
  return `collapse-${slugifyId(name || 'uncategorized')}`;
}
function inferCategoryFromName(name = '') {
  const n = String(name).toLowerCase();
  if (/climate|cesm|era|atm|weather|ncar/.test(n)) return 'Climate/Weather';
  if (/hurricane|isabel/.test(n)) return 'Hurricane';
  if (/nyx|cosmology/.test(n)) return 'Cosmology';
  if (/miranda|combustion|s3d/.test(n)) return 'Combustion';
  if (/hacc|particle/.test(n)) return 'Particles';
  if (/exafel|lcls|xrd/.test(n)) return 'Light source';
  if (/md|molecular|protein|atom/.test(n)) return 'Molecular Dynamics';
  return 'Uncategorized';
}

async function loadSdrbenchDatasets() {
  // Use embedded SDRBench list; optionally override from JSON if available
  sdrError.value = '';
  try {
    sdrbenchDatasets.value = Array.isArray(SDRBENCH_EMBEDDED) ? SDRBENCH_EMBEDDED : [];
  } catch (e) {
    console.warn('Failed to set embedded SDRBench list:', e);
    sdrbenchDatasets.value = [];
  }

  // Optional: try to override from public/sdrbench-datasets.json so it can be updated without rebuild
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/g, '/').replace(/^$/g, '/');
  const candidates = Array.from(
    new Set([
      `${base}sdrbench-datasets.json`,
      '/sdrbench-datasets.json',
      'sdrbench-datasets.json',
    ]),
  ).map((u) => `${u}${u.includes('?') ? '' : `?ts=${Date.now()}`}`);

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

  for (const url of candidates) {
    try {
      const data = await tryFetch(url);
      if (Array.isArray(data) && data.length) {
        sdrbenchDatasets.value = data;
      }
      break; // stop on first success
    } catch (e) {
      // Non-fatal; keep embedded data
      console.warn('Optional sdrbench-datasets.json fetch failed:', e);
    }
  }
}

async function loadAll() {
  loading.value = true;
  await Promise.allSettled([loadCommunityDatasets(), loadSdrbenchDatasets()]);
  loading.value = false;
}

onMounted(loadAll);

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

    <div class="d-flex justify-content-end mb-3">
      <button class="btn btn-outline-secondary" :disabled="loading" @click="loadAll">
        <span v-if="!loading">Reload lists</span>
        <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      </button>
    </div>

    <div class="accordion" id="datasetsAccordion">
      <!-- SDRBench category (expanded by default) -->
      <div class="accordion-item">
        <h2 class="accordion-header" id="heading-sdr">
          <button
            class="accordion-button fs-5"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapse-sdr"
            aria-expanded="true"
            aria-controls="collapse-sdr"
          >
            SDRBench datasets
          </button>
        </h2>
        <div
          id="collapse-sdr"
          class="accordion-collapse collapse show"
          aria-labelledby="heading-sdr"
        >
          <div class="accordion-body">
            <div v-if="sdrError" class="alert alert-warning" role="alert">{{ sdrError }}</div>

            <!-- Important Note about SDRBench Usage -->
            <div class="alert alert-info mb-4" role="alert">
              <h6 class="alert-heading fw-bold mb-3">Important: When publishing results from one or more datasets presented in this webpage, please:</h6>
              <ul class="mb-0">
                <li class="mb-2">
                  <strong>Cite:</strong> SDRBench: <a href="https://sdrbench.github.io" target="_blank" rel="noopener" class="alert-link">https://sdrbench.github.io</a>
                </li>
                <li class="mb-2">
                  <strong>Please also cite:</strong> K. Zhao, S. Di, X. Liang, S. Li, D. Tao, J. Bessac, Z. Chen, and F. Cappello, "SDRBench: Scientific Data Reduction Benchmark for Lossy Compressors", International Workshop on Big Data Reduction (IWBDR2020), in conjunction with IEEE Bigdata20.
                </li>
                <li class="mb-2">
                  <strong>Acknowledge:</strong> the source of the dataset you used, the DOE NNSA ECP project, and the ECP CODAR project.
                </li>
                <li class="mb-2">
                  <strong>Check:</strong> the condition of publications (some dataset sources request prior check)
                </li>
                <li class="mb-2">
                  <strong>Contact:</strong> the compressor authors to get the correct compressor configuration according to each dataset and each comparison metrics.
                </li>
                <li>
                  <strong>Dimension:</strong> the order of the dimensions shown in the 'Format' column of the table is in row-major order (aka. C order), which is consistent with well-known I/O libraries such as HDF5. For example, for the CESM-ATM dataset (1800 × 3600), 1800 is higher dimension (changing slower) and 3600 is lower dimension (changing faster). For most compressors (such as SZ, ZFP and FPZIP), the dimensions should be given in the reverse order (such as <code>-2 3600 1800</code>) for their executables. If you are not sure about the order of dimension, one simple method is trying different dimension orders and selecting the results with highest compression ratios.
                </li>
              </ul>
            </div>

            <!-- Original SDRBench table (sanitized) -->
            <div class="table-responsive mb-4">
              <table class="table table-bordered align-middle" style="min-width: 1000px;">
                <thead>
                  <tr>
                    <th class="text-center" style="width: 194px; color:#0070c0;">Name</th>
                    <th class="text-center" style="width: 121px; color:#0070c0;">Type</th>
                    <th class="text-center" style="width: 297px; color:#0070c0;">Format</th>
                    <th class="text-center" style="width: 116px; color:#0070c0;">Size (data)</th>
                    <th class="text-center" style="width: 89px; color:#0070c0;">Link</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- CESM-ATM row -->
                  <tr>
                    <td>
                      <div class="fw-semibold text-center">CESM-ATM</div>
                      <div class="text-center small text-muted mb-2">High-resolution atmospheric data from climate simulations with multiple 2D/3D fields</div>
                      <div class="text-center small"><em>Source:</em></div>
                      <div class="text-center small"><em>Mark Taylor (SNL)</em></div>
                    </td>
                    <td class="text-center">Climate simulation</td>
                    <td>
                      <div class="text-center">Dataset1: 79 fields: 2D, 1800 x 3600;</div>
                      <div class="text-center">Dataset2: 1 field: 3D, 26 x 1800 x 3600.</div>
                      <div class="text-center">Both are single precision, binary</div>
                      <div class="my-2">
                        <table class="table table-sm table-bordered mb-0">
                          <thead>
                            <tr>
                              <th style="width:58px"></th>
                              <th class="text-center">8 bit Entropy</th>
                              <th class="text-center">32 bit Entropy</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th scope="row">avg</th>
                              <td class="text-center">6.5</td>
                              <td class="text-center">19.8</td>
                            </tr>
                            <tr>
                              <th scope="row">min</th>
                              <td class="text-center">1.5</td>
                              <td class="text-center">2.3</td>
                            </tr>
                            <tr>
                              <th scope="row">max</th>
                              <td class="text-center">7.8</td>
                              <td class="text-center">22.6</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                    <td>
                      <div class="text-center">Dataset1 (raw): 1.47 GB</div>
                      <div class="text-center">Dataset1 (cleared): 1.47 GB</div>
                      <div class="text-center">Dataset2: 17 GB</div>
                      <div class="text-center small">(cleared data zeroed all background data)</div>
                    </td>
                    <td>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/CESM-ATM/SDRBENCH-CESM-ATM-1800x3600.tar.gz" target="_blank" rel="noopener">Dataset1 (raw)</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/CESM-ATM/SDRBENCH-CESM-ATM-cleared-1800x3600.tar.gz" target="_blank" rel="noopener">Dataset1 (cleared)</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/CESM-ATM/SDRBENCH-CESM-ATM-26x1800x3600.tar.gz" target="_blank" rel="noopener">Dataset2 (raw)</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/CESM-ATM/template_data.txt" target="_blank" rel="noopener">Metadata</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/CESM-ATM/SDRBENCH-CESM-ATM-cleared-1800x3600-property.txt" target="_blank" rel="noopener">Dataset1 property</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/CESM-ATM/SDRBENCH-CESM-ATM-26x1800x3600-property.txt" target="_blank" rel="noopener">Dataset2 property</a></div>
                    </td>
                  </tr>

                  <!-- EXAALT row -->
                  <tr>
                    <td>
                      <div class="fw-semibold text-center">EXAALT</div>
                      <div class="text-center small text-muted mb-2">Molecular dynamics simulation data with position and velocity fields</div>
                      <div class="text-center small"><em>Source:</em></div>
                      <div class="text-center small"><em>EXAALT team</em></div>
                      <div class="text-center small"><em>LA-UR-18-25670</em></div>
                    </td>
                    <td class="text-center">Molecular dynamics simulation</td>
                    <td>
                      <div class="text-center">6 fields: x,y,z,vx,vy,vz,</div>
                      <div class="text-center">Each field stored separately,</div>
                      <div class="text-center">Single precision, Binary, Little-endian</div>
                      <div class="my-2">
                        <table class="table table-sm table-bordered mb-0">
                          <thead>
                            <tr>
                              <th style="width:58px">Data1</th>
                              <th class="text-center">8 bit Entropy</th>
                              <th class="text-center">32 bit Entropy</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th scope="row">avg</th>
                              <td class="text-center">7.3</td>
                              <td class="text-center">19.9</td>
                            </tr>
                            <tr>
                              <th scope="row">min</th>
                              <td class="text-center">7</td>
                              <td class="text-center">18.4</td>
                            </tr>
                            <tr>
                              <th scope="row">max</th>
                              <td class="text-center">7.4</td>
                              <td class="text-center">20.4</td>
                            </tr>
                            <tr>
                              <th scope="row" colspan="3">Data2</th>
                            </tr>
                            <tr>
                              <th scope="row">avg</th>
                              <td class="text-center">6.7</td>
                              <td class="text-center">15.4</td>
                            </tr>
                            <tr>
                              <th scope="row">min</th>
                              <td class="text-center">6</td>
                              <td class="text-center">9.40</td>
                            </tr>
                            <tr>
                              <th scope="row">max</th>
                              <td class="text-center">7.1</td>
                              <td class="text-center">20.1</td>
                            </tr>
                            <tr>
                              <th scope="row" colspan="3">Data3</th>
                            </tr>
                            <tr>
                              <th scope="row">avg</th>
                              <td class="text-center">6.9</td>
                              <td class="text-center">16.3</td>
                            </tr>
                            <tr>
                              <th scope="row">min</th>
                              <td class="text-center">6.8</td>
                              <td class="text-center">15.6</td>
                            </tr>
                            <tr>
                              <th scope="row">max</th>
                              <td class="text-center">7.2</td>
                              <td class="text-center">17.6</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                    <td>
                      <div class="text-center">Dataset1: 60 MB</div>
                      <div class="text-center">Dataset2: 973 MB</div>
                      <div class="text-center">Dataset3: 2.4 GB</div>
                    </td>
                    <td class="small">
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAALT/SDRBENCH-EXAALT-2869440.tar.gz" target="_blank" rel="noopener">Dataset1</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAALT/SDRBENCH-EXAALT-2869440-template_data.txt" target="_blank" rel="noopener">Metadata1</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAALT/SDRBENCH-EXAALT-2869440-property.txt" target="_blank" rel="noopener">Property1</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAALT/SDRBENCH-exaalt-copper.tar.gz" target="_blank" rel="noopener">Dataset2</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAALT/SDRBENCH-exaalt-copper-template_data.txt" target="_blank" rel="noopener">Metadata2</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAALT/SDRBENCH-EXAALT-copper-property.txt" target="_blank" rel="noopener">Property2</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAALT/SDRBENCH-exaalt-helium.tar.gz" target="_blank" rel="noopener">Dataset3</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAALT/SDRBENCH-exaalt-helium-template_data.txt" target="_blank" rel="noopener">Metadata3</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAALT/SDRBENCH-EXAALT-helium-property.txt" target="_blank" rel="noopener">Property3</a></div>
                    </td>
                  </tr>

                  <!-- Hurricane ISABEL row -->
                  <tr>
                    <td>
                      <div class="fw-semibold text-center">Hurricane ISABEL</div>
                      <div class="text-center small text-muted mb-2">3D weather simulation data from Hurricane Isabel with multiple atmospheric variables</div>
                      <div class="text-center small"><em>Source:</em></div>
                      <div class="text-center small"><em><a href="http://vis.computer.org/vis2004contest/data.html" target="_blank" rel="noopener">vis2004contest</a></em></div>
                    </td>
                    <td class="text-center">Weather simulation</td>
                    <td>
                      <div class="text-center">13 fields: 3D, 100x500x500,</div>
                      <div class="text-center">single-precision, binary</div>
                      <div class="text-center small">(cleared dataset by replacing background by 0)</div>
                      <div class="my-2">
                        <table class="table table-sm table-bordered mb-0">
                          <thead>
                            <tr>
                              <th style="width:58px"></th>
                              <th class="text-center">8 bit Entropy</th>
                              <th class="text-center">32 bit Entropy</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th scope="row">avg</th>
                              <td class="text-center">5.9</td>
                              <td class="text-center">18.9</td>
                            </tr>
                            <tr>
                              <th scope="row">min</th>
                              <td class="text-center">0.7</td>
                              <td class="text-center">1.3</td>
                            </tr>
                            <tr>
                              <th scope="row">max</th>
                              <td class="text-center">7.5</td>
                              <td class="text-center">24.2</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                    <td class="text-center">1.25 GB</td>
                    <td class="small">
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/Hurricane-ISABEL/SDRBENCH-Hurricane-ISABEL-100x500x500.tar.gz" target="_blank" rel="noopener">Dataset</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/Hurricane-ISABEL/template_data.txt" target="_blank" rel="noopener">Metadata</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/Hurricane-ISABEL/SDRBENCH-Hurricane-ISABEL-100x500x500-property.txt" target="_blank" rel="noopener">Property</a></div>
                    </td>
                  </tr>

                  <!-- EXAFEL row -->
                  <tr>
                    <td>
                      <div class="fw-semibold text-center">EXAFEL</div>
                      <div class="text-center small text-muted mb-2">X-ray diffraction images from the LCLS light source instrument</div>
                      <div class="text-center small"><em>Source:</em></div>
                      <div class="text-center small"><em>LCLS</em></div>
                    </td>
                    <td class="text-center">Images from the LCLS instrument</td>
                    <td>
                      <div class="text-center">1 field: 2D,</div>
                      <div class="text-center">Single precision</div>
                      <div class="text-center">HDF5 and binary</div>
                      <div class="my-2">
                        <table class="table table-sm table-bordered mb-0">
                          <thead>
                            <tr>
                              <th class="text-center">8 bit Entropy</th>
                              <th class="text-center">32 bit Entropy</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td class="text-center">7.4</td>
                              <td class="text-center">25.7</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                    <td>
                      <div class="text-center">51 MB</div>
                      <div class="text-center">8.5 GB</div>
                      <div class="text-center">1 GB</div>
                    </td>
                    <td class="small">
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAFEL/SDRBENCH-EXAFEL-10x32x185x388.tar.gz" target="_blank" rel="noopener">Dataset1</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAFEL/SDRBENCH-EXAFEL-986x32x185x388.tar.gz" target="_blank" rel="noopener">Dataset2</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAFEL/template_data.txt" target="_blank" rel="noopener">Metadata</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAFEL/SDRBENCH-EXAFEL-986x32x185x388-property.txt" target="_blank" rel="noopener">Property</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAFEL/SDRBENCH-EXAFEL-130x1480x1552.tar.gz" target="_blank" rel="noopener">Dataset3</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXAFEL/template_data-exafel-130x1480x1552.txt" target="_blank" rel="noopener">Metadata3</a></div>
                    </td>
                  </tr>

                  <!-- HACC row -->
                  <tr>
                    <td>
                      <div class="fw-semibold text-center">HACC</div>
                      <div class="text-center small text-muted mb-2">Large-scale cosmology particle simulation with spatial and velocity components</div>
                      <div class="text-center small"><em>Source:</em></div>
                      <div class="text-center small"><em>HACC team</em></div>
                      <div class="text-center small"><em>(ECP EXASKY)</em></div>
                    </td>
                    <td class="text-center">Cosmology: particle simulation</td>
                    <td>
                      <div class="text-center">1 snapshot: 6 fields (x,y,z,vx,vy,vz)</div>
                      <div class="text-center">Each field stored separately,</div>
                      <div class="text-center">Single precision, Binary, Little-endian</div>
                      <div class="my-2">
                        <table class="table table-sm table-bordered mb-0">
                          <thead>
                            <tr>
                              <th style="width:58px"></th>
                              <th class="text-center">8 bit Entropy</th>
                              <th class="text-center">32 bit Entropy</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th scope="row">avg</th>
                              <td class="text-center">7.2</td>
                              <td class="text-center">25.3</td>
                            </tr>
                            <tr>
                              <th scope="row">min</th>
                              <td class="text-center">7.1</td>
                              <td class="text-center">24.7</td>
                            </tr>
                            <tr>
                              <th scope="row">max</th>
                              <td class="text-center">7.4</td>
                              <td class="text-center">25.9</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                    <td>
                      <div class="text-center">19 GB</div>
                      <div class="text-center">5 GB</div>
                    </td>
                    <td class="small">
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXASKY/HACC/EXASKY-HACC-data-big-size.tar.gz" target="_blank" rel="noopener">Dataset1</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXASKY/HACC/template_data_big-size.txt" target="_blank" rel="noopener">Metadata1</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXASKY/HACC/EXASKY-HACC-data-medium-size-property.txt" target="_blank" rel="noopener">Property1</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXASKY/HACC/EXASKY-HACC-data-medium-size.tar.gz" target="_blank" rel="noopener">Dataset2</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXASKY/HACC/template_data_medium-size.txt" target="_blank" rel="noopener">Metadata2</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXASKY/HACC/EXASKY-HACC-data-big-size-property.txt" target="_blank" rel="noopener">Property2</a></div>
                    </td>
                  </tr>

                  <!-- NYX row -->
                  <tr>
                    <td>
                      <div class="fw-semibold text-center">NYX</div>
                      <div class="text-center small text-muted mb-2">Adaptive mesh cosmology simulation combining hydrodynamics and N-body methods</div>
                      <div class="text-center small"><em>Source:</em></div>
                      <div class="text-center small"><em>Lukic et al., MNRAS</em></div>
                    </td>
                    <td class="text-center">Cosmology: Adaptive mesh hydrodynamics + N-body cosmological simulation</td>
                    <td>
                      <div class="text-center">6 fields, 3D, 512 x 512 x 512</div>
                      <div class="text-center">Single precision, Binary, Little-endian</div>
                      <div class="my-2">
                        <table class="table table-sm table-bordered mb-0">
                          <thead>
                            <tr>
                              <th style="width:58px"></th>
                              <th class="text-center">8 bit Entropy</th>
                              <th class="text-center">32 bit Entropy</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th scope="row">avg</th>
                              <td class="text-center">7.2</td>
                              <td class="text-center">25.1</td>
                            </tr>
                            <tr>
                              <th scope="row">min</th>
                              <td class="text-center">7.0</td>
                              <td class="text-center">24</td>
                            </tr>
                            <tr>
                              <th scope="row">max</th>
                              <td class="text-center">7.4</td>
                              <td class="text-center">25.9</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                    <td class="text-center">2.7 GB</td>
                    <td class="small">
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXASKY/NYX/SDRBENCH-EXASKY-NYX-512x512x512.tar.gz" target="_blank" rel="noopener">Dataset</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXASKY/NYX/template_data.txt" target="_blank" rel="noopener">Metadata</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/EXASKY/NYX/SDRBENCH-EXASKY-NYX-512x512x512-property.txt" target="_blank" rel="noopener">Property</a></div>
                    </td>
                  </tr>

                  <!-- NWChem row -->
                  <tr>
                    <td>
                      <div class="fw-semibold text-center">NWChem</div>
                      <div class="text-center small text-muted mb-2">Two-electron repulsion integrals from quantum chemistry calculations</div>
                      <div class="text-center small"><em>Source:</em></div>
                      <div class="text-center small"><em>Example molecular 2-electron integral values generated by libint</em></div>
                      <div class="text-center small"><em><a href="https://github.com/evaleev/libint" target="_blank" rel="noopener">github.com/evaleev/libint</a></em></div>
                    </td>
                    <td class="text-center">Two-electron repulsion integrals computed over Gaussian-type orbital basis sets</td>
                    <td>
                      <div class="text-center">3 fields, 1D,</div>
                      <div class="text-center">Double precision,</div>
                      <div class="text-center">Binary, Little-endian</div>
                    </td>
                    <td class="text-center">16 GB</td>
                    <td class="small">
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/NWChem/SDRBENCH-NWChem-dataset.tar.gz" target="_blank" rel="noopener">Dataset</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/NWChem/template_data.txt" target="_blank" rel="noopener">Metadata</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/NWChem/SDRBENCH-NWChem-dataset-property.txt" target="_blank" rel="noopener">Property</a></div>
                    </td>
                  </tr>

                  <!-- SCALE-LETKF row -->
                  <tr>
                    <td>
                      <div class="fw-semibold text-center">SCALE-LETKF</div>
                      <div class="text-center small text-muted mb-2">Regional weather model data with ensemble Kalman filter assimilation</div>
                      <div class="text-center small"><em>Source:</em></div>
                      <div class="text-center small"><em>SCALE-RM weather model (RIKEN)</em></div>
                      <div class="text-center small"><em>Contact: Guo-yuan Lien</em></div>
                    </td>
                    <td class="text-center">Climate simulation</td>
                    <td>
                      <div class="text-center">13 fields, 3D,</div>
                      <div class="text-center">Single precision, binary, little-endian</div>
                      <div class="my-2">
                        <table class="table table-sm table-bordered mb-0">
                          <thead>
                            <tr>
                              <th style="width:58px"></th>
                              <th class="text-center">8 bit Entropy</th>
                              <th class="text-center">32 bit Entropy</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th scope="row">avg</th>
                              <td class="text-center">6.7</td>
                              <td class="text-center">21.7</td>
                            </tr>
                            <tr>
                              <th scope="row">min</th>
                              <td class="text-center">4.6</td>
                              <td class="text-center">10.2</td>
                            </tr>
                            <tr>
                              <th scope="row">max</th>
                              <td class="text-center">7.4</td>
                              <td class="text-center">26.1</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                    <td class="text-center">4.9 GB</td>
                    <td class="small">
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/SCALE_LETKF/SDRBENCH-SCALE-98x1200x1200.tar.gz" target="_blank" rel="noopener">Dataset</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/SCALE_LETKF/template_data.txt" target="_blank" rel="noopener">Metadata</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/SCALE_LETKF/SDRBENCH-SCALE-98x1200x1200-property.txt" target="_blank" rel="noopener">Property</a></div>
                    </td>
                  </tr>

                  <!-- QMCPACK row -->
                  <tr>
                    <td>
                      <div class="fw-semibold text-center">QMCPACK</div>
                      <div class="text-center small text-muted mb-2">Quantum Monte Carlo electronic structure orbital data for many-body systems</div>
                      <div class="text-center small"><em>Source:</em></div>
                      <div class="text-center small"><em>QMCPACK performance test</em></div>
                      <div class="text-center small"><em>Contact: Ye Luo</em></div>
                    </td>
                    <td class="text-center">Many-body ab initio Quantum Monte Carlo (electronic structure of atoms, molecules, and solids)</td>
                    <td>
                      <div class="text-center">1 field, 288 orbitals, 3D,</div>
                      <div class="text-center">69 x 69 x 115,</div>
                      <div class="text-center">Single precision, Binary, Little endian</div>
                      <div class="my-2">
                        <table class="table table-sm table-bordered mb-0">
                          <thead>
                            <tr>
                              <th class="text-center">8 bit Entropy</th>
                              <th class="text-center">32 bit Entropy</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td class="text-center">7.6</td>
                              <td class="text-center">26.1</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                    <td class="text-center">1 GB</td>
                    <td class="small">
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/QMCPack/SDRBENCH-QMCPack.tar.gz" target="_blank" rel="noopener">Dataset</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/QMCPack/template_data.txt" target="_blank" rel="noopener">Metadata</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/QMCPack/SDRBENCH-QMCPack-property.txt" target="_blank" rel="noopener">Property</a></div>
                    </td>
                  </tr>

                  <!-- Miranda row -->
                  <tr>
                    <td>
                      <div class="fw-semibold text-center">Miranda</div>
                      <div class="text-center small text-muted mb-2">Large-scale turbulence simulation with multiple hydrodynamic fields</div>
                      <div class="text-center small"><em>Source:</em></div>
                      <div class="text-center small"><em>Hydrodynamics code for large turbulence simulations</em></div>
                      <div class="text-center small"><em>Contact: Peter Lindstrom</em></div>
                    </td>
                    <td class="text-center">Hydrodynamics code for large turbulence simulations</td>
                    <td>
                      <div class="text-center">3D, totally 7 fields,</div>
                      <div class="text-center">each field is 256x384x384,</div>
                      <div class="text-center">Double precision, Binary, Little endian</div>
                      <div class="my-2">
                        <table class="table table-sm table-bordered mb-0">
                          <thead>
                            <tr>
                              <th style="width:58px"></th>
                              <th class="text-center">8 bit Entropy</th>
                              <th class="text-center">32 bit Entropy</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th scope="row">avg</th>
                              <td class="text-center">7.1</td>
                              <td class="text-center">22.5</td>
                            </tr>
                            <tr>
                              <th scope="row">min</th>
                              <td class="text-center">3.62</td>
                              <td class="text-center">7.2</td>
                            </tr>
                            <tr>
                              <th scope="row">max</th>
                              <td class="text-center">7.7</td>
                              <td class="text-center">25.1</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                    <td>
                      <div class="text-center">Small: 1.87 GB</div>
                      <div class="text-center">Big: 106 GB</div>
                    </td>
                    <td class="small">
                      <div class="text-center"><strong>Small (256x384x384)</strong></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/Miranda/SDRBENCH-Miranda-256x384x384.tar.gz" target="_blank" rel="noopener">Dataset</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/Miranda/template_data-miranda-256x384x384.txt" target="_blank" rel="noopener">Metadata</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/Miranda/SDRBENCH-Miranda-256x384x384-property.txt" target="_blank" rel="noopener">Property</a></div>
                      <div class="text-center mt-2"><strong>Big (3072x3072x3072)</strong></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/Miranda/SDRBENCH-Miranda-3072x3072x3072.tar.gz" target="_blank" rel="noopener">Dataset</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/Miranda/template_data-miranda-3072x3072x3072.txt" target="_blank" rel="noopener">Metadata</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/Miranda/SDRBENCH-Miranda-3072x3072x3072-property.txt" target="_blank" rel="noopener">Property</a></div>
                    </td>
                  </tr>

                  <!-- S3D row -->
                  <tr>
                    <td>
                      <div class="fw-semibold text-center">S3D</div>
                      <div class="text-center small text-muted mb-2">Direct numerical simulation of turbulent combustion with detailed chemistry</div>
                      <div class="text-center small"><em>Source:</em></div>
                      <div class="text-center small"><em>Kolla, Hemanth</em></div>
                    </td>
                    <td class="text-center">Combustion simulation</td>
                    <td>
                      <div class="text-center">11 fields, 3D, 500x500x500,</div>
                      <div class="text-center">Double precision</div>
                      <div class="text-center">Binary, Little-endian</div>
                      <div class="my-2">
                        <table class="table table-sm table-bordered mb-0">
                          <thead>
                            <tr>
                              <th style="width:58px"></th>
                              <th class="text-center">8 bit Entropy</th>
                              <th class="text-center">32 bit Entropy</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th scope="row">avg</th>
                              <td class="text-center">7.6</td>
                              <td class="text-center">21.9</td>
                            </tr>
                            <tr>
                              <th scope="row">min</th>
                              <td class="text-center">7.6</td>
                              <td class="text-center">21.8</td>
                            </tr>
                            <tr>
                              <th scope="row">max</th>
                              <td class="text-center">7.6</td>
                              <td class="text-center">22</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                    <td class="text-center">44 GB</td>
                    <td class="small">
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/S3D/SDRBENCH-S3D.tar.gz" target="_blank" rel="noopener">Dataset</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/S3D/template.txt" target="_blank" rel="noopener">Metadata</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/S3D/SDRBENCH-S3D-property.txt" target="_blank" rel="noopener">Property</a></div>
                    </td>
                  </tr>

                  <!-- XGC row -->
                  <tr>
                    <td>
                      <div class="fw-semibold text-center">XGC</div>
                      <div class="text-center small text-muted mb-2">Fusion plasma simulation on unstructured mesh using ADIOS format</div>
                      <div class="text-center small"><em>Source:</em></div>
                      <div class="text-center small"><em>Princeton Plasma Physics Laboratory (PPPL)</em></div>
                      <div class="text-center small"><em><a href="https://jychoi-hpc.github.io/adios-python-docs/XGC-mesh-and-field-data.html" target="_blank" rel="noopener">XGC Docs</a></em></div>
                    </td>
                    <td class="text-center">Fusion Simulation</td>
                    <td>
                      <div class="text-center">9 timesteps, 3D,</div>
                      <div class="text-center">unstructured mesh</div>
                      <div class="text-center">(the mesh data is in the archive),</div>
                      <div class="text-center">20694x512,</div>
                      <div class="text-center">Double precision, Binary, Little-endian</div>
                    </td>
                    <td class="text-center">1.2 GB</td>
                    <td class="small">
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/XGC/xgc.3d.tar.gz" target="_blank" rel="noopener">Dataset (Adios2)</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/XGC/xgc.zip" target="_blank" rel="noopener">Dataset (binary)</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/XGC/template_data.txt" target="_blank" rel="noopener">Metadata</a></div>
                    </td>
                  </tr>

                  <!-- NSTX GPI row -->
                  <tr>
                    <td>
                      <div class="fw-semibold text-center">NSTX GPI</div>
                      <div class="text-center small text-muted mb-2">High-speed imaging of fusion plasma turbulence (time-series movie data)</div>
                      <div class="text-center small"><em>Source:</em></div>
                      <div class="text-center small"><em>Michael Churchill, PPPL</em></div>
                      <div class="text-center small"><em>Copyright: Contact before publishing</em></div>
                    </td>
                    <td class="text-center">Fusion Gas Puff Image (GPI) data</td>
                    <td>
                      <div class="text-center">369,357 steps,</div>
                      <div class="text-center">2D time-series data (movie), 80x64 image</div>
                      <div class="text-center">Double precision, Binary, Little-endian</div>
                    </td>
                    <td class="text-center">4.1 GB</td>
                    <td class="small">
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/NSTX_GPI/nstx_data_ornl_demo.bp" target="_blank" rel="noopener">Dataset</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/NSTX_GPI/template_data.txt" target="_blank" rel="noopener">Metadata</a></div>
                    </td>
                  </tr>

                  <!-- Brown Samples row -->
                  <tr>
                    <td>
                      <div class="fw-semibold text-center">Brown Samples</div>
                      <div class="text-center small text-muted mb-2">Synthetic data generated with controlled regularity for compression testing</div>
                      <div class="text-center small"><em>Source:</em></div>
                      <div class="text-center small"><em>Brown University</em></div>
                    </td>
                    <td class="text-center">Synthetic, generated to specified regularity</td>
                    <td>
                      <div class="text-center">1D, Double precision</div>
                      <div class="text-center">Binary, Little-endian</div>
                      <div class="text-center">(3 datasets with 3 different regularity)</div>
                      <div class="my-2">
                        <table class="table table-sm table-bordered mb-0">
                          <thead>
                            <tr>
                              <th style="width:58px"></th>
                              <th class="text-center">8 bit Entropy</th>
                              <th class="text-center">32 bit Entropy</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th scope="row">avg</th>
                              <td class="text-center">7.5</td>
                              <td class="text-center">23</td>
                            </tr>
                            <tr>
                              <th scope="row">min</th>
                              <td class="text-center">7.5</td>
                              <td class="text-center">23</td>
                            </tr>
                            <tr>
                              <th scope="row">max</th>
                              <td class="text-center">7.6</td>
                              <td class="text-center">23</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                    <td>
                      <div class="text-center">256 MB</div>
                      <div class="text-center">256 MB</div>
                      <div class="text-center">256 MB</div>
                    </td>
                    <td class="small">
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/brown_synth/SDRBENCH-BROWN-33554433.tar.gz" target="_blank" rel="noopener">Dataset</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/brown_synth/template_data.txt" target="_blank" rel="noopener">Metadata</a></div>
                      <div class="text-center"><a href="https://g-8d6b0.fd635.8443.data.globus.org/ds131.2/Data-Reduction-Repo/raw-data/brown_synth/SDRBENCH-BROWN-33554433-property.txt" target="_blank" rel="noopener">Property</a></div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Unified Command Examples Section -->
            <div class="mt-4 p-4 bg-light rounded">
              <h5 class="mb-3">General Command Examples</h5>
              <p class="text-muted mb-3">
                Below are generic command templates for compressing SDRBench datasets. Replace placeholders like <code>filename</code>, dimensions (<code>-1</code>, <code>-2</code>, <code>-3</code>), and error bounds based on your specific dataset.
              </p>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <h6 class="fw-semibold">SZ Compression</h6>
                  <div class="bg-white p-3 rounded border">
                    <div class="mb-2"><strong>Compress (relative error):</strong></div>
                    <code class="d-block mb-2 text-wrap">sz -z -f -i &lt;filename&gt;.f32 -M REL -R 1E-2 -[1|2|3] &lt;dims&gt;</code>
                    <div class="mb-2 mt-3"><strong>Decompress:</strong></div>
                    <code class="d-block text-wrap">sz -x -f -i &lt;filename&gt;.f32 -s &lt;filename&gt;.f32.sz -[1|2|3] &lt;dims&gt; -a</code>
                  </div>
                </div>

                <div class="col-md-6 mb-3">
                  <h6 class="fw-semibold">ZFP Compression</h6>
                  <div class="bg-white p-3 rounded border">
                    <div class="mb-2"><strong>Compress & decompress:</strong></div>
                    <code class="d-block text-wrap">zfp -f -i &lt;filename&gt;.f32 -z &lt;filename&gt;.f32.zfp -o &lt;filename&gt;.f32.zfp.out -[1|2|3] &lt;dims&gt; -a 1E-2 -s</code>
                  </div>
                </div>

                <div class="col-md-6 mb-3">
                  <h6 class="fw-semibold">LibPressio</h6>
                  <div class="bg-white p-3 rounded border">
                    <div class="mb-2"><strong>Generic usage:</strong></div>
                    <code class="d-block text-wrap">pressio -b compressor=$COMP -i &lt;filename&gt;.f32 -d &lt;dim1&gt; -d &lt;dim2&gt; ... -t float -o rel=1e-2 -m time -m size -M all</code>
                    <div class="small text-muted mt-2">where $COMP can be sz, zfp, sz3, mgard, etc.</div>
                  </div>
                </div>

                <div class="col-md-6 mb-3">
                  <h6 class="fw-semibold">Z-checker-installer</h6>
                  <div class="bg-white p-3 rounded border">
                    <div class="mb-2"><strong>Run compression case:</strong></div>
                    <code class="d-block text-wrap">./runZCCase.sh -f REL &lt;dataset-name&gt; &lt;raw-data-dir&gt; f32 &lt;dims&gt;</code>
                  </div>
                </div>
              </div>

              <div class="alert alert-info mt-3 mb-0">
                <strong>Note:</strong> Consult each dataset's metadata file for specific dimensions, data types (f32/d64), and recommended error bounds. Some datasets (XGC, NSTX GPI) use ADIOS format and require specialized tools.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Community category -->
      <div class="accordion-item">
        <h2 class="accordion-header" id="heading-community">
          <button
            class="accordion-button collapsed fs-5"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapse-community"
            aria-expanded="false"
            aria-controls="collapse-community"
          >
            Community datasets
          </button>
        </h2>
        <div
          id="collapse-community"
          class="accordion-collapse collapse"
          aria-labelledby="heading-community"
        >
          <div class="accordion-body">
            <div class="d-flex justify-content-end mb-3">
              <button
                class="btn btn-primary"
                data-bs-toggle="modal"
                data-bs-target="#uploadDatasetModal"
              >
                Submit a dataset
              </button>
            </div>

            <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

            <div v-if="communityDatasets.length" class="list-group">
              <div class="list-group-item" v-for="d in communityDatasets" :key="d.id || d.name">
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
                  <span v-for="t in d.tags || []" :key="t" class="badge bg-secondary me-1">{{ t }}</span>
                </div>
              </div>
            </div>
            <div v-else-if="!loading" class="alert alert-info" role="alert">
              No community datasets yet. Be the first to share yours!
            </div>
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
