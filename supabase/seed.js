// ============================================================
// Ripple Chat — Seed Script
// ============================================================
// Creates seeded auth users + a conversation between them.
//
// Usage:
//   node supabase/seed.js
//
// Requirements:
//   npm install @supabase/supabase-js dotenv
//
// You need your SERVICE ROLE key (not the anon key) since we're
// creating auth users. Find it in:
//   Supabase dashboard → Project Settings → API → service_role
//
// Add to your .env:
//   VITE_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env",
  );
  process.exit(1);
}

// Service role client — bypasses RLS, can create auth users
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// Seed users
// ============================================================

const SEED_USERS = [
  {
    email: "alice.chen@example.com",
    password: "password123",
    username: "alicechen",
    display_name: "Alice Chen",
  },
  {
    email: "bob.martinez@example.com",
    password: "password123",
    username: "bobmartinez",
    display_name: "Bob Martinez",
  },
  {
    email: "carol.williams@example.com",
    password: "password123",
    username: "carolwilliams",
    display_name: "Carol Williams",
  },
];

// ============================================================
// Seed conversation + messages
// ============================================================

const SEED_MESSAGES = [
  { senderIndex: 0, content: "Hey! Have you tried Ripple yet?" },
  { senderIndex: 1, content: "Just signed up — looks great so far!" },
  { senderIndex: 0, content: "Real-time delivery is working nicely 🎉" },
  { senderIndex: 1, content: "Yeah the message delivery is super snappy." },
  { senderIndex: 0, content: "Built on Supabase Realtime under the hood." },
  { senderIndex: 1, content: "Nice. Raspberry theme is a good call 🍦" },
  { senderIndex: 2, content: "Hey can I join this conversation?" },
];

async function createOrFetchUser(userData) {
  // Check if user already exists in profiles (seed was already run)
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", userData.username)
    .single();

  if (existing) {
    console.log(`  ↩  User already exists: ${userData.email}`);
    return existing.id;
  }

  // Create via auth admin API — this triggers the handle_new_user
  // trigger which auto-creates the profiles row
  const { data, error } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true, // skip email confirmation
  });

  if (error)
    throw new Error(
      `Failed to create user ${userData.email}: ${error.message}`,
    );

  // Update the profile with proper display name and username
  // (trigger defaults to email local-part)
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      username: userData.username,
      display_name: userData.display_name,
    })
    .eq("id", data.user.id);

  if (profileError)
    throw new Error(`Failed to update profile: ${profileError.message}`);

  console.log(
    `  ✓  Created user: ${userData.email} (${userData.display_name})`,
  );
  return data.user.id;
}

async function seed() {
  console.log("\n🌱 Ripple Chat — Seeding\n");

  // 1. Create users
  console.log("Creating users…");
  const userIds = [];
  for (const userData of SEED_USERS) {
    const id = await createOrFetchUser(userData);
    userIds.push(id);
  }

  const [aliceId, bobId, carolId] = userIds;

  // 2. Create Alice ↔ Bob conversation (if not already seeded)
  console.log("\nCreating conversations…");

  const { data: existingConv } = await supabase.rpc("get_direct_conversation", {
    user_a: aliceId,
    user_b: bobId,
  });

  let convId = existingConv;

  if (!convId) {
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({ type: "direct", created_by: aliceId })
      .select("id")
      .single();

    if (convError)
      throw new Error(`Failed to create conversation: ${convError.message}`);
    convId = conv.id;

    await supabase.from("conversation_participants").insert([
      { conversation_id: convId, user_id: aliceId, role: "admin" },
      { conversation_id: convId, user_id: bobId, role: "member" },
    ]);

    console.log("  ✓  Created Alice ↔ Bob conversation");
  } else {
    console.log("  ↩  Alice ↔ Bob conversation already exists");
  }

  // 3. Seed Alice ↔ Bob messages (only if none exist yet)
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", convId);

  if (count === 0) {
    console.log("\nSeeding messages…");
    const senderIds = [aliceId, bobId, carolId];

    for (let i = 0; i < SEED_MESSAGES.length; i++) {
      const msg = SEED_MESSAGES[i];
      // Skip Carol's message — she's not in this conversation
      if (msg.senderIndex === 2) continue;

      const { error } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: senderIds[msg.senderIndex],
        content: msg.content,
        created_at: new Date(
          Date.now() - (SEED_MESSAGES.length - i) * 60000,
        ).toISOString(),
      });

      if (error)
        console.warn(`  ✗  Failed to insert message: ${error.message}`);
      else console.log(`  ✓  Message: "${msg.content.slice(0, 40)}…"`);
    }
  } else {
    console.log(`\n  ↩  Messages already seeded (${count} found)`);
  }

  // 4. Create Alice ↔ Carol conversation (empty, for testing new conv picker)
  const { data: existingAliceCarol } = await supabase.rpc(
    "get_direct_conversation",
    { user_a: aliceId, user_b: carolId },
  );

  if (!existingAliceCarol) {
    const { data: conv2, error: conv2Error } = await supabase
      .from("conversations")
      .insert({ type: "direct", created_by: aliceId })
      .select("id")
      .single();

    if (!conv2Error) {
      await supabase.from("conversation_participants").insert([
        { conversation_id: conv2.id, user_id: aliceId, role: "admin" },
        { conversation_id: conv2.id, user_id: carolId, role: "member" },
      ]);
      console.log("\n  ✓  Created Alice ↔ Carol conversation (empty)");
    }
  } else {
    console.log("\n  ↩  Alice ↔ Carol conversation already exists");
  }

  console.log("\n✅ Seed complete!\n");
  console.log("Sign in with:");
  for (const u of SEED_USERS) {
    console.log(`  ${u.email} / ${u.password}`);
  }
  console.log("");
}

seed().catch((err) => {
  console.error("\n❌ Seed failed:", err.message);
  process.exit(1);
});
