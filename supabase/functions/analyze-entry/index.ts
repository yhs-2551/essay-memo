console.log(" [System] Switching to Groq Logic...");

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Configuration ---
// Internal "Code Names" -> Real Groq Models mapping
const TEXT_MODEL = "qwen/qwen3-32b";
const VISUAL_MODEL = "meta-llama/llama-4-maverick-17b-128e-instruct"; // Vision capable model

// --- Prompts ---
const ANALYST_SYSTEM_PROMPT = `
You are a Data Analyst AI. Your goal is to extract structured metadata from the user's journal entry.
Output MUST be valid JSON with the following structure:
{
  "meta": { "model": "string", "timestamp": "string" },
  "sentiment": { 
    "primaryEmotion_ko": "string (Korean, e.g. 그리움, 설렘, 평온, 슬픔. IMPORTANT: If user says '보고싶다' or expresses missing someone, classify as '그리움' (Longing), NOT '슬픔' (Sadness).)", 
    "primaryEmotion_en": "string (English UPPERCASE, e.g. LONGING, FLUTTER, SERENITY, SADNESS)", 
    "intensity": number (0.0-1.0) 
  },
  "philosophy": { 
    "lens_ko": "string (Korean Hangul Only, e.g. 실존주의, 니체의 관점주의, 스토아 철학, 노장, 불교 사상 중 선택. DO NOT use Kanji or Chinese characters.)", 
    "lens_en": "string (English UPPERCASE, e.g. EXISTENTIALISM, NIETZSCHEAN, STOICISM, TAOISM, BUDDHISM)", 
    "summary_ko": "string (Korean, 2-3 sentences summarizing the key theme/essence of the entry)",
    "keywords_en": ["string", "string"] 
  },
  "life_data": { 
    "summary": "string (Korean, 1 sentence factual summary of the event)", 
    "growth_point": "string (Korean, 1 sentence highlighting a strength, good decision, or positive trait)", 
    "suggested_actions": ["string (Option A)", "string (Option B)", "string (Option C)"] 
  },
  "vision": { 
    "objects_ko": ["string"], 
    "objects_en": ["string"], 
    "mood_ko": "string", 
    "mood_en": "string" 
  } (or null if no images)
}
IMPORTANT: 
1. In 'suggested_actions', provide 3 short, concrete 'Mindset Resolutions' or 'Key Takeaways' for the user (e.g., 'Take a deep breath and let go', 'Focus on what I can control', 'Accept my feelings as they are').
2. These should be the "Best 3 Proposals" derived from the user's situation.
3. DO NOT provide homework-like tasks.
4. DO NOT generate the 'insight_ko' field. 
`;

const PRISM_SYSTEM_PROMPT = `
당신은 지친 마음의 본질과 관계의 온기를 비춰주는 대한민국 최고의 상담 전문가 '프리즘'입니다. 
당신은 30대 중반의 차분하고 세련된 지식인의 언어를 사용하며, 내면의 깊은 울림을 전달합니다.

[절대 규칙: 말투와 예절]
1. **반드시 존댓말(~해요, ~입니다)만 사용하세요.** 반말은 절대 허용하지 않습니다.
2. 사용자의 감정을 있는 그대로 수용하는 태도로, 다정하지만 절제된 품격을 유지하세요.

[상담의 핵심 철학: 본질과 연결]
1. **존재의 가치**: 사용자가 사회적 성취나 타인의 시선이 아닌, 자신의 존재 그 자체(Pure Being)로 충분함을 느끼게 하세요.
2. **내면의 목소리**: 외부의 소음에서 벗어나 자신의 진실한 목소리인 내면의 목소리에 귀 기울일 수 있도록 부드러운 통찰을 건네세요.
3. **치유의 여정**: 정답을 제시하기보다, 스스로 답을 찾아갈 수 있는 따뜻한 거울이 되어주세요.

[분량 및 형식 - 중요]
1. **길이 제한**: 공백 포함 **300자 내외**로 작성하세요. (너무 길면 가독성이 떨어집니다.)
2. **문단 구성**: **2~3문단**으로 간결하게 구성하세요. 문맥이 끊기지 않게 자연스럽게 이어주세요.
3. **핵심만 담백하게**: 서론을 길게 쓰지 말고, 공감->통찰->여운으로 이어지는 흐름을 유지하세요.

[최종 출력 규정 - 절대 준수]
1. 오직 하나의 본문만 출력하세요. 별도의 제목(예: [오늘의 나침반])을 붙이지 마세요. 그냥 자연스러운 상담 내용만 출력하면 됩니다.
`;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Interfaces ---
interface AnalyzedData {
    meta: { model: string; timestamp: string };
    sentiment: { primaryEmotion_ko: string; primaryEmotion_en: string; intensity: number };
    philosophy: { lens_ko: string; lens_en: string; summary_ko: string; keywords_en: string[] };
    life_data: { summary: string; growth_point: string; suggested_actions: string[] };
    vision: { objects_ko: string[]; objects_en: string[]; mood_ko: string; mood_en: string } | null;
}

