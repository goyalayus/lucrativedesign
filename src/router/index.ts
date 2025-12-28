import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ProjectDetail from '../views/ProjectDetail.vue';
import FoundersView from '../views/FoundersView.vue'; // <--- Import this

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/project/:slug',
      name: 'project-detail',
      component: ProjectDetail
    },
    // Add this new route block
    {
      path: '/founders',
      name: 'founders',
      component: FoundersView
    }
  ]
});

export default router;
