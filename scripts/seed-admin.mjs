// Seed (or update) an admin user. Run:
//   node --env-file=.env.local scripts/seed-admin.mjs [email] [password]
// Uses the service-role key to create an auto-confirmed user and grant the
// 'admin' role. Safe to re-run.
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2] || process.env.SEED_ADMIN_EMAIL || "admin@abc.local";
const password =
  process.argv[3] || process.env.SEED_ADMIN_PASSWORD || "psa-admin-1234";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function findUserByEmail(targetEmail) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email === targetEmail);
    if (match) return match;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

let userId;
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Admin" },
});

if (createErr) {
  const existing = await findUserByEmail(email);
  if (!existing) throw createErr;
  userId = existing.id;
  await admin.auth.admin.updateUserById(userId, { password });
  console.log(`ℹ️  User already existed — password reset.`);
} else {
  userId = created.user.id;
  console.log(`✅ Created auth user.`);
}

const { error: roleErr } = await admin
  .from("profiles")
  .update({ roles: ["admin"], full_name: "Admin" })
  .eq("id", userId);
if (roleErr) throw roleErr;

console.log(`✅ Admin ready.\n   Email:    ${email}\n   Password: ${password}`);
