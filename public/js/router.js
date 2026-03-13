import Home from "./views/Home.js";
import RawMetrics from "./views/RawMetrics.js";
import Scouting from "./views/Scouting.js";
import Settings from "./views/Settings.js";

export const navigateTo = url => {
    history.pushState(null, null, url);
    router();
};

export const router = async () => {
    const routes = [
        { path: '/home', view: Home() },
        { path: '/metrics', view: RawMetrics() },
        { path: '/scouting', view: Scouting() },
        { path: '/settings', view: Settings() }
    ];

    const potentialMatches = routes.map(route => ({
        route,
        isMatch: location.pathname === route.path
    }));

    let match = potentialMatches.find(potentialMatch => potentialMatch.isMatch);

    if (location.pathname === '/home') {
        if (localStorage.getItem("reload") === "false") 
            {
             location.reload();
             localStorage.setItem("reload", "true"); 
            }
    };
    if (location.pathname !== '/home') {
        localStorage.setItem("reload", "false")
    }

    // Route to home if path is not found
    if (!match) {
        match = {
            route: routes[0],
            isMatch: true
        };
    }

const appContainer = document.getElementById('app');
const currentRenderedPath = appContainer.getAttribute('data-current-path');
const targetPath = match.route.path;

if (targetPath !== currentRenderedPath || appContainer.innerHTML === "") {
    console.log("Changing page to:", targetPath);
    appContainer.innerHTML = match.route.view;
    appContainer.setAttribute('data-current-path', targetPath);
} else {
    console.log("Double-click detected. View already matches URL.");
}

};//