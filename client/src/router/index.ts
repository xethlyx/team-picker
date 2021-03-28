import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Home from '../views/Home.vue';

const routes: Array<RouteRecordRaw> = [
	{
		path: '/',
		name: 'Home',
		component: Home
	},
	{
		path: '/create',
		name: 'Create',
		component: () => import(/* webpackChunkName: "create" */ '../views/Create.vue')
	},
	{
		path: '/match/:id/:secret',
		name: 'Match',
		component: () => import(/* webpackChunkName: "match" */ '../views/Match.vue')
	}
];

const router = createRouter({
	history: createWebHistory(process.env.BASE_URL),
	routes
});

export default router;
