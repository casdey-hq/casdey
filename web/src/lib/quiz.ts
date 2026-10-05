// The free analysis quiz. Shared by the page (to render it) and the API (to
// validate answers and describe them to the model). Order is the order asked.

export type Choice = { value: string; label: string };
export type Question = { id: string; title: string; hint?: string; choices: Choice[] };

export const QUESTIONS: Question[] = [
  {
    id: "goal",
    title: "What do you want to improve most?",
    choices: [
      { value: "body", label: "Body" },
      { value: "face", label: "Face and skin" },
      { value: "style", label: "Style" },
      { value: "discipline", label: "Discipline" },
    ],
  },
  {
    id: "age",
    title: "How old are you?",
    choices: [
      { value: "under18", label: "Under 18" },
      { value: "18-21", label: "18 to 21" },
      { value: "22-25", label: "22 to 25" },
      { value: "26-30", label: "26 to 30" },
      { value: "31+", label: "31 or older" },
    ],
  },
  {
    id: "training",
    title: "How often do you train?",
    choices: [
      { value: "never", label: "I don't" },
      { value: "1-2", label: "1 or 2 times a week" },
      { value: "3-4", label: "3 or 4 times a week" },
      { value: "5+", label: "5 or more" },
    ],
  },
  {
    id: "sleep",
    title: "How much do you sleep on a normal night?",
    choices: [
      { value: "<6", label: "Under 6 hours" },
      { value: "6-7", label: "6 to 7 hours" },
      { value: "7-8", label: "7 to 8 hours" },
      { value: "8+", label: "More than 8" },
    ],
  },
  {
    id: "skincare",
    title: "What do you do for your skin?",
    choices: [
      { value: "nothing", label: "Nothing" },
      { value: "wash", label: "Just wash my face" },
      { value: "some", label: "A few products" },
      { value: "routine", label: "A full routine" },
    ],
  },
  {
    id: "skin",
    title: "Your biggest skin issue?",
    choices: [
      { value: "acne", label: "Breakouts" },
      { value: "oily", label: "Oily or shiny" },
      { value: "dry", label: "Dry or flaky" },
      { value: "tired", label: "Tired, dark circles" },
      { value: "none", label: "None really" },
    ],
  },
  {
    id: "hair",
    title: "How do you feel about your hair?",
    choices: [
      { value: "happy", label: "Happy with it" },
      { value: "nostyle", label: "No real style" },
      { value: "unsure", label: "Not sure what suits me" },
      { value: "thinning", label: "Thinning or receding" },
    ],
  },
  {
    id: "style",
    title: "How would you describe how you dress?",
    choices: [
      { value: "none", label: "I don't think about it" },
      { value: "basic", label: "Basic and safe" },
      { value: "decent", label: "Decent, could be sharper" },
      { value: "sharp", label: "Already put together" },
    ],
  },
  {
    id: "blocker",
    title: "What stopped you before?",
    hint: "Be honest. Your plan is built around this.",
    choices: [
      { value: "noplan", label: "No clear plan" },
      { value: "consistency", label: "I start, then stop" },
      { value: "time", label: "No time" },
      { value: "where", label: "Didn't know where to start" },
    ],
  },
];

export type Units = "metric" | "imperial";
export type Body = { units: Units; height: number; weight: number };

/** Height in cm and weight in kg, whatever units were typed. */
export function toMetric(body: Body): { cm: number; kg: number } {
  return body.units === "metric"
    ? { cm: body.height, kg: body.weight }
    : { cm: Math.round(body.height * 2.54), kg: Math.round(body.weight * 0.4536) };
}

export function validAnswers(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object") return false;
  const answers = value as Record<string, unknown>;
  return QUESTIONS.every((q) => typeof answers[q.id] === "string" && q.choices.some((c) => c.value === answers[q.id]));
}

export function validBody(value: unknown): value is Body {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (body.units !== "metric" && body.units !== "imperial") return false;
  if (typeof body.height !== "number" || typeof body.weight !== "number") return false;
  const { cm, kg } = toMetric(body as Body);
  return cm >= 130 && cm <= 230 && kg >= 35 && kg <= 250;
}

/** The answers as plain lines, for the model and the email. */
export function describe(answers: Record<string, string>, body: Body): string {
  const { cm, kg } = toMetric(body);
  const lines = QUESTIONS.map((q) => `${q.title} ${q.choices.find((c) => c.value === answers[q.id])?.label}`);
  lines.splice(2, 0, `Height ${cm} cm, weight ${kg} kg.`);
  return lines.join("\n");
}
