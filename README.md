# Metropolitan v2

## Description

What if you could easily track how housing and employment growth are shaping the future of Hamilton and Toronto—all in one place? Regional planners, real estate investors, and policymakers often struggle with fragmented data, making informed decisions difficult. The Metropolitan Housing and Employment Growth Index simplifies this by integrating housing statistics and employment trends into an intuitive platform with Line Charts and Radar Charts, enabling quick comparisons and insights. Imagine a city planner aligning development plans with real-time data—saving time and ensuring balanced growth. By transforming complex data into clear visuals, our tool boosts productivity, supports data-driven decisions, and maximizes ROI.

## Tech Stack

*   **Backend:** Java (Spring Boot), Gradle
*   **Frontend:** TypeScript, React, Vite, CSS
*   **Database:** MariaDB
*   **Ingester:** Python
*   **Containerization:** Docker, Docker Compose
*   **Web Server/Proxy:** Nginx (via `swag` configuration)

## Features

*   **Integrated Data View:** Displays combined housing statistics and employment trends for Hamilton and Toronto in one interface.
*   **Trend Visualization:** Utilizes Line Charts to show historical trends in employment data.
*   **Comparative Analysis:** Employs Radar Charts and Bar Charts for comparing different metrics between the two cities.
*   **Specific Data Insights:** Provides access to key statistics like Labour Force data.
*   **Automated Data Ingestion:** Automatically collects and processes data from relevant sources.
*   **User-Friendly Interface:** Presents complex data in an intuitive and easy-to-understand visual format.

## Prerequisites

*   [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/samokw/metropolitan.git
    cd metropolitan
    ```
2.  **Run the application:**
    This command will build the images (if they don't exist) and start all the services (frontend, backend, database, ingester).
    ```bash
    docker compose up -d --build
    ```
    *   The frontend should be accessible at `http://localhost:3000`.
    *   The backend API is accessible at `http://localhost:8080`.
    *   API documentation (Swagger UI) is available at `http://localhost:8080/api/swagger-ui/index.html`.

3.  **To stop the application:**
    ```bash
    docker compose down
    ```

## Running Tests

There are two main types of tests in this project: Component Tests and Integration Tests.

### Component Tests

These tests verify the functionality of each component (frontend, backend, ingester) in isolation, often using mocks or test-specific configurations.

**Prerequisites:** Ensure the main application containers are running (`docker compose up`).

| Component | Command                                                                 | Expected Outcome        |
| :-------- | :---------------------------------------------------------------------- | :---------------------- |
| Frontend  | `docker exec -it metropolitan-frontend-1 /bin/bash -c "npm run test"`   | All Vitest tests pass.  |
| Backend   | `docker exec -it metropolitan-backend-1 /bin/bash -c "./gradlew test"`  | All Gradle tests pass.  |
| Ingester  | `docker exec -it metropolitan-ingester-1 /bin/bash -c "pytest"`         | All Pytest tests pass.  |

### Integration Tests

These tests verify the interactions *between* different components.

| Step | Command                   | Description                                                              | Expected Outcome                                                                     |
| :--- | :------------------------ | :----------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| 1    | `chmod +x integration.sh` | Make the `integration.sh` script executable.                             | The script `integration.sh` has execute permissions.                                 |
| 2    | `./integration.sh`        | Run the main integration script.                                         | Executes two sub-scripts: `./api.sh` and `./ingester.sh`.                            |
| 3    | `./api.sh`                | (Executed by `integration.sh`) Tests frontend and backend interaction.   | Verifies that data is correctly returned from the mocked in-memory data.             |
| 4    | `./ingester.sh`           | (Executed by `integration.sh`) Tests ingester's DB connection & insertion. | Verifies that the ingester successfully connects to the database and adds data.      |

## Demo Video
![Demo GIF](./demo.gif)

<!-- Optional: Consider uploading the video somewhere and linking it here. -->
<!-- e.g., [Watch the Demo Video](link-to-video) -->
