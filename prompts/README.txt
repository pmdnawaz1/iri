RIR — READY-TO-PASTE IMPLEMENTER PROMPTS
=========================================

Each promptN.txt is fully self-contained. Open a FRESH session with your
implementer model and paste the ENTIRE file. One file = one TSPEC = one PR.
These are independent; you can run them in parallel.

prompt1.txt  ->  TSPEC-F01  NodeIR rich fields: signature/returnType/typeParameters/visibility/modifiers  [branch feature/tspec-f01-nodeir-rich-fields-signature-returntype-typeparameters-visibility-modifiers]
prompt2.txt  ->  TSPEC-F21  IR files[] metadata (language/size/hash/nodeCount)  [branch feature/tspec-f21-ir-files-metadata-language-size-hash-nodecount]
prompt3.txt  ->  TSPEC-F22  IR schemaVersion header + migration discipline  [branch feature/tspec-f22-ir-schemaversion-header-migration-discipline]
prompt4.txt  ->  TSPEC-F28  Dependency version tracking (package.json/lockfile -> DEPENDS_ON metadata)  [branch feature/tspec-f28-dependency-version-tracking-package-json-lockfile-depends-on-metadata]
prompt5.txt  ->  TSPEC-F02  NodeIR qualifiedName + promoted filePath + node-level line/col span  [branch feature/tspec-f02-nodeir-qualifiedname-promoted-filepath-node-level-line-col-span]
prompt6.txt  ->  TSPEC-F03  NodeIR decorators[] as data (critical for NestJS routes/DI)  [branch feature/tspec-f03-nodeir-decorators-as-data-critical-for-nestjs-routes-di]
prompt7.txt  ->  TSPEC-F04  NodeIR docstring (JSDoc/TSDoc) extraction  [branch feature/tspec-f04-nodeir-docstring-jsdoc-tsdoc-extraction]
prompt8.txt  ->  TSPEC-F05  PROPERTY/FIELD nodes (class fields, DI tokens)  [branch feature/tspec-f05-property-field-nodes-class-fields-di-tokens]
prompt9.txt  ->  TSPEC-F06  CONSTANT/ENUM/ENUM_MEMBER nodes (config + type constants)  [branch feature/tspec-f06-constant-enum-enum-member-nodes-config-type-constants]
prompt10.txt  ->  TSPEC-F07  TYPE_ALIAS nodes + granular IMPORT nodes  [branch feature/tspec-f07-type-alias-nodes-granular-import-nodes]
prompt11.txt  ->  TSPEC-F08  CONTAINS edges (file -> class -> method symbol tree)  [branch feature/tspec-f08-contains-edges-file-class-method-symbol-tree]
prompt12.txt  ->  TSPEC-F09  EXTENDS + IMPLEMENTS edges (class hierarchy)  [branch feature/tspec-f09-extends-implements-edges-class-hierarchy]
prompt13.txt  ->  TSPEC-F10  INSTANTIATES edges (new X() — DI/factory analysis)  [branch feature/tspec-f10-instantiates-edges-new-x-di-factory-analysis]
prompt14.txt  ->  TSPEC-F20  Route extraction correctness: kill config-call false positives  [branch feature/tspec-f20-route-extraction-correctness-kill-config-call-false-positives]
prompt15.txt  ->  TSPEC-F11  REFERENCES edges (value/constant/config usage)  [branch feature/tspec-f11-references-edges-value-constant-config-usage]
prompt16.txt  ->  TSPEC-F12  DECORATES edges (which decorator applied where)  [branch feature/tspec-f12-decorates-edges-which-decorator-applied-where]
prompt17.txt  ->  TSPEC-F13  ReferenceResolver: import resolution + name matching (deep call graph)  [branch feature/tspec-f13-referenceresolver-import-resolution-name-matching-deep-call-graph]
prompt18.txt  ->  TSPEC-F19  Error-handling (CATCHES/THROWS) + middleware (MIDDLEWARE node, WRAPS edges)  [branch feature/tspec-f19-error-handling-catches-throws-middleware-middleware-node-wraps-edges]
prompt19.txt  ->  TSPEC-F23  rir search <query> — full-text over node name/qualifiedName/docstring  [branch feature/tspec-f23-rir-search-query-full-text-over-node-name-qualifiedname-docstring]
prompt20.txt  ->  TSPEC-F24  Test-coverage mapping (lcov -> node.execution.tested)  [branch feature/tspec-f24-test-coverage-mapping-lcov-node-execution-tested]
prompt21.txt  ->  TSPEC-F25  Git churn / change-frequency per node  [branch feature/tspec-f25-git-churn-change-frequency-per-node]
prompt22.txt  ->  TSPEC-F14  Framework route + DI resolution (NestJS/Express/Spring/FastAPI/Gin)  [branch feature/tspec-f14-framework-route-di-resolution-nestjs-express-spring-fastapi-gin]
prompt23.txt  ->  TSPEC-F16  Dynamic-dispatch synthesizers (callback/observer/event edges)  [branch feature/tspec-f16-dynamic-dispatch-synthesizers-callback-observer-event-edges]
prompt24.txt  ->  TSPEC-F17  Entry-point reachability tracing (bootstrap/main -> call graph)  [branch feature/tspec-f17-entry-point-reachability-tracing-bootstrap-main-call-graph]
prompt25.txt  ->  TSPEC-F29  Performance annotations: N+1 query + hot-path / slow-operation detection  [branch feature/tspec-f29-performance-annotations-n-1-query-hot-path-slow-operation-detection]
prompt26.txt  ->  TSPEC-F15  DI/provider mapping: PROVIDES edges (NestJS @Module + constructor injection)  [branch feature/tspec-f15-di-provider-mapping-provides-edges-nestjs-module-constructor-injection]
prompt27.txt  ->  TSPEC-F26  Dead-code detection (reachability + graph)  [branch feature/tspec-f26-dead-code-detection-reachability-graph]
prompt28.txt  ->  TSPEC-F27  Runtime-trace ingestion (execution.runtimeObserved via OTel)  [branch feature/tspec-f27-runtime-trace-ingestion-execution-runtimeobserved-via-otel]
prompt29.txt  ->  TSPEC-F18  Closure populates on the resolved DI graph (the headline fix)  [branch feature/tspec-f18-closure-populates-on-the-resolved-di-graph-the-headline-fix]
