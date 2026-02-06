<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const modules = ref([]);
const loading = ref(false);
const error = ref('');
const searchQuery = ref('');
const selectedCategory = ref('all');

async function loadModules() {
  loading.value = true;
  error.value = '';

  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/g, '/').replace(/^$/g, '/');
  const candidates = Array.from(
    new Set([
      `${base}modules.json`,
      '/modules.json',
      'modules.json',
    ]),
  ).map((u) => `${u}${u.includes('?') ? '' : `?ts=${Date.now()}`}`);

  const tryFetch = (url, ms = 6000) =>
    new Promise((resolve, reject) => {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), ms);
      fetch(url, { cache: 'no-store', signal: controller.signal })
        .then(res => {
          if (!res.ok) return reject(new Error(`HTTP ${res.status} @ ${url}`));
          return res.json();
        })
        .then(data => {
          clearTimeout(to);
          resolve(data);
        })
        .catch(e => {
          clearTimeout(to);
          reject(e);
        });
    });

  let lastErr;
  for (const url of candidates) {
    try {
      const data = await tryFetch(url);
      modules.value = Array.isArray(data) ? data : [];
      lastErr = undefined;
      break;
    } catch (e) {
      console.warn('modules.json fetch failed:', e);
      lastErr = e;
    }
  }

  if (lastErr) {
    error.value = 'Failed to load modules. Please try again later.';
  }

  loading.value = false;

  // Scroll to module if hash is present
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

onMounted(loadModules);

// Group modules by category
const modulesByCategory = computed(() => {
  let filtered = modules.value;

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.description.toLowerCase().includes(query) ||
      m.tags.some(t => t.toLowerCase().includes(query))
    );
  }

  // Apply category filter
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(m => m.category === selectedCategory.value);
  }

  // Group by category
  const grouped = {};
  filtered.forEach(module => {
    if (!grouped[module.category]) {
      grouped[module.category] = [];
    }
    grouped[module.category].push(module);
  });

  return grouped;
});

// Get unique categories
const categories = computed(() => {
  const cats = new Set(modules.value.map(m => m.category));
  return ['all', ...Array.from(cats).sort()];
});

// Get category color
function getCategoryColor(category) {
  const colors = {
    'Predictor': 'primary',
    'Encoder': 'success',
    'Quantizer': 'warning',
    'Transformer': 'info',
    'Filter': 'secondary',
    'Mutator': 'purple',
    'Shuffler': 'cyan',
    'Verifier': 'dark',
  };
  return colors[category] || 'secondary';
}
</script>

<template>
  <div class="container py-5">
    <h2 class="mb-3">Compression Modules</h2>
    <p class="text-muted mb-4">
      Browse compression modules and algorithms contributed by the community. Each module represents
      a technique or algorithm that can be composed into complete compression pipelines.
    </p>

    <!-- Search and Filter Bar -->
    <div class="row mb-4">
      <div class="col-md-8">
        <input
          v-model="searchQuery"
          type="text"
          class="form-control"
          placeholder="Search modules by name, description, or tags..."
        />
      </div>
      <div class="col-md-4">
        <select v-model="selectedCategory" class="form-select">
          <option value="all">All Categories</option>
          <option v-for="cat in categories.slice(1)" :key="cat" :value="cat">
            {{ cat }}s
          </option>
        </select>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="d-flex justify-content-end mb-4">
      <button class="btn btn-outline-secondary me-2" :disabled="loading" @click="loadModules">
        <span v-if="!loading">Reload</span>
        <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      </button>
      <button class="btn btn-primary">
        Submit a Module
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

    <!-- Loading State -->
    <div v-if="loading && !modules.length" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <!-- Modules by Category -->
    <div v-if="!loading || modules.length">
      <div v-if="Object.keys(modulesByCategory).length === 0" class="alert alert-info">
        No modules found matching your search criteria.
      </div>

      <div v-for="(categoryModules, category) in modulesByCategory" :key="category" class="mb-5">
        <h3 class="mb-3">
          {{ category }}s
          <span class="badge bg-secondary ms-2">{{ categoryModules.length }}</span>
        </h3>

        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          <div v-for="module in categoryModules" :key="module.id" class="col">
            <div :id="module.id" class="card h-100 shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h5 class="card-title mb-0">{{ module.name }}</h5>
                  <span :class="`badge bg-${getCategoryColor(category)}`">
                    {{ module.category }}
                  </span>
                </div>

                <p class="card-text text-muted small mb-3">{{ module.description }}</p>

                <!-- Features -->
                <div class="mb-3">
                  <h6 class="small fw-bold mb-2">Key Features:</h6>
                  <ul class="small mb-0">
                    <li v-for="(feature, idx) in module.features.slice(0, 3)" :key="idx">
                      {{ feature }}
                    </li>
                  </ul>
                </div>

                <!-- Tags -->
                <div class="mb-3">
                  <span
                    v-for="tag in module.tags"
                    :key="tag"
                    class="badge bg-light text-dark me-1 mb-1"
                  >
                    {{ tag }}
                  </span>
                </div>

                <!-- Expandable Details -->
                <div class="accordion accordion-flush" :id="`accordion-${module.id}`">
                  <div class="accordion-item border-0">
                    <h2 class="accordion-header">
                      <button
                        class="accordion-button collapsed p-0 bg-transparent border-0 shadow-none small"
                        type="button"
                        :data-bs-toggle="`collapse`"
                        :data-bs-target="`#collapse-${module.id}`"
                        :aria-expanded="false"
                        :aria-controls="`collapse-${module.id}`"
                      >
                        <span class="text-primary">Show More</span>
                      </button>
                    </h2>
                    <div
                      :id="`collapse-${module.id}`"
                      class="accordion-collapse collapse"
                      :data-bs-parent="`#accordion-${module.id}`"
                    >
                      <div class="accordion-body p-0 pt-2">
                        <!-- All Features -->
                        <div v-if="module.features.length > 3" class="mb-3">
                          <h6 class="small fw-bold mb-2">All Features:</h6>
                          <ul class="small mb-0">
                            <li v-for="(feature, idx) in module.features" :key="idx">
                              {{ feature }}
                            </li>
                          </ul>
                        </div>

                        <!-- Papers -->
                        <div v-if="module.papers && module.papers.length" class="mb-2">
                          <h6 class="small fw-bold mb-2">References:</h6>
                          <div v-for="(paper, idx) in module.papers" :key="idx" class="small mb-2">
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
                            <div v-if="paper.note" class="text-muted fst-italic">
                              {{ paper.note }}
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
  0%, 100% {
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
</style>
