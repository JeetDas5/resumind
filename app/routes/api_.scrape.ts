import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import axios from "axios";
import * as cheerio from "cheerio";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function action({ request }: ActionFunctionArgs) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  const body = await request.json();
  const { url } = body;

  if (!url) {
    return Response.json({ error: "URL is required" }, { status: 400, headers: CORS_HEADERS });
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
        .replace(/<br\s*\/?\>/gi, "\n")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }
    const skills = $(".round_tabs_container")
      .first()
      .find(".round_tabs")
      .map((i, el) => $(el).text().trim())
      .get();

    return Response.json(
      {
        title,
        company,
        location,
        jobDescription,
        skills,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Error scraping URL:", error);
    return Response.json({ error: "Failed to scrape URL" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  // Handle CORS preflight at the routing layer (react-router expects a loader for OPTIONS)
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
}