"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * What Davide can change from /admin: tick, dismiss, accept or add a to-do,
 * and edit a written note. Each action checks the founder gate itself, since
 * a server action is reachable by anyone who can post to the page.
 *
 * Errors come back as a sentence saying what went wrong, never a generic
 * "try again" (IMPROVEMENTS.md #9).
 */

export type HqActionState = { error: string | null };

const Status = z.enum(["open", "done", "dismissed"]);

export async function setTodoStatus(id: string, status: string): Promise<HqActionState> {
  await requireAdmin();
  const parsed = Status.safeParse(status);
  if (!parsed.success || !z.uuid().safeParse(id).success) {
    return { error: "That to-do could not be found. Reload the page." };
  }
  const { error } = await supabaseAdmin()
    .from("hq_todos")
    .update({
      status: parsed.data,
      closed_at: parsed.data === "open" ? null : new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: `The database refused the change: ${error.message}` };
  revalidatePath("/admin");
  return { error: null };
}

/**
 * Ticking or dismissing a live signal stores its key, so the same situation
 * stays ticked on every later load. Upsert on the key: ticking twice, or from
 * two tabs, is one row.
 */
export async function closeSignal(
  key: string,
  title: string,
  status: string,
): Promise<HqActionState> {
  await requireAdmin();
  const parsed = Status.safeParse(status);
  if (!parsed.success || !key || key.length > 200) {
    return { error: "That to-do could not be found. Reload the page." };
  }
  const { error } = await supabaseAdmin()
    .from("hq_todos")
    .upsert(
      {
        signal_key: key,
        title: title.slice(0, 300) || key,
        source: "signal",
        status: parsed.data,
        closed_at: parsed.data === "open" ? null : new Date().toISOString(),
      },
      { onConflict: "signal_key" },
    );
  if (error) return { error: `The database refused the change: ${error.message}` };
  revalidatePath("/admin");
  return { error: null };
}

const NewTodo = z.object({
  title: z.string().trim().min(1, "Write what needs doing.").max(300, "Keep the title under 300 characters."),
  detail: z.string().trim().max(2000).optional(),
  due: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

export async function addTodo(
  _previous: HqActionState,
  form: FormData,
): Promise<HqActionState> {
  await requireAdmin();
  const parsed = NewTodo.safeParse({
    title: form.get("title") ?? "",
    detail: form.get("detail") ?? undefined,
    due: form.get("due") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the to-do." };
  }
  const { error } = await supabaseAdmin().from("hq_todos").insert({
    title: parsed.data.title,
    detail: parsed.data.detail || null,
    due: parsed.data.due || null,
    source: "manual",
    status: "open",
  });
  if (error) return { error: `The database refused the new to-do: ${error.message}` };
  revalidatePath("/admin");
  return { error: null };
}

const Note = z.object({
  key: z.string().regex(/^[a-z0-9_]{1,64}$/),
  body: z.string().max(50_000, "That is longer than a note can hold (50,000 characters)."),
});

export async function saveNote(
  _previous: HqActionState,
  form: FormData,
): Promise<HqActionState> {
  await requireAdmin();
  const parsed = Note.safeParse({ key: form.get("key"), body: form.get("body") ?? "" });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the note." };
  }
  const { error } = await supabaseAdmin()
    .from("hq_notes")
    .update({
      body: parsed.data.body,
      updated_at: new Date().toISOString(),
      updated_by: "davide",
    })
    .eq("key", parsed.data.key);
  if (error) return { error: `The database refused the note: ${error.message}` };
  revalidatePath("/admin");
  return { error: null };
}
