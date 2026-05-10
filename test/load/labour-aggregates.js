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
    labour_aggregates: {
      executor: "ramping-vus",
      stages: defaultStages,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800", "p(99)<1500"],
    "http_req_duration{endpoint:labour_annual_pumf}": ["p(95)<800"],
    "http_req_duration{endpoint:labour_by_province_education}": ["p(95)<800"],
  },
};

const endpoints = [
  {
    name: "labour_annual_pumf",
    path: "/api/labourOntarioAnnualFromPumf",
    weight: 50,
  },
  {
    name: "labour_by_province_education",
    path: "/api/labourEmploymentRatesByProvinceEducation",
    weight: 50,
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
