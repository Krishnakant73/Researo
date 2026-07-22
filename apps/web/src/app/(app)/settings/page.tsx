"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Zap,
  KeyRound,
  Palette,
  Bell,
  Database,
  Shield,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSettings, useUpdateSettings } from "@/lib/hooks/use-settings";
import { useDocuments } from "@/lib/hooks/use-documents";
import { usePreferences } from "@/lib/hooks/use-preferences";
import type { AppSettingsUpdate } from "@/lib/types";

const SECTIONS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "ai", label: "AI & Models", icon: Zap },
  { key: "keys", label: "API Keys", icon: KeyRound },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "data", label: "Data & Storage", icon: Database },
  { key: "security", label: "Security", icon: Shield },
];

export default function SettingsPage() {
  const [section, setSection] = useState("profile");

  return (
    <>
      <Topbar title="Settings" subtitle="Manage your workspace" />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto grid max-w-[1100px] gap-6 md:grid-cols-[220px_1fr]">
          <nav className="panel h-fit p-2">
            <ul>
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.key}>
                    <button
                      onClick={() => setSection(s.key)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors",
                        section === s.key
                          ? "bg-[color:var(--color-bg-hover)] text-white"
                          : "text-[color:var(--color-fg-dim)] hover:bg-[color:var(--color-bg-hover)]/60"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <motion.section
            key={section}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel p-5"
          >
            {section === "profile" && <ProfileSection />}
            {section === "ai" && <AISection />}
            {section === "keys" && <KeysSection />}
            {section === "appearance" && <AppearanceSection />}
            {section === "notifications" && <NotificationsSection />}
            {section === "data" && <DataSection />}
            {section === "security" && <SecuritySection />}
          </motion.section>
        </div>
      </main>
    </>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4 border-b border-[color:var(--color-border)] pb-4">
      <h2 className="text-[16px] font-semibold text-white">{title}</h2>
      <p className="mt-0.5 text-[12.5px] text-[color:var(--color-fg-dim)]">{description}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-white">{label}</label>
      {children}
      {hint && <span className="text-[11px] text-[color:var(--color-fg-muted)]">{hint}</span>}
    </div>
  );
}

function ProfileSection() {
  const { prefs, update, loaded } = usePreferences();
  const [local, setLocal] = useState({ fullName: "", email: "", workspaceName: "" });

  useEffect(() => {
    if (loaded) {
      setLocal({
        fullName: prefs.fullName,
        email: prefs.email,
        workspaceName: prefs.workspaceName,
      });
    }
  }, [loaded, prefs.fullName, prefs.email, prefs.workspaceName]);

  return (
    <>
      <SectionHeader title="Profile" description="Your personal info and workspace" />
      <div className="grid gap-4 max-w-lg">
        <Field label="Full name">
          <Input
            value={local.fullName}
            placeholder="Your name"
            onChange={(e) => setLocal((s) => ({ ...s, fullName: e.target.value }))}
          />
        </Field>
        <Field label="Email">
          <Input
            value={local.email}
            type="email"
            placeholder="you@example.com"
            onChange={(e) => setLocal((s) => ({ ...s, email: e.target.value }))}
          />
        </Field>
        <Field label="Workspace name">
          <Input
            value={local.workspaceName}
            placeholder="My Workspace"
            onChange={(e) => setLocal((s) => ({ ...s, workspaceName: e.target.value }))}
          />
        </Field>
        <div className="pt-2">
          <Button
            variant="primary"
            size="md"
            className="gap-1.5"
            onClick={() => {
              update(local);
              toast.success("Profile saved");
            }}
          >
            <Save className="h-3.5 w-3.5" /> Save changes
          </Button>
        </div>
      </div>
    </>
  );
}

