RIR IR-FIDELITY — THREE PR PROMPTS (ADR-0025)
==============================================

Run sequentially: PR1 -> PR2 -> PR3 (later PRs depend on earlier).

PR1.txt  ->  IR depth — node fields, node/edge kinds, files[], schemaVersion  [branch feat/ir-fidelity-1-depth]  (15 tasks: F01,F02,F03,F04,F05,F06,F07,F08,F09,F10,F11,F12,F19,F21,F22)
PR2.txt  ->  Resolution layer + closure on real code (the headline fix)  [branch feat/ir-fidelity-2-resolution]  (7 tasks: F20,F13,F14,F15,F16,F17,F18)
PR3.txt  ->  Correctness + opportunities — search, coverage, churn, dead-code, runtime, deps, perf  [branch feat/ir-fidelity-3-analysis]  (7 tasks: F28,F23,F24,F25,F26,F27,F29)
