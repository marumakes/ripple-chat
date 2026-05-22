// ============================================================
// Ripple Chat — Seed Script
// ============================================================
// Creates seeded auth users + conversations between them.
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

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// Users
// ============================================================

const SEED_USERS = [
  {
    email: "alice.chen@example.com",
    password: "password123",
    username: "alicechen",
    display_name: "Alice Chen",
    avatar_url: "https://i.pravatar.cc/150?img=31",
  },
  {
    email: "bob.martinez@example.com",
    password: "password123",
    username: "bobmartinez",
    display_name: "Bob Martinez",
    avatar_url: "https://i.pravatar.cc/150?img=12",
  },
  {
    email: "carol.williams@example.com",
    password: "password123",
    username: "carolwilliams",
    display_name: "Carol Williams",
    avatar_url: "https://i.pravatar.cc/150?img=5",
  },
  {
    email: "priya.sharma@example.com",
    password: "password123",
    username: "priyasharma",
    display_name: "Priya Sharma",
    avatar_url: "https://i.pravatar.cc/150?img=30",
  },
  {
    email: "kayla.thompson@example.com",
    password: "password123",
    username: "kaylathompson",
    display_name: "Kayla Thompson",
    avatar_url: "https://i.pravatar.cc/150?img=49",
  },
  {
    email: "yuki.tanaka@example.com",
    password: "password123",
    username: "yukitanaka",
    display_name: "Yuki Tanaka",
    avatar_url: null,
  },
  {
    email: "ramon.reyes@example.com",
    password: "password123",
    username: "ramonreyes",
    display_name: "Ramón Reyes",
    avatar_url: null,
  },
  {
    email: "alex.carter@example.com",
    password: "password123",
    username: "alexcarter",
    display_name: "Alex Carter",
    avatar_url: null,
  },
];

// ============================================================
// Timestamp helpers
// alice=0  bob=1  carol=2  priya=3  kayla=4  yuki=5  ramon=6  alex=7
// ============================================================

