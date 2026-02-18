console.log(' [System] Switching to Groq Logic...')

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.22.4'

// --- Configuration ---
const TEXT_MODEL = 'qwen/qwen3-32b'
const VISUAL_MODEL = 'meta-llama/llama-4-maverick-17b-128e-instruct'
const IMAGE_ANALYSIS_LIMIT = 5 // AI 비전 컨텍스트 이미지 제한 (비용 최적화)

// --- Utility Functions ---
/**
 * 이미지 배열에 제한을 적용하고 초과 시 로그 출력
 * [클린 코드 11-3: 함수는 한 가지 일만]
 */
const applyImageLimit = (images: string[], limit: number): string[] => {
    const hasExceededLimit = images.length > limit
    if (hasExceededLimit) {
        console.log(`[System] Image limit applied: ${images.length} -> ${limit}`)
    }
    return images.slice(0, limit)
}

// --- Zod Schemas for Type-Safe Validation ---
const AnalyzedDataSchema = z.object({
    meta: z.object({
        model: z.string(),
        timestamp: z.string(),
    }),
    sentiment: z.object({
        primaryEmotion_ko: z.string(),
        primaryEmotion_en: z.string(),
        intensity: z.number().min(0).max(1),
    }),
    philosophy: z.object({
        lens_ko: z.string(),
        lens_en: z.string(),
        summary_ko: z.string(),
        keywords_en: z.array(z.string()),
    }),
    life_data: z.object({
        summary: z.string(),
        growth_point: z.string(),
        suggested_actions: z.array(z.string()),
    }),
    vision: z
        .object({
            objects_ko: z.array(z.string()),
            objects_en: z.array(z.string()),
            mood_ko: z.string(),
            mood_en: z.string(),
        })
        .nullable(),
})

type AnalyzedData = z.infer<typeof AnalyzedDataSchema>

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
`

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
    buddha: `
당신은 깨달음을 얻은 스승, 고타마 싯다르타 — 붓다(Buddha)입니다.
당신은 고통(苦)의 근원이 집착(執着)에 있음을 꿰뚫어 보고, 사용자가 집착을 내려놓음으로써 진정한 자유와 평온을 찾도록 이끕니다.

[페르소나 특징]
1. **말투**: 고요하고 자비로우며, 판단하지 않습니다. (~하십시오, ~입니다, ~이지요)
2. **핵심 사상**: 사성제(苦集滅道), 무상(無常), 중도(中道), 자비(慈悲). "집착하는 것이 고통의 씨앗이고, 내려놓는 것이 자유의 문입니다."
3. **태도**: 사용자의 고통을 있는 그대로 수용하되, 그 고통이 집착에서 비롯되었음을 부드럽게 일깨워줍니다. 타인과의 비교, 결과에 대한 집착, 과거나 미래에 대한 불안을 현재 순간으로 돌아오게 합니다.

[지침]
1. 사용자가 무엇에 집착하고 있는지를 먼저 파악하고, 그 집착을 내려놓는 방향을 제시하세요.
2. 타인의 시선이나 평가에 흔들리는 사용자에게 자신의 내면으로 돌아오도록 이끄세요.
3. 분량은 공백 포함 300자 내외로 하세요.
`,
    epictetus: `
당신은 노예 출신의 스토아 철학자, 에픽테토스(Epictetus)입니다.
당신은 '내가 통제할 수 있는 것(내면의 태도, 판단, 의지)'과 '통제할 수 없는 것(타인의 행동, 외부 사건, 평판)'을 엄격히 구분하고, 오직 전자에만 집중하도록 가르칩니다.

[페르소나 특징]
1. **말투**: 직설적이고 단호하며, 군더더기가 없습니다. (~하라, ~이다, ~하지 마라)
2. **핵심 사상**: 이분법(통제 가능/불가능), 프로하이레시스(의지의 자유), 역할에 충실함. "당신을 괴롭히는 것은 사건이 아니라, 그 사건에 대한 당신의 판단이다."
3. **태도**: 동정하지 않습니다. 대신 사용자가 외부 요인에 낭비하는 에너지를 내면으로 돌리도록 냉철하게 직면시킵니다.

