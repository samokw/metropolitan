import http from "k6/http";
import {
  BASE_URL,
  pickWeightedEndpoint,
  randomThinkTime,
  recordResponse,
} from "./common.js";

export const options = {
  scenarios: {
    api_load: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 25 },
        { duration: "1m", target: 50 },
        { duration: "1m", target: 100 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<300", "p(99)<800"],
    "http_req_duration{endpoint:housing_all}": ["p(95)<500"],
    "http_req_duration{endpoint:housing_starts_toronto}": ["p(95)<300"],
    "http_req_duration{endpoint:housing_completions_toronto}": ["p(95)<300"],
    "http_req_duration{endpoint:labour_annual_pumf}": ["p(95)<800"],
    "http_req_duration{endpoint:labour_by_province_education}": ["p(95)<800"],
  },
};

const endpoints = [
  {
    name: "housing_all",
    path: "/api/housingStats",
    weight: 30,
  },
  {
    name: "housing_starts_toronto",
    path: "/api/housingStats/starts/Toronto",
    weight: 15,
  },
  {
    name: "housing_completions_toronto",
    path: "/api/housingStats/completions/Toronto",
    weight: 15,
  },
  {
    name: "labour_annual_pumf",
    path: "/api/labourOntarioAnnualFromPumf",
    weight: 20,
  },
  {
    name: "labour_by_province_education",
    path: "/api/labourEmploymentRatesByProvinceEducation",
    weight: 20,
  },
];

export default function () {
  const endpoint = pickWeightedEndpoint(endpoints);
  const res = http.get(`${BASE_URL}${endpoint.path}`, {
    tags: {
      endpoint: endpoint.name,
    },
  });

  recordResponse(endpoint.name, res);
  randomThinkTime();
}
