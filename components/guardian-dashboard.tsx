"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Baby, BarChart3, BookHeart, CalendarDays, Check, ChevronRight, ClipboardList, FileText, Heart, Home, KeyRound, LoaderCircle, LogOut, Menu, Settings, ShieldCheck, Sparkles, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { childName, DEVELOPMENT_AREAS, formatDate } from "@/lib/constants";
import type { Child, Group, Observation, ObservationMedia, PeriodSummary, Profile } from "@/lib/types";

type GuardianView = "home" | "observations" | "progress" | "reports" | "settings";
type Period = "week" | "month" | "quarter" | "year";
const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 31, quarter: 92, year: 366 };
const PERIOD_LABELS: Record<Period, string> = { week: "7 хоног", month: "Сар", quarter: "Улирал", year: "Жил" };

function average(item: Observation) {
  return DEVELOPMENT_AREAS.reduce((sum, area) => sum + Number(item[`${area.key}_score` as keyof Observation]), 0) / DEVELOPMENT_AREAS.length;
}

export default function GuardianDashboard({ user }: { user: User }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<GuardianView>("home");
  const [mobileNav, setMobileNav] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [media, setMedia] = useState<ObservationMedia[]>([]);
  const [summaries, setSummaries] = useState<PeriodSummary[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [period, setPeriod] = useState<Period>("month");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [profileResult, childResult, groupResult, observationResult, mediaResult, summaryResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name, kindergarten_name, phone").eq("id", user.id).maybeSingle(),
      supabase.from("children").select("*").order("first_name"),
      supabase.from("groups").select("*").order("name"),
      supabase.from("observations").select("*").order("observed_on", { ascending: false }),
      supabase.from("observation_media").select("id, observation_id, child_id, storage_path, file_name"),
      supabase.from("period_summaries").select("*").order("period_end", { ascending: false }),
    ]);
    const error = [profileResult, childResult, groupResult, observationResult, mediaResult, summaryResult].find((item) => item.error)?.error;
    if (error) setMessage(error.message);
    let guardianProfile = profileResult.data as Profile | null;
    if (!guardianProfile) {
      const fullName = String(user.user_metadata?.full_name || user.email || "Асран хамгаалагч");
      const { data } = await supabase.from("profiles").upsert({ id: user.id, full_name: fullName }).select("id, full_name, kindergarten_name, phone").single();
      guardianProfile = data as Profile | null;
    }
    setProfile(guardianProfile);
    const childList = (childResult.data || []) as Child[];
    setChildren(childList);
    setGroups((groupResult.data || []) as Group[]);
    setObservations((observationResult.data || []) as Observation[]);
    setSummaries((summaryResult.data || []) as PeriodSummary[]);
    setSelectedChildId((current) => current || childList[0]?.id || "");
    const signed = await Promise.all(((mediaResult.data || []) as ObservationMedia[]).map(async (item) => {
      const { data } = await supabase.storage.from("child-work").createSignedUrl(item.storage_path, 3600);
      return { ...item, signed_url: data?.signedUrl };
    }));
    setMedia(signed);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPassword(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (password.length < 8 || password !== confirmation) {
      setSavingPassword(false);
      setMessage("Нууц үг 8-аас дээш тэмдэгттэй, давталт нь ижил байна.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) return setMessage(error.message);
    setMessage("Нууц үг амжилттай шинэчлэгдлээ.");
    event.currentTarget.reset();
  }

  if (loading) return <div className="role-loading"><LoaderCircle className="spin" /><p>Хүүхдийн мэдээллийг уншиж байна…</p></div>;
  if (!children.length) return <main className="guardian-claim-page"><div className="guardian-claim-card"><div className="claim-logo"><Sparkles />Өсөлт</div><span className="guardian-modal-icon"><KeyRound /></span><span className="eyebrow">АСРАН ХАМГААЛАГЧИЙН ОРЧИН</span><h1>Хүүхдийн эрх холбоогүй байна</h1><p>Таны нэвтрэх эрхэд хүүхэд холбогдоогүй байна. Хүүхдийнхээ багшид хандаж эрхээ идэвхжүүлнэ үү.</p>{message ? <div className="role-auth-message">{message}</div> : null}<div className="guardian-security-note"><ShieldCheck /><span>Холболтыг зөвхөн тухайн хүүхдийн багш үүсгэх боломжтой.</span></div><button className="claim-signout" onClick={() => supabase.auth.signOut()}><LogOut />Системээс гарах</button></div></main>;

  const selectedChild = children.find((child) => child.id === selectedChildId) || children[0];
  const childObservations = observations.filter((item) => item.child_id === selectedChild.id);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period]);
  const periodObservations = childObservations.filter((item) => new Date(`${item.observed_on}T23:59:59`) >= cutoff).reverse();
  const latest = childObservations[0];
  const childSummaries = summaries.filter((item) => item.child_id === selectedChild.id);
  const group = groups.find((item) => item.id === selectedChild.group_id);
  const nav = [
    { id: "home" as const, label: "Нүүр", icon: Home },
    { id: "observations" as const, label: "Ажиглалт", icon: ClipboardList },
    { id: "progress" as const, label: "Ахиц", icon: BarChart3 },
    { id: "reports" as const, label: "Тайлан", icon: FileText },
    { id: "settings" as const, label: "Тохиргоо", icon: Settings },
  ];

  return <div className="guardian-shell">
    <aside className={`guardian-sidebar ${mobileNav ? "open" : ""}`}><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Цэс хаах"><X /></button><div className="guardian-brand"><span><Sparkles /></span>Өсөлт<small>Гэр бүлийн орчин</small></div><div className="guardian-profile"><span>{(profile?.full_name || "А")[0]}</span><div><b>{profile?.full_name}</b><small>Асран хамгаалагч</small></div></div><nav>{nav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobileNav(false); }}><item.icon />{item.label}<ChevronRight /></button>)}</nav><div className="guardian-safe"><ShieldCheck /><div><b>Аюулгүй орчин</b><p>Зөвхөн таны хүүхдийн мэдээлэл харагдана.</p></div></div><button className="guardian-signout" onClick={() => supabase.auth.signOut()}><LogOut />Гарах</button></aside>
    {mobileNav ? <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="Цэс хаах" /> : null}
    <main className="guardian-main"><header className="guardian-topbar"><button onClick={() => setMobileNav(true)} aria-label="Цэс нээх"><Menu /></button><div><span>Сайн байна уу,</span><b>{profile?.full_name?.split(" ").at(-1) || "Асран хамгаалагч"} 👋</b></div>{children.length > 1 ? <select aria-label="Хүүхэд сонгох" value={selectedChild.id} onChange={(event) => setSelectedChildId(event.target.value)}>{children.map((child) => <option value={child.id} key={child.id}>{childName(child)}</option>)}</select> : <span className="guardian-child-pill"><Baby />{childName(selectedChild)}</span>}</header>
      {view === "home" ? <section className="guardian-home"><div className="guardian-welcome"><div><span className="eyebrow">{group?.name || "ХҮҮХДИЙН БҮЛЭГ"}</span><h1>{childName(selectedChild)}-ийн<br/><em>өсөлтийн түүх</em></h1><p>Багшийн тэмдэглэсэн өдөр тутмын онцгой мөч, ахиц дэвшлийг эндээс хараарай.</p></div><div className="guardian-child-orbit"><span><Heart /></span><strong>{childName(selectedChild).slice(0, 1)}</strong></div></div><div className="guardian-stats"><article><span><ClipboardList /></span><div><small>Нийт ажиглалт</small><b>{childObservations.length}</b></div></article><article><span><CalendarDays /></span><div><small>Сүүлийн тэмдэглэл</small><b>{latest ? formatDate(latest.observed_on) : "—"}</b></div></article><article><span><BarChart3 /></span><div><small>Одоогийн дундаж</small><b>{latest ? `${average(latest).toFixed(1)} / 5` : "—"}</b></div></article></div><section className="guardian-section"><div className="guardian-section-head"><div><span className="eyebrow">СҮҮЛИЙН АЖИГЛАЛТ</span><h2>Өнөөдрийн онцгой мөч</h2></div><button onClick={() => setView("observations")}>Бүгдийг харах <ChevronRight /></button></div>{latest ? <ObservationCard observation={latest} media={media} /> : <GuardianEmpty />}</section></section> : null}
      {view === "observations" ? <section className="guardian-page"><PageTitle icon={BookHeart} title="Ажиглалтын түүх" text={`${childName(selectedChild)}-ийн багшийн хуваалцсан өдөр тутмын тэмдэглэлүүд.`} />{childObservations.length ? <div className="guardian-observation-list">{childObservations.map((item) => <ObservationCard key={item.id} observation={item} media={media} />)}</div> : <GuardianEmpty />}</section> : null}
      {view === "progress" ? <section className="guardian-page"><PageTitle icon={BarChart3} title="Хөгжлийн ахиц" text="7 чиглэлийн өөрчлөлтийг хугацаагаар харьцуулна." /><div className="guardian-periods">{(["week","month","quarter","year"] as Period[]).map((item) => <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{PERIOD_LABELS[item]}</button>)}</div>{periodObservations.length ? <ProgressPanel observations={periodObservations} /> : <GuardianEmpty />}</section> : null}
      {view === "reports" ? <section className="guardian-page"><PageTitle icon={FileText} title="Багшийн дүгнэлт" text="Сар, улирал, жилийн дүгнэлт болон гэрт дэмжих зөвлөмж." />{childSummaries.length ? <div className="guardian-report-list">{childSummaries.map((summary) => <article key={summary.id}><div><span>{summary.period_type === "month" ? "Сарын" : summary.period_type === "quarter" ? "Улирлын" : "Жилийн"} дүгнэлт</span><small>{formatDate(summary.period_start)} — {formatDate(summary.period_end)}</small></div><h3>{summary.overall_summary}</h3>{summary.strengths ? <p><b>🌟 Давуу тал</b>{summary.strengths}</p> : null}{summary.recommendations ? <p><b>💜 Гэрт дэмжих зөвлөмж</b>{summary.recommendations}</p> : null}</article>)}</div> : <GuardianEmpty />}</section> : null}
      {view === "settings" ? <section className="guardian-page"><PageTitle icon={Settings} title="Тохиргоо" text="Багшийн өгсөн түр нууц үгийг хувийн нууц үгээрээ солино." /><form className="guardian-password-card" onSubmit={changePassword}><span><KeyRound /></span><h2>Нууц үг солих</h2><p>8-аас дээш тэмдэгттэй, бусдад таахад хэцүү нууц үг сонгоно уу.</p><label>Шинэ нууц үг<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label><label>Шинэ нууц үг давтах<input name="confirmation" type="password" minLength={8} required autoComplete="new-password" /></label>{message ? <div className="role-auth-message">{message}</div> : null}<button disabled={savingPassword}>{savingPassword ? <LoaderCircle className="spin" /> : <Check />}Нууц үг хадгалах</button></form></section> : null}
    </main>
  </div>;
}

