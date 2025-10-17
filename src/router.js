import { createRouter, createWebHistory } from 'vue-router';

import Home from './pages/Home.vue';
import Modules from './pages/Modules.vue';
import Compositions from './pages/Compositions.vue';
import Datasets from './pages/Datasets.vue';

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/modules', name: 'modules', component: Modules },
  { path: '/compositions', name: 'compositions', component: Compositions },
  { path: '/datasets', name: 'datasets', component: Datasets },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
