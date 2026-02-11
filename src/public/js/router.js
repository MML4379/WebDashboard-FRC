import Home from "./views/Home.js";
import RawMetrics from "./views/RawMetrics.js";

export const navigateTo = url => {
    history.pushState(null, null, url);
    router();
};

export const router = async () => {
    const routes = [
        { path: '/', view: Home() },
        { path: '/metrics', view: RawMetrics() }
    ];

    const potentialMatches = routes.map(route => ({
        route,
        isMatch: location.pathname === route.path
    }));

    let match = potentialMatches.find(potentialMatch => potentialMatch.isMatch);

    // Route to home if path is not found
    if (!match) {
        match = {
            route: routes[0],
            isMatch: true
        };
    }

    // inject view into dom
    document.getElementById('app').innerHTML = match.route.view;
};//