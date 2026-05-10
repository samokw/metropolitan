import http from "k6/http";
import { sleep, check } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://metropolitan.foundre.app";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<300", "p(99)<800"],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/`);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response is not empty": (r) => r.body && r.body.length > 0,
  });

  sleep(1);
}
