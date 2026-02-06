<script setup>
import { ref, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';

const compositions = ref([]);
const searchQuery = ref('');
const selectedCategory = ref('All');

const categories = computed(() => {
  const cats = new Set(compositions.value.map(c => c.category));
  return ['All', ...Array.from(cats).sort()];
});

const filteredCompositions = computed(() => {
  let filtered = compositions.value;

  if (selectedCategory.value !== 'All') {
    filtered = filtered.filter(c => c.category === selectedCategory.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query) ||
      c.tags.some(tag => tag.toLowerCase().includes(query)) ||
      c.usedIn?.some(use => use.toLowerCase().includes(query)) ||
      c.capabilities?.some(cap =>
        cap.name.toLowerCase().includes(query) ||
        cap.description.toLowerCase().includes(query)
      )
    );
  }

  return filtered;
});

const loadCompositions = async () => {
  try {
    const response = await fetch(import.meta.env.BASE_URL + 'compositions.json');
    compositions.value = await response.json();
  } catch (error) {
    console.error('Failed to load compositions:', error);
  }
};

const getCategoryColor = (category) => {
  const colors = {
    'CPU': 'primary',
    'GPU': 'success',
    'Mixed': 'warning',
    'Other': 'secondary'
  };
  return colors[category] || 'secondary';
};

const getCompressionTypeColor = (type) => {
  const colors = {
    'Lossless': 'info',
    'Lossy': 'danger',
    'Hybrid': 'warning'
  };
  return colors[type] || 'secondary';
};

onMounted(() => {
  loadCompositions();
});
</script>

<template>
  <div class="container py-5">
    <h2 class="mb-4">Compression Compositions</h2>
    <p class="lead mb-4">
      Complete compression pipelines combining multiple modules. These are tested configurations and implementations from the literature.
    </p>

    <!-- Search and Filter -->
    <div class="row mb-4">
      <div class="col-md-8">
        <input
          v-model="searchQuery"
          type="text"
          class="form-control"
          placeholder="Search compositions..."
        />
      </div>
      <div class="col-md-4">
        <select v-model="selectedCategory" class="form-select">
          <option v-for="cat in categories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>
      </div>
    </div>

    <!-- Compositions List -->
    <div class="row">
      <div v-for="composition in filteredCompositions" :key="composition.id" class="col-md-12 mb-4">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 class="card-title mb-2">{{ composition.name }}</h5>
                <span :class="`badge bg-${getCategoryColor(composition.category)} me-2`">
                  {{ composition.category }}
                </span>
                <span
                  v-if="composition.compressionType"
                  :class="`badge bg-${getCompressionTypeColor(composition.compressionType)} me-2`"
                >
                  {{ composition.compressionType }}
                </span>
              </div>
            </div>

            <p class="card-text">{{ composition.description }}</p>

            <!-- Capabilities -->
            <div v-if="composition.capabilities && composition.capabilities.length > 0" class="mb-3">
              <h6 class="text-muted mb-2">Capabilities:</h6>
              <div class="d-flex flex-wrap gap-2">
                <div
                  v-for="(capability, idx) in composition.capabilities"
                  :key="idx"
                  class="capability-badge"
                >
                  <div class="badge bg-info text-dark px-3 py-2">
                    <strong>{{ capability.name }}</strong>
                    <div class="small mt-1" style="white-space: normal; max-width: 300px;">
                      {{ capability.description }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pipeline Visualization -->
            <div class="mb-3">
              <h6 class="text-muted mb-2">Pipeline:</h6>
              <div class="d-flex flex-wrap align-items-center gap-2">
                <template v-for="(stage, index) in composition.pipeline" :key="index">
                  <div class="pipeline-stage">
                    <div class="badge bg-light text-dark border px-3 py-2">
                      <RouterLink
                        v-if="stage.module"
                        :to="`/modules#${stage.module}`"
                        class="text-decoration-none text-dark"
                      >
                        <strong>{{ stage.name }}</strong>
                      </RouterLink>
                      <strong v-else>{{ stage.name }}</strong>
                      <span v-if="stage.optional" class="text-muted ms-1">(optional)</span>
                      <div class="small text-muted mt-1">{{ stage.description }}</div>
                      <div v-if="stage.note" class="small fst-italic mt-1">{{ stage.note }}</div>
                    </div>
                  </div>
                  <span v-if="index < composition.pipeline.length - 1" class="text-muted">→</span>
                </template>
              </div>
            </div>

            <!-- Used In -->
            <div v-if="composition.usedIn && composition.usedIn.length > 0" class="mb-3">
              <strong class="text-muted small">Used in: </strong>
              <span class="small">{{ composition.usedIn.join(', ') }}</span>
            </div>

            <!-- GitHub Link -->
            <div v-if="composition.github" class="mb-3">
              <a :href="composition.github" target="_blank" class="btn btn-sm btn-outline-dark">
                <i class="bi bi-github"></i> View Implementation
              </a>
            </div>

            <!-- Papers -->
            <div v-if="composition.papers && composition.papers.length > 0">
              <button
                class="btn btn-sm btn-outline-secondary"
                type="button"
                data-bs-toggle="collapse"
                :data-bs-target="`#papers-${composition.id}`"
              >
                Show References ({{ composition.papers.length }})
              </button>
              <div :id="`papers-${composition.id}`" class="collapse mt-2">
                <ul class="small mb-0">
                  <li v-for="(paper, idx) in composition.papers" :key="idx">
                    <em>{{ paper.title }}</em>
                    <span v-if="paper.authors"> - {{ paper.authors }}</span>
                    <span v-if="paper.year"> ({{ paper.year }})</span>
                    <a v-if="paper.doi" :href="`https://doi.org/${paper.doi}`" target="_blank" class="ms-1">
                      [DOI]
                    </a>
                    <span v-if="paper.note" class="text-muted"> - {{ paper.note }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Tags -->
            <div class="mt-3">
              <span v-for="tag in composition.tags" :key="tag" class="badge bg-secondary me-1">
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredCompositions.length === 0" class="text-center text-muted py-5">
      <p>No compositions found matching your search.</p>
    </div>
  </div>
</template>

<style scoped>
.pipeline-stage {
  display: inline-block;
}

.pipeline-stage .badge {
  min-width: 150px;
  text-align: center;
  white-space: normal;
}

.pipeline-stage .badge a:hover strong {
  text-decoration: underline;
}

.capability-badge .badge {
  text-align: left;
  font-weight: normal;
}

.capability-badge .badge strong {
  display: block;
  font-size: 0.9rem;
}
</style>
