import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import axios from "axios";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function compileWithLatexYtoTech(latex: string): Promise<Uint8Array> {
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

  const contentType = (response.headers["content-type"] || "") as string;

  if (response.status >= 200 && response.status < 300 && contentType.includes("application/pdf")) {
    return new Uint8Array(response.data);
  }

  const text = Buffer.from(response.data).toString("utf-8").substring(0, 500);
  throw new Error(`latex.ytotech.com (${response.status}): ${text}`);
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  return new Response("Method not allowed", {
    status: 405,
    headers: CORS_HEADERS,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  const body = await request.json();
  const { latex } = body;

  if (!latex || typeof latex !== "string") {
    return Response.json(
      { error: "LaTeX source is required" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    const pdf = await compileWithLatexYtoTech(latex);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="resume.pdf"',
      },
    });
  } catch (error) {
    console.warn("❌ latex compilation failed:", error);
    return Response.json(
      {
        error:
          "LaTeX compilation failed. Use the download button to get the .tex file and compile on overleaf.com.",
      },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}
