# Load tests

These k6 scripts are intended to measure the public app and backend API before and after performance changes.

## Smoke test

Use this to confirm the deployed homepage is reachable and stable under light load.

```bash
k6 run test/load/home.js
```

## API load test

Use this to exercise the Spring API and database-backed read paths with a weighted traffic mix.

```bash
k6 run test/load/api-load.js
```

To test another environment, set `BASE_URL`:

```bash
BASE_URL=http://localhost:8080 k6 run test/load/api-load.js
BASE_URL=https://metropolitan.foundre.app k6 run test/load/api-load.js
```

## Interpreting results

Focus on p95/p99 latency and failed request rate rather than average latency. Useful comparisons:

- baseline database-backed API
- after adding database indexes
- after adding Redis or precomputed aggregates

Run the same script with the same target and compare endpoint-tagged metrics.
