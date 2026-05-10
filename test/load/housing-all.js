import http from "k6/http";
import { BASE_URL, defaultStages, randomThinkTime, recordResponse } from "./common.js";

export const options = {
  scenarios: {
    housing_all: {
      executor: "ramping-vus",
      stages: defaultStages,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800", "p(99)<1500"],
    "http_req_duration{endpoint:housing_all}": ["p(95)<800"],
  },
};

export default function () {
  const endpoint = "housing_all";
  const res = http.get(`${BASE_URL}/api/housingStats`, {
    tags: { endpoint },
  });

  recordResponse(endpoint, res);
  randomThinkTime();
}
