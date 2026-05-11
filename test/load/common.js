import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

export const BASE_URL = __ENV.BASE_URL || "https://metropolitan.foundre.app";

export const statusCodes = new Counter("http_status_codes");
export const status0 = new Counter("http_status_0");
export const status2xx = new Counter("http_status_2xx");
export const status3xx = new Counter("http_status_3xx");
export const status4xx = new Counter("http_status_4xx");
export const status5xx = new Counter("http_status_5xx");
export const emptyResponses = new Counter("empty_responses");
export const responseBodyBytes = new Trend("response_body_bytes");

export const defaultStages = [
  { duration: "30s", target: 5 },
  { duration: "1m", target: 10 },
  { duration: "1m", target: 20 },
  { duration: "1m", target: 40 },
  { duration: "30s", target: 0 },
];

export function recordResponse(endpoint, res) {
  const tags = {
    endpoint,
    status: String(res.status),
  };

  statusCodes.add(1, tags);
  responseBodyBytes.add(res.body ? res.body.length : 0, { endpoint });

  if (res.status === 0) {
    status0.add(1, tags);
  } else if (res.status >= 200 && res.status < 300) {
    status2xx.add(1, tags);
  } else if (res.status >= 300 && res.status < 400) {
    status3xx.add(1, tags);
  } else if (res.status >= 400 && res.status < 500) {
    status4xx.add(1, tags);
  } else if (res.status >= 500) {
    status5xx.add(1, tags);
  }

  if (!res.body || res.body.length === 0) {
    emptyResponses.add(1, tags);
  }

  check(
    res,
    {
      "status is 200": (r) => r.status === 200,
      "response is not empty": (r) => r.body && r.body.length > 0,
    },
    { endpoint, status: String(res.status) },
  );
}

export function randomThinkTime(minSeconds = 0.5, maxSeconds = 2.5) {
  sleep(Math.random() * (maxSeconds - minSeconds) + minSeconds);
}

export function pickWeightedEndpoint(endpoints) {
  const totalWeight = endpoints.reduce((sum, endpoint) => sum + endpoint.weight, 0);
  let n = Math.random() * totalWeight;

  for (const endpoint of endpoints) {
    n -= endpoint.weight;
    if (n <= 0) return endpoint;
  }

  return endpoints[0];
}
