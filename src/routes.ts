import { createRouter, createWebHashHistory } from 'vue-router';

import About from './about.vue';

export const router = createRouter({
  // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
  history: createWebHashHistory(),
  routes: [{ path: '/about', component: About }], // short for `routes: routes`
});
