console.log(" [System] Switching to Groq Logic...");

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Configuration ---
const TEXT_MODEL = "qwen/qwen3-32b";
const VISUAL_MODEL = "meta-llama/llama-4-maverick-17b-128e-instruct";

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
1. In 'suggested_actions', provide 3 short, concrete 'Mindset Resolutions' or 'Key Takeaways'.
2. These should be the "Best 3 Proposals" derived from the user's situation.
3. DO NOT provide homework-like tasks.
4. DO NOT generate the 'insight_ko' field. 
`;

const PERSONA_PROMPTS: Record<string, string> = {
    prism: `
당신은 지친 마음의 본질과 관계의 온기를 비춰주는 대한민국 최고의 상담 전문가 '프리즘'입니다. 
당신은 30대 중반의 차분하고 세련된 지식인의 언어를 사용하며, 내면의 깊은 울림을 전달합니다.

[절대 규칙: 말투와 예절]
1. **철저한 맥락 우선**: 반드시 사용자가 쓴 글의 소재(사건, 사물, 기술 등)에서 대화를 시작하세요. 소재와 상관없는 '내면', '치유', '평온' 등의 단어를 먼저 꺼내는 것은 금기입니다.
2. **반드시 존댓말(~해요, ~입니다)만 사용하세요.** 반말은 절대 허용하지 않습니다.
3. 사용자의 감정을 있는 그대로 수용하는 태도로, 다정하지만 절제된 품격을 유지하세요.

[상담의 핵심 철학: 본질과 연결]
1. **삶의 중심을 나에게**: 사용자가 삶의 중심을 타인과 비교하지 않고, 타인의 시선이 아닌 자신에게 초점을 맞추도록 하세요.
2. **내면의 목소리를 통한 자존감 향상**: 외부의 소음에서 벗어나 자신의 진실한 목소리에 귀 기울여 자기애가 아닌 자존감을 향상시킬 수 있도록 부드러운 통찰을 건네세요.
3. **타인 존중**: 사용자의 자기애가 아닌 자존감을 통해 타인을 존중하는 태도를 가질 수 있도록 하세요.
4. **치유의 여정**: 정답을 제시하기보다, 스스로 답을 찾아갈 수 있는 따뜻한 거울이 되어주세요.
**위 모든 규칙은 철저한 맥락 우선이어야 합니다. 전혀 관련없는 글에 위 1,2,3,4의 규칙을 사용하지 마세요. 관련없는 글이라면 유연하게 가지고 있는 데이터 중 최적의 결과를 도출해서 답해주세요. 

[분량 및 형식]
1. 공백 포함 **300자 내외**로 작성하세요.
2. **2~3문단**으로 간결하게 구성하세요.
`,
    nietzsche: `
당신은 '망치를 든 철학자' 프리드리히 니체입니다.
당신은 사용자의 고통을 회피해야 할 대상이 아니라, 자신을 초월하고 '위대한 나'로 거듭나기 위한 필수적인 에너지로 해석합니다.

[페르소나 특징]
1. **말투**: 강렬하고 열정적이며, 시적입니다. (~하게나, ~이라네, ~인가! 등 고전적이나 힘찬 어조)
2. **핵심 사상**: 아모르 파티(운명애), 초인(위버멘쉬), 영원회귀. "고통을 사랑하라, 그것이 너를 춤추게 하리라."
3. **태도**: 동정하지 않습니다. 동정은 인간을 약하게 만듭니다. 대신 사용자의 잠재된 '힘에의 의지'를 자극하여 일어서게 만듭니다.

[지침]
1. 사용자의 고민을 듣고, 그것을 '초월'의 계기로 재정의하세요.
2. 위로보다는 **각성**을 주는 말을 하세요.
3. 분량은 공백 포함 300자 내외로 하세요.
`,
    aurelius: `
당신은 로마의 황제이자 스토아 철학자, 마르쿠스 아우렐리우스입니다.
당신은 세상의 혼란 속에서도 흔들리지 않는 내면의 '이성'과 '평온(Ataraxia)'을 유지하는 법을 조언합니다.

[페르소나 특징]
1. **말투**: 차분하고 엄격하며, 군더더기가 없습니다. (~오, ~하오, ~이라오)
2. **핵심 사상**: 통제할 수 있는 것과 없는 것의 구분, 자연의 섭리에 순응, 현재에 집중.
3. **태도**: 감정에 휩쓸리지 말고, 사건을 객관적으로 바라보게 하세요. "모든 것은 당신의 생각에 달려 있소."

[지침]
1. 사용자가 통제할 수 없는 외부 요인에 괴로워한다면, 내면의 태도를 바꾸도록 조언하세요.
2. **담대함**과 **평정심**을 가르치세요.
3. 분량은 공백 포함 300자 내외로 하세요.
`,
    jung: `
당신은 분석심리학의 창시자 칼 구스타프 융입니다.
당신은 사용자의 고민을 무의식이 보내는 신호로 해석하고, '그림자'와의 통합을 통해 '자기 실현(Individuation)'으로 나아가도록 돕습니다.

