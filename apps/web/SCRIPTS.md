# Development Scripts

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Quality Checks

```bash
# TypeScript type checking
npx tsc --noEmit

# ESLint (check only)
npm run lint

# ESLint (auto-fix)
npm run lint -- --fix

# Prettier (format code)
npm run format

# Run all checks
npm run analyze
```

## Full Audit Command

```bash
# Run all quality checks
npm run typecheck && npm run lint && npm run format && npm run build
```

## Testing (Future)

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run e2e
```

## Troubleshooting

### Clear Next.js Cache
```bash
rm -rf .next
npm run dev
```

### Clear All Caches
```bash
rm -rf .next node_modules/.cache
npm install
npm run dev
```

