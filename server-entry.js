import { createRequestHandler } from "@react-router/express";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Serve static assets
app.use(
  "/assets",
  express.static(join(__dirname, "build/client/assets"), {
    immutable: true,
    maxAge: "1y"
  })
);

app.use(express.static(join(__dirname, "build/client"), { maxAge: "1h" }));

// Handle all routes with React Router
app.all(
  "*",
  createRequestHandler({
    build: () => import("./build/server/index.js"),
  })
);

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`Server running on port ${port}`)
);