function PageTitle({ icon: Icon, title, text }: { icon: typeof Home; title: string; text: string }) { return <div className="guardian-page-title"><span><Icon /></span><div><h1>{title}</h1><p>{text}</p></div></div>; }
function GuardianEmpty() { return <div className="guardian-empty"><span>🌱</span><h3>Мэдээлэл хараахан алга</h3><p>Багш тэмдэглэл нэмэхэд энд автоматаар харагдана.</p></div>; }
function ObservationCard({ observation, media }: { observation: Observation; media: ObservationMedia[] }) { const photos = media.filter((item) => item.observation_id === observation.id); return <article className="guardian-observation-card"><div className="guardian-observation-date"><b>{new Date(`${observation.observed_on}T00:00:00`).getDate()}</b><span>{new Intl.DateTimeFormat("mn-MN", { month: "short" }).format(new Date(`${observation.observed_on}T00:00:00`))}</span></div><div className="guardian-observation-content"><div className="guardian-observation-meta"><span>БАГШИЙН АЖИГЛАЛТ</span><b>{average(observation).toFixed(1)} / 5</b></div><h3>{observation.summary || "Өдрийн хөгжлийн тэмдэглэл"}</h3><div className="guardian-area-chips">{DEVELOPMENT_AREAS.filter((area) => observation[`${area.key}_notes` as keyof Observation]).map((area) => <span key={area.key} style={{ color: area.color, background: area.bg }}><area.icon />{area.label}</span>)}</div>{photos.length ? <div className="guardian-photo-row">{photos.map((photo) => photo.signed_url ? <img src={photo.signed_url} alt={photo.file_name} key={photo.id} /> : null)}</div> : null}{observation.next_steps ? <p className="guardian-next"><Sparkles /> <span><b>Дараагийн дэмжлэг</b>{observation.next_steps}</span></p> : null}</div></article>; }
function ProgressPanel({ observations }: { observations: Observation[] }) { const first = observations[0]; const last = observations.at(-1)!; return <div className="guardian-progress-card"><div className="guardian-progress-summary"><span><Sparkles /></span><div><small>СОНГОСОН ХУГАЦААНЫ ДУНДАЖ</small><b>{(observations.reduce((sum, item) => sum + average(item), 0) / observations.length).toFixed(1)} / 5</b><p>{observations.length} ажиглалтад үндэслэв</p></div></div><div className="guardian-bars">{DEVELOPMENT_AREAS.map((area) => { const score = observations.reduce((sum, item) => sum + Number(item[`${area.key}_score` as keyof Observation]), 0) / observations.length; const change = Number(last[`${area.key}_score` as keyof Observation]) - Number(first[`${area.key}_score` as keyof Observation]); return <div key={area.key}><div><span><area.icon style={{ color: area.color }} />{area.label}</span><b>{score.toFixed(1)} {change > 0 ? <em>+{change.toFixed(1)}</em> : null}</b></div><span className="guardian-bar-track"><i style={{ width: `${score * 20}%`, background: area.color }} /></span></div>; })}</div></div>; }
