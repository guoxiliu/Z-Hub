<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, RouterLink } from 'vue-router';

const route = useRoute();
const entries = ref([]);
const loading = ref(false);
const error = ref('');
const searchQuery = ref('');
const selectedCategory = ref('all');

// Per-category presentation: a nice heading, a one-line description, and a
// Bootstrap contextual color. Keep keys in sync with docs/ecosystem.schema.json.
const categoryMeta = {
  'module-library': {
    title: 'Module Libraries',
    color: 'success',
    desc: "Catalogs of stage/module implementations, and frameworks for composing them into pipelines — where the building blocks come from.",
  },
  'meta-interface': {
    title: 'Meta-Interfaces',
    color: 'primary',
    desc: 'Uniform APIs that aggregate many compressors behind one interface.',
  },
  'io-integration': {
    title: 'I/O Integrations',
    color: 'secondary',
    desc: 'Storage formats, filter plugins, dataset loaders, and transport layers (network/MPI) that carry compressed data.',
  },
  'optimizer': {
    title: 'Optimizers',
    color: 'dark',
    desc: 'Tools layered on top of compressors that tune their parameters.',
  },
  'application': {
    title: 'Applications',
    color: 'info',
    desc: 'Real-world science/engineering domains: their simulators, datasets, quantity-of-interest constraints, and the compositions actually used there.',
  },
  'other': {
    title: 'Other',
    color: 'secondary',
    desc: 'Everything else in the surrounding compression ecosystem.',
  },
};

function categoryTitle(cat) {
  return categoryMeta[cat]?.title || cat;
}
function categoryColor(cat) {
  return categoryMeta[cat]?.color || 'secondary';
}

// entry id -> name, for resolving relatedTo cross-links to display names.
const nameById = computed(() => {
  const map = {};
  for (const e of entries.value) map[e.id] = e.name;
  return map;
});

// Dataset name -> anchor slug, shared logic with Datasets.vue's SDRBench table
// rows so an application entry's datasets[] entries can deep-link there when
// the name matches a real SDRBench dataset (not every free-text dataset name
// will — that's expected, only linkify what actually resolves).
function slugifyDataset(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const sdrbenchSlugs = ref([]);

async function loadSdrbenchNames() {
  try {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/g, '/').replace(/^$/g, '/');
    const res = await fetch(`${base}sdrbench-datasets.json`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    sdrbenchSlugs.value = (Array.isArray(data) ? data : []).map((d) => slugifyDataset(d.name));
  } catch (e) {
    console.warn('sdrbench-datasets.json fetch failed:', e);
  }
}

// Exact match, or a prefix match against a hyphenated SDRBench name (e.g. an
// entry's short "CESM" resolves to the SDRBench row "CESM-ATM") — deliberately
// not a loose substring match, to avoid false-positive links.
function datasetLink(name) {
  const target = slugifyDataset(name);
  const hit = sdrbenchSlugs.value.find((s) => s === target || s.startsWith(`${target}-`));
  return hit ? `/datasets#${hit}` : null;
}

async function loadEntries() {
  loading.value = true;
  error.value = '';

  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/g, '/').replace(/^$/g, '/');
  const candidates = Array.from(
    new Set([`${base}ecosystem.json`, '/ecosystem.json', 'ecosystem.json']),
  ).map((u) => `${u}${u.includes('?') ? '' : `?ts=${Date.now()}`}`);

  const tryFetch = (url, ms = 6000) =>
    new Promise((resolve, reject) => {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), ms);
      fetch(url, { cache: 'no-store', signal: controller.signal })
        .then((res) => {
          if (!res.ok) return reject(new Error(`HTTP ${res.status} @ ${url}`));
          return res.json();
        })
        .then((data) => {
          clearTimeout(to);
          resolve(data);
        })
        .catch((e) => {
          clearTimeout(to);
          reject(e);
        });
    });

  let lastErr;
  for (const url of candidates) {
    try {
      const data = await tryFetch(url);
      entries.value = Array.isArray(data) ? data : [];
      lastErr = undefined;
      break;
    } catch (e) {
      console.warn('ecosystem.json fetch failed:', e);
      lastErr = e;
    }
  }

  if (lastErr) {
    error.value = 'Failed to load the ecosystem catalog. Please try again later.';
  }

  loading.value = false;

  if (route.hash) {
    setTimeout(() => {
      const element = document.querySelector(route.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-card');
        setTimeout(() => element.classList.remove('highlight-card'), 2000);
      }
    }, 300);
  }
}

onMounted(() => {
  loadEntries();
  loadSdrbenchNames();
});

const entriesByCategory = computed(() => {
  let filtered = entries.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query) ||
        (e.aliases || []).some((a) => a.toLowerCase().includes(query)),
    );
  }

  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter((e) => e.category === selectedCategory.value);
  }

  const grouped = {};
  filtered.forEach((entry) => {
    (grouped[entry.category] ||= []).push(entry);
  });
  return grouped;
});

