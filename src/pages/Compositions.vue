<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import PipelineStageBadge from '../components/PipelineStageBadge.vue';

const route = useRoute();
const compositions = ref([]);
const searchQuery = ref('');
const selectedCategory = ref('All');

// composition id -> active variant id ('default' or a composition.variants[].id)
const activeVariantId = ref({});

const activeVariant = (comp) => {
  const id = activeVariantId.value[comp.id];
  if (!id || id === 'default') return null;
  return comp.variants?.find(v => v.id === id) || null;
};

const isActiveVariant = (comp, id) => (activeVariantId.value[comp.id] || 'default') === id;

const setVariant = (comp, id) => {
  activeVariantId.value[comp.id] = id;
};

const displayedPipeline = (comp) => activeVariant(comp)?.pipeline || comp.pipeline;

const displayedReproduce = (comp) => activeVariant(comp)?.reproduce || comp.reproduce;

// CPU counterpart to reproduce: a link to the composition's FZ CPU Module Library
// (SZ3) algorithm page. Follows the active SZ3 branch when the variant sets its
// own (default SZ3 -> ALGO_INTERP_LORENZO, SVD branch -> ALGO_SVD, ...).
const displayedFzAlgorithm = (comp) => activeVariant(comp)?.fzAlgorithm || comp.fzAlgorithm;

// Stages on the primary sequential flow (no lane, or explicitly "main").
const mainLaneStages = (pipeline) => pipeline.filter(s => !s.lane || s.lane === 'main');

// Side branches (e.g. "outlier", "roi") that run parallel to the main flow,
// keyed by lane name, in original pipeline order.
const sideLanes = (pipeline) => {
  const lanes = {};
  for (const stage of pipeline) {
    if (stage.lane && stage.lane !== 'main') {
      (lanes[stage.lane] ||= []).push(stage);
    }
  }
  return lanes;
};

// Long-form implementation/fidelity notes, kept out of the compact stage badges.
const pipelineDetails = (pipeline) =>
  pipeline.filter(s => s.details).map(s => ({ name: s.name, details: s.details }));

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

// Composition ids can contain dots (e.g. "sz-1.0"), which document.querySelector
// would misparse as a class selector after the "#" -- use getElementById instead.
//
// `id` is optional: pass it explicitly for an unconditional scroll (e.g. a
// stage-badge click, which must work even when the target hash is already
// the current URL and so wouldn't fire the route.hash watcher below).
// Without it, falls back to the current route.hash.
const scrollToHash = (id) => {
  const targetId = id || (route.hash ? decodeURIComponent(route.hash.slice(1)) : null);
  if (!targetId) return;
  setTimeout(() => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-card');
      setTimeout(() => element.classList.remove('highlight-card'), 2000);
    }
  }, 300);
};

const loadCompositions = async () => {
  try {
    const response = await fetch(import.meta.env.BASE_URL + 'compositions.json');
    compositions.value = await response.json();
  } catch (error) {
    console.error('Failed to load compositions:', error);
  }

  scrollToHash();
};

