import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const appRoot = path.resolve("frontend/dist");
const publishedRoot = path.resolve("deployment");
const port = Number.parseInt(process.env.REVIEW_FRONTEND_PORT ?? "3000", 10);
const host = process.env.REVIEW_FRONTEND_HOST ?? "127.0.0.1";
const backendOrigin = process.env.REVIEW_BACKEND_ORIGIN ?? "http://127.0.0.1:3001";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function rewritePublishedHtml(content) {
  const rewritten = content
    .replace(
      /https:\/\/storage\.googleapis\.com\/[^"'<>]+\/assets\/client-runtime\.global\.js/g,
      "/published/assets/client-runtime.global.js"
    )
    .replace(
      /https:\/\/storage\.googleapis\.com\/[^"'<>]+\/assets\/page-application-tester\.global\.js/g,
      "/published/assets/page-application-tester.global.js"
    )
    .replace(
      /https:\/\/storage\.googleapis\.com\/[^"'<>]+\/assets\/page-application-tester-support\.global\.js/g,
      "/published/assets/page-application-tester-support.global.js"
    );
  if (rewritten.includes("page-application-tester-support.global.js")) {
    return rewritten;
  }
  return rewritten.replace(
    '<script src="/published/assets/page-application-tester.global.js" defer data-page-runtime-script="true"></script>',
    '<script src="/published/assets/page-application-tester-support.global.js" defer data-page-runtime-script="true"></script>\n    <script src="/published/assets/page-application-tester.global.js" defer data-page-runtime-script="true"></script>'
  );
}

function resolveFilePath(urlPath) {
  const cleanPath = String(urlPath || "/").split("?")[0].split("#")[0];
  if (cleanPath === "/published" || cleanPath === "/published/") {
    return {
      root: publishedRoot,
      filePath: path.join(publishedRoot, "index.html")
    };
  }
  if (cleanPath.startsWith("/published/")) {
    return {
      root: publishedRoot,
      filePath: path.join(publishedRoot, cleanPath.slice("/published/".length))
    };
  }
  const relativePath = cleanPath === "/" ? "/index.html" : cleanPath;
  return {
    root: appRoot,
    filePath: path.join(appRoot, relativePath)
  };
}

function shouldProxyToBackend(urlPath) {
  const cleanPath = String(urlPath || "/").split("?")[0].split("#")[0];
  return cleanPath === "/health" || cleanPath === "/ready" || cleanPath.startsWith("/api/");
}

async function proxyToBackend(request, response) {
  const targetUrl = new URL(request.url || "/", backendOrigin);
  const upstreamResponse = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body:
      request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS"
        ? undefined
        : request,
    duplex: "half"
  });

  const headers = {};
  upstreamResponse.headers.forEach((value, key) => {
    headers[key] = value;
  });
  response.writeHead(upstreamResponse.status, headers);
  const arrayBuffer = await upstreamResponse.arrayBuffer();
  response.end(Buffer.from(arrayBuffer));
}

const server = http.createServer(async (request, response) => {
  if (shouldProxyToBackend(request.url)) {
    try {
      await proxyToBackend(request, response);
    } catch {
      response.writeHead(502);
      response.end("backend unavailable");
    }
    return;
  }

  const resolvedPath = resolveFilePath(request.url);
  const candidatePath = resolvedPath.filePath;
  const normalizedCandidate = path.normalize(candidatePath);
  if (!normalizedCandidate.startsWith(resolvedPath.root)) {
    response.writeHead(403);
    response.end("forbidden");
    return;
  }

  try {
    const stat = await fs.stat(normalizedCandidate).catch(() => null);
    const filePath =
      stat && stat.isFile()
        ? normalizedCandidate
        : path.join(resolvedPath.root, "index.html");
    const ext = path.extname(filePath).toLowerCase();
    const rawContent = await fs.readFile(filePath);
    const content =
      resolvedPath.root === publishedRoot && ext === ".html"
        ? Buffer.from(rewritePublishedHtml(rawContent.toString("utf8")), "utf8")
        : rawContent;
    response.writeHead(200, {
      "content-type": mimeTypes[ext] || "application/octet-stream"
    });
    response.end(content);
  } catch {
    response.writeHead(500);
    response.end("server error");
  }
});

server.listen(port, host, () => {
  console.log(`Static frontend listening at http://${host}:${port}`);
});
