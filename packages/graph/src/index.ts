/**
 * @rir/graph — Generic directed-graph utilities.
 *
 * No compiler logic lives here. Standard, deterministic algorithms only. Iteration
 * order is insertion order so all outputs are stable across runs.
 */

/** A minimal directed graph keyed by string node ids. */
export class DirectedGraph {
  private readonly adjacency = new Map<string, string[]>();

  addNode(id: string): this {
    if (!this.adjacency.has(id)) this.adjacency.set(id, []);
    return this;
  }

  addEdge(from: string, to: string): this {
    this.addNode(from).addNode(to);
    this.adjacency.get(from)!.push(to);
    return this;
  }

  nodes(): readonly string[] {
    return [...this.adjacency.keys()];
  }

  neighbors(id: string): readonly string[] {
    return this.adjacency.get(id) ?? [];
  }

  hasNode(id: string): boolean {
    return this.adjacency.has(id);
  }
}

/** Breadth-first set of nodes reachable from any of the given sources (inclusive). */
export function reachableFrom(graph: DirectedGraph, sources: Iterable<string>): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [];
  for (const s of sources) {
    if (graph.hasNode(s) && !visited.has(s)) {
      visited.add(s);
      queue.push(s);
    }
  }
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of graph.neighbors(current)) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}

/** BFS distance from the nearest source to every reachable node. */
export function distancesFrom(graph: DirectedGraph, sources: Iterable<string>): Map<string, number> {
  const dist = new Map<string, number>();
  const queue: string[] = [];
  for (const s of sources) {
    if (graph.hasNode(s) && !dist.has(s)) {
      dist.set(s, 0);
      queue.push(s);
    }
  }
  while (queue.length > 0) {
    const current = queue.shift()!;
    const d = dist.get(current)!;
    for (const next of graph.neighbors(current)) {
      if (!dist.has(next)) {
        dist.set(next, d + 1);
        queue.push(next);
      }
    }
  }
  return dist;
}

/**
 * Kahn topological sort. Returns null when the graph contains a cycle (no total
 * order exists). Output is deterministic given insertion order.
 */
export function topologicalSort(graph: DirectedGraph): string[] | null {
  const indegree = new Map<string, number>();
  for (const n of graph.nodes()) indegree.set(n, 0);
  for (const n of graph.nodes()) {
    for (const m of graph.neighbors(n)) indegree.set(m, (indegree.get(m) ?? 0) + 1);
  }
  const queue = graph.nodes().filter((n) => (indegree.get(n) ?? 0) === 0);
  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const next of graph.neighbors(current)) {
      const d = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  return order.length === graph.nodes().length ? order : null;
}

/**
 * Tarjan's strongly-connected-components. Returns components in reverse topological
 * order; each component lists its member ids in discovery order.
 */
export function stronglyConnectedComponents(graph: DirectedGraph): string[][] {
  let index = 0;
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const result: string[][] = [];

  const strongConnect = (v: string): void => {
    indices.set(v, index);
    lowlink.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    for (const w of graph.neighbors(v)) {
      if (!indices.has(w)) {
        strongConnect(w);
        lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v)!, indices.get(w)!));
      }
    }

    if (lowlink.get(v) === indices.get(v)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        component.push(w);
      } while (w !== v);
      result.push(component);
    }
  };

  for (const v of graph.nodes()) {
    if (!indices.has(v)) strongConnect(v);
  }
  return result;
}

/** Weakly-connected components (ignoring edge direction). */
export function connectedComponents(graph: DirectedGraph): string[][] {
  const undirected = new DirectedGraph();
  for (const n of graph.nodes()) undirected.addNode(n);
  for (const n of graph.nodes()) {
    for (const m of graph.neighbors(n)) {
      undirected.addEdge(n, m).addEdge(m, n);
    }
  }
  const seen = new Set<string>();
  const components: string[][] = [];
  for (const n of undirected.nodes()) {
    if (seen.has(n)) continue;
    const component = [...reachableFrom(undirected, [n])];
    for (const id of component) seen.add(id);
    components.push(component);
  }
  return components;
}
