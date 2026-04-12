# Metropolitan v2

## Description

What if you could easily track how housing and employment growth are shaping the future of Hamilton and Toronto—all in one place? Regional planners, real estate investors, and policymakers often struggle with fragmented data, making informed decisions difficult. The Metropolitan Housing and Employment Growth Index simplifies this by integrating housing statistics and employment trends into an intuitive platform with Line Charts and Radar Charts, enabling quick comparisons and insights. Imagine a city planner aligning development plans with real-time data—saving time and ensuring balanced growth. By transforming complex data into clear visuals, our tool boosts productivity, supports data-driven decisions, and maximizes ROI.

## Tech Stack

*   **Backend:** Java (Spring Boot), Gradle
*   **Frontend:** TypeScript, React, Vite, CSS
*   **Database:** MariaDB
*   **Ingester:** Python
*   **Containerization:** Docker, Docker Compose
*   **Web Server/Proxy:** Caddy (production), Nginx/SWAG (development)
*   **Observability:** Prometheus, Grafana

## Features

*   **Integrated Data View:** Displays combined housing statistics and employment trends for Hamilton and Toronto in one interface.
*   **Trend Visualization:** Utilizes Line Charts to show historical trends in employment data.
*   **Comparative Analysis:** Employs Radar Charts and Bar Charts for comparing different metrics between the two cities.
*   **Specific Data Insights:** Provides access to key statistics like Labour Force data broken down by province and education level.
*   **Automated Data Ingestion:** Collects and processes data daily from Statistics Canada (housing starts, LFS PUMF microdata, Ontario annual LFS rates).
*   **Observability:** Prometheus metrics and Grafana dashboards for monitoring pipeline runs and backend performance.

## Prerequisites

*   [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/samokw/metropolitan.git
    cd metropolitan
    ```

2.  **Configure environment variables:**
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and fill in the required values (database password, Grafana password, domain, GitHub username).

3.  **Run the application:**
    ```bash
    docker compose up -d --build
    ```
    *   Frontend: `http://localhost:3000`
    *   Backend API: `http://localhost:8080`
    *   Swagger UI: `http://localhost:8080/api/swagger-ui/index.html`
    *   Grafana: `http://localhost:3001`

4.  **To stop the application:**
    ```bash
    docker compose down
    ```

## Data Ingestion

The ingester runs automatically on container startup and then daily at midnight (Toronto time). It loads data from three Statistics Canada sources:

| Source | Description |
| :----- | :---------- |
| Housing starts & completions (34-10-0154-01) | Monthly housing statistics by CMA |
| LFS PUMF microdata (71M0001X) | Individual-level labour force survey records by province and education |
| Ontario annual LFS rates (14-10-0393-01) | Annual employment, unemployment, and participation rates for Ontario |

### PUMF configuration

The `STATCAN_LABOUR_PUMF_SOURCES` variable in `.env` controls which PUMF data is loaded:

| Value | Behaviour |
| :---- | :-------- |
| `discover` | Scrapes the StatCan product page for new monthly ZIPs + probes hist/ bundles for past years |
| `hist:2020,hist:2021,...` | Downloads specific historical annual bundles directly |
| `2026-03` | Downloads a specific monthly ZIP |

Set `STATCAN_LABOUR_PUMF_SKIP_UNCHANGED=true` to skip re-downloading ZIPs whose `Last-Modified` header hasn't changed — recommended for production to keep nightly runs lightweight.

### Load performance

The ingester uses a bulk load strategy (TRUNCATE/DELETE + `executemany` in batches of 5,000) instead of per-row SELECT + INSERT. Benchmarked against a single PUMF wave (~113k rows):

| Dataset | Strategy | Records | Duration | Rows/sec |
| :------ | :------- | ------: | -------: | -------: |
| Housing | per-row (original) | 22,680 | 40.42s | 561 |
| Housing | bulk | 22,680 | 0.21s | 108,000 |
| Labour | per-row (original) | 113,001 | 400.32s | 282 |
| Labour | bulk | 113,001 | 0.29s | 389,659 |

**192x** faster for housing, **1,380x** faster for labour. Run the benchmark yourself with:
```bash
docker compose run --rm ingester python -m benchmark
```

## Production Deployment

Deployment is automated via GitHub Actions on every push to `main`. The workflow builds Docker images, pushes them to GHCR, and deploys to the VPS over SSH.

**Required GitHub secrets:** `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_APP_DIR`

The production stack uses `compose.prod.yml` with Caddy as the reverse proxy serving HTTPS automatically.

## Running Tests

### Component Tests

| Component | Command                                                                 | Expected Outcome        |
| :-------- | :---------------------------------------------------------------------- | :---------------------- |
| Frontend  | `docker exec -it metropolitan-frontend-1 /bin/bash -c "npm run test"`   | All Vitest tests pass.  |
| Backend   | `docker exec -it metropolitan-backend-1 /bin/bash -c "./gradlew test"`  | All Gradle tests pass.  |
| Ingester  | `docker exec -it metropolitan-ingester-1 /bin/bash -c "pytest"`         | All Pytest tests pass.  |

### Integration Tests

| Step | Command                   | Description                                                              | Expected Outcome                                                                     |
| :--- | :------------------------ | :----------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| 1    | `chmod +x integration.sh` | Make the `integration.sh` script executable.                             | The script `integration.sh` has execute permissions.                                 |
| 2    | `./integration.sh`        | Run the main integration script.                                         | Executes two sub-scripts: `./api.sh` and `./ingester.sh`.                            |
| 3    | `./api.sh`                | (Executed by `integration.sh`) Tests frontend and backend interaction.   | Verifies that data is correctly returned from the mocked in-memory data.             |
| 4    | `./ingester.sh`           | (Executed by `integration.sh`) Tests ingester's DB connection & insertion. | Verifies that the ingester successfully connects to the database and adds data.      |

## Demo Video
![Demo GIF](./demo.gif)
