import axios from "axios";
import cors from "cors";
import express from "express";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to resumind");
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
