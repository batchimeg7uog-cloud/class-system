"use client";
/* eslint-disable react/no-children-prop, @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Baby,
  BarChart3,
  Camera,
  Check,
  ChevronDown,
  ClipboardPenLine,
  Download,
  FileText,
  FolderHeart,
  GraduationCap,
  ImagePlus,
  LoaderCircle,
  LogOut,
  Menu,
  Phone,
  Plus,
  Printer,
  Search,
  Settings,
  Sparkles,
  Upload,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { DEVELOPMENT_AREAS, GROUP_COLORS, childName, formatDate } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";
import type { Child, Group, Observation, ObservationMedia, PeriodSummary, Profile, ViewKey } from "@/lib/types";

type AreaKey = (typeof DEVELOPMENT_AREAS)[number]["key"];
type Period = "week" | "month" | "quarter" | "year";
type Toast = { kind: "success" | "error"; text: string } | null;

const PERIOD_LABELS: Record<Period, string> = { week: "7 хоног", month: "Сар", quarter: "Улирал", year: "Жил" };
const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 31, quarter: 92, year: 366 };

const NAV_ITEMS: { id: ViewKey; label: string; icon: typeof UsersRound }[] = [
  { id: "groups", label: "Бүлгүүд", icon: UsersRound },
  { id: "children", label: "Хүүхдүүд", icon: Baby },
  { id: "observations", label: "Ажиглалт тэмдэглэл", icon: ClipboardPenLine },
  { id: "analysis", label: "Ахицын анализ", icon: BarChart3 },
  { id: "reports", label: "Тайлан", icon: FileText },
  { id: "settings", label: "Тохиргоо", icon: Settings },
];

const emptyChild = {
  id: "",
  first_name: "",
  last_name: "",
  preferred_name: "",
  gender: "",
  birth_date: "",
  enrollment_date: new Date().toISOString().slice(0, 10),
  parent_one_name: "",
  parent_one_phone: "",
  parent_two_name: "",
  parent_two_phone: "",
  emergency_contact: "",
  address: "",
  medical_notes: "",
  notes: "",
};

function emptyObservation() {
  return {
    child_id: "",
    observed_on: new Date().toISOString().slice(0, 10),
    summary: "",
    next_steps: "",
    notes: Object.fromEntries(DEVELOPMENT_AREAS.map((area) => [area.key, ""])) as Record<AreaKey, string>,
    scores: Object.fromEntries(DEVELOPMENT_AREAS.map((area) => [area.key, 3])) as Record<AreaKey, number>,
  };
}

function averageScore(observation: Observation) {
  return DEVELOPMENT_AREAS.reduce((sum, area) => sum + Number(observation[`${area.key}_score` as keyof Observation]), 0) / DEVELOPMENT_AREAS.length;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

export default function KindergartenApp() {
  const supabase = useMemo(() => getSupabase(), []);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [media, setMedia] = useState<ObservationMedia[]>([]);
  const [summaries, setSummaries] = useState<PeriodSummary[]>([]);
  const [view, setView] = useState<ViewKey>("children");
  const [mobileNav, setMobileNav] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"group" | "child" | "observation" | "summary" | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [analysisChildId, setAnalysisChildId] = useState("");
  const [period, setPeriod] = useState<Period>("month");
  const [reportPeriod, setReportPeriod] = useState<Exclude<Period, "week">>("month");
  const [toast, setToast] = useState<Toast>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authMessage, setAuthMessage] = useState("");
  const [groupForm, setGroupForm] = useState({ name: "", school_year: "2026–2027", age_band: "", color: GROUP_COLORS[0] });
  const [childForm, setChildForm] = useState(emptyChild);
  const [observationForm, setObservationForm] = useState(emptyObservation);
  const [files, setFiles] = useState<File[]>([]);
  const [summaryForm, setSummaryForm] = useState({ child_id: "", overall_summary: "", strengths: "", recommendations: "" });
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const notify = useCallback((kind: "success" | "error", text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const loadData = useCallback(async (currentUser: User) => {
    setDataLoading(true);
    const [profileResult, groupsResult, childrenResult, observationsResult, mediaResult, summariesResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name, kindergarten_name, phone").eq("id", currentUser.id).maybeSingle(),
      supabase.from("groups").select("*").order("created_at"),
      supabase.from("children").select("*").order("first_name"),
      supabase.from("observations").select("*").order("observed_on", { ascending: false }),
      supabase.from("observation_media").select("id, observation_id, child_id, storage_path, file_name"),
      supabase.from("period_summaries").select("*").order("period_end", { ascending: false }),
    ]);

    const firstError = [profileResult, groupsResult, childrenResult, observationsResult, mediaResult, summariesResult].find((result) => result.error)?.error;
    if (firstError) {
      notify("error", `Мэдээлэл уншихад алдаа гарлаа: ${firstError.message}`);
      setDataLoading(false);
      return;
    }

    setProfile(profileResult.data || { id: currentUser.id, full_name: "", kindergarten_name: "", phone: "" });
    const loadedGroups = (groupsResult.data || []) as Group[];
    const loadedChildren = (childrenResult.data || []) as Child[];
    setGroups(loadedGroups);
    setChildren(loadedChildren);
    setActiveGroupId((current) => current || loadedGroups[0]?.id || "");
    setAnalysisChildId((current) => current || loadedChildren[0]?.id || "");
    setObservations((observationsResult.data || []) as Observation[]);
    setSummaries((summariesResult.data || []) as PeriodSummary[]);

    const signedMedia = await Promise.all(((mediaResult.data || []) as ObservationMedia[]).map(async (item) => {
      const { data } = await supabase.storage.from("child-work").createSignedUrl(item.storage_path, 3600);
      return { ...item, signed_url: data?.signedUrl };
    }));
    setMedia(signedMedia);
    setDataLoading(false);
  }, [notify, supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthLoading(false);
      if (data.user) void loadData(data.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      if (session?.user) void loadData(session.user);
      else {
        setProfile(null);
        setGroups([]);
        setChildren([]);
        setObservations([]);
        setSummaries([]);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [loadData, supabase]);

  const activeGroup = groups.find((group) => group.id === activeGroupId);
  const groupChildren = children.filter((child) => !activeGroupId || child.group_id === activeGroupId);
  const visibleChildren = groupChildren.filter((child) => childName(child).toLowerCase().includes(search.toLowerCase()));
  const selectedChild = children.find((child) => child.id === selectedChildId);
  const selectedChildObservations = observations.filter((observation) => observation.child_id === selectedChildId);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setAuthMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const fullName = String(form.get("full_name") || "").trim();
    const result = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    setSaving(false);
    if (result.error) {
      setAuthMessage(result.error.message);
      return;
    }
    if (authMode === "signup" && !result.data.session) {
      setAuthMessage("Бүртгэл үүслээ. Имэйлээр ирсэн баталгаажуулах холбоосыг нээгээд нэвтэрнэ үү.");
    }
  }

  async function handleOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const fullName = String(form.get("full_name") || "").trim();
    const kindergartenName = String(form.get("kindergarten_name") || "").trim();
    const groupName = String(form.get("group_name") || "").trim();
    const profileResult = await supabase.from("profiles").upsert({ id: user.id, full_name: fullName, kindergarten_name: kindergartenName });
    if (profileResult.error) {
      notify("error", profileResult.error.message);
      setSaving(false);
      return;
    }
    if (groupName) {
      await supabase.from("groups").insert({ teacher_id: user.id, name: groupName, school_year: "2026–2027", color: GROUP_COLORS[0] });
    }
    await loadData(user);
    setSaving(false);
    notify("success", "Таны ажлын орчин бэлэн боллоо.");
  }

  async function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("groups").insert({ ...groupForm, teacher_id: user.id, age_band: groupForm.age_band || null });
    setSaving(false);
    if (error) return notify("error", error.message);
    setModal(null);
    setGroupForm({ name: "", school_year: "2026–2027", age_band: "", color: GROUP_COLORS[(groups.length + 1) % GROUP_COLORS.length] });
    await loadData(user);
    notify("success", "Шинэ бүлэг нэмэгдлээ.");
  }

  function openChildForm(child?: Child) {
    setChildForm(child ? {
      id: child.id,
      first_name: child.first_name,
      last_name: child.last_name || "",
      preferred_name: child.preferred_name || "",
      gender: child.gender || "",
      birth_date: child.birth_date || "",
      enrollment_date: child.enrollment_date || "",
      parent_one_name: child.parent_one_name || "",
      parent_one_phone: child.parent_one_phone || "",
      parent_two_name: child.parent_two_name || "",
      parent_two_phone: child.parent_two_phone || "",
      emergency_contact: child.emergency_contact || "",
      address: child.address || "",
      medical_notes: child.medical_notes || "",
      notes: child.notes || "",
    } : emptyChild);
    setModal("child");
  }

  async function saveChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !activeGroupId) return;
    setSaving(true);
    const payload = Object.fromEntries(Object.entries(childForm).map(([key, value]) => [key, value || null]));
    const result = childForm.id
      ? await supabase.from("children").update({ ...payload, id: undefined, teacher_id: user.id, group_id: activeGroupId }).eq("id", childForm.id)
      : await supabase.from("children").insert({ ...payload, id: undefined, teacher_id: user.id, group_id: activeGroupId });
    setSaving(false);
    if (result.error) return notify("error", result.error.message);
    setModal(null);
    await loadData(user);
    notify("success", childForm.id ? "Хүүхдийн мэдээлэл шинэчлэгдлээ." : "Хүүхэд амжилттай нэмэгдлээ.");
  }

  function openObservation(childId?: string) {
    setObservationForm({ ...emptyObservation(), child_id: childId || "" });
    setFiles([]);
    setModal("observation");
  }

  function selectFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).filter((file) => file.type.startsWith("image/") && file.size <= 8 * 1024 * 1024);
    setFiles((current) => [...current, ...next].slice(0, 6));
    if (next.length !== list.length) notify("error", "Зөвхөн 8 МБ-аас бага хэмжээтэй зураг оруулна уу.");
  }

  async function saveObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !observationForm.child_id) return;
    const child = children.find((item) => item.id === observationForm.child_id);
    if (!child) return;
    setSaving(true);
    const scorePayload = Object.fromEntries(DEVELOPMENT_AREAS.flatMap((area) => [
      [`${area.key}_score`, observationForm.scores[area.key]],
      [`${area.key}_notes`, observationForm.notes[area.key] || null],
    ]));
    const { data: saved, error } = await supabase.from("observations").insert({
      teacher_id: user.id,
      child_id: child.id,
      group_id: child.group_id,
      observed_on: observationForm.observed_on,
      summary: observationForm.summary || null,
      next_steps: observationForm.next_steps || null,
      ...scorePayload,
    }).select("id").single();
    if (error || !saved) {
      setSaving(false);
      return notify("error", error?.message || "Ажиглалт хадгалж чадсангүй.");
    }
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${user.id}/${saved.id}/${crypto.randomUUID()}-${safeName}`;
      const upload = await supabase.storage.from("child-work").upload(path, file, { contentType: file.type });
      if (!upload.error) {
        await supabase.from("observation_media").insert({ teacher_id: user.id, observation_id: saved.id, child_id: child.id, storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size });
      }
    }
    setSaving(false);
    setModal(null);
    await loadData(user);
    notify("success", "Өдрийн ажиглалт хадгалагдлаа.");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: String(form.get("full_name") || ""),
      kindergarten_name: String(form.get("kindergarten_name") || ""),
      phone: String(form.get("phone") || ""),
    }).eq("id", user.id);
    setSaving(false);
    if (error) return notify("error", error.message);
    await loadData(user);
    notify("success", "Тохиргоо хадгалагдлаа.");
  }

  async function savePeriodSummary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !summaryForm.child_id) return;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - PERIOD_DAYS[reportPeriod]);
    setSaving(true);
    const { error } = await supabase.from("period_summaries").upsert({
      teacher_id: user.id,
      child_id: summaryForm.child_id,
      period_type: reportPeriod,
      period_start: periodStart.toISOString().slice(0, 10),
      period_end: new Date().toISOString().slice(0, 10),
      overall_summary: summaryForm.overall_summary,
      strengths: summaryForm.strengths || null,
      recommendations: summaryForm.recommendations || null,
    }, { onConflict: "teacher_id,child_id,period_type,period_start,period_end" });
    setSaving(false);
    if (error) return notify("error", error.message);
    setModal(null);
    setSummaryForm({ child_id: "", overall_summary: "", strengths: "", recommendations: "" });
    await loadData(user);
    notify("success", `${PERIOD_LABELS[reportPeriod]}ийн дүгнэлт хадгалагдлаа.`);
  }

  function filteredObservations(childId: string, selectedPeriod: Period) {
    const start = new Date();
    start.setDate(start.getDate() - PERIOD_DAYS[selectedPeriod]);
    return observations.filter((observation) => observation.child_id === childId && new Date(`${observation.observed_on}T23:59:59`) >= start).reverse();
  }

  function downloadReport() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[reportPeriod]);
    const rows = children.map((child) => {
      const items = observations.filter((item) => item.child_id === child.id && new Date(item.observed_on) >= cutoff);
      const avg = items.length ? items.reduce((sum, item) => sum + averageScore(item), 0) / items.length : 0;
      return [childName(child), groups.find((group) => group.id === child.group_id)?.name || "", items.length, avg.toFixed(1)];
    });
    const csv = [["Хүүхэд", "Бүлэг", "Ажиглалтын тоо", "Дундаж үнэлгээ"], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `hugjliin-tailan-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (authLoading) return <FullScreenLoading />;
  if (!user) return <AuthScreen mode={authMode} setMode={setAuthMode} onSubmit={handleAuth} saving={saving} message={authMessage} />;
  if (dataLoading && !profile) return <FullScreenLoading />;
  if (profile && !profile.full_name) return <Onboarding user={user} saving={saving} onSubmit={handleOnboarding} />;

  const headerTitle = NAV_ITEMS.find((item) => item.id === view)?.label;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Цэс хаах"><X /></button>
        <div className="brand"><span className="brand-mark"><Sparkles /></span><span>Өсөлт<small>Хүүхдийн хөгжил</small></span></div>
        <div className="teacher-card">
          <span className="avatar">{initials(profile?.full_name || user.email || "Б")}</span>
          <span><strong>{profile?.full_name}</strong><small>{profile?.kindergarten_name || "Цэцэрлэгийн багш"}</small></span>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobileNav(false); }}><item.icon />{item.label}</button>)}
        </nav>
        <div className="sidebar-tip"><span>💡</span><div><strong>Өнөөдрийн зөвлөмж</strong><p>Багахан ажиглалт ч хүүхдийн том ахицыг харуулдаг.</p></div></div>
        <button className="signout-link" onClick={() => supabase.auth.signOut()}><LogOut /> Системээс гарах</button>
      </aside>

      {mobileNav ? <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="Цэс хаах" /> : null}

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Цэс нээх"><Menu /></button>
          <div><p className="eyebrow">Өнөөдөр · {new Intl.DateTimeFormat("mn-MN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</p><h1>{headerTitle}</h1></div>
          <label className="group-picker"><span style={{ background: activeGroup?.color || "#8b5cf6" }} /><select value={activeGroupId} onChange={(event) => setActiveGroupId(event.target.value)}><option value="">Бүх бүлэг</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><ChevronDown /></label>
        </header>

        <div className="page-content">
          {view === "groups" ? <GroupsView groups={groups} childList={children} observations={observations} onAdd={() => setModal("group")} onSelect={(id) => { setActiveGroupId(id); setView("children"); }} /> : null}
          {view === "children" ? <ChildrenView childList={visibleChildren} total={groupChildren.length} search={search} setSearch={setSearch} canAdd={Boolean(activeGroupId)} onAdd={() => openChildForm()} onSelect={setSelectedChildId} observations={observations} /> : null}
          {view === "observations" ? <ObservationsView observations={observations.filter((item) => !activeGroupId || item.group_id === activeGroupId)} childList={children} media={media} onAdd={() => openObservation()} /> : null}
          {view === "analysis" ? <AnalysisView children={children} childId={analysisChildId} setChildId={setAnalysisChildId} period={period} setPeriod={setPeriod} observations={filteredObservations(analysisChildId, period)} /> : null}
          {view === "reports" ? <ReportsView children={children} groups={groups} observations={observations} summaries={summaries} reportPeriod={reportPeriod} setReportPeriod={setReportPeriod} onDownload={downloadReport} onSummary={() => setModal("summary")} /> : null}
          {view === "settings" && profile ? <SettingsView profile={profile} email={user.email || ""} saving={saving} onSubmit={saveProfile} onSignOut={() => supabase.auth.signOut()} /> : null}
        </div>
      </main>

      {selectedChild ? <ChildDrawer child={selectedChild} group={groups.find((group) => group.id === selectedChild.group_id)} observations={selectedChildObservations} media={media} onClose={() => setSelectedChildId(null)} onEdit={() => { setSelectedChildId(null); openChildForm(selectedChild); }} onObservation={() => { setSelectedChildId(null); openObservation(selectedChild.id); }} /> : null}
      {modal === "group" ? <Modal title="Шинэ бүлэг" onClose={() => setModal(null)}><GroupForm value={groupForm} setValue={setGroupForm} onSubmit={saveGroup} saving={saving} /></Modal> : null}
      {modal === "child" ? <Modal title={childForm.id ? "Хүүхдийн мэдээлэл засах" : "Шинэ хүүхэд нэмэх"} onClose={() => setModal(null)} wide><ChildForm value={childForm} setValue={setChildForm} onSubmit={saveChild} saving={saving} /></Modal> : null}
      {modal === "observation" ? <Modal title="Өдрийн ажиглалт" onClose={() => setModal(null)} wide><ObservationForm children={groupChildren} value={observationForm} setValue={setObservationForm} files={files} setFiles={setFiles} onSubmit={saveObservation} saving={saving} cameraInput={cameraInput} fileInput={fileInput} onFiles={selectFiles} /></Modal> : null}
      {modal === "summary" ? <Modal title={`${PERIOD_LABELS[reportPeriod]}ийн дүгнэлт`} onClose={() => setModal(null)}><SummaryForm children={children} value={summaryForm} setValue={setSummaryForm} onSubmit={savePeriodSummary} saving={saving} /></Modal> : null}
      {toast ? <div className={`toast ${toast.kind}`}><Check />{toast.text}</div> : null}
    </div>
  );
}

function FullScreenLoading() {
  return <div className="full-loading"><span className="brand-mark"><Sparkles /></span><LoaderCircle className="spin" /><p>Системийг бэлтгэж байна…</p></div>;
}

function AuthScreen({ mode, setMode, onSubmit, saving, message }: { mode: "login" | "signup"; setMode: (mode: "login" | "signup") => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean; message: string }) {
  return <main className="auth-shell">
    <section className="auth-story"><div className="auth-logo"><span className="brand-mark"><Sparkles /></span>Өсөлт</div><div className="story-copy"><span className="pill">Цэцэрлэгийн хөгжлийн тэмдэглэл</span><h1>Жижигхэн мөч бүр<br /><em>том өсөлтийн</em> эхлэл.</h1><p>Хүүхэд бүрийн онцгой ахицыг өдөр бүр ажиглаж, эцэг эхтэй нь ойлгомжтой хуваалцаарай.</p><div className="story-features"><span>🌱 7 хөгжлийн чиглэл</span><span>📸 Бүтээлийн сан</span><span>📈 Ахицын анализ</span></div></div><div className="auth-bubbles"><span>⭐</span><span>🌈</span><span>🧩</span></div></section>
    <section className="auth-panel"><form className="auth-card" onSubmit={onSubmit}><div className="auth-mobile-logo"><span className="brand-mark"><Sparkles /></span>Өсөлт</div><span className="eyebrow">БАГШИЙН ОРЧИН</span><h2>{mode === "login" ? "Тавтай морилно уу" : "Шинэ эрх нээх"}</h2><p>{mode === "login" ? "Өнөөдрийн ажиглалтаа үргэлжлүүлье." : "Хүүхдүүдийнхээ ахицыг нэг дор хөтлөөрэй."}</p>{mode === "signup" ? <label>Таны нэр<input name="full_name" required placeholder="Жишээ: Б. Саруул" autoComplete="name" /></label> : null}<label>Имэйл хаяг<input name="email" type="email" required placeholder="bagsh@example.mn" autoComplete="email" /></label><label>Нууц үг<input name="password" type="password" minLength={8} required placeholder="Хамгийн багадаа 8 тэмдэгт" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>{message ? <div className="form-message">{message}</div> : null}<button className="primary-button" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <GraduationCap />}{mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}</button><div className="auth-switch">{mode === "login" ? "Шинэ багш уу?" : "Өмнө нь бүртгүүлсэн үү?"}<button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Эрх нээх" : "Нэвтрэх"}</button></div></form></section>
  </main>;
}

function Onboarding({ user, saving, onSubmit }: { user: User; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <main className="onboarding-shell"><form className="onboarding-card" onSubmit={onSubmit}><div className="celebrate">🎉</div><span className="eyebrow">АНХНЫ ТОХИРГОО</span><h1>Ажлын орчноо бэлдье</h1><p>Таны нэр, цэцэрлэг болон эхний бүлгийн мэдээллийг оруулна уу.</p><div className="form-grid"><label>Багшийн нэр<input name="full_name" required defaultValue={String(user.user_metadata?.full_name || "")} placeholder="Б. Саруул" /></label><label>Цэцэрлэгийн нэр<input name="kindergarten_name" required placeholder="120-р цэцэрлэг" /></label><label className="full">Эхний бүлгийн нэр<input name="group_name" required placeholder="Бяцхан одод" /></label></div><button className="primary-button" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Sparkles />}Эхлэх</button></form></main>;
}

function GroupsView({ groups, childList, observations, onAdd, onSelect }: { groups: Group[]; childList: Child[]; observations: Observation[]; onAdd: () => void; onSelect: (id: string) => void }) {
  return <section><SectionHeading title="Миний бүлгүүд" description="Бүлэг тус бүрийн хүүхэд болон ажиглалтын ерөнхий төлөв." action="Бүлэг нэмэх" onAction={onAdd} /><div className="group-grid">{groups.map((group) => { const count = childList.filter((child) => child.group_id === group.id).length; const obsCount = observations.filter((item) => item.group_id === group.id).length; return <button className="group-card" key={group.id} onClick={() => onSelect(group.id)} style={{ "--group-color": group.color } as React.CSSProperties}><div className="group-card-top"><span className="group-icon"><UsersRound /></span><span className="arrow">→</span></div><h3>{group.name}</h3><p>{group.age_band || "Насны ангилал оруулаагүй"} · {group.school_year}</p><div className="group-stats"><span><strong>{count}</strong> хүүхэд</span><span><strong>{obsCount}</strong> ажиглалт</span></div></button>; })}<button className="add-card" onClick={onAdd}><Plus /><strong>Шинэ бүлэг</strong><span>Нэмэхийн тулд дарна уу</span></button></div>{groups.length === 0 ? <EmptyState icon="👋" title="Эхний бүлгээ нэмээрэй" text="Бүлэг үүсгэсний дараа хүүхдүүдээ бүртгэх боломжтой." action="Бүлэг нэмэх" onAction={onAdd} /> : null}</section>;
}

function ChildrenView({ childList, total, search, setSearch, canAdd, onAdd, onSelect, observations }: { childList: Child[]; total: number; search: string; setSearch: (value: string) => void; canAdd: boolean; onAdd: () => void; onSelect: (id: string) => void; observations: Observation[] }) {
  return <section><SectionHeading title="Хүүхдүүд" description={`${total} хүүхдийн хөгжлийн мэдээлэл`} action="Хүүхэд нэмэх" onAction={onAdd} disabled={!canAdd} /><div className="toolbar"><label className="search-box"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Хүүхдийн нэрээр хайх…" /></label><span className="legend-dot"><i /> Идэвхтэй бүртгэл</span></div>{childList.length ? <div className="children-grid">{childList.map((child, index) => { const childObs = observations.filter((item) => item.child_id === child.id); const latest = childObs[0]; return <button className="child-card" key={child.id} onClick={() => onSelect(child.id)}><div className={`child-avatar tone-${index % 6}`}>{initials(childName(child))}<span /></div><div className="child-card-body"><h3>{childName(child)}</h3><p>{child.birth_date ? `${Math.max(0, new Date().getFullYear() - new Date(child.birth_date).getFullYear())} настай` : "Нас оруулаагүй"}</p><div className="progress-mini"><span style={{ width: latest ? `${averageScore(latest) * 20}%` : "8%" }} /></div><small>{latest ? `Сүүлийн тэмдэглэл ${formatDate(latest.observed_on)}` : "Ажиглалт эхлээгүй"}</small></div><span className="card-chevron">›</span></button>; })}</div> : <EmptyState icon="🧸" title={search ? "Хүүхэд олдсонгүй" : "Хүүхдээ бүртгээрэй"} text={search ? "Хайлтын утгаа өөрчлөөд үзнэ үү." : canAdd ? "Хувийн болон асран хамгаалагчийн мэдээллийг нэг дор хадгална." : "Эхлээд дээрээс бүлэг сонгоно уу."} action={canAdd && !search ? "Хүүхэд нэмэх" : undefined} onAction={onAdd} />}</section>;
}

function ObservationsView({ observations, childList, media, onAdd }: { observations: Observation[]; childList: Child[]; media: ObservationMedia[]; onAdd: () => void }) {
  return <section><SectionHeading title="Ажиглалт тэмдэглэл" description="Хүүхдийн өдөр тутмын онцгой мөч, бүтээл болон хөгжлийн үнэлгээ." action="Шинэ ажиглалт" onAction={onAdd} disabled={!childList.length} />{observations.length ? <div className="timeline">{observations.map((observation) => { const child = childList.find((item) => item.id === observation.child_id); const photos = media.filter((item) => item.observation_id === observation.id); return <article className="observation-card" key={observation.id}><div className="timeline-date"><strong>{new Date(`${observation.observed_on}T00:00:00`).getDate()}</strong><span>{new Intl.DateTimeFormat("mn-MN", { month: "short" }).format(new Date(`${observation.observed_on}T00:00:00`))}</span></div><div className="observation-main"><div className="observation-head"><div className="mini-avatar">{initials(childName(child))}</div><div><h3>{childName(child)}</h3><p>{formatDate(observation.observed_on)}</p></div><span className="score-badge">{averageScore(observation).toFixed(1)} / 5</span></div>{observation.summary ? <p className="observation-summary">{observation.summary}</p> : null}<div className="area-chips">{DEVELOPMENT_AREAS.filter((area) => observation[`${area.key}_notes` as keyof Observation]).map((area) => <span key={area.key} style={{ color: area.color, background: area.bg }}><area.icon />{area.short} · {observation[`${area.key}_score` as keyof Observation]}</span>)}</div>{photos.length ? <div className="photo-strip">{photos.map((photo) => photo.signed_url ? <Image unoptimized width={82} height={68} src={photo.signed_url} alt={photo.file_name} key={photo.id} /> : null)}</div> : null}{observation.next_steps ? <div className="next-step"><Sparkles />Дараагийн алхам: {observation.next_steps}</div> : null}</div></article>; })}</div> : <EmptyState icon="📝" title="Ажиглалт хараахан алга" text="Хүүхдийн өнөөдрийн үйлдэл, ахиц болон бүтээлийг тэмдэглээрэй." action={childList.length ? "Эхний ажиглалт" : undefined} onAction={onAdd} />}</section>;
}

function AnalysisView({ children, childId, setChildId, period, setPeriod, observations }: { children: Child[]; childId: string; setChildId: (id: string) => void; period: Period; setPeriod: (period: Period) => void; observations: Observation[] }) {
  const averages = DEVELOPMENT_AREAS.map((area) => ({ ...area, value: observations.length ? observations.reduce((sum, item) => sum + (item[`${area.key}_score` as keyof Observation] as number), 0) / observations.length : 0 }));
  const points = observations.map((item, index) => ({ x: observations.length === 1 ? 50 : 8 + (index * 84) / (observations.length - 1), y: 88 - averageScore(item) * 16, label: item.observed_on }));
  return <section><SectionHeading title="Ахицын анализ" description="7 чиглэлийн үнэлгээг хугацаагаар харьцуулж, өсөлтийг харах." /><div className="analysis-controls"><label>Хүүхэд сонгох<select value={childId} onChange={(event) => setChildId(event.target.value)}>{children.map((child) => <option key={child.id} value={child.id}>{childName(child)}</option>)}</select></label><div className="segmented">{(Object.keys(PERIOD_LABELS) as Period[]).map((item) => <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{PERIOD_LABELS[item]}</button>)}</div></div>{childId && observations.length ? <><div className="analysis-grid"><article className="chart-card wide"><div className="card-title"><div><span className="eyebrow">НИЙТ АХИЦ</span><h3>{childName(children.find((child) => child.id === childId))}</h3></div><span className="big-score">{(observations.reduce((sum, item) => sum + averageScore(item), 0) / observations.length).toFixed(1)}<small>/5</small></span></div><svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Ахицын шугаман график"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".28"/><stop offset="1" stopColor="#8b5cf6" stopOpacity="0"/></linearGradient></defs>{[8,28,48,68,88].map((y) => <line key={y} x1="5" x2="97" y1={y} y2={y} className="grid-line" />)}{points.length > 1 ? <><path d={`M ${points.map((point) => `${point.x},${point.y}`).join(" L ")} L ${points.at(-1)?.x},94 L ${points[0].x},94 Z`} fill="url(#chartFill)" /><polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#8b5cf6" strokeWidth="2.3" vectorEffect="non-scaling-stroke" /></> : null}{points.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="2.4" fill="#fff" stroke="#8b5cf6" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />)}</svg><div className="chart-labels"><span>{formatDate(observations[0]?.observed_on)}</span><span>{formatDate(observations.at(-1)?.observed_on)}</span></div></article><article className="chart-card"><div className="card-title"><div><span className="eyebrow">ТЭМДЭГЛЭЛ</span><h3>Идэвх</h3></div><ClipboardPenLine /></div><strong className="metric-number">{observations.length}</strong><p>энэ хугацаанд хийсэн ажиглалт</p><div className="metric-note">Хамгийн сүүлийн: {formatDate(observations.at(-1)?.observed_on)}</div></article></div><article className="chart-card"><div className="card-title"><div><span className="eyebrow">ЧИГЛЭЛ ТУС БҮРЭЭР</span><h3>Дундаж үнэлгээ</h3></div></div><div className="area-bars">{averages.map((area) => <div key={area.key}><span className="area-bar-label"><i style={{ background: area.color }} /><strong>{area.label}</strong><em>{area.value.toFixed(1)}</em></span><div className="bar-track"><span style={{ width: `${area.value * 20}%`, background: area.color }} /></div></div>)}</div></article></> : <EmptyState icon="📊" title="Анализ хийх мэдээлэл дутуу" text={children.length ? "Сонгосон хугацаанд ажиглалт байхгүй байна." : "Эхлээд хүүхэд болон ажиглалт нэмнэ үү."} />}</section>;
}

function ReportsView({ children, groups, observations, summaries, reportPeriod, setReportPeriod, onDownload, onSummary }: {
  children: Child[];
  groups: Group[];
  observations: Observation[];
  summaries: PeriodSummary[];
  reportPeriod: Exclude<Period, "week">;
  setReportPeriod: (period: Exclude<Period, "week">) => void;
  onDownload: () => void;
  onSummary: () => void;
}) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[reportPeriod]);
  const recent = observations.filter((item) => new Date(item.observed_on) >= cutoff);
  const overall = recent.length ? recent.reduce((sum, item) => sum + averageScore(item), 0) / recent.length : 0;
  const periodSummaries = summaries.filter((item) => item.period_type === reportPeriod);

  return <section className="report-page">
    <SectionHeading title="Хөгжлийн тайлан" description="Сар, улирал болон жилийн нэгтгэлийг хэвлэх эсвэл CSV файлаар авах." />
    <div className="report-actions no-print">
      <div className="segmented">{(["month", "quarter", "year"] as const).map((item) => <button key={item} className={reportPeriod === item ? "active" : ""} onClick={() => setReportPeriod(item)}>{PERIOD_LABELS[item]}</button>)}</div>
      <button className="secondary-button" onClick={onSummary}><ClipboardPenLine />Дүгнэлт бичих</button>
      <button className="secondary-button" onClick={() => window.print()}><Printer />Хэвлэх / PDF</button>
      <button className="primary-button compact" onClick={onDownload}><Download />CSV татах</button>
    </div>
    <div className="report-cover"><div><span className="eyebrow">{PERIOD_LABELS[reportPeriod].toUpperCase()}ИЙН НЭГТГЭЛ</span><h2>Хүүхдийн хөгжлийн тайлан</h2><p>{formatDate(cutoff.toISOString().slice(0, 10))} — {formatDate(new Date().toISOString().slice(0, 10))}</p></div><span className="report-mark"><FolderHeart /></span></div>
    <div className="report-metrics"><div><span>Бүртгэлтэй хүүхэд</span><strong>{children.length}</strong></div><div><span>Нийт ажиглалт</span><strong>{recent.length}</strong></div><div><span>Дундаж үнэлгээ</span><strong>{overall.toFixed(1)}</strong></div><div><span>Хамрагдсан бүлэг</span><strong>{groups.length}</strong></div></div>
    <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Хүүхэд</th><th>Бүлэг</th><th>Ажиглалт</th><th>Дундаж</th><th>Төлөв</th></tr></thead><tbody>{children.map((child) => { const childObs = recent.filter((item) => item.child_id === child.id); const avg = childObs.length ? childObs.reduce((sum, item) => sum + averageScore(item), 0) / childObs.length : 0; return <tr key={child.id}><td><span className="table-avatar">{initials(childName(child))}</span><strong>{childName(child)}</strong></td><td>{groups.find((group) => group.id === child.group_id)?.name || "—"}</td><td>{childObs.length}</td><td>{avg ? avg.toFixed(1) : "—"}</td><td><span className={childObs.length ? "status-good" : "status-empty"}>{childObs.length ? "Шинэчлэгдсэн" : "Тэмдэглэлгүй"}</span></td></tr>; })}</tbody></table>{!children.length ? <EmptyState icon="📄" title="Тайлангийн мэдээлэл алга" text="Хүүхэд бүртгэсний дараа тайлан автоматаар үүснэ." /> : null}</div>
    {periodSummaries.length ? <div className="summary-list"><span className="eyebrow">БАГШИЙН ДҮГНЭЛТҮҮД</span>{periodSummaries.map((summary) => <article key={summary.id}><div><strong>{childName(children.find((child) => child.id === summary.child_id))}</strong><span>{formatDate(summary.period_start)} — {formatDate(summary.period_end)}</span></div><p>{summary.overall_summary}</p>{summary.strengths ? <small><b>Давуу тал:</b> {summary.strengths}</small> : null}{summary.recommendations ? <small><b>Дараагийн дэмжлэг:</b> {summary.recommendations}</small> : null}</article>)}</div> : null}
  </section>;
}

function SettingsView({ profile, email, saving, onSubmit, onSignOut }: { profile: Profile; email: string; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onSignOut: () => void }) {
  return <section><SectionHeading title="Тохиргоо" description="Багш болон цэцэрлэгийн үндсэн мэдээлэл." /><div className="settings-grid"><form className="settings-card" onSubmit={onSubmit}><div className="settings-head"><span className="avatar large">{initials(profile.full_name)}</span><div><h3>{profile.full_name}</h3><p>{email}</p></div></div><div className="form-grid"><label>Багшийн нэр<input name="full_name" defaultValue={profile.full_name} required /></label><label>Утас<input name="phone" defaultValue={profile.phone || ""} type="tel" /></label><label className="full">Цэцэрлэгийн нэр<input name="kindergarten_name" defaultValue={profile.kindergarten_name || ""} /></label></div><button className="primary-button compact" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Check />}Хадгалах</button></form><article className="settings-card privacy-card"><span className="privacy-icon">🔐</span><h3>Нууцлал хамгаалагдсан</h3><p>Таны бүртгэсэн хүүхдийн мэдээлэл зөвхөн таны багшийн эрхээр нээгдэнэ. Бүтээлийн зураг хувийн сангаар хамгаалагдана.</p><button className="danger-button" onClick={onSignOut}><LogOut />Системээс гарах</button></article></div></section>;
}

function SectionHeading({ title, description, action, onAction, disabled }: { title: string; description: string; action?: string; onAction?: () => void; disabled?: boolean }) { return <div className="section-heading"><div><h2>{title}</h2><p>{description}</p></div>{action ? <button className="primary-button compact" onClick={onAction} disabled={disabled}><Plus />{action}</button> : null}</div>; }

function EmptyState({ icon, title, text, action, onAction }: { icon: string; title: string; text: string; action?: string; onAction?: () => void }) { return <div className="empty-state"><span>{icon}</span><h3>{title}</h3><p>{text}</p>{action ? <button className="primary-button compact" onClick={onAction}><Plus />{action}</button> : null}</div>; }

function Modal({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) { return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}><div className={`modal-card ${wide ? "wide" : ""}`}><div className="modal-head"><div><span className="eyebrow">ӨСӨЛТ СИСТЕМ</span><h2>{title}</h2></div><button onClick={onClose} aria-label="Хаах"><X /></button></div><div className="modal-body">{children}</div></div></div>; }

function GroupForm({ value, setValue, onSubmit, saving }: { value: typeof KindergartenApp extends never ? never : { name: string; school_year: string; age_band: string; color: string }; setValue: React.Dispatch<React.SetStateAction<{ name: string; school_year: string; age_band: string; color: string }>>; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean }) { return <form onSubmit={onSubmit} className="stack-form"><label>Бүлгийн нэр<input value={value.name} onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))} required placeholder="Жишээ: Бяцхан одод" autoFocus /></label><label>Хичээлийн жил<input value={value.school_year} onChange={(event) => setValue((current) => ({ ...current, school_year: event.target.value }))} required /></label><label>Насны ангилал<input value={value.age_band} onChange={(event) => setValue((current) => ({ ...current, age_band: event.target.value }))} placeholder="Жишээ: 4–5 нас" /></label><fieldset className="color-field"><legend>Бүлгийн өнгө</legend><div>{GROUP_COLORS.map((color) => <button type="button" key={color} className={value.color === color ? "selected" : ""} style={{ background: color }} onClick={() => setValue((current) => ({ ...current, color }))}>{value.color === color ? <Check /> : null}</button>)}</div></fieldset><button className="primary-button" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Plus />}Бүлэг үүсгэх</button></form>; }

function SummaryForm({ children, value, setValue, onSubmit, saving }: {
  children: Child[];
  value: { child_id: string; overall_summary: string; strengths: string; recommendations: string };
  setValue: React.Dispatch<React.SetStateAction<{ child_id: string; overall_summary: string; strengths: string; recommendations: string }>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  return <form className="stack-form" onSubmit={onSubmit}>
    <label>Хүүхэд<select required value={value.child_id} onChange={(event) => setValue((current) => ({ ...current, child_id: event.target.value }))}><option value="">Сонгох…</option>{children.map((child) => <option key={child.id} value={child.id}>{childName(child)}</option>)}</select></label>
    <label>Ерөнхий дүгнэлт<textarea required value={value.overall_summary} onChange={(event) => setValue((current) => ({ ...current, overall_summary: event.target.value }))} placeholder="Энэ хугацаанд гарсан ахиц, өөрчлөлтийг нэгтгэн бичнэ үү." /></label>
    <label>Давуу тал<textarea value={value.strengths} onChange={(event) => setValue((current) => ({ ...current, strengths: event.target.value }))} placeholder="Илүү сайн хөгжиж буй чадвар, сонирхол…" /></label>
    <label>Дараагийн дэмжлэг<textarea value={value.recommendations} onChange={(event) => setValue((current) => ({ ...current, recommendations: event.target.value }))} placeholder="Дараагийн хугацаанд дэмжих чиглэл…" /></label>
    <button className="primary-button" disabled={saving || !children.length}>{saving ? <LoaderCircle className="spin" /> : <Check />}Дүгнэлт хадгалах</button>
  </form>;
}

function ChildForm({ value, setValue, onSubmit, saving }: { value: typeof emptyChild; setValue: React.Dispatch<React.SetStateAction<typeof emptyChild>>; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean }) {
  const update = (key: keyof typeof emptyChild, next: string) => setValue((current) => ({ ...current, [key]: next }));
  return <form onSubmit={onSubmit} className="child-form"><div className="form-section"><h3><UserRound />Хүүхдийн мэдээлэл</h3><div className="form-grid three"><label>Овог<input value={value.last_name} onChange={(event) => update("last_name", event.target.value)} /></label><label>Нэр *<input value={value.first_name} onChange={(event) => update("first_name", event.target.value)} required /></label><label>Дуудах нэр<input value={value.preferred_name} onChange={(event) => update("preferred_name", event.target.value)} /></label><label>Төрсөн огноо<input type="date" value={value.birth_date} onChange={(event) => update("birth_date", event.target.value)} /></label><label>Хүйс<select value={value.gender} onChange={(event) => update("gender", event.target.value)}><option value="">Сонгох</option><option>Эрэгтэй</option><option>Эмэгтэй</option><option>Бусад</option></select></label><label>Элссэн огноо<input type="date" value={value.enrollment_date} onChange={(event) => update("enrollment_date", event.target.value)} /></label></div></div><div className="form-section"><h3><Phone />Эцэг эх, асран хамгаалагч</h3><div className="form-grid"><label>1-р асран хамгаалагч<input value={value.parent_one_name} onChange={(event) => update("parent_one_name", event.target.value)} placeholder="Нэр" /></label><label>Утас<input type="tel" value={value.parent_one_phone} onChange={(event) => update("parent_one_phone", event.target.value)} /></label><label>2-р асран хамгаалагч<input value={value.parent_two_name} onChange={(event) => update("parent_two_name", event.target.value)} placeholder="Нэр" /></label><label>Утас<input type="tel" value={value.parent_two_phone} onChange={(event) => update("parent_two_phone", event.target.value)} /></label><label className="full">Яаралтай үед холбоо барих<input value={value.emergency_contact} onChange={(event) => update("emergency_contact", event.target.value)} placeholder="Нэр, холбоо хамаарал, утас" /></label></div></div><div className="form-section"><h3><FolderHeart />Нэмэлт мэдээлэл</h3><div className="form-grid"><label className="full">Гэрийн хаяг<input value={value.address} onChange={(event) => update("address", event.target.value)} /></label><label>Эрүүл мэндийн тэмдэглэл<textarea value={value.medical_notes} onChange={(event) => update("medical_notes", event.target.value)} /></label><label>Бусад тэмдэглэл<textarea value={value.notes} onChange={(event) => update("notes", event.target.value)} /></label></div></div><button className="primary-button" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Check />}{value.id ? "Мэдээлэл шинэчлэх" : "Хүүхэд нэмэх"}</button></form>;
}

function ObservationForm({ children, value, setValue, files, setFiles, onSubmit, saving, cameraInput, fileInput, onFiles }: { children: Child[]; value: ReturnType<typeof emptyObservation>; setValue: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyObservation>>>; files: File[]; setFiles: React.Dispatch<React.SetStateAction<File[]>>; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean; cameraInput: React.RefObject<HTMLInputElement | null>; fileInput: React.RefObject<HTMLInputElement | null>; onFiles: (list: FileList | null) => void }) {
  return <form className="observation-form" onSubmit={onSubmit}><div className="observation-basics"><label>Хүүхэд<select value={value.child_id} onChange={(event) => setValue((current) => ({ ...current, child_id: event.target.value }))} required><option value="">Сонгох…</option>{children.map((child) => <option key={child.id} value={child.id}>{childName(child)}</option>)}</select></label><label>Ажигласан өдөр<input type="date" value={value.observed_on} onChange={(event) => setValue((current) => ({ ...current, observed_on: event.target.value }))} required /></label></div><div className="area-form-list">{DEVELOPMENT_AREAS.map((area) => <section key={area.key} style={{ "--area-color": area.color, "--area-bg": area.bg } as React.CSSProperties}><div className="area-form-head"><span><area.icon /></span><div><h3>{area.label}</h3><p>Харсан зүйлээ бодитоор, товч тэмдэглэнэ үү.</p></div><label className="score-select">Үнэлгээ<select value={value.scores[area.key]} onChange={(event) => setValue((current) => ({ ...current, scores: { ...current.scores, [area.key]: Number(event.target.value) } }))}>{[1,2,3,4,5].map((score) => <option key={score} value={score}>{score}</option>)}</select></label></div><textarea value={value.notes[area.key]} onChange={(event) => setValue((current) => ({ ...current, notes: { ...current.notes, [area.key]: event.target.value } }))} placeholder={`${area.label}-ны ажиглалт…`} /></section>)}</div><div className="form-section"><h3><ImagePlus />Бүтээлийн зураг</h3><p className="helper">Гар утаснаас шууд зураг авах эсвэл төхөөрөмжөөсөө сонгоно. Нэг зураг 8 МБ хүртэл.</p><div className="upload-actions"><button type="button" onClick={() => cameraInput.current?.click()}><Camera />Камераар авах</button><button type="button" onClick={() => fileInput.current?.click()}><Upload />Зураг сонгох</button></div><input hidden ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={(event) => onFiles(event.target.files)} /><input hidden ref={fileInput} type="file" accept="image/*" multiple onChange={(event) => onFiles(event.target.files)} />{files.length ? <div className="selected-files">{files.map((file, index) => <span key={`${file.name}-${index}`}><ImagePlus />{file.name}<button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X /></button></span>)}</div> : null}</div><div className="form-grid"><label>Ерөнхий дүгнэлт<textarea value={value.summary} onChange={(event) => setValue((current) => ({ ...current, summary: event.target.value }))} placeholder="Өнөөдрийн онцлох ахиц, сонирхол…" /></label><label>Дараагийн алхам<textarea value={value.next_steps} onChange={(event) => setValue((current) => ({ ...current, next_steps: event.target.value }))} placeholder="Дэмжих дараагийн үйл ажиллагаа…" /></label></div><button className="primary-button" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <ClipboardPenLine />}Ажиглалт хадгалах</button></form>;
}

function ChildDrawer({ child, group, observations, media, onClose, onEdit, onObservation }: { child: Child; group?: Group; observations: Observation[]; media: ObservationMedia[]; onClose: () => void; onEdit: () => void; onObservation: () => void }) {
  return <div className="drawer-backdrop" onClick={onClose}><aside className="child-drawer" onClick={(event) => event.stopPropagation()}><button className="drawer-close" onClick={onClose}><X /></button><div className="drawer-hero" style={{ "--group-color": group?.color || "#8b5cf6" } as React.CSSProperties}><div className="child-avatar large">{initials(childName(child))}</div><h2>{childName(child)}</h2><p>{group?.name || "Бүлэггүй"} · {child.birth_date ? `${Math.max(0, new Date().getFullYear() - new Date(child.birth_date).getFullYear())} настай` : "Нас оруулаагүй"}</p><div><button onClick={onObservation}><Plus />Ажиглалт</button><button onClick={onEdit}>Засах</button></div></div><div className="drawer-body"><section><span className="eyebrow">ХУВИЙН МЭДЭЭЛЭЛ</span><dl className="detail-list"><div><dt>Төрсөн огноо</dt><dd>{formatDate(child.birth_date)}</dd></div><div><dt>Элссэн огноо</dt><dd>{formatDate(child.enrollment_date)}</dd></div><div><dt>Хүйс</dt><dd>{child.gender || "—"}</dd></div><div><dt>Гэрийн хаяг</dt><dd>{child.address || "—"}</dd></div></dl></section><section><span className="eyebrow">АСРАН ХАМГААЛАГЧ</span><div className="parent-cards"><div><strong>{child.parent_one_name || "Мэдээлэлгүй"}</strong><a href={child.parent_one_phone ? `tel:${child.parent_one_phone}` : undefined}><Phone />{child.parent_one_phone || "Утасгүй"}</a></div>{child.parent_two_name || child.parent_two_phone ? <div><strong>{child.parent_two_name || "2-р асран хамгаалагч"}</strong><a href={child.parent_two_phone ? `tel:${child.parent_two_phone}` : undefined}><Phone />{child.parent_two_phone || "Утасгүй"}</a></div> : null}</div>{child.emergency_contact ? <p className="emergency">Яаралтай үед: {child.emergency_contact}</p> : null}</section>{child.medical_notes || child.notes ? <section><span className="eyebrow">ТЭМДЭГЛЭЛ</span>{child.medical_notes ? <p className="medical-note">💊 {child.medical_notes}</p> : null}{child.notes ? <p className="plain-note">{child.notes}</p> : null}</section> : null}<section><span className="eyebrow">СҮҮЛИЙН АЖИГЛАЛТУУД</span>{observations.slice(0, 4).map((observation) => <div className="drawer-observation" key={observation.id}><span>{formatDate(observation.observed_on)}</span><strong>{averageScore(observation).toFixed(1)} / 5</strong><p>{observation.summary || "Ерөнхий дүгнэлт оруулаагүй."}</p>{media.filter((item) => item.observation_id === observation.id).map((photo) => photo.signed_url ? <img key={photo.id} src={photo.signed_url} alt={photo.file_name} /> : null)}</div>)}{!observations.length ? <p className="muted">Ажиглалт хараахан байхгүй.</p> : null}</section></div></aside></div>;
}
