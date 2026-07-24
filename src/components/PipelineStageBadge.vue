<script>
// Module-scoped (not per-instance) so every stage badge on the page gets a
// distinct id for its "Show More" collapse target.
let nextStageBadgeId = 0;
</script>

<script setup>
import { RouterLink } from 'vue-router';

defineProps({
  stage: { type: Object, required: true }
});

// Composition links always point within the current (Compositions) page --
// RouterLink alone won't re-scroll when the target hash matches the current
// URL (e.g. clicking the same link twice), so the parent also gets an
// explicit, unconditional "go there" signal to handle directly.
const emit = defineEmits(['navigate-composition']);

const collapseId = `stage-more-info-${nextStageBadgeId++}`;
</script>

<template>
  <div class="badge bg-light text-dark border px-3 py-2">
    <RouterLink
      v-if="stage.module"
      :to="`/modules#${stage.module}`"
      class="text-decoration-none text-dark"
    >
      <strong>{{ stage.name }}</strong>
    </RouterLink>
    <RouterLink
      v-else-if="stage.composition"
      :to="`/compositions#${stage.composition}`"
      class="text-decoration-none text-dark"
      :title="`Embeds the ${stage.composition} composition`"
      @click="emit('navigate-composition', stage.composition)"
    >
      <strong>{{ stage.name }}</strong>
    </RouterLink>
    <strong v-else>{{ stage.name }}</strong>
    <span
      v-if="stage.joinsLanes && stage.joinsLanes.length"
      class="join-badge ms-1"
      :title="`Rejoins the ${stage.joinsLanes.join(', ')} path here`"
    >⤵</span>
    <span v-if="stage.optional" class="text-muted ms-1">(optional)</span>
    <span v-if="stage.variant" class="text-muted ms-1">— {{ stage.variant }}</span>
    <div class="small text-muted mt-1">{{ stage.description }}</div>
    <div v-if="stage.note" class="small fst-italic mt-1">{{ stage.note }}</div>

    <!-- Adaptive selection: candidate techniques this stage picks between -->
    <div v-if="stage.alternatives && stage.alternatives.length" class="alternatives mt-2 pt-2 border-top">
      <div class="small text-muted mb-1">Selects between:</div>
      <div class="d-flex flex-column align-items-start gap-1">
        <div v-for="(alt, idx) in stage.alternatives" :key="idx" class="small text-start">
          <RouterLink
            v-if="alt.module"
            :to="`/modules#${alt.module}`"
            class="text-decoration-none fw-semibold"
          >
            {{ alt.name }}
          </RouterLink>
          <span v-else class="fw-semibold">{{ alt.name }}</span>
          <span v-if="alt.variant" class="text-muted"> — {{ alt.variant }}</span>
          <div v-if="alt.implementation" class="mt-1">
            <a
              v-if="alt.implementation.url"
              :href="alt.implementation.url"
              target="_blank"
              rel="noopener"
              class="badge bg-success-subtle text-success-emphasis border border-success-subtle text-decoration-none"
            >
              {{ alt.implementation.library }} · {{ alt.implementation.stage }}
            </a>
            <span
              v-else
              class="badge bg-success-subtle text-success-emphasis border border-success-subtle"
            >
              {{ alt.implementation.library }} · {{ alt.implementation.stage }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Extended technical explanation, collapsed by default -->
    <div v-if="stage.moreInfo" class="mt-2 pt-2 border-top text-start">
      <button
        class="btn btn-link btn-sm p-0 small text-decoration-none"
        type="button"
        data-bs-toggle="collapse"
        :data-bs-target="`#${collapseId}`"
        aria-expanded="false"
        :aria-controls="collapseId"
      >
        Show More
      </button>
      <div :id="collapseId" class="collapse">
        <div class="small text-muted mt-1">{{ stage.moreInfo }}</div>
      </div>
    </div>

    <div v-if="stage.implementation" class="mt-1">
      <a
        v-if="stage.implementation.url"
        :href="stage.implementation.url"
        target="_blank"
        rel="noopener"
        class="badge bg-success-subtle text-success-emphasis border border-success-subtle text-decoration-none"
      >
        {{ stage.implementation.library }} · {{ stage.implementation.stage }}
      </a>
      <span
        v-else
        class="badge bg-success-subtle text-success-emphasis border border-success-subtle"
      >
        {{ stage.implementation.library }} · {{ stage.implementation.stage }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.border-top {
  border-top-color: rgba(0, 0, 0, 0.1) !important;
}

.join-badge {
  color: var(--bs-secondary-color, #6c757d);
  font-size: 0.85em;
}
</style>
