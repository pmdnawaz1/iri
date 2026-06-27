git stash

# TSPEC-CE04
git checkout -b feature/tspec-ce04-java-adapter-emit-callfact-enclosing main
git checkout stash@{0} -- packages/code-compiler/src/language/java.ts tests/compiler/java-adapter.test.ts
git add packages/code-compiler/src/language/java.ts tests/compiler/java-adapter.test.ts
git commit -m "feat(tspec-ce04): java enclosing"
git push -u origin feature/tspec-ce04-java-adapter-emit-callfact-enclosing
gh pr create --title "feat(tspec-ce04): java enclosing" --body "Implementation of TSPEC-CE04."
git checkout main

# TSPEC-CE05
git checkout -b feature/tspec-ce05-rust-adapter-emit-callfact-enclosing main
git checkout stash@{0} -- packages/code-compiler/src/language/rust.ts tests/compiler/rust-adapter.test.ts
git add packages/code-compiler/src/language/rust.ts tests/compiler/rust-adapter.test.ts
git commit -m "feat(tspec-ce05): rust enclosing"
git push -u origin feature/tspec-ce05-rust-adapter-emit-callfact-enclosing
gh pr create --title "feat(tspec-ce05): rust enclosing" --body "Implementation of TSPEC-CE05."
git checkout main

# TSPEC-CE06
git checkout -b feature/tspec-ce06-csharp-adapter-emit-callfact-enclosing main
git checkout stash@{0} -- packages/code-compiler/src/language/csharp.ts tests/compiler/csharp-adapter.test.ts
git add packages/code-compiler/src/language/csharp.ts tests/compiler/csharp-adapter.test.ts
git commit -m "feat(tspec-ce06): csharp enclosing"
git push -u origin feature/tspec-ce06-csharp-adapter-emit-callfact-enclosing
gh pr create --title "feat(tspec-ce06): csharp enclosing" --body "Implementation of TSPEC-CE06."
git checkout main

# TSPEC-CE07
git checkout -b feature/tspec-ce07-javascript-adapter-emit-callfact-enclosing main
git checkout stash@{0} -- packages/code-compiler/src/language/javascript.ts tests/compiler/javascript-adapter.test.ts
git add packages/code-compiler/src/language/javascript.ts tests/compiler/javascript-adapter.test.ts
git commit -m "feat(tspec-ce07): javascript enclosing"
git push -u origin feature/tspec-ce07-javascript-adapter-emit-callfact-enclosing
gh pr create --title "feat(tspec-ce07): javascript enclosing" --body "Implementation of TSPEC-CE07."
git checkout main

# TSPEC-FX08
git checkout -b feature/tspec-fx08-fixture-microservices main
# For untracked files in stash, stash might not include them unless stashed with -u
# Let's restore stash first, then commit them, or we can just pop the stash on main at the end, but wait!
