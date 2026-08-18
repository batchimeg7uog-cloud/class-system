"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Copy, LoaderCircle, RefreshCw, ShieldCheck, UserPlus, UsersRound, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { childName } from "@/lib/constants";
import type { Child } from "@/lib/types";

type Credential = { email: string; password: string; childName: string; created: boolean };

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return `Oso!${Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("")}`;
}

export default function TeacherGuardianAccess() {
  const supabase = useMemo(() => getSupabase(), []);
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [credential, setCredential] = useState<Credential | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    void supabase.from("children").select("*").order("first_name").then(({ data, error }) => {
      if (error) setMessage(error.message);
      const list = (data || []) as Child[];
      setChildren(list);
      setChildId((current) => current || list[0]?.id || "");
      setPassword((current) => current || temporaryPassword());
    });
  }, [open, supabase]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!childId) return;
    setLoading(true);
    setMessage("");
    setCredential(null);
    const { data, error } = await supabase.functions.invoke("create-guardian-account", {
      body: { child_id: childId, full_name: fullName.trim(), email: email.trim().toLowerCase(), password },
    });
    setLoading(false);
    if (error) return setMessage(`Эрх үүсгэхэд алдаа гарлаа: ${error.message}`);
    if (!data?.ok) return setMessage(data?.error || "Эрх үүсгэж чадсангүй.");
    const child = children.find((item) => item.id === childId);
    setCredential({ email, password, childName: childName(child), created: Boolean(data.created) });
  }

  async function copyCredential() {
    if (!credential) return;
    await navigator.clipboard.writeText(`Өсөлт систем\n${window.location.origin}\nИмэйл: ${credential.email}\nТүр нууц үг: ${credential.password}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function close() {
    setOpen(false);
    setCredential(null);
    setMessage("");
    setFullName("");
    setEmail("");
    setPassword("");
  }

  return <>
    <button className="guardian-access-fab no-print" onClick={() => setOpen(true)}><UsersRound /><span>Асран хамгаалагчийн эрх</span></button>
    {open ? <div className="guardian-access-backdrop" role="dialog" aria-modal="true" aria-label="Асран хамгаалагчийн эрх үүсгэх">
      <section className="guardian-access-modal">
        <button className="guardian-modal-close" onClick={close} aria-label="Хаах"><X /></button>
        <span className="guardian-modal-icon"><UserPlus /></span>
        <span className="eyebrow">БАГШИЙН УДИРДЛАГА</span>
        <h2>Асран хамгаалагчийн эрх</h2>
        <p>Нэвтрэх имэйл, түр нууц үгийг багш үүсгэж шууд идэвхжүүлнэ.</p>
        {!credential ? <form onSubmit={createAccount} className="guardian-account-form">
          <label>Хүүхэд<select required value={childId} onChange={(event) => setChildId(event.target.value)}><option value="">Сонгох…</option>{children.map((child) => <option key={child.id} value={child.id}>{childName(child)}</option>)}</select></label>
          <label>Асран хамгаалагчийн нэр<input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Овог нэр" /></label>
          <label>Нэвтрэх имэйл<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="parent@example.com" /></label>
          <label>Түр нууц үг<div className="temporary-password"><input required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setPassword(temporaryPassword())} aria-label="Шинэ нууц үг үүсгэх"><RefreshCw /></button></div></label>
          <button className="primary-button guardian-code-create" disabled={!childId || loading}>{loading ? <LoaderCircle className="spin" /> : <UserPlus />}Эрх үүсгэж идэвхжүүлэх</button>
        </form> : <div className="guardian-credential-box"><small>{credential.created ? "НЭВТРЭХ ЭРХ ИДЭВХЖЛЭЭ" : "ӨМНӨХ ЭРХТЭЙ ХОЛБОГДЛОО"}</small><h3>{credential.childName}</h3><dl><div><dt>Имэйл</dt><dd>{credential.email}</dd></div>{credential.created ? <div><dt>Түр нууц үг</dt><dd>{credential.password}</dd></div> : null}</dl>{credential.created ? <button onClick={copyCredential}>{copied ? <Check /> : <Copy />}{copied ? "Хуулсан" : "Нэвтрэх мэдээлэл хуулах"}</button> : <p>Энэ имэйл өмнө нь бүртгэлтэй тул тухайн хэрэглэгч өөрийн одоогийн нууц үгээр нэвтэрнэ.</p>}</div>}
        {message ? <div className="role-auth-message">{message}</div> : null}
        <div className="guardian-security-note"><ShieldCheck /><span><b>Тусдаа эрх</b> зөвхөн сонгосон хүүхдийн ажиглалт, ахиц, тайланг уншина. Багшийн мэдээллийг өөрчлөх боломжгүй.</span></div>
      </section>
    </div> : null}
  </>;
}
