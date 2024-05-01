import {createApp} from 'vue';
import './scss/style.scss'
import 'sweetalert2/dist/sweetalert2.min.css';
import App from './App.vue'
import {createRouter, createWebHistory} from 'vue-router';
import VueSweetalert2 from 'vue-sweetalert2';
import "bootstrap/dist/css/bootstrap.css";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import {faRemove, faChevronLeft, faChartBar, faBan} from "@fortawesome/free-solid-svg-icons";

library.add(faRemove, faChevronLeft, faChartBar, faBan);

const app = createApp(App);

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'Dashboard',
            component: () => import('./components/Dashboard.vue')
        },
        {
            path: '/statistics',
            name: 'Statistics',
            component: () => import('./components/Statistics.vue')
        },
        {
            path: '/:catchAll(.*)*',
            name: "PageNotFound",
            component: () => import('./components/PageNotFound.vue')
        }
    ]
});

router.beforeEach((to: any) => {
    if (to.path === "/index.html") {
        const path: string = to.fullPath.replace("/index.html", "");
        return `/${path}`;
    }
});

app.use(router)
    .use(VueSweetalert2)
    .component('font-awesome-icon', FontAwesomeIcon)
    .mount('#app')
