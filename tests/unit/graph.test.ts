import { describe, it, expect } from "vitest";
import {
  DirectedGraph,
  reachableFrom,
  distancesFrom,
  topologicalSort,
  stronglyConnectedComponents,
  connectedComponents,
} from "@rir/graph";

describe("DirectedGraph", () => {
  it("addNode creates a node with no neighbors", () => {
    const g = new DirectedGraph();
    g.addNode("a");
    expect(g.hasNode("a")).toBe(true);
    expect(g.neighbors("a")).toEqual([]);
  });

  it("addEdge creates both nodes and the edge", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b");
    expect(g.hasNode("a")).toBe(true);
    expect(g.hasNode("b")).toBe(true);
    expect(g.neighbors("a")).toEqual(["b"]);
    expect(g.neighbors("b")).toEqual([]);
  });

  it("nodes() returns insertion order", () => {
    const g = new DirectedGraph();
    g.addNode("c");
    g.addNode("a");
    g.addNode("b");
    expect(g.nodes()).toEqual(["c", "a", "b"]);
  });

  it("addEdge is idempotent for nodes but not for edges (multi-edges allowed)", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b");
    g.addEdge("a", "b");
    expect(g.neighbors("a")).toEqual(["b", "b"]);
  });
});

describe("reachableFrom", () => {
  it("returns just the source when no edges", () => {
    const g = new DirectedGraph();
    g.addNode("a");
    expect([...reachableFrom(g, ["a"])]).toEqual(["a"]);
  });

  it("traverses a linear chain a -> b -> c", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b").addEdge("b", "c");
    const r = reachableFrom(g, ["a"]);
    expect(r.has("a")).toBe(true);
    expect(r.has("b")).toBe(true);
    expect(r.has("c")).toBe(true);
  });

  it("does not reach nodes not connected from the source", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b");
    g.addNode("c"); // disconnected
    const r = reachableFrom(g, ["a"]);
    expect(r.has("c")).toBe(false);
  });

  it("handles cycles without infinite loop", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b").addEdge("b", "a");
    const r = reachableFrom(g, ["a"]);
    expect(r.size).toBe(2);
  });

  it("supports multiple sources (union of reachable)", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "c");
    g.addEdge("b", "d");
    const r = reachableFrom(g, ["a", "b"]);
    expect([...r].sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("ignores sources not in the graph", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b");
    const r = reachableFrom(g, ["a", "nonexistent"]);
    expect(r.size).toBe(2);
  });
});

describe("distancesFrom", () => {
  it("distance 0 for sources", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b");
    const d = distancesFrom(g, ["a"]);
    expect(d.get("a")).toBe(0);
    expect(d.get("b")).toBe(1);
  });

  it("correct distances in a DAG", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    g.addEdge("a", "c");
    const d = distancesFrom(g, ["a"]);
    expect(d.get("a")).toBe(0);
    expect(d.get("b")).toBe(1);
    expect(d.get("c")).toBe(1); // direct edge a->c
  });

  it("unreachable nodes have no distance entry", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b");
    g.addNode("c");
    const d = distancesFrom(g, ["a"]);
    expect(d.has("c")).toBe(false);
  });
});

describe("topologicalSort", () => {
  it("returns nodes in dependency order for a DAG", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    const order = topologicalSort(g);
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("returns null for a graph with a cycle", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b");
    g.addEdge("b", "a");
    expect(topologicalSort(g)).toBeNull();
  });

  it("returns [] for an empty graph", () => {
    const g = new DirectedGraph();
    expect(topologicalSort(g)).toEqual([]);
  });
});

describe("stronglyConnectedComponents", () => {
  it("each node is its own SCC in a DAG", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    const sccs = stronglyConnectedComponents(g);
    expect(sccs.length).toBe(3);
  });

  it("finds a 2-node cycle as one SCC", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b");
    g.addEdge("b", "a");
    const sccs = stronglyConnectedComponents(g);
    const bigScc = sccs.find((s) => s.length === 2);
    expect(bigScc).toBeDefined();
    expect(new Set(bigScc)).toEqual(new Set(["a", "b"]));
  });
});

describe("connectedComponents", () => {
  it("returns one component for a connected graph", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b").addEdge("b", "c");
    const ccs = connectedComponents(g);
    expect(ccs.length).toBe(1);
    expect(ccs[0]!.length).toBe(3);
  });

  it("returns separate components for disconnected graphs", () => {
    const g = new DirectedGraph();
    g.addEdge("a", "b");
    g.addEdge("c", "d");
    const ccs = connectedComponents(g);
    expect(ccs.length).toBe(2);
  });

  it("returns [] for an empty graph", () => {
    const g = new DirectedGraph();
    expect(connectedComponents(g)).toEqual([]);
  });
});
