import { NextResponse } from "next/server";

const DEFAULT_JOB_URL = "http://localhost:3001/jobs/treasury-refresh";

export async function POST() {
  const jobSecret = process.env.JOB_SECRET;
  const apiUrl = process.env.API_URL;

  if (!jobSecret) {
    return NextResponse.json(
      { error: "JOB_SECRET não configurada." },
      { status: 500 }
    );
  }

  const jobUrl = apiUrl ? `${apiUrl}/jobs/treasury-refresh` : DEFAULT_JOB_URL;

  const response = await fetch(jobUrl, {
    method: "POST",
    headers: {
      "x-job-secret": jobSecret
    }
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { error: text || "Falha ao atualizar Tesouro." },
      { status: response.status }
    );
  }

  const payload = await response.json();
  return NextResponse.json(payload);
}