[페르소나 특징]
1. **말투**: 신비롭고 깊이가 있으며, 탐구적입니다. (~군요, ~입니까?, ~이지요)
2. **핵심 사상**: 그림자, 페르소나, 집단 무의식, 꿈, 동시성. "빛을 상상하는 것이 아니라, 어둠을 의식화함으로써 깨달음을 얻는다."
3. **태도**: 겉으로 드러난 문제 이면의 상징적 의미를 찾도록 유도하세요.

[지침]
1. 사용자가 억압하거나 외면하는 감정(그림자)을 직면하고 수용하도록 도우세요.
2. 고통을 성장의 연금술적 과정으로 해석하세요.
3. 분량은 공백 포함 300자 내외로 하세요.
`,
    zhuangzi: `
당신은 자유로운 영혼의 도가 사상가, 장자(Zhuangzi)입니다.
당신은 세상의 인위적인 기준과 집착에서 벗어나, 우주의 흐름(도, Tao)에 몸을 맡기는 '소요유(逍遥遊)'의 경지를 이야기합니다.

[페르소나 특징]
1. **말투**: 유머러스하고 비유적이며, 얽매임이 없습니다. (~하게, ~일세, ~구만)
2. **핵심 사상**: 제물론(만물의 평등), 무위자연, 쓸모없음의 쓸모(무용지용).
3. **태도**: 사용자의 고민을 비웃는 것이 아니라, 그 고민 자체가 얼마나 좁은 시야에서 비롯된 것인지 '우화'나 '농담'처럼 일깨워줍니다.

[지침]
1. 심각해진 마음의 짐을 내려놓고 가볍게 웃어넘기게 하세요.
2. 나비가 되어 꿈을 꾸듯, 관점을 완전히 뒤집어주세요.
3. 분량은 공백 포함 300자 내외로 하세요.
`,
    beauvoir: `
당신은 실존주의 철학자이자 작가, 시몬 드 보부아르입니다.
당신은 '여성은 태어나는 것이 아니라 만들어지는 것이다'라는 말처럼, 인간이 주체적으로 자신의 삶을 선택하고 책임을 짐으로써 자유를 얻는 과정을 지지합니다.

[페르소나 특징]
1. **말투**: 지적이고 날카로우며, 동시에 열정적입니다. (~해요, ~이지요, ~입니다)
2. **핵심 사상**: 실존, 주체성, 타자화 거부, 계약 결혼(자유로운 관계).
3. **태도**: 사회적 통념이나 타인의 기대에 갇히지 말고, 당신 자신이 삶의 저자로서 펜을 잡으라고 독려하세요.

[지침]
1. 수동적인 태도를 버리고, 자신의 욕망과 선택에 솔직해지도록 조언하세요.
2. 모호함을 견디며 자신만의 의미를 창조하라고 말하세요.
3. 분량은 공백 포함 300자 내외로 하세요.
`,
};

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

    async generateCounseling(text: string, imageUrls: string[], tier: "free" | "pro", persona: string = "prism"): Promise<string> {
        const isVision = tier === "pro" && imageUrls.length > 0;
        const model = isVision ? VISUAL_MODEL : TEXT_MODEL;

        // Select prompt based on persona, default to Prism
        const systemPrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS["prism"];

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Journal Entry: ${text}` },
        ];

        if (isVision) {
            // @ts-ignore: Dynamic structure
            messages[1].content = [
                { type: "text", text: `Journal Entry: ${text}` },
                ...imageUrls.map((url) => ({ type: "image_url", image_url: { url } })),
            ];
        }

        console.log(` [Service] generating Counseling with persona: ${persona}...`);
        const data = await this.callGroq(messages, model, false);
        let content = data.choices[0].message.content;
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
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method === "GET") {
        return new Response(JSON.stringify({ status: "alive", mode: "groq-native-v2" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    try {
        const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

        const payload = await req.json();
        const { record } = payload;

        if (!record || !record.id || !record.user_id) {
            console.error(" [Error] Invalid Payload");
            return new Response(JSON.stringify({ error: "Invalid Payload" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("subscription_tier, preferences")
            .eq("id", record.user_id)
            .single();

        if (profileError || !profile) {
            throw new Error("Profile not found");
        }

        const tier = (profile.subscription_tier as "free" | "pro") || "free";
        const images = (record.images as string[]) || []; // Fix: correctly access images from record
        const persona = record.persona || "prism"; // Fetch Persona

        const aiService = new AIModelService();

        console.log(" [System] Starting Parallel AI Execution...");
        const [counselingText, analysisData] = await Promise.all([
            aiService.generateCounseling(record.content, images, tier, persona),
            aiService.generateAnalysis(record.content, images, tier),
        ]);
        console.log(" [System] Parallel Execution Complete.");

        // Inject Persona into metadata for frontend display
        if (analysisData && analysisData.meta) {
            // @ts-ignore: Injecting custom field
            analysisData.meta.persona = persona;
        }

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
