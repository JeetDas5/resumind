import type { ActionFunctionArgs } from "react-router";
import axios from "axios";
import * as cheerio from "cheerio";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    throw new Response("Method not allowed", { status: 405 });
  }

  const body = await request.json();
  const { url } = body;

  if (!url) {
    return Response.json({ error: "URL is required" }, { status: 400 });
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

    return Response.json({
      title,
      company,
      location,
      jobDescription,
      skills,
    });
  } catch (error) {
    console.error("Error scraping URL:", error);
    return Response.json({ error: "Failed to scrape URL" }, { status: 500 });
  }
}