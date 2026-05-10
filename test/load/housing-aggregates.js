import http from "k6/http";
import {
  BASE_URL,
  defaultStages,
  pickWeightedEndpoint,
  randomThinkTime,
  recordResponse,
} from "./common.js";

export const options = {
  scenarios: {
    housing_aggregates: {
      executor: "ramping-vus",
      stages: defaultStages,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<300", "p(99)<800"],
    "http_req_duration{endpoint:housing_starts_toronto}": ["p(95)<300"],
    "http_req_duration{endpoint:housing_starts_hamilton}": ["p(95)<300"],
    "http_req_duration{endpoint:housing_completions_toronto}": ["p(95)<300"],
    "http_req_duration{endpoint:housing_completions_hamilton}": ["p(95)<300"],
  },
};

const endpoints = [
  {
    name: "housing_starts_toronto",
    path: "/api/housingStats/starts/Toronto",
    weight: 25,
  },
  {
    name: "housing_starts_hamilton",
    path: "/api/housingStats/starts/Hamilton",
    weight: 25,
  },
  {
    name: "housing_completions_toronto",
    path: "/api/housingStats/completions/Toronto",
    weight: 25,
  },
  {
    name: "housing_completions_hamilton",
    path: "/api/housingStats/completions/Hamilton",
    weight: 25,
  },
];

export default function () {
  const endpoint = pickWeightedEndpoint(endpoints);
  const res = http.get(`${BASE_URL}${endpoint.path}`, {
    tags: { endpoint: endpoint.name },
  });

  recordResponse(endpoint.name, res);
  randomThinkTime();
}
