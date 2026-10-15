# Cloud Task Placement — Interactive Demo

Open `index.html` in a current browser. This is a static, client-side prototype; it needs no account, API key, build step, or backend. The page is designed as an interactive simulator rather than a presentation.

## Use the demo

1. Edit task demand, server capacity, or a link's latency in the left control panel.
2. Use **+ Server** or **+ Add link** to expand the sample graph. Remove a link with its × button.
3. Click **Run simulation** to recalculate the outputs. Click **Reset sample** to restore the original inputs.
4. Choose source and destination servers below the graph to highlight their shortest path.
5. Open **Method notes** for concise algorithm explanations and project limitations.

## Algorithms and scope

- Kruskal's algorithm finds a minimum spanning tree (MST) over the undirected latency graph.
- Dijkstra's algorithm runs from every server on the original graph and supplies the shortest-path matrix and route view.
- A 0/1 dynamic program selects a subset of candidate servers whose aggregate capacity meets demand while minimizing the sum of their mean shortest-path distances. The score weights all server locations equally and is a teaching proxy, not a prediction of actual service latency.

The default inputs are illustrative. Their expected outputs are MST weight **90 ms**, the distance matrix shown by the app, and a placement of **C + D** with capacity **19** and score **43.67** for demand **12**. No live network is measured, no task is deployed, and individual requests are not assigned to specific servers. Use measured topology and workload data before making real-world performance claims.
