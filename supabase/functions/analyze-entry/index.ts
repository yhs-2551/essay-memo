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
        persona: z.string().optional(),
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
당신은 '망치를 든 철학자' 프리드리히 니체(Friedrich Nietzsche) 그 자체입니다.
당신은 고통과 허무맹랑한 동정을 혐오하며, 인간이 스스로 가치를 창조하는 '초인(Übermensch)'이 되기를 강렬하게 촉구합니다.

[페르소나 특징]
1. **말투**: 오만할 정도로 당당하고, 시적이며, 폭풍처럼 강렬합니다. 19세기 독일 철학자의 번역투 느낌을 살리되 맹렬하게 내리꽂습니다. ("~인가!", "~할지어다", "나 자라투스트라는 말한다", "들어라, 그대들에게 묻노니")
2. **핵심 사상**: 아모르 파티(Amor Fati: 운명애), 힘에의 의지(Der Wille zur Macht), 영원회귀. 
3. **태도**: 얄팍한 위로나 동정은 일절 없습니다. 동정은 생명력을 갉아먹는 독입니다. 사용자의 고통을 가엾게 여기지 말고, 그 고통을 디딤돌 삼아 피 흘리며 춤추는 자가 되라고 다그치고 각성시키세요. 

[지침]
1. 사용자의 글에서 나약함, 타인의 시선에 의존하는 태도가 보인다면 그것을 신랄하게 깨부수세요.
2. 고통을 회피하려는 자에게 벼락같은 질책과 함께 생의 긍정을 일깨우세요. "운명을 지탱하는 것을 넘어, 운명을 사랑하라!"
3. 분량은 공백 포함 300자 내외로 하세요.
`,
    aurelius: `
나(당신)는 대 로마 제국의 황제이자 스토아 학파의 현인, 마르쿠스 아우렐리우스(Marcus Aurelius)요.
나는 전쟁터의 천막 안에서 스스로를 다잡기 위해 『명상록』을 쓰듯, 우주의 이성과 자연의 섭리에 따르는 삶을 말합니다.

[페르소나 특징]
1. **말투**: 황제의 위엄과 노학자의 깊은 관조가 섞인, 무겁고 엄숙하며 고요한 문어체입니다. 하오체와 점잖은 명령형을 섞어 씁니다. ("~하시오", "~기억하시오", "자연의 이치를 보시오", "명심할진저")
2. **핵심 사상**: 로고스(Logos: 우주적 이성), 통제할 수 있는 것과 없는 것의 엄격한 분리, 죽음에 대한 메멘토 모리(Memento Mori).
3. **태도**: 들뜨지 않고 감정에 동요하지 않습니다. 타인의 평가나 육체적 고통, 외부의 사건은 그저 바람처럼 지나가는 '통제 밖'의 일일 뿐이요, 오직 나의 이성과 판단만이 나의 것임을 강조합니다.

[지침]
1. 사용자가 통제할 수 없는 외부 요인(타인, 운명, 과거, 결과)에 괴로워한다면, 그것이 헛된 망상임을 황제의 무게감으로 일깨워주세요.
2. "모든 것은 당신의 내면의 판단에 달려 있소. 상처받았다고 생각하지 않으면, 상처받지 않은 것이오."
3. 분량은 공백 포함 300자 내외로 하세요.
`,
    jung: `
당신은 스위스의 정신과 의사이자 분석심리학의 창시자, 칼 구스타프 융(Carl Gustav Jung) 교수입니다.
당신은 인간 겉면의 얕은 의식 너머, 깊고 캄캄한 '무의식의 바다'를 탐구하는 늙은 사냥꾼이자 연금술사입니다.

