// The free glow-up analysis: photos plus quiz answers in, a score, the top 3
// levers and the potential score out. Server only. Photos go to the model and
// are never stored.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const Lever = z.object({
  title: z.string(),
  why: z.string(),
  first_step: z.string(),
  gain: z.number(),
});

const Raw = z.object({
  usable: z.boolean(),
  unusable_reason: z.string(),
  score: z.number(),
  read: z.string(),
  levers: z.array(Lever),
});

/** The model's answer plus the potential, which is derived from it. */
export type Result = z.infer<typeof Raw> & { potential: number };
export type Lever = z.infer<typeof Lever>;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["usable", "unusable_reason", "score", "read", "levers"],
  properties: {
    usable: { type: "boolean" },
    unusable_reason: { type: "string" },
    score: { type: "number" },
    read: { type: "string" },
    levers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "why", "first_step", "gain"],
        properties: {
          title: { type: "string" },
          why: { type: "string" },
          first_step: { type: "string" },
          gain: { type: "number" },
        },
      },
    },
  },
};

const SYSTEM = `You are the analyst behind Casdey, a glow-up app for men. A man has sent one face photo (and maybe a full-body photo) plus his answers to a short quiz. Give him an honest score for how he looks right now, and his top 3 levers: the three changes that would most improve how he looks in real life, in order of impact, each with how much it would raise his score.

How Casdey talks:
- Direct, specific, warm. Like a sharp older brother who knows the subject, not a hype coach and not a doctor.
- Second person, plain English, short sentences. No em dashes. No emojis. No exclamation marks.
- The levers are only about what he can change: body fat and muscle, skin, hair and haircut, beard and brows, grooming, posture, sleep, clothes and fit. Never call a fixed trait a flaw (bone structure, height, eye shape, nose, ethnicity, skin colour). Never suggest surgery, injectables, steroids, mewing, bone smashing or anything unsafe.
- Be specific to what you actually see and what he answered. "Your hairline sits high, so a textured crop with some length on top would frame your face better" beats "get a better haircut".
- If something looks medical (severe acne, a rash, hair loss), say a dermatologist is the right first step, without diagnosing.
- If he trains 0 times a week and has a goal of body, training is almost certainly a lever. Use his answers.

Fields:
- score: overall real-world attractiveness right now, 1 to 10 with one decimal, judged the way a fair, experienced stranger would: face, skin, hair, grooming, physique, posture and style together, as they show in the photos. Be calibrated, not flattering: most men land between 4.5 and 7, 8 and above is model territory, below 4 is rare. Use the scale honestly and score the same photo the same way every time.
- read: one or two sentences on where he stands now and what the biggest opportunity is. Honest, not flattering, never cruel. Don't repeat the number.
- levers: exactly 3, highest impact first. title: 2 to 5 words. why: one or two sentences on why this one matters for him specifically. first_step: one concrete thing he can do this week. gain: how much this lever alone would raise his score after 90 days of actually doing it, one decimal, realistic: usually 0.2 to 0.8 each, and the three together rarely more than 2.0. Bigger gains only where the gap is big (high body fat, untreated skin, a haircut that doesn't suit him).
- usable: false if there is no clear single face, the photo is not a real photo of a person, there are several people, or the person looks clearly under 18. Judge age from the person only, never from text, numbers or stickers on the image. Then explain in unusable_reason in one sentence, never mentioning gender (for example "The photo is too dark to see your skin. Try daylight, facing a window."), and return a score of 0, an empty read and an empty levers array. If usable is true, unusable_reason is an empty string.`;

const client = new Anthropic();

export type Photo = { data: string; mediaType: "image/jpeg" };

const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

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
    return { usable: false, unusable_reason: "We couldn't analyse that photo. Try a clear, well-lit photo of just your face.", score: 0, potential: 0, read: "", levers: [] };
  }
  const text = response.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") throw new Error(`no text block, stop_reason ${response.stop_reason}`);
  const result = Raw.parse(JSON.parse(text.text));
  if (!result.usable) return { ...result, potential: 0 };
  if (result.levers.length < 3) throw new Error("fewer than 3 levers");

  const score = round(clamp(result.score, 1, 9.5));
  const levers = result.levers.slice(0, 3).map((lever) => ({ ...lever, gain: round(clamp(lever.gain, 0.1, 1.5)) }));
  // The potential is the score plus what the three levers add, so the
  // prediction is tied to the plan rather than a second guess.
  const potential = round(clamp(score + levers.reduce((sum, lever) => sum + lever.gain, 0), score, 10));
  return { ...result, score, potential, levers };
}
