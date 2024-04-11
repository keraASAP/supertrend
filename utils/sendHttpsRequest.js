const https = require("https");
const httpsAgent = new https.Agent({ keepAlive: true });

function sendHttpsRequest(method, url, headers = {}, body = "") {
  return new Promise((resolve, reject) => {
    headers["Connection"] = "keep-alive";

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: headers,
      agent: httpsAgent,
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const finalData = JSON.parse(data);
          if ("msg" in finalData || "message" in finalData) {
            reject(finalData);
          } else {
            resolve(finalData);
          }
        } catch (e) {
          reject({ message: `Msg wasn't proper json` });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

module.exports = sendHttpsRequest;
