"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowUpRight,
  HelpCircle,
  Scale,
  FlaskConical,
  Compass,
} from "lucide-react";
import type { Report } from "@/lib/types";

interface Group {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  questions: string[];
}

/**
 * Builds grouped follow-up suggestions. The "Suggested" group uses the model's
 * real follow-up questions; the "Go deeper" group uses templated queries that
 * launch a genuine new research run (they aren't canned answers).
 */
function buildGroups(report: Report): Group[] {
  const subject = report.title?.trim() || "this topic";
  const groups: Group[] = [];

  if (report.follow_up_questions.length) {
    groups.push({
      key: "suggested",
      label: "Suggested",
      icon: HelpCircle,
      questions: report.follow_up_questions,
    });
  }

  groups.push({
    key: "critical",
    label: "Critical thinking",
    icon: Scale,
    questions: [
      `What are the main limitations or weaknesses relating to ${subject}?`,
      `What future work does the evidence suggest for ${subject}?`,
    ],
  });

  groups.push({
    key: "compare",
    label: "Compare & contrast",
    icon: FlaskConical,
    questions: [`How does ${subject} compare with alternative approaches in the library?`],
  });

  groups.push({
    key: "explore",
    label: "Explore",
    icon: Compass,
    questions: [`Summarize the methodology behind ${subject}.`],
  });

  return groups;
}

export function FollowUps({ report }: { report: Report }) {
  const router = useRouter();
  const groups = buildGroups(report);

  const ask = (q: string) => router.push(`/research?q=${encodeURIComponent(q)}`);

  return (
    <div className="panel p-4">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        <Sparkles className="h-3.5 w-3.5 text-[color:var(--color-accent)]" />
        Continue researching
      </div>
      <p className="mb-3 text-[11px] text-[color:var(--color-fg-muted)]">
        One click launches a new grounded research run.
      </p>

      <div className="space-y-3">
        {groups.map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.key}>
              <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                <Icon className="h-3 w-3" />
                {g.label}
              </div>
              <div className="space-y-1.5">
                {g.questions.map((q, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ x: 2 }}
                    onClick={() => ask(q)}
                    className="group flex w-full items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-2.5 py-2 text-left text-[12px] text-[color:var(--color-fg-dim)] transition-colors hover:border-[rgba(124,92,255,0.35)] hover:bg-[color:var(--color-bg-hover)] hover:text-white"
                  >
                    <span className="flex-1">{q}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-fg-muted)] transition-colors group-hover:text-[color:var(--color-accent)]" />
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