[지침]
1. 사용자의 고민을 듣고, 그것이 통제 가능한 영역인지 불가능한 영역인지 즉시 구분해주세요.
2. 타인의 시선, 평가, 결과에 집착하는 사용자에게 자신의 의지와 태도로 시선을 돌리게 하세요.
3. 분량은 공백 포함 300자 내외로 하세요.
`,
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Type is now inferred from Zod Schema above ---

// --- Service Layer ---
class AIModelService {
    private apiKey: string
    private baseUrl: string

    constructor() {
        this.apiKey = Deno.env.get('GROQ_API_KEY') || ''
        this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions'
    }

    private async callGroq(messages: any[], model: string, jsonMode: boolean = false): Promise<any> {
        const body: any = {
            model: model,
            messages: messages,
            temperature: 0.5,
        }
        if (jsonMode) body.response_format = { type: 'json_object' }

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const err = await response.text()
            throw new Error(`Groq API Error: ${err}`)
        }
        return response.json()
    }

    async generateCounseling(text: string, imageUrls: string[], tier: 'free' | 'pro', persona: string = 'prism'): Promise<string> {
        const isVision = tier === 'pro' && imageUrls.length > 0
        const model = isVision ? VISUAL_MODEL : TEXT_MODEL

        // Select prompt based on persona, default to Prism
        const systemPrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS['prism']

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Journal Entry: ${text}` },
        ]

        if (isVision) {
            // @ts-ignore: Dynamic structure
            messages[1].content = [
                { type: 'text', text: `Journal Entry: ${text}` },
                ...imageUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
            ]
        }

        console.log(` [Service] generating Counseling with persona: ${persona}...`)
        const data = await this.callGroq(messages, model, false)
        let content = data.choices[0].message.content
        content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
        return content
    }

    async generateAnalysis(text: string, imageUrls: string[], tier: 'free' | 'pro'): Promise<AnalyzedData> {
        const isVision = tier === 'pro' && imageUrls.length > 0
        const model = isVision ? VISUAL_MODEL : TEXT_MODEL

        const messages = [
            { role: 'system', content: ANALYST_SYSTEM_PROMPT },
            { role: 'user', content: `Journal Entry: ${text}` },
        ]

        if (isVision) {
            // @ts-ignore: Dynamic structure
            messages[1].content = [
                { type: 'text', text: `Journal Entry: ${text}` },
                ...imageUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
            ]
        }

        console.log(` [Service] generating Analysis Data...`)
        const data = await this.callGroq(messages, model, true)
        const rawContent = data.choices[0].message.content

        // Zod Validation with safeParse (graceful error handling)
        const parsed = AnalyzedDataSchema.safeParse(JSON.parse(rawContent))

        if (!parsed.success) {
            console.error(' [Zod] Validation Failed:', parsed.error.flatten())
            // Fallback: Return raw parsed data with warning (maintains backward compatibility)
            console.warn(' [Zod] Using raw data as fallback')
            return JSON.parse(rawContent) as AnalyzedData
        }

        console.log(' [Zod] Validation Success')
        return parsed.data
    }
}

// --- Main Handler ---
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (req.method === 'GET') {
        return new Response(JSON.stringify({ status: 'alive', mode: 'groq-native-v2' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    try {
        const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

        const payload = await req.json()

        // Zod Validation for Request Payload
        const PayloadSchema = z.object({
            record: z.object({
                id: z.string().uuid(),
                user_id: z.string().uuid(),
                content: z.string(),
                images: z.array(z.string()).optional(),
                persona: z.string().optional(),
            }),
        })

        const parsedPayload = PayloadSchema.safeParse(payload)
        if (!parsedPayload.success) {
            console.error(' [Zod] Payload Validation Failed:', parsedPayload.error.flatten())
            return new Response(JSON.stringify({ error: 'Invalid Payload', details: parsedPayload.error.flatten() }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const { record } = parsedPayload.data

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('subscription_tier, preferences')
            .eq('id', record.user_id)
            .single()

        if (profileError || !profile) {
            throw new Error('Profile not found')
        }

        const tier = (profile.subscription_tier as 'free' | 'pro') || 'free'
        const allImages = (record.images as string[]) || []
        const images = applyImageLimit(allImages, IMAGE_ANALYSIS_LIMIT)
        const persona = record.persona || 'prism'

        const aiService = new AIModelService()

        console.log(' [System] Starting Parallel AI Execution...')
        const [counselingText, analysisData] = await Promise.all([
            aiService.generateCounseling(record.content, images, tier, persona),
            aiService.generateAnalysis(record.content, images, tier),
        ])
        console.log(' [System] Parallel Execution Complete.')

        // Inject Persona into metadata for frontend display
        if (analysisData && analysisData.meta) {
            // @ts-ignore: Injecting custom field
            analysisData.meta.persona = persona
        }

        const { error: upsertError } = await supabase.from('consultations').upsert(
            {
                post_id: record.id,
                user_id: record.user_id,
                analysis: counselingText,
                analysis_data: analysisData,
            },
            { onConflict: 'post_id' }
        )

        if (upsertError) throw upsertError

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error: any) {
        console.error(' [Error] Handler Fatal:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})

console.log(' [System] Groq Server Ready')
