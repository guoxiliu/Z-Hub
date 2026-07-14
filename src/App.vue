<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const showBackToTop = ref(false);

const onScroll = () => {
  showBackToTop.value = window.scrollY > 400;
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener('scroll', onScroll));
</script>

<template>
  <div id="app">
    <nav class="navbar navbar-expand-lg navbar-dark bg-success sticky-top">
      <div class="container-fluid">
        <RouterLink class="navbar-brand" to="/">
          <img
            src="/favicon.svg"
            alt="Z-Hub Logo"
            width="30"
            height="30"
            class="d-inline-block align-text-top"
          />
          Z-Hub
        </RouterLink>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav">
            <li class="nav-item">
              <RouterLink class="nav-link" to="/modules">Modules</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink class="nav-link" to="/compositions">Compositions</RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink class="nav-link" to="/datasets">Datasets</RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <main class="flex-shrink-0">
      <RouterView />
    </main>

    <button
      v-if="showBackToTop"
      type="button"
      class="btn btn-success back-to-top shadow"
      aria-label="Back to top"
      title="Back to top"
      @click="scrollToTop"
    >
      <i class="bi bi-arrow-up"></i>
    </button>

    <footer class="footer mt-auto py-3 bg-light">
      <div class="container text-center">
        <span class="text-muted">&copy; 2026 Z-Hub</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
main {
  flex-grow: 1;
}

.back-to-top {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  z-index: 1030;
}
</style>
