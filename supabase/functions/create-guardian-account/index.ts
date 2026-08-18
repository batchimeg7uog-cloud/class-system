import { createClient } from "npm:@supabase/supabase-js@2.112.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ ok: false, error: "Method not allowed" }, 405);

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return response({ ok: false, error: "Нэвтрэх шаардлагатай." }, 401);

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const configuredSecrets = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const secretKey = configuredSecrets.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !secretKey) throw new Error("Supabase server configuration is missing");

    const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const teacher = authData.user;
    if (authError || !teacher) return response({ ok: false, error: "Нэвтрэх эрх хүчингүй байна." }, 401);

    const payload = await request.json();
    const childId = String(payload.child_id || "");
    const fullName = String(payload.full_name || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");
    if (!childId || !fullName || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      return response({ ok: false, error: "Нэр, зөв имэйл болон 8-аас дээш тэмдэгттэй нууц үг оруулна уу." });
    }

    const [{ data: role }, { data: child }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", teacher.id).maybeSingle(),
      admin.from("children").select("id, teacher_id").eq("id", childId).maybeSingle(),
    ]);
    if (role?.role !== "teacher" || child?.teacher_id !== teacher.id) {
      return response({ ok: false, error: "Энэ хүүхдэд эрх үүсгэх зөвшөөрөлгүй байна." }, 403);
    }

    let guardianId = "";
    let created = false;
    const { data: userPage, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    const existing = userPage.users.find((item) => item.email?.toLowerCase() === email);

    if (existing) {
      const { data: existingRole } = await admin.from("user_roles").select("role").eq("user_id", existing.id).maybeSingle();
      if (existingRole?.role !== "guardian") return response({ ok: false, error: "Энэ имэйл багшийн эрхээр бүртгэлтэй байна." });
      guardianId = existing.id;
    } else {
      const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, account_role: "guardian" },
        app_metadata: { account_role: "guardian", must_change_password: true },
      });
      if (createError || !createdUser.user) throw createError || new Error("User creation failed");
      guardianId = createdUser.user.id;
      created = true;
    }

    const { error: linkError } = await admin.from("guardian_children").upsert({ guardian_id: guardianId, child_id: childId, linked_by: teacher.id }, { onConflict: "guardian_id,child_id" });
    if (linkError) {
      if (created) await admin.auth.admin.deleteUser(guardianId);
      throw linkError;
    }

    await admin.from("profiles").upsert({ id: guardianId, full_name: fullName }, { onConflict: "id" });
    return response({ ok: true, created, guardian_id: guardianId });
  } catch (error) {
    console.error(error);
    return response({ ok: false, error: "Асран хамгаалагчийн эрх үүсгэхэд алдаа гарлаа." }, 500);
  }
});