const categories = computed(() => {
  const cats = new Set(entries.value.map((e) => e.category));
  return Array.from(cats);
});

</script>

<template>
  <div class="container py-5">
    <h2 class="mb-3">Ecosystem</h2>
    <p class="text-muted mb-4">
      The wider compression world around the FZ projects — module libraries, meta-interfaces, I/O
      integrations, and tools layered on top of compressors. A broad, misc catalog: entries are
      grouped by <em>what they are / where they sit in the stack</em>, not by whether they supply
      modules or compositions.
    </p>

    <!-- Search and Filter Bar -->
    <div class="row mb-4">
      <div class="col-md-8">
        <input
          v-model="searchQuery"
          type="text"
          class="form-control"
          placeholder="Search the ecosystem by name, description, or alias..."
        />
      </div>
      <div class="col-md-4">
        <select v-model="selectedCategory" class="form-select">
          <option value="all">All Categories</option>
          <option v-for="cat in categories" :key="cat" :value="cat">
            {{ categoryTitle(cat) }}
          </option>
        </select>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="d-flex justify-content-end mb-4">
      <button class="btn btn-outline-secondary me-2" :disabled="loading" @click="loadEntries">
        <span v-if="!loading">Reload</span>
        <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      </button>
      <a
        href="https://github.com/skyler-ruiter/Z-Hub/issues/new"
        target="_blank"
        rel="noopener"
        class="btn btn-primary"
      >
        Suggest an Addition
      </a>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

    <!-- Loading State -->
    <div v-if="loading && !entries.length" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <!-- Entries by Category -->
    <div v-if="!loading || entries.length">
      <div v-if="Object.keys(entriesByCategory).length === 0" class="alert alert-info">
        No ecosystem entries found matching your search criteria.
      </div>

      <div v-for="(catEntries, category) in entriesByCategory" :key="category" class="mb-5">
        <h3 class="mb-1">
          {{ categoryTitle(category) }}
          <span class="badge bg-secondary ms-2">{{ catEntries.length }}</span>
        </h3>
        <p v-if="categoryMeta[category]" class="text-muted small mb-3">
          {{ categoryMeta[category].desc }}
        </p>

        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          <div v-for="entry in catEntries" :key="entry.id" class="col">
            <div :id="entry.id" class="card h-100 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h5 class="card-title mb-0">{{ entry.name }}</h5>
                    <div v-if="entry.aliases && entry.aliases.length" class="text-muted small">
                      {{ entry.aliases.join(' · ') }}
                    </div>
                  </div>
                  <div class="d-flex flex-column align-items-end gap-1 flex-shrink-0 ms-2">
                    <a
                      v-if="entry.firstParty"
                      href="https://fzframework.org"
                      target="_blank"
                      rel="noopener"
                      class="badge fz-badge text-decoration-none"
                      title="Developed as part of the FZ project — fzframework.org"
                    >
                      <i class="bi bi-patch-check-fill me-1"></i>FZ
                    </a>
                    <span :class="`badge bg-${categoryColor(category)}`">
                      {{ categoryTitle(category) }}
                    </span>
                  </div>
                </div>

                <p v-if="entry.platform" class="text-muted small mb-2">
                  <i class="bi bi-cpu me-1"></i>{{ entry.platform }}
                </p>

                <p class="card-text text-muted small mb-3">{{ entry.description }}</p>

                <!-- Supported compressors/frameworks (mainly for io-integration entries) -->
                <div v-if="entry.supportedCompressors && entry.supportedCompressors.length" class="mb-3">
                  <span class="small fw-bold me-2">Supports:</span>
                  <span
                    v-for="c in entry.supportedCompressors"
                    :key="c"
                    class="badge bg-light text-dark border me-1"
                  >
                    {{ c }}
                  </span>
                </div>

                <!-- Compositions used in this domain (application entries) -->
                <div v-if="entry.compositions && entry.compositions.length" class="mb-3">
                  <span class="small fw-bold me-2">Compositions:</span>
                  <RouterLink
                    v-for="c in entry.compositions"
                    :key="c"
                    :to="`/compositions#${c}`"
                    class="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle text-decoration-none me-1 mb-1"
                  >
                    {{ c }}
                  </RouterLink>
                </div>

                <!-- Simulators (application entries) -->
                <div v-if="entry.simulators && entry.simulators.length" class="mb-3">
                  <span class="small fw-bold me-2">Simulators:</span>
                  <span
                    v-for="s in entry.simulators"
                    :key="s"
                    class="badge bg-light text-dark border me-1"
                  >
                    {{ s }}
                  </span>
                </div>

                <!-- Datasets (application entries) -->
                <div v-if="entry.datasets && entry.datasets.length" class="mb-3">
                  <span class="small fw-bold me-2">Datasets:</span>
                  <template v-for="d in entry.datasets" :key="d">
                    <RouterLink
                      v-if="datasetLink(d)"
                      :to="datasetLink(d)"
                      class="badge bg-light text-dark border text-decoration-none me-1"
                    >
                      {{ d }}<i class="bi bi-box-arrow-up-right ms-1"></i>
                    </RouterLink>
                    <span v-else class="badge bg-light text-dark border me-1">
                      {{ d }}
                    </span>
                  </template>
                </div>

                <!-- Links -->
                <div v-if="entry.url || entry.github" class="mb-3">
                  <a
                    v-if="entry.url"
                    :href="entry.url"
                    target="_blank"
                    rel="noopener"
                    class="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle text-decoration-none me-1 mb-1"
                  >
                    <i class="bi bi-box-arrow-up-right me-1"></i>Home
                  </a>
                  <a
                    v-if="entry.github"
                    :href="entry.github"
                    target="_blank"
                    rel="noopener"
                    class="badge bg-dark-subtle text-dark-emphasis border border-dark-subtle text-decoration-none me-1 mb-1"
                  >
                    <i class="bi bi-github me-1"></i>GitHub
                  </a>
                </div>

                <!-- Note (user-facing cross-links / caveats) -->
                <p v-if="entry.note" class="small fst-italic text-muted mb-3">{{ entry.note }}</p>

                <!-- Related ecosystem entries -->
                <div v-if="entry.relatedTo && entry.relatedTo.length" class="mb-3">
                  <h6 class="small fw-bold mb-2">Related:</h6>
                  <a
                    v-for="rel in entry.relatedTo"
                    :key="rel"
                    :href="`#${rel}`"
                    class="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle text-decoration-none me-1 mb-1"
                  >
                    {{ nameById[rel] || rel }}
                  </a>
                </div>

                <!-- Expandable Details: capabilities + references -->
                <div
                  v-if="(entry.capabilities && entry.capabilities.length) || (entry.papers && entry.papers.length)"
                  class="accordion accordion-flush"
                  :id="`accordion-${entry.id}`"
                >
                  <div class="accordion-item border-0">
                    <h2 class="accordion-header">
                      <button
                        class="accordion-button collapsed p-0 bg-transparent border-0 shadow-none small"
                        type="button"
                        data-bs-toggle="collapse"
                        :data-bs-target="`#collapse-${entry.id}`"
                        :aria-expanded="false"
                        :aria-controls="`collapse-${entry.id}`"
                      >
                        <span class="text-primary">Show More</span>
                      </button>
                    </h2>
                    <div
                      :id="`collapse-${entry.id}`"
                      class="accordion-collapse collapse"
                      :data-bs-parent="`#accordion-${entry.id}`"
                    >
                      <div class="accordion-body p-0 pt-2">
                        <!-- Capabilities (rendered as "Notes" — the free-text name/description shape fits
                             requirement/constraint bullets, e.g. on application entries, better than a
                             literal capabilities list) -->
                        <div v-if="entry.capabilities && entry.capabilities.length" class="mb-3">
                          <h6 class="small fw-bold mb-2">Notes:</h6>
                          <div
                            v-for="(cap, idx) in entry.capabilities"
                            :key="idx"
                            class="small mb-2"
                          >
                            <div class="fw-semibold">{{ cap.name }}</div>
                            <div class="text-muted">{{ cap.description }}</div>
                          </div>
                        </div>

                        <!-- Papers -->
                        <div v-if="entry.papers && entry.papers.length" class="mb-2">
                          <h6 class="small fw-bold mb-2">References:</h6>
                          <div v-for="(paper, idx) in entry.papers" :key="idx" class="small mb-2">
                            <div class="fw-semibold">{{ paper.title }}</div>
                            <div class="text-muted">
                              <span v-if="paper.authors">{{ paper.authors }}</span>
                              <span v-if="paper.year"> ({{ paper.year }})</span>
                            </div>
                            <div v-if="paper.doi">
                              <a :href="`https://doi.org/${paper.doi}`" target="_blank" rel="noopener">
                                {{ paper.doi }}
                              </a>
                            </div>
                            <div v-if="paper.url">
                              <a :href="paper.url" target="_blank" rel="noopener">{{ paper.url }}</a>
                            </div>
                            <div v-if="paper.note" class="text-muted fst-italic">{{ paper.note }}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
}

.highlight-card {
  animation: highlight 1s ease-in-out;
  box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.5) !important;
}

@keyframes highlight {
  0%,
  100% {
    box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.5);
  }
}

.accordion-button::after {
  margin-left: 0.5rem;
}

.accordion-button:not(.collapsed) {
  color: var(--bs-primary);
  background-color: transparent;
  box-shadow: none;
}

.fz-badge {
  background-color: var(--bs-success);
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.02em;
}
</style>
