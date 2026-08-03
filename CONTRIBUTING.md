# Contributing to MemoryMinusOne

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/NormVg/MemoryMinusOne.git
cd MemoryMinusOne

# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm test
```

## Project Structure

```
packages/
├── core/          # Engine, plugin system, built-in plugins
├── drizzle/       # Drizzle ORM storage + pgvector
├── ai-sdk/        # Vercel AI SDK embedding + tools
├── cache-redis/   # Upstash Redis cache plugin
└── eve/           # Eve agent tool wrapper
benchmarks/        # E2E tests and benchmark runners
```

## Making Changes

1. **Fork** the repo and create a branch from `master`.
2. **Write code** — follow the existing patterns in the codebase.
3. **Build** — run `pnpm run build` and make sure it passes.
4. **Test** — run `pnpm test` or the relevant benchmark.
5. **Commit** — use [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`).
6. **Open a PR** — describe what you changed and why.

## Key Rules

- **Plugin-first** — Every capability is a swappable plugin. Don't hardcode providers.
- **User isolation** — Every database query MUST be scoped by `userId`.
- **No raw `Date.now()`** — Use the `Clock` interface from `core/clock.ts`.
- **Drizzle-native** — All database access goes through Drizzle ORM. No raw SQL.
- **Structured errors** — All errors extend `MemoryMinusOneError` with a machine-readable `code`.

## Writing a Plugin

Implement one of the four plugin interfaces:

| Interface | Purpose |
|---|---|
| `IStoragePlugin` | Memory CRUD, waypoints, facts |
| `IEmbeddingPlugin` | Text → vector embedding |
| `IVectorPlugin` | Vector storage and similarity search |
| `ICachePlugin` | Key-value cache with TTL |

See `packages/core/src/core/plugin.ts` for the full interface definitions.

## Questions?

Open an issue — we're happy to help.
