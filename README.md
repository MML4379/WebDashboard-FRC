# WebDashboard-FRC
A FRC dashboard that runs on the driver laptop and fetches data from NetworkTables. Uses Node.JS.

## How To Run
Example:
`node server.js robot IPv4`
This will make the code look for your ROBOT, and use IPv4 on the computer.
You can change `robot` to `local` to have the code look for a simulator at localhost.
You can also change `IPv4` to `IPv6` if you choose to use IPv6 on the network. IPv6 is not supported by the RoboRIO, and changing this to IPv6 does not change the connection between your computer and the simulator/robot.

## The Router
It is a JS router that simply works. If you just so happen to need to add your own pages though, you can go to `router.js` and modify the `routes` variable, adding a new route like this:

```JavaScript
    const routes = [
        { path: '/', view: Home() },
        { path: '/metrics', view: RawMetrics() },
        { path: '/foo', view: Foo() } // NEW
    ];
```