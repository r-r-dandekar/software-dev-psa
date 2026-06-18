"use client";

import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { updateTaskAction, deleteTaskAction } from "./actions";
import type { Task } from "@/lib/db/types";

const cls = "h-8 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function TaskRow({
  projectId,
  task,
  locked,
}: {
  projectId: string;
  task: Task;
  locked: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing && !locked) {
    return (
      <tr className="border-t bg-muted/30 align-top">
        <td colSpan={5} className="px-3 py-2">
          <form action={updateTaskAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="taskId" value={task.id} />
            <div className="min-w-[200px] flex-1 text-sm font-medium">{task.title}</div>
            <select name="discipline" defaultValue={task.discipline} className={cls}>
              <option value="frontend">frontend</option>
              <option value="backend">backend</option>
              <option value="qa">qa</option>
              <option value="pm">pm</option>
            </select>
            <input
              name="minHours"
              type="number"
              step="0.5"
              defaultValue={task.min_hours}
              className={`${cls} w-20`}
              aria-label="Min hours"
            />
            <input
              name="maxHours"
              type="number"
              step="0.5"
              defaultValue={task.max_hours}
              className={`${cls} w-20`}
              aria-label="Max hours"
            />
            <select name="uncertainty" defaultValue={task.uncertainty} className={cls}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            <input
              name="overrideNote"
              defaultValue={task.override_note ?? ""}
              placeholder="Override note (optional)"
              className={`${cls} min-w-[160px] flex-1`}
            />
            <SubmitButton size="sm" pendingLabel="Saving…">Save</SubmitButton>
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditing(false)}>
              <X className="size-3.5" />
            </Button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t">
      <td className="px-3 py-2">
        {task.title}
        {task.override_note ? (
          <span className="ml-2 text-xs text-muted-foreground">({task.override_note})</span>
        ) : null}
      </td>
      <td className="px-3 py-2 text-muted-foreground">{task.discipline}</td>
      <td className="px-3 py-2 tabular-nums">{task.min_hours}</td>
      <td className="px-3 py-2 tabular-nums">{task.max_hours}</td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary">{task.uncertainty}</Badge>
          {!locked ? (
            <span className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Edit task"
                onClick={() => setEditing(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
              <form action={deleteTaskAction}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="taskId" value={task.id} />
                <button
                  type="submit"
                  aria-label="Delete task"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </form>
            </span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
