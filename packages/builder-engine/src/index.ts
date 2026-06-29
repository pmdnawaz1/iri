/**
 * @rir/builder-engine — Compiler pass runner.
 *
 * Drives the registered builders/passes over a CompilationContext to produce the
 * Repository IR. Ordering comes from @rir/core's PluginRegistry; this engine only
 * executes passes in that fixed order against a shared IRDraft. It adds no semantics
 * and changes no ordering.
 */

import {
  PluginRegistry,
  type Builder,
  type Compiler,
  type CompilationContext,
  type IRDraft,
  type Pass,
} from "@rir/core";
import {
  RIR_VERSION,
  type ArtifactIR,
  type CapabilityIR,
  type EdgeIR,
  type NodeIR,
  type RepositoryIR,
} from "@rir/ir";

/** Mutable IR accumulator; deduplicates by id and seals into an immutable IR. */
export class DefaultIRDraft implements IRDraft {
  private readonly nodes = new Map<string, NodeIR>();
  private readonly edges = new Map<string, EdgeIR>();
  private readonly artifacts = new Map<string, ArtifactIR>();
  private readonly capabilities = new Map<string, CapabilityIR>();

  addNode(node: NodeIR): void {
    this.nodes.set(node.id, node);
  }
  addEdge(edge: EdgeIR): void {
    this.edges.set(edge.id, edge);
  }
  addArtifact(artifact: ArtifactIR): void {
    this.artifacts.set(artifact.id, artifact);
  }
  addCapability(capability: CapabilityIR): void {
    this.capabilities.set(capability.id, capability);
  }

  getNodes(): readonly NodeIR[] {
    return [...this.nodes.values()];
  }
  getEdges(): readonly EdgeIR[] {
    return [...this.edges.values()];
  }
  getNode(id: string): NodeIR | undefined {
    return this.nodes.get(id);
  }
  getCapabilities(): readonly CapabilityIR[] {
    return [...this.capabilities.values()];
  }

  seal(): RepositoryIR {
    return {
      version: RIR_VERSION,
      schemaVersion: RIR_VERSION,
      nodes: [...this.nodes.values()],
      edges: [...this.edges.values()],
      artifacts: [...this.artifacts.values()],
      files: [...this.artifacts.values()].map((a) => ({
        path: a.path,
        language: a.language,
        size: 0,
        contentHash: a.hash,
        nodeCount: [...this.nodes.values()].filter((n) => n.artifactId === a.id).length,
      })),
      capabilities: [...this.capabilities.values()],
    };
  }
}

/** Runs all applicable passes (in PluginRegistry order) to build the IR. */
export class BuilderEngine implements Compiler {
  constructor(private readonly registry: PluginRegistry) {}

  static fromBuilders(builders: readonly Builder[]): BuilderEngine {
    const registry = new PluginRegistry();
    for (const b of builders) registry.register(b);
    return new BuilderEngine(registry);
  }

  async compile(ctx: CompilationContext): Promise<RepositoryIR> {
    const draft = new DefaultIRDraft();
    const passes: readonly Pass[] = this.registry.resolvePasses(ctx);
    for (const pass of passes) {
      ctx.logger.debug("running pass", { pass: pass.name });
      await pass.run(ctx, draft);
    }
    return draft.seal();
  }
}
