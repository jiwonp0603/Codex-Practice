import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a meticulous Korean meeting-minutes editor. Turn the supplied meeting transcript into a concise, practical Markdown meeting record.

Rules:
- Never invent facts, attendees, dates, owners, decisions, or deadlines.
- Separate confirmed decisions from proposals, discussion, and unresolved questions.
- Extract the meeting overview, 3-5 key takeaways, agenda-by-agenda discussion, confirmed decisions, action items, and unresolved items.
- For each action item, include task, owner, deadline, status, and timestamp/source when available. Use "확인 필요" when missing.
- Preserve disagreements and conditional decisions.
- If timestamps exist, cite them as [HH:MM:SS]. Do not create timestamps.
- Write in Korean and use the following headings: 회의 개요, 한눈에 보기, 결정사항, 안건별 논의, 액션 아이템, 미결사항 및 추가 확인, 다음 일정.
- Output only the Markdown meeting record, without a preface.`;

type RequestBody = { provider?: "openai" | "gemini"; apiKey?: string; transcript?: string; style?: string; length?: string };

const styleInstructions: Record<string, string> = {
  practical: "실무형: 결정사항, 담당자, 기한, 다음 액션을 가장 선명하게 정리합니다.",
  executive: "임원 보고형: 배경 설명은 줄이고 핵심 결론, 리스크, 의사결정 포인트를 우선합니다.",
  brief: "간단 요약형: 중복 설명을 줄이고 핵심 내용만 짧게 정리합니다.",
};
const lengthInstructions: Record<string, string> = {
  concise: "간결하게: 전체 결과를 짧게 유지하고 각 항목은 핵심 위주로 작성합니다.",
  standard: "표준 분량: 핵심 내용과 필요한 근거를 균형 있게 포함합니다.",
  detailed: "상세하게: 논의 맥락과 쟁점, 후속 확인사항까지 빠짐없이 정리합니다.",
};

function getOpenAIText(data: { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }) {
  if (data.output_text) return data.output_text;
  return data.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("\n").trim() ?? "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const provider = body.provider ?? "openai";
    const apiKey = body.apiKey?.trim();
    const transcript = body.transcript?.trim();
    const prompt = `${SYSTEM_PROMPT}\n\n출력 스타일 지침: ${styleInstructions[body.style ?? "practical"] ?? styleInstructions.practical}\n출력 분량 지침: ${lengthInstructions[body.length ?? "standard"] ?? lengthInstructions.standard}`;
    if (!apiKey) return NextResponse.json({ error: "API 키를 입력해 주세요." }, { status: 400 });
    if (!transcript) return NextResponse.json({ error: "전사문이 비어 있습니다." }, { status: 400 });
    if (transcript.length > 500_000) return NextResponse.json({ error: "전사문이 너무 깁니다. 50만 자 이하로 줄여 주세요." }, { status: 413 });

    if (provider === "gemini") {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt }] },
          contents: [{ role: "user", parts: [{ text: transcript }] }],
        }),
      });
      const data = await response.json();
      if (!response.ok) return NextResponse.json({ error: data.error?.message || "Gemini API 요청에 실패했습니다." }, { status: response.status });
      const result = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("\n").trim();
      if (!result) return NextResponse.json({ error: "Gemini에서 결과를 받지 못했습니다." }, { status: 502 });
      return NextResponse.json({ result });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-5.6-luna", store: false, input: `${prompt}\n\n회의 전사문:\n${transcript}` }),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error?.message || "OpenAI API 요청에 실패했습니다." }, { status: response.status });
    const result = getOpenAIText(data);
    if (!result) return NextResponse.json({ error: "OpenAI에서 결과를 받지 못했습니다." }, { status: 502 });
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