const QUALITY_MODELS = [
  { value: "openai/gpt-4o", label: "OpenAI · GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "OpenAI · GPT-4o Mini" },
  { value: "anthropic/claude-3.5-sonnet", label: "Anthropic · Claude 3.5 Sonnet" },
  { value: "google/gemini-pro-1.5", label: "Google · Gemini Pro 1.5" },
  { value: "meta-llama/llama-3.3-70b-instruct", label: "Meta · Llama 3.3 70B" },
];

const FAST_MODELS = [
  { value: "openai/gpt-4o-mini", label: "OpenAI · GPT-4o Mini" },
  { value: "anthropic/claude-3.5-haiku", label: "Anthropic · Claude 3.5 Haiku" },
  { value: "mistralai/mistral-small", label: "Mistral · Small" },
  { value: "google/gemini-flash-1.5", label: "Google · Gemini Flash 1.5" },
];

// Ensure the currently-saved model is always selectable even if it isn't in
// the curated list above (e.g. a custom OpenRouter slug set via env).
function withCurrent(
  options: { value: string; label: string }[],
  current: string
) {
  if (current && !options.some((o) => o.value === current)) {
    return [{ value: current, label: current }, ...options];
  }
  return options;
}

function AISection() {
  const { data, isLoading, isError } = useSettings();
  const update = useUpdateSettings();
  const [form, setForm] = useState<AppSettingsUpdate>({});

  // Seed the local form once real settings arrive.
  useEffect(() => {
    if (data) {
      setForm({
        quality_model: data.quality_model,
        fast_model: data.fast_model,
        top_k_dense: data.top_k_dense,
        top_k_bm25: data.top_k_bm25,
        top_k_final: data.top_k_final,
        use_reranker: data.use_reranker,
      });
    }
  }, [data]);

  if (isLoading) {
    return (
      <>
        <SectionHeader title="AI & Models" description="Configure the LLM gateway and agents" />
        <div className="flex items-center gap-2 py-8 text-[12.5px] text-[color:var(--color-fg-dim)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
        </div>
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <SectionHeader title="AI & Models" description="Configure the LLM gateway and agents" />
        <div className="rounded-md border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger)]/10 p-3 text-[12.5px] text-[color:var(--color-danger)]">
          Could not load settings. Is the API running?
        </div>
      </>
    );
  }

  const save = async () => {
    try {
      await update.mutateAsync(form);
      toast.success("AI settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const setField = <K extends keyof AppSettingsUpdate>(
    key: K,
    value: AppSettingsUpdate[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const num = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  return (
    <>
      <SectionHeader title="AI & Models" description="Configure the LLM gateway and agents" />
      <div className="grid gap-4 max-w-lg">
        <div className="flex items-center justify-between rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-3">
          <div>
            <div className="text-[12px] font-medium text-white">LLM gateway</div>
            <div className="text-[11px] text-[color:var(--color-fg-muted)]">
              {data.llm_live
                ? "Live — routing agent calls through OpenRouter"
                : "Offline — set OPENROUTER_API_KEY to enable live models"}
            </div>
          </div>
          <Badge tone={data.llm_live ? "success" : "neutral"}>
            {data.llm_live ? "Live" : "Fallback"}
          </Badge>
        </div>
        <Field label="Analyst model" hint="High-quality model used for reasoning">
          <Select
            value={form.quality_model ?? data.quality_model}
            onValueChange={(v) => setField("quality_model", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {withCurrent(QUALITY_MODELS, form.quality_model ?? data.quality_model).map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Fast model" hint="Used for Planner, Curator, Validator">
          <Select
            value={form.fast_model ?? data.fast_model}
            onValueChange={(v) => setField("fast_model", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {withCurrent(FAST_MODELS, form.fast_model ?? data.fast_model).map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid gap-2 grid-cols-2">
          <Field label="Top K (dense)">
            <Input
              type="number"
              min={1}
              max={50}
              value={form.top_k_dense ?? data.top_k_dense}
              onChange={(e) => setField("top_k_dense", num(e.target.value, data.top_k_dense))}
            />
          </Field>
          <Field label="Top K (BM25)">
            <Input
              type="number"
              min={1}
              max={50}
              value={form.top_k_bm25 ?? data.top_k_bm25}
              onChange={(e) => setField("top_k_bm25", num(e.target.value, data.top_k_bm25))}
            />
          </Field>
        </div>
        <Field label="Final chunks used by Analyst" hint="How many top chunks the analyst reasons over">
          <Input
            type="number"
            min={1}
            max={30}
            value={form.top_k_final ?? data.top_k_final}
            onChange={(e) => setField("top_k_final", num(e.target.value, data.top_k_final))}
          />
        </Field>
        <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-medium text-white">Enable reranker</div>
              <div className="text-[11px] text-[color:var(--color-fg-muted)]">
                Cross-encoder reranking for higher-precision evidence
              </div>
            </div>
            <Switch
              checked={form.use_reranker ?? data.use_reranker}
              onCheckedChange={(v) => setField("use_reranker", v)}
            />
          </div>
        </div>
        <div className="pt-2">
          <Button
            variant="primary"
            size="md"
            className="gap-1.5"
            disabled={update.isPending}
            onClick={save}
          >
            {update.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>
    </>
  );
}

function KeysSection() {
  const { data, isLoading } = useSettings();
  return (
    <>
      <SectionHeader
        title="API Keys"
        description="Provider keys are configured on the server via environment variables"
      />
      <div className="grid gap-4 max-w-lg">
        <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-medium text-white">OpenRouter (LLM gateway)</div>
              <div className="text-[11px] text-[color:var(--color-fg-muted)] font-mono">
                OPENROUTER_API_KEY
              </div>
            </div>
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[color:var(--color-fg-muted)]" />
            ) : (
              <Badge tone={data?.llm_live ? "success" : "neutral"}>
                {data?.llm_live ? "Configured" : "Not set"}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-medium text-white">Embedding model</div>
              <div className="text-[11px] text-[color:var(--color-fg-muted)] font-mono">
                {data?.embedding_model || "—"}
              </div>
            </div>
            <Badge tone="neutral">{data?.embedding_backend || "…"}</Badge>
          </div>
        </div>
        <p className="text-[11.5px] leading-relaxed text-[color:var(--color-fg-muted)]">
          For security, secret keys are never stored in the browser or the app
          database. Set <span className="font-mono">OPENROUTER_API_KEY</span> in
          your deployment environment (Railway variables) and restart the API to
          switch from the offline fallback to live models.
        </p>
      </div>
    </>
  );
}

function AppearanceSection() {
  const { prefs, update } = usePreferences();
  return (
    <>
      <SectionHeader title="Appearance" description="Theme, density and motion" />
      <div className="grid gap-3 max-w-lg">
        <Row title="Dark mode" hint="Researo is optimised for dark environments">
          <Switch checked disabled />
        </Row>
        <Row title="Reduced motion" hint="Disable non-essential animations">
          <Switch
            checked={prefs.reducedMotion}
            onCheckedChange={(v) => update({ reducedMotion: v })}
          />
        </Row>
        <Row title="Compact density" hint="Tighter spacing across the app">
          <Switch
            checked={prefs.compactDensity}
            onCheckedChange={(v) => update({ compactDensity: v })}
          />
        </Row>
        <Row title="High-contrast focus rings" hint="Improved WCAG focus visibility">
          <Switch
            checked={prefs.highContrastFocus}
            onCheckedChange={(v) => update({ highContrastFocus: v })}
          />
        </Row>
      </div>
    </>
  );
}

function NotificationsSection() {
  const { prefs, update } = usePreferences();
  return (
    <>
      <SectionHeader title="Notifications" description="What triggers a toast" />
      <div className="grid gap-3 max-w-lg">
        <Row title="Research completed">
          <Switch
            checked={prefs.notifyResearchComplete}
            onCheckedChange={(v) => update({ notifyResearchComplete: v })}
          />
        </Row>
        <Row title="Document indexed">
          <Switch
            checked={prefs.notifyDocumentIndexed}
            onCheckedChange={(v) => update({ notifyDocumentIndexed: v })}
          />
        </Row>
        <Row title="Report shared with me">
          <Switch
            checked={prefs.notifyReportShared}
            onCheckedChange={(v) => update({ notifyReportShared: v })}
          />
        </Row>
        <Row title="Weekly digest email">
          <Switch
            checked={prefs.weeklyDigest}
            onCheckedChange={(v) => update({ weeklyDigest: v })}
          />
        </Row>
      </div>
    </>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function DataSection() {
  const { data: docs, isLoading } = useDocuments();
  const list = docs ?? [];
  const totalBytes = list.reduce((sum, d) => sum + (d.size || 0), 0);
  const totalChunks = list.reduce((sum, d) => sum + (d.chunks || 0), 0);
  const totalPages = list.reduce((sum, d) => sum + (d.pages || 0), 0);
  const maxBytes = Math.max(totalBytes, 1);

  return (
    <>
      <SectionHeader title="Data & Storage" description="What Researo stores in this workspace" />
      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-[12.5px] text-[color:var(--color-fg-dim)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading storage…
        </div>
      ) : (
        <div className="grid gap-4 max-w-lg">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Documents" value={String(list.length)} />
            <StatCard label="Pages" value={String(totalPages)} />
            <StatCard label="Chunks" value={String(totalChunks)} />
          </div>
          <StorageRow
            label="Uploaded documents"
            value={formatBytes(totalBytes)}
            bar={100}
          />
          <StorageRow
            label="Largest document"
            value={formatBytes(list.reduce((m, d) => Math.max(m, d.size || 0), 0))}
            bar={
              (list.reduce((m, d) => Math.max(m, d.size || 0), 0) / maxBytes) * 100
            }
          />
        </div>
      )}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-3">
      <div className="text-[18px] font-semibold text-white">{value}</div>
      <div className="text-[11px] text-[color:var(--color-fg-muted)]">{label}</div>
    </div>
  );
}

function SecuritySection() {
  const { prefs, update } = usePreferences();
  return (
    <>
      <SectionHeader title="Security" description="Session and audit preferences" />
      <div className="grid gap-3 max-w-lg">
        <Row title="Require passphrase on export">
          <Switch
            checked={prefs.requirePassphraseExport}
            onCheckedChange={(v) => update({ requirePassphraseExport: v })}
          />
        </Row>
        <Row title="Log audit events">
          <Switch
            checked={prefs.logAuditEvents}
            onCheckedChange={(v) => update({ logAuditEvents: v })}
          />
        </Row>
        <Row title="Auto sign-out after 30 min idle">
          <Switch
            checked={prefs.autoSignOut}
            onCheckedChange={(v) => update({ autoSignOut: v })}
          />
        </Row>
      </div>
    </>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-3">
      <div>
        <div className="text-[12px] font-medium text-white">{title}</div>
        {hint && <div className="text-[11px] text-[color:var(--color-fg-muted)]">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function StorageRow({ label, value, bar }: { label: string; value: string; bar: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-[color:var(--color-fg-dim)]">{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7c5cff] to-[#4dd0ff]"
          style={{ width: `${bar}%` }}
        />
      </div>
    </div>
  );
}