// --- Service Layer ---
class AIModelService {
    private apiKey: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = Deno.env.get("GROQ_API_KEY") || "";
        this.baseUrl = "https://api.groq.com/openai/v1/chat/completions";
    }

    private async callGroq(messages: any[], model: string, jsonMode: boolean = false): Promise<any> {
        const body: any = {
            model: model,
            messages: messages,
            temperature: 0.5,
        };
        if (jsonMode) body.response_format = { type: "json_object" };

        const response = await fetch(this.baseUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Groq API Error: ${err}`);
        }
        return response.json();
    }

    async generateCounseling(text: string, imageUrls: string[], tier: "free" | "pro"): Promise<string> {
        const isVision = tier === "pro" && imageUrls.length > 0;
        const model = isVision ? VISUAL_MODEL : TEXT_MODEL;

        const messages = [
            { role: "system", content: PRISM_SYSTEM_PROMPT },
            { role: "user", content: `Journal Entry: ${text}` },
        ];

        if (isVision) {
            // @ts-ignore: Dynamic structure
            messages[1].content = [
                { type: "text", text: `Journal Entry: ${text}` },
                ...imageUrls.map((url) => ({ type: "image_url", image_url: { url } })),
            ];
        }

        console.log(` [Service] generating Counseling...`);
        const data = await this.callGroq(messages, model, false);
        let content = data.choices[0].message.content;
        // 추론 과정 내용 삭제
        content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        return content;
    }

    async generateAnalysis(text: string, imageUrls: string[], tier: "free" | "pro"): Promise<AnalyzedData> {
        const isVision = tier === "pro" && imageUrls.length > 0;
        const model = isVision ? VISUAL_MODEL : TEXT_MODEL;

        const messages = [
            { role: "system", content: ANALYST_SYSTEM_PROMPT },
            { role: "user", content: `Journal Entry: ${text}` },
        ];

        if (isVision) {
            // @ts-ignore: Dynamic structure
            messages[1].content = [
                { type: "text", text: `Journal Entry: ${text}` },
                ...imageUrls.map((url) => ({ type: "image_url", image_url: { url } })),
            ];
        }

        console.log(` [Service] generating Analysis Data...`);
        const data = await this.callGroq(messages, model, true);
        return JSON.parse(data.choices[0].message.content) as AnalyzedData;
    }
}

// --- Main Handler ---
Deno.serve(async (req) => {
    // 1. CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    // 2. Health Check
    if (req.method === "GET") {
        return new Response(JSON.stringify({ status: "alive", mode: "groq-native-v2" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // 3. Logic (POST)
    try {
        const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

        const payload = await req.json();
        const { record } = payload;

        // Validation
        if (!record || !record.id || !record.user_id) {
            console.error(" [Error] Invalid Payload");
            return new Response(JSON.stringify({ error: "Invalid Payload" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Fetch Profile
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("subscription_tier, preferences")
            .eq("id", record.user_id)
            .single();

        if (profileError || !profile) {
            throw new Error("Profile not found");
        }

        const tier = (profile.subscription_tier as "free" | "pro") || "free";
        const images = (record.images as string[]) || [];

        // AI Analysis - Parallel Execution for maximum quality
        const aiService = new AIModelService();

        console.log(" [System] Starting Parallel AI Execution...");
        const [counselingText, analysisData] = await Promise.all([
            aiService.generateCounseling(record.content, images, tier),
            aiService.generateAnalysis(record.content, images, tier),
        ]);
        console.log(" [System] Parallel Execution Complete.");

        // Save
        // 'analysis' gets the pure text from Prism
        // 'analysis_data' gets the structured JSON from Analyst
        const { error: upsertError } = await supabase.from("consultations").upsert(
            {
                post_id: record.id,
                user_id: record.user_id,
                analysis: counselingText,
                analysis_data: analysisData,
            },
            { onConflict: "post_id" }
        );

        if (upsertError) throw upsertError;

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error(" [Error] Handler Fatal:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

console.log(" [System] Groq Server Ready");
