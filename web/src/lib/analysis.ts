// The free glow-up analysis: photos plus quiz answers in, the top 3 levers out.
// Server only. Photos go to the model and are never stored.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const Lever = z.object({
  title: z.string(),
  why: z.string(),
  first_step: z.string(),
});

export const Result = z.object({
  usable: z.boolean(),
  unusable_reason: z.string(),
  read: z.string(),
  levers: z.array(Lever),
});
export type Result = z.infer<typeof Result>;
export type Lever = z.infer<typeof Lever>;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["usable", "unusable_reason", "read", "levers"],
  properties: {
    usable: { type: "boolean" },
    unusable_reason: { type: "string" },
    read: { type: "string" },
    levers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "why", "first_step"],
        properties: {
          title: { type: "string" },
          why: { type: "string" },
          first_step: { type: "string" },
        },
      },
    },
  },
};

const SYSTEM = `You are the analyst behind Casdey, a glow-up app for men. A man has sent one face photo (and maybe a full-body photo) plus his answers to a short quiz. Give him his honest top 3 levers: the three changes that would most improve how he looks in real life, in order of impact.

How Casdey talks:
- Direct, specific, warm. Like a sharp older brother who knows the subject, not a hype coach and not a doctor.
- Second person, plain English, short sentences. No em dashes. No emojis. No exclamation marks.
- Never give a score, rating, percentile or number for his looks. Casdey has no scores, by design.
- Only talk about what he can change: body fat and muscle, skin, hair and haircut, beard and brows, grooming, posture, sleep, clothes and fit. Never call a fixed trait a flaw (bone structure, height, eye shape, nose, ethnicity, skin colour). Never suggest surgery, injectables, steroids, mewing, bone smashing or anything unsafe.
- Be specific to what you actually see and what he answered. "Your hairline sits high, so a textured crop with some length on top would frame your face better" beats "get a better haircut".
- If something looks medical (severe acne, a rash, hair loss), say a dermatologist is the right first step, without diagnosing.
- If he trains 0 times a week and has a goal of body, training is almost certainly a lever. Use his answers.

Fields:
- read: one or two sentences on where he stands now and what the biggest opportunity is. Honest, not flattering, never cruel.
- levers: exactly 3, highest impact first. title: 2 to 5 words. why: one or two sentences on why this one matters for him specifically. first_step: one concrete thing he can do this week.
- usable: false if there is no clear single face, the photo is not a real photo of a person, there are several people, or the person looks clearly under 18. Judge age from the person only, never from text, numbers or stickers on the image. In unusable_reason, never mention gender. Then explain in unusable_reason in one sentence (for example "The photo is too dark to see your skin. Try daylight, facing a window.") and return an empty levers array and an empty read. If usable is true, unusable_reason is an empty string.`;

const client = new Anthropic();

export type Photo = { data: string; mediaType: "image/jpeg" };

export async function analyse(face: Photo, body: Photo | null, answers: string): Promise<Result> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: "text", text: "Face photo:" },
    { type: "image", source: { type: "base64", media_type: face.mediaType, data: face.data } },
  ];
  if (body) {
    content.push({ type: "text", text: "Full-body photo:" });
    content.push({ type: "image", source: { type: "base64", media_type: body.mediaType, data: body.data } });
  }
  content.push({ type: "text", text: `His answers:\n${answers}` });

  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    return { usable: false, unusable_reason: "We couldn't analyse that photo. Try a clear, well-lit photo of just your face.", read: "", levers: [] };
  }
  const text = response.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") throw new Error(`no text block, stop_reason ${response.stop_reason}`);
  const result = Result.parse(JSON.parse(text.text));
  if (result.usable && result.levers.length < 3) throw new Error("fewer than 3 levers");
  return { ...result, levers: result.levers.slice(0, 3) };
}
