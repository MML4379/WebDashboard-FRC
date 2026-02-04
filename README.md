# WebDashboard-FRC
A FRC dashboard that runs on the driver laptop and fetches data from NetworkTables. Uses Node.JS.

## How To Run
Run node server.js from the command line. Ensure node is installed, and all dependencies are installed.

## The Router
It is a JS router that simply works. If you just so happen to need to add your own pages though, you can go to `router.js` and modify the `routes` variable, adding a new route like this:

```JavaScript
    const routes = [
        { path: '/', view: Home() },
        { path: '/metrics', view: RawMetrics() },
        { path: '/foo', view: Foo() } // NEW
    ];
```