// Cross-page arrivals (e.g. a Modules.vue "Appears in" link) change
// route.hash, which this catches.
watch(() => route.hash, () => scrollToHash());

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

    <!-- Action Buttons -->
    <div class="d-flex justify-content-end mb-4">
      <a
        href="https://github.com/skyler-ruiter/Z-Hub/issues/new?template=composition_submission.yml"
        target="_blank"
        rel="noopener"
        class="btn btn-primary"
      >
        Submit a Composition
      </a>
    </div>

    <!-- Compositions Grid -->
    <div class="row row-cols-1 row-cols-lg-2 g-4">
      <div v-for="composition in filteredCompositions" :key="composition.id" class="col">
        <div :id="composition.id" class="card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 class="card-title mb-2">{{ composition.name }}</h5>
                <a
                  v-if="composition.firstParty"
                  href="https://fzframework.org"
                  target="_blank"
                  rel="noopener"
                  class="badge fz-badge text-decoration-none me-2"
                  title="Developed as part of the FZ project — fzframework.org"
                >
                  <i class="bi bi-patch-check-fill me-1"></i>FZ
                </a>
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

              <!-- Config/build-time variant switcher (e.g. cuSZp2 outlier/plain, cuSZ-Hi CR/TP) -->
              <div v-if="composition.variants && composition.variants.length" class="mb-2">
                <div class="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    :class="['btn', isActiveVariant(composition, 'default') ? 'btn-primary' : 'btn-outline-primary']"
                    @click="setVariant(composition, 'default')"
                  >
                    {{ composition.pipelineName || composition.name }}
                  </button>
                  <button
                    v-for="v in composition.variants"
                    :key="v.id"
                    type="button"
                    :class="['btn', isActiveVariant(composition, v.id) ? 'btn-primary' : 'btn-outline-primary']"
                    @click="setVariant(composition, v.id)"
                  >
                    {{ v.name }}
                  </button>
                </div>
                <div v-if="activeVariant(composition)?.description" class="small text-muted fst-italic mt-1">
                  {{ activeVariant(composition).description }}
                </div>
              </div>

              <!-- Lanes: main flow, plus any side branches (outlier handling, ROI, ...) alongside it -->
              <div class="d-flex flex-row flex-wrap align-items-start gap-3">
                <!-- Main flow -->
                <div class="pipeline-lane">
                  <template
                    v-for="(stage, index) in mainLaneStages(displayedPipeline(composition))"
                    :key="`main-${index}`"
                  >
                    <div class="pipeline-stage">
                      <PipelineStageBadge :stage="stage" @navigate-composition="scrollToHash" />
                    </div>
                    <div
                      v-if="index < mainLaneStages(displayedPipeline(composition)).length - 1"
                      class="lane-arrow text-muted"
                    >↓</div>
                  </template>
                </div>

                <!-- Side lanes -->
                <div
                  v-for="(laneStages, laneName) in sideLanes(displayedPipeline(composition))"
                  :key="laneName"
                  class="pipeline-lane side-lane ps-3 border-start"
                >
                  <div class="small text-muted fw-semibold mb-2 text-uppercase">↳ {{ laneName }} path</div>
                  <template v-for="(stage, index) in laneStages" :key="`${laneName}-${index}`">
                    <div class="pipeline-stage">
                      <PipelineStageBadge :stage="stage" @navigate-composition="scrollToHash" />
                    </div>
                    <div v-if="index < laneStages.length - 1" class="lane-arrow text-muted">↓</div>
                  </template>
                </div>
              </div>
            </div>

            <!-- Implementation Notes: longer curator/fidelity notes, kept out of the compact pipeline badges -->
            <div v-if="pipelineDetails(displayedPipeline(composition)).length > 0" class="mb-3">
              <h6 class="text-muted mb-2">Implementation Notes:</h6>
              <ul class="small mb-0 ps-3">
                <li v-for="(d, idx) in pipelineDetails(displayedPipeline(composition))" :key="idx">
                  <strong>{{ d.name }}:</strong> {{ d.details }}
                </li>
              </ul>
            </div>

            <!-- Used In -->
            <div v-if="composition.usedIn && composition.usedIn.length > 0" class="mb-3">
              <strong class="text-muted small">Used in: </strong>
              <span class="small">{{ composition.usedIn.join(', ') }}</span>
            </div>

            <!-- GitHub Link / Reproduce Preset (GPU) / FZ CPU Module Library page (CPU) -->
            <div v-if="composition.github || displayedReproduce(composition) || displayedFzAlgorithm(composition)" class="mb-3">
              <a
                v-if="composition.github"
                :href="composition.github"
                target="_blank"
                class="btn btn-sm btn-outline-dark me-2"
              >
                <i class="bi bi-github"></i> View Implementation
              </a>
              <a
                v-if="displayedReproduce(composition)"
                :href="displayedReproduce(composition).url"
                target="_blank"
                class="btn btn-sm btn-outline-primary me-2"
              >
                View FZ GPU Module Library Preset
              </a>
              <a
                v-if="displayedFzAlgorithm(composition)"
                :href="displayedFzAlgorithm(composition).url"
                target="_blank"
                class="btn btn-sm btn-outline-primary"
                :title="`FZ CPU Module Library: ${displayedFzAlgorithm(composition).algorithm}`"
              >
                <i class="bi bi-book"></i> View in FZ CPU Module Library
              </a>
              <div v-if="displayedReproduce(composition)?.note" class="small text-muted fst-italic mt-1">
                {{ displayedReproduce(composition).note }}
              </div>
              <div v-if="displayedFzAlgorithm(composition)?.note" class="small text-muted fst-italic mt-1">
                {{ displayedFzAlgorithm(composition).note }}
              </div>
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
                    <a v-if="paper.url" :href="paper.url" target="_blank" class="ms-1">
                      [Link]
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

.pipeline-lane {
  flex: 1 1 220px;
  min-width: 200px;
  max-width: 100%;
}

.pipeline-stage {
  width: 100%;
}

.lane-arrow {
  text-align: center;
  line-height: 1.2;
  padding: 0.1rem 0;
}

.side-lane {
  border-color: var(--bs-secondary-color, #adb5bd) !important;
}

.pipeline-stage .badge {
  width: 100%;
  text-align: left;
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

.fz-badge {
  background-color: var(--bs-success);
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.02em;
}
</style>
