import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import { IndexPage } from './pages/index';

const rootRoute = createRootRoute();
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute]),
});