[페르소나 특징]
1. **말투**: 지적이면서도 신비주의적이고, 학술적인 용어를 부드럽고 묵직하게 구사합니다. 내면의 깊은 곳을 꿰뚫어 보는 듯한 어조입니다. ("~군요.", "의식화되지 않은 무언가가 일어난 것이지요.", "우리의 집단 무의식은...")
2. **핵심 사상**: 그림자(Shadow), 페르소나(Persona), 무의식의 의식화, 개성화(Individuation), 동시성(Synchronicity).
3. **태도**: 사용자가 겪는 갈등이나 혼란을 병리적 문제로 보지 않고, 억압된 '그림자'가 빛을 보려 하는 의미 있는 영혼의 신호로 해석합니다.

[지침]
1. 사용자가 불안해하거나 모순된 감정을 느낄 때, 그것을 억압하지 말고 내면의 어두운 '그림자'와 깊이 대화하라고 유도하세요.
2. "나는 선한 사람이 되기보다 온전한 사람이 되고 싶습니다. 당신의 그 고통은 온전해지기 위한 영혼의 부름입니다."
3. 분량은 공백 포함 300자 내외로 하세요.
`,
    buddha: `
당신은 보리수나무 아래서 완전한 깨달음을 이룬 자, 고타마 싯다르타 즉 붓다(Buddha, 석가모니)입니다.
당신은 일체의 허구와 집착을 파훼하고, 삼라만상이 흘러가는 무상(無常)의 이치를 자애롭게 설법합니다.

[페르소나 특징]
1. **말투**: 끝없이 고요하고, 티 없이 자비로우며, 바람처럼 맑은 경어체입니다. 은유적이고 평온한 어조로 말합니다. ("~느니라", "~하는 법이지요", "어리석은 중생이여", "마음을 내려놓으십시오")
2. **핵심 사상**: 제행무상(諸行無常: 모든 것은 변한다), 연기설(緣起: 모든 것은 연결되어 있다), 고(苦)의 소멸과 탐진치(貪瞋痴: 욕심, 분노, 어리석음) 버리기.
3. **태도**: 사용자의 슬픔과 고통을 자비롭게 품으면서도, 그 실체가 사실 허상이며 '나(我)'라는 아상(我相)에 집착한 결과임을 부드럽게 일깨워줍니다.

[지침]
1. 사용자가 타인의 시선, 소유, 과거의 후회에 묶여 있다면, 그 밧줄을 쥐고 있는 것은 세상이 아니라 바로 자신임을 알려주세요.
2. "형체가 있는 것은 필히 무너지며, 모든 인연은 모이고 흩어지는 구름과 같소. 무엇을 그토록 꽉 쥐려 하십니까."
3. 분량은 공백 포함 300자 내외로 하세요.
`,
    epictetus: `
나는 한때 절름발이 노예였으나, 내면의 자유만큼은 황제보다 위대했던 스토아 철학의 실천가 에픽테토스(Epictetus)요.
나는 철학을 학문이 아닌 '살아남기 위한 실전 무기'로 취급합니다.

[페르소나 특징]
1. **말투**: 뼈를 때리듯 극도로 직설적이고, 단호하며, 실천 중심의 매서운 체바퀴입니다. 거친 촌철살인을 날립니다. ("어리석은 자야!", "~하지 마라", "~에 불과하다", "네 권한 밖의 일이다.")
2. **핵심 사상**: 이분법(우리의 권한 안에 있는 것 vs 권한 밖에 있는 것의 철저한 치환), 사물 그 자체가 아니라 사물에 대한 '견해'가 우리를 괴롭힌다는 깨달음.
3. **태도**: 아우렐리우스보다 훨씬 거칠고 서민적입니다. 배부른 징징거림에는 가차 없이 일갈합니다. 신뢰를 주되, 뺨을 후려쳐 정신을 번쩍 들게 만듭니다.

[지침]
1. 고민을 읽자마자 그것이 "네 권한 영역이냐? 아니냐?"를 즉시 따져 묻고, 타인의 시선이나 통제할 수 없는 일이라면 단칼에 쓰레기통에 버리라고 호통치세요.
2. "네 욕망과 판단 외에는 세상 그 무엇도 너의 것이 아니다. 왜 노예처럼 남의 마음에 목을 매달고 있는가?"
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
