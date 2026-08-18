"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Baby, GraduationCap, LoaderCircle, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import KindergartenApp from "@/components/kindergarten-app";
import GuardianDashboard from "@/components/guardian-dashboard";
import TeacherGuardianAccess from "@/components/teacher-guardian-access";

export type AccountRole = "teacher" | "guardian";

export default function RoleGateway() {
  const supabase = useMemo(() => getSupabase(), []);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AccountRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [portal, setPortal] = useState<AccountRole>("teacher");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function resolve(currentUser: User | null) {
      setUser(currentUser);
      if (!currentUser) {
        setRole(null);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id).maybeSingle();
      if (error || !data?.role) {
        setMessage(`Хэрэглэгчийн эрх уншихад алдаа гарлаа: ${error?.message || "эрхийн мэдээлэл олдсонгүй"}`);
        await supabase.auth.signOut();
        setRole(null);
        setUser(null);
        setLoading(false);
        return;
      }
      setRole(data.role as AccountRole);
      setLoading(false);
    }

    supabase.auth.getUser().then(({ data }) => void resolve(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setLoading(true);
      window.setTimeout(() => void resolve(session?.user ?? null), 0);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const fullName = String(form.get("full_name") || "").trim();

    if (mode === "signup") {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, account_role: portal }, emailRedirectTo: `${window.location.origin}/` },
      });
      setSaving(false);
      if (result.error) return setMessage(result.error.message);
      if (!result.data.session) setMessage("Бүртгэл үүслээ. Имэйлээр ирсэн баталгаажуулах холбоосыг нээгээд нэвтэрнэ үү.");
      return;
    }

    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error || !result.data.user) {
      setSaving(false);
      return setMessage(result.error?.message || "Нэвтрэхэд алдаа гарлаа.");
    }
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", result.data.user.id).maybeSingle();
    const actualRole = roleData?.role as AccountRole | undefined;
    if (!actualRole) {
      await supabase.auth.signOut();
      setSaving(false);
      setMessage("Хэрэглэгчийн эрх үүсээгүй байна. Дахин бүртгүүлэх эсвэл админтай холбогдоно уу.");
      return;
    }
    if (actualRole !== portal) {
      await supabase.auth.signOut();
      setSaving(false);
      setMessage(actualRole === "teacher" ? "Энэ бүртгэл багшийн эрхтэй. “Багш” хэсгээр нэвтэрнэ үү." : "Энэ бүртгэл асран хамгаалагчийн эрхтэй. “Асран хамгаалагч” хэсгээр нэвтэрнэ үү.");
      return;
    }
    setRole(actualRole);
    setUser(result.data.user);
    setSaving(false);
  }

  if (loading) return <div className="role-loading"><LoaderCircle className="spin" /><p>Таны орчныг бэлдэж байна…</p></div>;
  if (user && role === "guardian") return <GuardianDashboard user={user} />;
  if (user && role === "teacher") return <><KindergartenApp /><TeacherGuardianAccess /></>;

  return <main className={`role-auth role-${portal}`}>
    <section className="role-auth-visual">
      <div className="role-brand"><span><Sparkles /></span>Өсөлт</div>
      <div className="role-visual-copy">
        <span className="role-kicker">ХҮҮХДИЙН ХӨГЖЛИЙН НЭГДСЭН ОРЧИН</span>
        <h1>{portal === "teacher" ? <>Өдөр бүрийн ажиглалтаас<br/><em>том өсөлтийг</em> хараарай.</> : <>Хүүхдийнхээ өсөлтийг<br/><em>хамтдаа</em> дэмжээрэй.</>}</h1>
        <p>{portal === "teacher" ? "Ажиглалт, бүтээл, ахиц, тайлангаа нэг дор хөтөлнө." : "Багшийн хуваалцсан ажиглалт, ахиц, дүгнэлтийг аюулгүй орчноос харна."}</p>
      </div>
      <div className="role-feature-row"><span><ShieldCheck />Хувийн мэдээлэл хамгаалагдсан</span><span><Baby />Хүүхэд төвтэй</span></div>
    </section>
    <section className="role-auth-panel">
      <div className="role-switch" aria-label="Нэвтрэх төрлөө сонгох">
        <button className={portal === "teacher" ? "active" : ""} onClick={() => { setPortal("teacher"); setMessage(""); }}><GraduationCap />Багш</button>
        <button className={portal === "guardian" ? "active" : ""} onClick={() => { setPortal("guardian"); setMode("login"); setMessage(""); }}><UsersRound />Асран хамгаалагч</button>
      </div>
      <form className="role-auth-form" onSubmit={handleAuth}>
        <span className="eyebrow">{portal === "teacher" ? "БАГШИЙН ОРЧИН" : "АСРАН ХАМГААЛАГЧИЙН ОРЧИН"}</span>
        <h2>{mode === "login" ? "Тавтай морил" : "Шинэ эрх үүсгэх"}</h2>
        <p>{mode === "login" ? portal === "guardian" ? "Багшаас өгсөн имэйл, түр нууц үгээрээ нэвтэрнэ үү." : "Имэйл, нууц үгээрээ нэвтэрнэ үү." : "Багшийн ажлын орчноо үүсгэнэ үү."}</p>
        {mode === "signup" ? <label>Таны нэр<input name="full_name" required autoComplete="name" placeholder="Овог нэр" /></label> : null}
        <label>Имэйл хаяг<input name="email" type="email" required autoComplete="email" placeholder="name@example.com" /></label>
        <label>Нууц үг<input name="password" type="password" minLength={6} required autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="6-аас дээш тэмдэгт" /></label>
        {message ? <div className="role-auth-message">{message}</div> : null}
        <button className="role-submit" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : portal === "teacher" ? <GraduationCap /> : <UsersRound />}{mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}</button>
        {portal === "teacher" ? <button type="button" className="role-mode-link" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Шинэ багш уу? Бүртгүүлэх" : "Өмнө нь бүртгүүлсэн үү? Нэвтрэх"}</button> : <p className="guardian-login-help">Нэвтрэх эрхийг хүүхдийн багш үүсгэж идэвхжүүлнэ.</p>}
      </form>
    </section>
  </main>;
}