function ts(daysAgo, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ============================================================
// Conversations & messages
// ============================================================

const SEED_CONVERSATIONS = [
  // ── 1. Alice ↔ Bob (DM, ~15 messages, past week) ────────
  {
    key: "alice_bob",
    type: "direct",
    participants: [0, 1],
    messages: [
      {
        s: 0,
        t: ts(6, 9, 0),
        c: "Hey, did you get a chance to look at the new landing page draft?",
      },
      {
        s: 1,
        t: ts(6, 9, 12),
        c: "Yeah just checked it out — the hero section is really clean",
      },
      {
        s: 0,
        t: ts(6, 9, 15),
        c: "Thanks! Still not 100% on the font pairing though",
      },
      {
        s: 1,
        t: ts(6, 9, 20),
        c: "Maybe try a heavier weight for the headline?",
      },
      { s: 0, t: ts(4, 11, 0), c: "Updated the font — what do you think now?" },
      { s: 1, t: ts(4, 11, 14), c: "Much better. The contrast is spot on" },
      {
        s: 0,
        t: ts(4, 11, 18),
        c: "Great. Going to show Carol later and see what she thinks",
      },
      { s: 1, t: ts(4, 11, 21), c: "She'll love it" },
      {
        s: 0,
        t: ts(2, 14, 5),
        c: "Carol approved it! We're going live with it next week",
      },
      { s: 1, t: ts(2, 14, 10), c: "🎉 Nice work" },
      {
        s: 0,
        t: ts(2, 14, 12),
        c: "Couldn't have done it without your feedback",
      },
      {
        s: 1,
        t: ts(0, 9, 30),
        c: "Hey, have you figured out the onboarding flow yet?",
      },
      {
        s: 0,
        t: ts(0, 9, 45),
        c: "Working on it — should have a draft by tomorrow",
      },
      { s: 1, t: ts(0, 9, 47), c: "No rush, just curious" },
      { s: 0, t: ts(0, 9, 50), c: "It's going to be clean, promise 😄" },
    ],
  },

  // ── 2. Alice ↔ Carol (DM, ~8 messages, yesterday + today) ──
  {
    key: "alice_carol",
    type: "direct",
    participants: [0, 2],
    messages: [
      {
        s: 2,
        t: ts(1, 10, 0),
        c: "Alice, are you free this week for a quick catchup?",
      },
      { s: 0, t: ts(1, 10, 10), c: "Yeah, Thursday works for me" },
      { s: 2, t: ts(1, 10, 13), c: "Perfect, let's do 2pm?" },
      { s: 0, t: ts(1, 10, 15), c: "Works for me!" },
      { s: 2, t: ts(0, 13, 55), c: "Just a reminder — catchup in an hour!" },
      { s: 0, t: ts(0, 13, 58), c: "On it, just finishing something up" },
      { s: 2, t: ts(0, 14, 0), c: "No worries, see you then 🙂" },
      { s: 0, t: ts(0, 14, 2), c: "See you soon!" },
    ],
  },

  // ── 3. Alice ↔ Priya (DM, ~5 messages, 3 days ago) ──────
  {
    key: "alice_priya",
    type: "direct",
    participants: [0, 3],
    messages: [
      { s: 0, t: ts(3, 10, 0), c: "Hi Priya! Welcome to Ripple 👋" },
      { s: 3, t: ts(3, 10, 5), c: "Thanks Alice! Looks great so far" },
      { s: 0, t: ts(3, 10, 8), c: "Let me know if you have any questions" },
      { s: 3, t: ts(3, 10, 12), c: "Will do! How do group chats work here?" },
      {
        s: 0,
        t: ts(3, 10, 15),
        c: "I'll add you to the Design Team chat — check it out!",
      },
    ],
  },

  // ── 4. Design Team (group, 60 messages, 2 weeks) ─────────
  //    alice=0  bob=1  carol=2  priya=3  kayla=4
  {
    key: "design_team",
    type: "group",
    group_name: "Design Team",
    group_avatar_url: "https://picsum.photos/seed/ripple-design/300",
    participants: [
      { idx: 0, role: "admin" },
      { idx: 1, role: "member" },
      { idx: 2, role: "member" },
      { idx: 3, role: "member" },
      { idx: 4, role: "member" },
    ],
    messages: [
      // Day -14: project kickoff
      {
        s: 0,
        t: ts(14, 9, 0),
        c: "Welcome everyone to the Design Team chat! 🎨",
      },
      { s: 4, t: ts(14, 9, 5), c: "Thanks for setting this up, Alice!" },
      { s: 1, t: ts(14, 9, 8), c: "Hey team, excited to kick things off" },
      {
        s: 3,
        t: ts(14, 9, 12),
        c: "Hi all! Looking forward to working together",
      },
      { s: 2, t: ts(14, 9, 15), c: "Same here. What are we tackling first?" },
      {
        s: 0,
        t: ts(14, 9, 20),
        c: "We need to finalise the brand direction — colours, type, component style",
      },
      {
        s: 1,
        t: ts(14, 9, 25),
        c: "I've been thinking we should go more minimal. Less clutter, more whitespace",
      },
      {
        s: 4,
        t: ts(14, 9, 30),
        c: "Agreed. The current style feels a bit heavy",
      },
      {
        s: 3,
        t: ts(14, 9, 35),
        c: "I did some mood boarding last night — I can share it on our next call",
      },
      {
        s: 2,
        t: ts(14, 9, 40),
        c: "Yes please! I love seeing mood boards at the start of a project",
      },

      // Day -11: palette discussion
      {
        s: 3,
        t: ts(11, 14, 0),
        c: "Just shared the mood board in the shared folder!",
      },
      { s: 0, t: ts(11, 14, 8), c: "Oh wow these are gorgeous Priya" },
      {
        s: 4,
        t: ts(11, 14, 12),
        c: "The third one especially — those muted tones are really elegant",
      },
      {
        s: 1,
        t: ts(11, 14, 18),
        c: "I like that direction too. Very modern without being cold",
      },
      {
        s: 2,
        t: ts(11, 14, 22),
        c: "What about accessibility? Some of those low-contrast combos worry me a bit",
      },
      {
        s: 0,
        t: ts(11, 14, 26),
        c: "Carol's right — we should run everything through a contrast checker",
      },
      {
        s: 3,
        t: ts(11, 14, 30),
        c: "Already on it! Will have a revised palette by tomorrow",
      },
      {
        s: 1,
        t: ts(11, 14, 35),
        c: "While we're at it, should we settle on a type scale too?",
      },
      {
        s: 4,
        t: ts(11, 14, 40),
        c: "I was thinking Inter or Geist — both feel very clean",
      },
      {
        s: 0,
        t: ts(11, 14, 45),
        c: "Let's go with Geist, it pairs nicely with what we're building",
      },

      // Day -9: palette locked
      {
        s: 3,
        t: ts(9, 10, 0),
        c: "Updated palette is ready! All colours pass AA accessibility ✅",
      },
      { s: 2, t: ts(9, 10, 8), c: "This is amazing Priya, great work" },
      { s: 0, t: ts(9, 10, 12), c: "The raspberry accent is a nice touch 🍓" },
      { s: 1, t: ts(9, 10, 16), c: "Bold choice but it works" },
      {
        s: 4,
        t: ts(9, 10, 20),
        c: "It's distinctive — you'd recognise a screenshot instantly",
      },
      {
        s: 0,
        t: ts(9, 10, 25),
        c: "That's exactly what we want. Okay, locking in this palette 🔒",
      },
      { s: 1, t: ts(9, 10, 28), c: "👍 Locked" },
      { s: 2, t: ts(9, 10, 30), c: "Love it" },

      // Day -7: component library kickoff
      {
        s: 0,
        t: ts(7, 9, 0),
        c: "Component library kickoff today — anyone want to take the card component?",
      },
      { s: 1, t: ts(7, 9, 8), c: "I'll take cards and buttons" },
      { s: 4, t: ts(7, 9, 12), c: "I can do the form inputs and modals" },
      { s: 2, t: ts(7, 9, 16), c: "I'll handle navigation and sidebar" },
      {
        s: 3,
        t: ts(7, 9, 20),
        c: "Happy to do avatars, badges, and notification toasts",
      },
      {
        s: 0,
        t: ts(7, 9, 25),
        c: "Perfect split! Let's check back in 2 days 🙌",
      },
      {
        s: 1,
        t: ts(7, 9, 30),
        c: "Should we use a consistent corner radius throughout?",
      },
      {
        s: 0,
        t: ts(7, 9, 35),
        c: "Yes — 0.75rem as the base. I'll add it to the design tokens doc",
      },

      // Day -5: component progress
      {
        s: 1,
        t: ts(5, 11, 0),
        c: "Cards and buttons are done! Link in the doc",
      },
      {
        s: 4,
        t: ts(5, 11, 8),
        c: "Modals look great, just needs a final review",
      },
      { s: 2, t: ts(5, 11, 12), c: "Nav is ready — tested on mobile too" },
      {
        s: 3,
        t: ts(5, 11, 18),
        c: "Posted the avatar component — handled all the edge cases",
      },
      {
        s: 0,
        t: ts(5, 11, 22),
        c: "You all are incredible, this is coming together so fast 🙌",
      },
      {
        s: 1,
        t: ts(5, 11, 26),
        c: "To be fair this is the most organised project I've worked on in a while",
      },
      {
        s: 4,
        t: ts(5, 11, 30),
        c: "Agreed. Let's make sure the handoff docs are solid",
      },
      { s: 0, t: ts(5, 11, 35), c: "Already started them 👀" },

      // Day -3: stakeholder review prep
      {
        s: 0,
        t: ts(3, 10, 0),
        c: "Quick heads up — stakeholder review is on Friday",
      },
      { s: 2, t: ts(3, 10, 8), c: "Oh that's soon! Are we ready?" },
      {
        s: 1,
        t: ts(3, 10, 12),
        c: "I think so. The prototype looks really polished",
      },
      { s: 4, t: ts(3, 10, 18), c: "I'll do a final pass on spacing tonight" },
      {
        s: 3,
        t: ts(3, 10, 22),
        c: "I can write up the accessibility notes section",
      },
      { s: 0, t: ts(3, 10, 26), c: "That would be perfect Priya, thank you" },
      {
        s: 2,
        t: ts(3, 10, 30),
        c: "Should we do a quick run-through together tomorrow?",
      },
      {
        s: 0,
        t: ts(3, 10, 35),
        c: "Yes, let's do 10am. I'll send a calendar invite",
      },

      // Day -1: final run-through
      {
        s: 0,
        t: ts(1, 10, 0),
        c: "Okay team — run-through in 30 mins, are we all ready? 👀",
      },
      { s: 1, t: ts(1, 10, 5), c: "Ready!" },
      { s: 4, t: ts(1, 10, 8), c: "Ready ✅" },
      { s: 3, t: ts(1, 10, 10), c: "All set!" },
      { s: 2, t: ts(1, 10, 12), c: "Just finishing up my notes, two minutes" },
      { s: 0, t: ts(1, 10, 14), c: "Take your time 😊" },
      { s: 2, t: ts(1, 10, 16), c: "Okay done, let's go!" },
      {
        s: 1,
        t: ts(1, 10, 45),
        c: "That was the smoothest design review I've been in 😄",
      },
      { s: 0, t: ts(1, 10, 48), c: "We make a great team" },
      { s: 3, t: ts(1, 10, 50), c: "The stakeholders are going to love it" },
      { s: 4, t: ts(1, 10, 52), c: "Can't wait to see their reactions 🤞" },
      { s: 2, t: ts(1, 10, 55), c: "Already feels like a win" },
    ],
  },

  // ── 5. Weekend Plans (group, ~18 messages, this week) ────
  //    alice=0  yuki=5  ramon=6  alex=7
  {
    key: "weekend_plans",
    type: "group",
    group_name: "Weekend Plans",
    group_avatar_url: "https://picsum.photos/seed/ripple-weekend/300",
    participants: [
      { idx: 0, role: "admin" },
      { idx: 5, role: "member" },
      { idx: 6, role: "member" },
      { idx: 7, role: "member" },
    ],
    messages: [
      { s: 6, t: ts(4, 18, 0), c: "Anyone up for hiking this weekend?" },
      { s: 5, t: ts(4, 18, 8), c: "I'm in! Which trail?" },
      {
        s: 7,
        t: ts(4, 18, 12),
        c: "Could do the coastal one if the weather holds",
      },
      {
        s: 0,
        t: ts(4, 18, 15),
        c: "Yes! I've been wanting to do that trail for ages",
      },
      {
        s: 6,
        t: ts(4, 18, 20),
        c: "Weather looks good on Saturday. Should we go then?",
      },
      { s: 5, t: ts(4, 18, 25), c: "Saturday works for me!" },
      {
        s: 7,
        t: ts(2, 20, 0),
        c: "Quick reminder — meeting at the trailhead at 8am Saturday?",
      },
      { s: 6, t: ts(2, 20, 8), c: "8am sounds good. I'll bring snacks 🍎" },
      { s: 0, t: ts(2, 20, 12), c: "I'll bring coffee ☕" },
      { s: 5, t: ts(2, 20, 15), c: "I'll sort the group playlist 🎵" },
      { s: 6, t: ts(2, 20, 18), c: "😂 essential" },
      {
        s: 0,
        t: ts(2, 20, 20),
        c: "Honestly we're going to have the best time",
      },
      { s: 5, t: ts(0, 8, 0), c: "Good morning everyone!! Beautiful day ☀️" },
      { s: 0, t: ts(0, 8, 10), c: "Let's gooo!! Almost there" },
      { s: 6, t: ts(0, 8, 15), c: "Just parked, heading to the trailhead" },
      { s: 7, t: ts(0, 8, 18), c: "Same, see you in 5!" },
      { s: 5, t: ts(0, 9, 30), c: "This view is absolutely unreal 😍" },
      { s: 0, t: ts(0, 9, 35), c: "Best idea Ramon 🏔️" },
    ],
  },

  // ── 6. Alice ↔ Alex (DM, ~4 messages, today) ────────────
  {
    key: "alice_alex",
    type: "direct",
    participants: [0, 7],
    messages: [
      { s: 7, t: ts(0, 12, 0), c: "Hey! Great hike today 😊" },
      {
        s: 0,
        t: ts(0, 12, 10),
        c: "Right?? We need to make it a regular thing",
      },
      { s: 7, t: ts(0, 12, 15), c: "100%. Same time next month?" },
      { s: 0, t: ts(0, 12, 20), c: "Already on my calendar 📅" },
    ],
  },
];

// ============================================================
// Helpers
// ============================================================

async function createOrFetchUser(userData) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", userData.username)
    .single();

  if (existing) {
    const update = { display_name: userData.display_name };
    if (userData.avatar_url) update.avatar_url = userData.avatar_url;
    await supabase.from("profiles").update(update).eq("id", existing.id);
    console.log(`  ↩  Updated: ${userData.email}`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
  });

  if (error)
    throw new Error(
      `Failed to create user ${userData.email}: ${error.message}`,
    );

  const update = {
    username: userData.username,
    display_name: userData.display_name,
  };
  if (userData.avatar_url) update.avatar_url = userData.avatar_url;

  const { error: profileError } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", data.user.id);

  if (profileError)
    throw new Error(`Failed to update profile: ${profileError.message}`);

  console.log(`  ✓  Created: ${userData.display_name} (${userData.email})`);
  return data.user.id;
}

