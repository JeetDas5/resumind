import axios from "axios";
import cors from "cors";
import express from "express";
import * as cheerio from "cheerio";
import https from "https";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/", (req, res) => {
  res.send("Welcome to resumind");
});

// ── Raw HTTPS multipart request to texlive.net ──────────────────────────────
function compileWithTexlive(latex: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const boundary = "----TexLiveBoundary" + Date.now();
    
    // Build multipart body as raw Buffer
    const CRLF = "\r\n";
    const parts: string[] = [];
    
    // Part 1: file content
    parts.push(`--${boundary}${CRLF}`);
    parts.push(`Content-Disposition: form-data; name="filecontents[]"; filename="resume.tex"${CRLF}`);
    parts.push(`Content-Type: text/plain${CRLF}`);
    parts.push(CRLF);
    parts.push(latex);
    parts.push(CRLF);
    
    // Part 2: filename
    parts.push(`--${boundary}${CRLF}`);
    parts.push(`Content-Disposition: form-data; name="filename[]"${CRLF}`);
    parts.push(CRLF);
    parts.push("resume.tex");
    parts.push(CRLF);
    
    // Part 3: engine
    parts.push(`--${boundary}${CRLF}`);
    parts.push(`Content-Disposition: form-data; name="engine"${CRLF}`);
    parts.push(CRLF);
    parts.push("pdflatex");
    parts.push(CRLF);
    
    // Part 4: return
    parts.push(`--${boundary}${CRLF}`);
    parts.push(`Content-Disposition: form-data; name="return"${CRLF}`);
    parts.push(CRLF);
    parts.push("pdf");
    parts.push(CRLF);
    
    // End boundary
    parts.push(`--${boundary}--${CRLF}`);
    
    const body = Buffer.from(parts.join(""), "utf-8");
    
    const options: https.RequestOptions = {
      hostname: "texlive.net",
      path: "/cgi-bin/latexcgi",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
      timeout: 60000,
    };
    
    console.log("→ Sending to texlive.net, body size:", body.length, "bytes");
    
    const req = https.request(options, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => {
        const result = Buffer.concat(chunks);
        const ct = response.headers["content-type"] || "";
        console.log("← texlive.net response:", response.statusCode, "Content-Type:", ct, "Size:", result.length);
        
        if (response.statusCode === 200 && ct.includes("application/pdf")) {
          resolve(result);
        } else {
          const text = result.toString("utf-8").substring(0, 500);
          reject(new Error(`texlive.net (${response.statusCode}): ${text}`));
        }
      });
    });
    
    req.on("error", (err) => reject(new Error(`texlive.net network error: ${err.message}`)));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("texlive.net timeout after 60s"));
    });
    
    req.write(body);
    req.end();
  });
}

// ── LaTeX → PDF proxy ────────────────────────────────────────────────────────
app.post("/api/latex", async (req, res) => {
  const { latex } = req.body;

  if (!latex || typeof latex !== "string") {
    return res.status(400).json({ error: "LaTeX source is required" });
  }

  // Use latex.ytotech.com — accepts JSON, returns PDF with 201
  try {
    console.log("Compiling LaTeX via latex.ytotech.com...");
    const response = await axios.post(
      "https://latex.ytotech.com/builds/sync",
      { compiler: "pdflatex", resources: [{ main: true, content: latex }] },
      {
        headers: { "Content-Type": "application/json" },
        responseType: "arraybuffer",
        timeout: 60000,
        validateStatus: () => true,
      }
    );
    const ct = (response.headers["content-type"] || "") as string;
    if (response.status >= 200 && response.status < 300 && ct.includes("application/pdf")) {
      console.log("✅ latex.ytotech.com returned PDF");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'inline; filename="resume.pdf"');
      return res.send(Buffer.from(response.data));
    }
    const text = Buffer.from(response.data).toString("utf-8").substring(0, 300);
    console.warn("❌ latex.ytotech.com failed:", response.status, text);
  } catch (err: any) {
    console.warn("❌ latex.ytotech.com error:", err.message);
  }

  res.status(502).json({
    error: "LaTeX compilation failed. Use the download button to get the .tex file and compile on overleaf.com.",
  });
});

app.post("/api/scrape", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const title = $(".profile").first().text().trim();
    const company = $(".company_name").text().trim();
    const location = $("#location_names").text().trim();
    let jobDescriptionHtml =
      $(".text-container").html() ||
      $(".job-descriptions").html() ||
      $(".internship_details").html();

    let jobDescription: string[] = [];

    if (jobDescriptionHtml) {
      jobDescription = jobDescriptionHtml
        .replace(/<br\s*\/?>/gi, "\n")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }
    const skills = $(".round_tabs_container")
      .first()
      .find(".round_tabs")
      .map((i, el) => $(el).text().trim())
      .get();

    res.json({
      title,
      company,
      location,
      jobDescription,
      skills,
    });
  } catch (error) {
    console.error("Error scraping URL:", error);
    res.status(500).json({ error: "Failed to scrape URL" });
  }
});

app.listen(5000, () => {
  console.log("Server is running on http://localhost:5000");
});
