export interface DashboardView {
    mount: (container: HTMLElement, params: Record<string, string>) => void;
    unmount: () => void;
}

type RouteHandler = () => DashboardView;

interface Route {
    pattern: RegExp;
    factory: RouteHandler;
    paramNames: string[];
}

export class Router {
    private routes: Route[] = [];
    private currentView: DashboardView | null = null;
    private rootElement: HTMLElement;

    constructor(rootSelector: string) {
        const el = document.querySelector(rootSelector);
        if (!el) throw new Error(`Root element ${rootSelector} not found!`);
        this.rootElement = el as HTMLElement;

        // listen to hash changes
        window.addEventListener('hashchange', () => this.handleHashChange());
        window.addEventListener('load', () => this.handleHashChange());
    }

    /**
     * Register a route
     * @param path e.g. '/auto' or '/match/:id'
     * @param viewFactory Function that returns the view object
     */
    public addRoute(path: string, viewFactory: RouteHandler): void {
        const paramNames: string[] = [];

        // convert path to regex
        const regexPath = path
            .replace(/:([^/]+)/g, (_, key) => {
                paramNames.push(key);
                return '([^/]+)';
            })
            .replace(/\//g, '\\/');

        this.routes.push({
            pattern: new RegExp(`^${regexPath}$`),
            factory: viewFactory,
            paramNames
        });
    }

    public navigate(path: string): void {
        window.location.hash = path;
    }

    private async handleHashChange() {
        const hash = window.location.hash.slice(1) || '/';

        // find matching route
        for (const route of this.routes) {
            const match = hash.match(route.pattern);
            if (match) {
                const params: Record<string, string> = {};
                match.slice(1).forEach((val, i) => params[route.paramNames[i]] = val);

                this.switchView(route.factory(), params);
            }
        }

        window.location.replace('/');
    }

    private switchView(newView: DashboardView, params: Record<string, string>) {
        // unmount previous view
        if (this.currentView) {
            try {
                this.currentView.unmount();
            } catch (e) {
                console.error('Error unmounting view: ', e);
            }
        }

        // clear DOM
        this.rootElement.innerHTML = '';

        // mount new view
        this.currentView = newView;
        this.currentView.mount(this.rootElement, params);
    }
}