async function seedConversation(conv, userIds) {
  let convId;

  if (conv.type === "direct") {
    const aId = userIds[conv.participants[0]];
    const bId = userIds[conv.participants[1]];
    const aName = SEED_USERS[conv.participants[0]].display_name;
    const bName = SEED_USERS[conv.participants[1]].display_name;

    const { data: existing } = await supabase.rpc("get_direct_conversation", {
      user_a: aId,
      user_b: bId,
    });

    if (existing) {
      console.log(`  ↩  DM already exists: ${aName} ↔ ${bName}`);
      convId = existing;
    } else {
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({ type: "direct", created_by: aId })
        .select("id")
        .single();

      if (error) throw new Error(`Failed to create DM: ${error.message}`);
      convId = newConv.id;

      await supabase.from("conversation_participants").insert([
        { conversation_id: convId, user_id: aId, role: "admin" },
        { conversation_id: convId, user_id: bId, role: "member" },
      ]);

      console.log(`  ✓  Created DM: ${aName} ↔ ${bName}`);
    }
  } else {
    const creatorId = userIds[conv.participants[0].idx];

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("type", "group")
      .eq("group_name", conv.group_name)
      .maybeSingle();

    if (existing) {
      console.log(`  ↩  Group already exists: ${conv.group_name}`);
      convId = existing.id;
    } else {
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          type: "group",
          created_by: creatorId,
          group_name: conv.group_name,
          group_avatar_url: conv.group_avatar_url,
        })
        .select("id")
        .single();

      if (error)
        throw new Error(
          `Failed to create group "${conv.group_name}": ${error.message}`,
        );
      convId = newConv.id;

      await supabase.from("conversation_participants").insert(
        conv.participants.map((p) => ({
          conversation_id: convId,
          user_id: userIds[p.idx],
          role: p.role,
        })),
      );

      console.log(`  ✓  Created group: ${conv.group_name}`);
    }
  }

  // Seed messages only if none exist yet
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", convId);

  if (count) {
    console.log(`    ↩  Messages already seeded (${count} found)`);
    return;
  }

  console.log(`    Inserting ${conv.messages.length} messages…`);
  for (const msg of conv.messages) {
    const { error } = await supabase.from("messages").insert({
      conversation_id: convId,
      sender_id: userIds[msg.s],
      content: msg.c,
      created_at: msg.t,
    });
    if (error) console.warn(`    ✗  ${error.message}`);
  }

  // Fix unread counts: each participant should only have unread messages
  // since their last sent message (sending implies they've read up to that point).
  const participantIndices =
    conv.type === "direct"
      ? conv.participants
      : conv.participants.map((p) => p.idx);

  for (const pidx of participantIndices) {
    let lastSentIndex = -1;
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      if (conv.messages[i].s === pidx) {
        lastSentIndex = i;
        break;
      }
    }

    let unreadCount = 0;
    if (lastSentIndex >= 0) {
      for (let i = lastSentIndex + 1; i < conv.messages.length; i++) {
        if (conv.messages[i].s !== pidx) unreadCount++;
      }
    }

    const { error } = await supabase
      .from("conversation_participants")
      .update({ unread_count: unreadCount })
      .eq("conversation_id", convId)
      .eq("user_id", userIds[pidx]);

    if (error)
      console.warn(
        `    ✗  Failed to set unread count for idx ${pidx}: ${error.message}`,
      );
  }

  console.log(`    ✓  Done`);
}

// ============================================================
// Main
// ============================================================

async function seed() {
  console.log("\n🌱 Ripple Chat — Seeding\n");

  console.log("Creating users…");
  const userIds = [];
  for (const userData of SEED_USERS) {
    const id = await createOrFetchUser(userData);
    userIds.push(id);
  }

  console.log("\nCreating conversations…");
  for (const conv of SEED_CONVERSATIONS) {
    await seedConversation(conv, userIds);
  }

  console.log("\n✅ Seed complete!\n");
  console.log("Sign in with any of these accounts (password: password123):");
  for (const u of SEED_USERS) {
    console.log(`  ${u.email}`);
  }
  console.log("");
}

seed().catch((err) => {
  console.error("\n❌ Seed failed:", err.message);
  process.exit(1);
});
