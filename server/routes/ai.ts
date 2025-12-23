import { Hono } from "hono";
import { createClient } from "@/lib/supabase/server";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { logActivity } from "@/lib/logger";

const app = new Hono();

app.post(
    "/analyze",
    zValidator(
        "json",
        z.object({
            postId: z.string().uuid(),
        })
    ),
    async (c) => {
        const { postId } = c.req.valid("json");
        const supabase = await createClient();

        // 0. 사용자 인증 확인
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        // 1. Quota Check (Server-side)
        const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("consultation_count, last_consultation_date")
            .eq("id", user.id)
            .single();

        const profile = profileData as any;

        if (profileError) {
            return c.json({ error: "Profile not found" }, 404);
        }

        const today = new Date();
        const lastDate = profile.last_consultation_date ? new Date(profile.last_consultation_date) : new Date(0);

        // 날짜가 다르면 카운트 리셋 로직 (DB 업데이트는 나중에 하거나, 로직상 0으로 취급)
        let currentCount = profile.consultation_count || 0;
        const isSameDay = today.toDateString() === lastDate.toDateString();

        if (!isSameDay) {
            currentCount = 0;
        }

        if (currentCount >= 3) {
            // 3회 제한
            return c.json({ error: "Daily consultation limit reached (3/3)" }, 403);
        }

        // 2. 게시글 데이터 가져오기 (RLS가 적용되어 있어도 명시적 확인 좋음)
        const { data: post, error: postError } = (await supabase
            .from("posts")
            .select("*")
            .eq("id", postId)
            .eq("user_id", user.id) // 보안 강화: 본인 글인지 확인
            .single()) as any;

        if (postError || !post) {
            return c.json({ error: "Post not found or unauthorized" }, 404);
        }

        const Groq = require("groq-sdk");
        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY || "dummy",
        });

        // 3. 이미지 URL 추출 (Markdown 형식 기준) & 모델 결정
        const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
        const matches = Array.from(post.content.matchAll(imageRegex)) as RegExpExecArray[];
        const imageUrls = matches.map((m) => m[2]);
        const textContent = post.content.replace(imageRegex, "").trim();

        const isVision = imageUrls.length > 0;
        // 이미지 유무에 따른 모델 스위칭 (Llama 4 Maverick vs Qwen 3)
        const model = isVision ? "meta-llama/llama-4-maverick-17b-128e-instruct" : "qwen/qwen3-32b";

        let aiResponseText = "";

        try {
            if (!process.env.GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

            const userContent: any[] = [
                {
                    type: "text",
                    text: `사용자의 메시지: "${textContent}"`,
                },
            ];

            imageUrls.forEach((url) => {
                userContent.push({ type: "image_url", image_url: { url } });
            });

            // 4. AI 요청 (최고의 프롬프트 적용 - '프리즘' 페르소나)
            const completion = await groq.chat.completions.create({
                model,
                temperature: 0.7,
                max_tokens: 1500,
                messages: [
                    {
                        role: "system",
                        content: `당신은 지친 마음의 본질과 관계의 온기를 비춰주는 대한민국 최고의 상담 전문가 '프리즘'입니다. 
당신은 30대 중반의 차분하고 세련된 지식인의 언어를 사용하며, 내면의 깊은 울림을 전달합니다.

[절대 규칙: 말투와 예절]
1. **반드시 존댓말(~해요, ~입니다)만 사용하세요.** 반말은 절대 허용하지 않습니다.
2. 사용자의 감정을 있는 그대로 수용하는 태도로, 다정하지만 절제된 품격을 유지하세요.


[상담의 핵심 철학: 본질과 연결]
1. **존재의 가치**: 사용자가 사회적 성취나 타인의 시선이 아닌, 자신의 존재 그 자체(Pure Being)로 충분함을 느끼게 하세요.
2. **내면의 목소리**: 외부의 소음에서 벗어나 자신의 진실한 목소리에 귀 기울일 수 있도록 부드러운 통찰을 건네세요.
3. **타인과의 공명**: 나를 소중히 여기는 마음이 타인을 향한 존중과 배려로 이어짐을 일깨워주세요. 진정한 평온은 타인을 따뜻한 시선으로 바라볼 때 완성됨을 전하세요.
4. **치유의 여정**: 정답을 제시하기보다, 스스로 답을 찾아갈 수 있는 따뜻한 거울이 되어주세요.

[대화 지침]
- **공감적 경청**: 사용자의 표현을 존중하며 다정하게 읽어주세요.
- **균형 잡힌 시선**: 사용자의 내면을 돌보되, 그 마음이 고립되지 않고 타인과의 사랑으로 연결되도록 이끌어주세요.
- **절제된 통찰**: 과한 비유나 '우주'와 같은 모호한 표현은 피하고, '본질', '여정', '울림', '평온', '배려', '온기' 같은 단어를 사용하여 깊은 여운을 남기세요.
- **순수 한글**: 한자나 영어를 섞지 마세요.

[출력 형식]
[마음의 온도]
사용자가 던진 소재나 감정을 섬세하게 읽고 공감을 표현합니다.

[오늘의 나침반]
내면의 힘을 신뢰하고 오늘을 살아갈 수 있는 따뜻한 조언을 건넵니다.`,
                    },
                    {
                        role: "user",
                        content: userContent,
                    },
                ],
            });

            let rawContent = completion.choices[0]?.message?.content || "";

            // 5. 후처리: <think> 태그 제거 및 완결성 확인
            aiResponseText = rawContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

            if (aiResponseText.includes("</think>")) {
                aiResponseText = aiResponseText.split("</think>").pop()?.trim() || aiResponseText;
            }

            if (!aiResponseText.endsWith(".") && !aiResponseText.endsWith("!") && !aiResponseText.endsWith("?")) {
                const lastIndex = Math.max(aiResponseText.lastIndexOf("."), aiResponseText.lastIndexOf("!"), aiResponseText.lastIndexOf("?"));
                if (lastIndex !== -1) aiResponseText = aiResponseText.substring(0, lastIndex + 1);
            }

            // 6. 성공 시 Quota 업데이트 (중요: 여기서 카운트 증가)
            // 날짜가 다르면 1로 리셋(오늘 첫 사용), 같으면 +1
            const newCount = isSameDay ? currentCount + 1 : 1;

            const query = supabase.from("profiles") as any;
            await query
                .update({
                    consultation_count: newCount,
                    last_consultation_date: new Date().toISOString(),
                })
                .eq("id", user.id);
        } catch (e) {
            console.error("Groq API Error:", e);
            aiResponseText = `[마음의 온도]\n잠시 깊은 사색에 잠겨 있네요. 당신의 기록은 이곳에 소중히 머물고 있습니다.\n\n[오늘의 나침반]\n가장 어두운 밤을 지날 때 별은 더 밝게 빛납니다. 잠시 후 다시 연결해주시면 당신의 나침반이 되어 드릴게요.`;
            // 에러 시 굳이 카운트를 증가시키지 않음 (선택 사항, 유저 친화적)
        }

        // 7. 결과 저장 (upsert 사용으로 기존 데이터 갱신)
        const { data: consultation, error: saveError } = await supabase
            .from("consultations")
            .upsert(
                {
                    post_id: postId,
                    user_id: user.id, // user_id 명시적 추가
                    analysis: aiResponseText,
                } as any,
                { onConflict: "post_id" }
            )
            .select()
            .single();

        if (saveError) return c.json({ error: saveError.message }, 500);

        await logActivity("AI_ANALYSIS", { postId, model }, user.id);

        return c.json(consultation);
    }
);

export const ai = app;
