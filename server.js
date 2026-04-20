const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const STORE_PATH = path.join(__dirname, "data", "store.json");
const REVENUE_PER_IMPRESSION = 0.01;
const AD_INSERT_INTERVAL = 6;

app.use(express.json({ limit: "12mb" }));
app.use(express.static(__dirname));

function readStore() {
  const raw = fs.readFileSync(STORE_PATH, "utf8");
  return JSON.parse(raw);
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function sanitizeText(value, max = 240) {
  return String(value || "").trim().slice(0, max);
}

function sanitizeLongText(value, max = 1200) {
  return String(value || "").trim().slice(0, max);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16);
}

function parseTags(tags) {
  const source = Array.isArray(tags) ? tags : String(tags || "").split(",");
  return [...new Set(
    source
      .map((tag) => sanitizeText(tag, 30).toLowerCase())
      .filter(Boolean)
  )].slice(0, 16);
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function assetIdFrom(post) {
  return post.designId || post.assetId || `FVX-${String(post.id || "").slice(-6).toUpperCase()}`;
}

function normalizeUser(user) {
  return {
    id: user.id || createId("usr"),
    username: sanitizeText(user.username, 32).toLowerCase(),
    passwordHash: user.passwordHash || hashPassword("demo123"),
    bio: sanitizeLongText(user.bio, 280),
    interests: parseTags(user.interests),
    createdAt: user.createdAt || new Date().toISOString(),
    isAdmin: Boolean(user.isAdmin)
  };
}

function normalizeAd(ad) {
  return {
    id: ad.id || createId("ad"),
    title: sanitizeText(ad.title || "AD SPACE", 80),
    image: sanitizeLongText(ad.image, 400000),
    link: sanitizeText(ad.link || "https://example.com", 280),
    description: sanitizeLongText(ad.description || ad.copy || "Reserved for future brand campaigns.", 220),
    source: sanitizeText(ad.source || "brand", 24),
    impressions: toNumber(ad.impressions, 0),
    clicks: toNumber(ad.clicks, 0),
    createdAt: ad.createdAt || new Date().toISOString(),
    createdByUserId: ad.createdByUserId || null,
    active: ad.active !== false
  };
}

function normalizePost(post) {
  const createdAt = post.createdAt || new Date().toISOString();
  const creatorUserId = post.creatorUserId || post.ownership?.creatorUserId || "";
  const creatorUsername = sanitizeText(post.creatorUsername || post.ownership?.creatorUsername || "unknown", 32).toLowerCase();
  const likes = Array.isArray(post.likes) ? [...new Set(post.likes)] : [];
  const saves = Array.isArray(post.saves) ? [...new Set(post.saves)] : [];

  return {
    id: post.id || createId("post"),
    designId: assetIdFrom(post),
    title: sanitizeText(post.title, 80),
    description: sanitizeLongText(post.description, 800),
    tags: parseTags(post.tags),
    style: sanitizeText(post.style, 40),
    color: sanitizeText(post.color, 30),
    type: sanitizeText(post.type, 30),
    imageData: sanitizeLongText(post.imageData, 400000),
    creatorUserId,
    creatorUsername,
    likes,
    saves,
    createdAt,
    ownership: {
      designId: assetIdFrom(post),
      creatorUserId,
      creatorUsername,
      timestamp: post.ownership?.timestamp || createdAt
    }
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    bio: user.bio,
    interests: user.interests,
    createdAt: user.createdAt,
    isAdmin: Boolean(user.isAdmin)
  };
}

function buildDemoStore() {
  const now = new Date().toISOString();
  const admin = normalizeUser({
    id: createId("usr"),
    username: "vault-admin",
    passwordHash: hashPassword("admin123"),
    bio: "Admin view for platform growth, monetization simulation, and trend intelligence.",
    interests: ["analytics", "luxury", "brand"],
    isAdmin: true,
    createdAt: now
  });
  const creatorA = normalizeUser({
    id: createId("usr"),
    username: "noir.archive",
    passwordHash: hashPassword("demo123"),
    bio: "Editorial tailoring, sharp layers, and quiet luxury statements.",
    interests: ["minimal", "tailoring", "outerwear"],
    createdAt: now
  });
  const creatorB = normalizeUser({
    id: createId("usr"),
    username: "signal.studio",
    passwordHash: hashPassword("demo123"),
    bio: "Color-led futurewear, glossy textures, and experimental street silhouettes.",
    interests: ["streetwear", "neon", "leather"],
    createdAt: now
  });

  const posts = [
    normalizePost({
      id: createId("post"),
      designId: `FVX-${Date.now().toString(36).toUpperCase()}-IVORY`,
      title: "Ivory Frame Coat",
      description: "Structured ivory outerwear built around sharp shoulders, soft movement, and gallery-clean restraint.",
      tags: ["minimal", "ivory", "outerwear", "luxury"],
      style: "Quiet Luxury",
      color: "Ivory",
      type: "Outerwear",
      imageData: "",
      creatorUserId: creatorA.id,
      creatorUsername: creatorA.username,
      likes: [admin.id, creatorB.id],
      saves: [admin.id],
      createdAt: now
    }),
    normalizePost({
      id: createId("post"),
      designId: `FVX-${Date.now().toString(36).toUpperCase()}-NOIR`,
      title: "Noir Motion Set",
      description: "Black tailoring layered with fluid fabric and a controlled editorial drape.",
      tags: ["black", "tailoring", "set", "editorial"],
      style: "Editorial Tailoring",
      color: "Black",
      type: "Set",
      imageData: "",
      creatorUserId: admin.id,
      creatorUsername: admin.username,
      likes: [creatorA.id],
      saves: [],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString()
    }),
    normalizePost({
      id: createId("post"),
      designId: `FVX-${Date.now().toString(36).toUpperCase()}-NEON`,
      title: "Neon Echo Leather",
      description: "Oversized leather accented with electric green details and late-night club energy.",
      tags: ["neon", "leather", "streetwear", "oversized"],
      style: "Future Street",
      color: "Neon Green",
      type: "Jacket",
      imageData: "",
      creatorUserId: creatorB.id,
      creatorUsername: creatorB.username,
      likes: [creatorA.id, admin.id, creatorB.id],
      saves: [creatorA.id],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString()
    }),
    normalizePost({
      id: createId("post"),
      designId: `FVX-${Date.now().toString(36).toUpperCase()}-SAND`,
      title: "Sand Drift Uniform",
      description: "Minimal beige co-ord balancing utility shape with soft movement and clean linework.",
      tags: ["beige", "minimal", "utility", "set"],
      style: "Soft Utility",
      color: "Sand",
      type: "Set",
      imageData: "",
      creatorUserId: creatorA.id,
      creatorUsername: creatorA.username,
      likes: [creatorB.id],
      saves: [creatorB.id, admin.id],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString()
    })
  ];

  return {
    users: [admin, creatorA, creatorB],
    sessions: [],
    posts,
    ads: [
      normalizeAd({
        title: "AD SPACE",
        description: "Reserved placement for future AdSense or direct brand sponsorship inventory.",
        link: "https://example.com",
        source: "system",
        impressions: 24,
        clicks: 4,
        createdAt: now
      }),
      normalizeAd({
        title: "Maison Future Capsule",
        description: "Mock luxury campaign placeholder for future direct brand uploads.",
        link: "https://example.com",
        source: "brand",
        impressions: 17,
        clicks: 2,
        createdAt: now,
        createdByUserId: admin.id
      })
    ]
  };
}

function ensureStore() {
  if (!fs.existsSync(path.dirname(STORE_PATH))) {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    writeStore(migrateStore(buildDemoStore()));
    return;
  }

  const rawStore = readStore();
  writeStore(migrateStore(rawStore));
}

function migrateStore(store) {
  return {
    users: Array.isArray(store.users) ? store.users.map(normalizeUser) : buildDemoStore().users,
    sessions: Array.isArray(store.sessions) ? store.sessions : [],
    posts: Array.isArray(store.posts) ? store.posts.map(normalizePost) : buildDemoStore().posts,
    ads: Array.isArray(store.ads) ? store.ads.map(normalizeAd) : buildDemoStore().ads
  };
}

function getAuthUser(request, store) {
  const header = request.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  const session = store.sessions.find((item) => item.token === token);
  if (!session) return null;
  return store.users.find((user) => user.id === session.userId) || null;
}

function requireUser(request, response, next) {
  const store = migrateStore(readStore());
  const user = getAuthUser(request, store);
  if (!user) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  request.store = store;
  request.user = user;
  next();
}

function requireAdmin(request, response, next) {
  requireUser(request, response, () => {
    if (!request.user.isAdmin) {
      response.status(403).json({ error: "Admin access required." });
      return;
    }
    next();
  });
}

function buildCycleMaps(items, selector) {
  const sorted = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const midpoint = Math.max(1, Math.ceil(sorted.length / 2));
  const recent = new Map();
  const previous = new Map();

  sorted.slice(0, midpoint).forEach((item) => {
    selector(item).forEach((key) => {
      if (!key) return;
      recent.set(key, (recent.get(key) || 0) + 1);
    });
  });

  sorted.slice(midpoint).forEach((item) => {
    selector(item).forEach((key) => {
      if (!key) return;
      previous.set(key, (previous.get(key) || 0) + 1);
    });
  });

  return { recent, previous };
}

function mapCounts(items, selector) {
  const counts = new Map();
  items.forEach((item) => {
    selector(item).forEach((value) => {
      if (!value) return;
      counts.set(value, (counts.get(value) || 0) + 1);
    });
  });
  return counts;
}

function buildTrendStats(posts) {
  const styleCounts = mapCounts(posts, (post) => [post.style || "Unclassified"]);
  const tagCounts = mapCounts(posts, (post) => post.tags);
  const typeLikeCounts = new Map();

  posts.forEach((post) => {
    const typeLabel = post.type || "Unclassified";
    typeLikeCounts.set(typeLabel, (typeLikeCounts.get(typeLabel) || 0) + (post.likes || []).length);
  });

  const tagCycles = buildCycleMaps(posts, (post) => post.tags);

  return {
    trendingStyles: [...styleCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    risingTags: [...tagCycles.recent.entries()]
      .map(([tag, recentCount]) => ({
        tag,
        growth: recentCount - (tagCycles.previous.get(tag) || 0),
        recentCount
      }))
      .filter((item) => item.growth > 0)
      .sort((a, b) => b.growth - a.growth || b.recentCount - a.recentCount)
      .slice(0, 8),
    mostLikedFashionTypes: [...typeLikeCounts.entries()]
      .map(([label, likes]) => ({ label, likes }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 6),
    topTags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  };
}

function buildCreatorStats(posts) {
  const creatorMap = new Map();
  posts.forEach((post) => {
    const current = creatorMap.get(post.creatorUserId) || {
      userId: post.creatorUserId,
      username: post.creatorUsername,
      postCount: 0,
      totalLikes: 0,
      totalSaves: 0
    };
    current.postCount += 1;
    current.totalLikes += post.likes.length;
    current.totalSaves += post.saves.length;
    creatorMap.set(post.creatorUserId, current);
  });

  return [...creatorMap.values()]
    .sort((a, b) => b.postCount - a.postCount || b.totalLikes - a.totalLikes)
    .slice(0, 8);
}

function buildAdMetrics(ads) {
  const totalImpressions = ads.reduce((sum, ad) => sum + toNumber(ad.impressions, 0), 0);
  const totalClicks = ads.reduce((sum, ad) => sum + toNumber(ad.clicks, 0), 0);
  const estimatedRevenue = Number((totalImpressions * REVENUE_PER_IMPRESSION).toFixed(2));

  return {
    totalImpressions,
    totalClicks,
    estimatedRevenue,
    ctr: totalImpressions ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
    ratePerImpression: REVENUE_PER_IMPRESSION,
    topAds: [...ads]
      .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks)
      .slice(0, 5)
      .map((ad) => ({
        id: ad.id,
        title: ad.title,
        impressions: ad.impressions,
        clicks: ad.clicks,
        revenue: Number((ad.impressions * REVENUE_PER_IMPRESSION).toFixed(2))
      }))
  };
}

function buildBrandDashboard(store) {
  const trendStats = buildTrendStats(store.posts);
  return {
    trendingStyles: trendStats.trendingStyles,
    mostActiveCreators: buildCreatorStats(store.posts),
    adMetrics: buildAdMetrics(store.ads),
    estimatedAdRevenue: buildAdMetrics(store.ads).estimatedRevenue
  };
}

function searchPosts(posts, query) {
  const text = sanitizeText(query, 80).toLowerCase();
  if (!text) return posts;

  return posts.filter((post) => {
    const haystack = [
      post.title,
      post.description,
      post.style,
      post.color,
      post.type,
      post.creatorUsername,
      ...(post.tags || [])
    ].join(" ").toLowerCase();
    return haystack.includes(text);
  });
}

function filterPosts(posts, filters) {
  let result = [...posts];

  if (filters.q) {
    result = searchPosts(result, filters.q);
  }

  if (filters.tag) {
    const tag = sanitizeText(filters.tag, 30).toLowerCase();
    result = result.filter((post) => post.tags.includes(tag));
  }

  if (filters.style) {
    const style = sanitizeText(filters.style, 40).toLowerCase();
    result = result.filter((post) => (post.style || "").toLowerCase() === style);
  }

  if (filters.color) {
    const color = sanitizeText(filters.color, 30).toLowerCase();
    result = result.filter((post) => (post.color || "").toLowerCase() === color);
  }

  if (filters.type) {
    const type = sanitizeText(filters.type, 30).toLowerCase();
    result = result.filter((post) => (post.type || "").toLowerCase() === type);
  }

  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function buildFeedItems(posts, ads) {
  const activeAds = ads.filter((ad) => ad.active);
  if (!activeAds.length) {
    return posts.map((post) => ({ kind: "post", data: post }));
  }

  const items = [];
  let adIndex = 0;

  posts.forEach((post, index) => {
    items.push({ kind: "post", data: post });
    const shouldInsertAd = (index + 1) % AD_INSERT_INTERVAL === 0;
    if (shouldInsertAd) {
      items.push({ kind: "ad", data: activeAds[adIndex % activeAds.length] });
      adIndex += 1;
    }
  });

  if (items.length < 3 && activeAds[0]) {
    items.push({ kind: "ad", data: activeAds[0] });
  }

  return items;
}

app.get("/api/posts", (request, response) => {
  const store = migrateStore(readStore());
  const posts = filterPosts(store.posts, request.query || {});
  response.json({
    posts,
    feed: buildFeedItems(posts, store.ads),
    filters: {
      q: request.query.q || "",
      tag: request.query.tag || "",
      style: request.query.style || "",
      color: request.query.color || "",
      type: request.query.type || ""
    }
  });
});

app.get("/api/trends", (_request, response) => {
  const store = migrateStore(readStore());
  response.json(buildTrendStats(store.posts));
});

app.get("/api/dashboard/brands", (_request, response) => {
  const store = migrateStore(readStore());
  response.json(buildBrandDashboard(store));
});

app.get("/api/ads", (_request, response) => {
  const store = migrateStore(readStore());
  response.json({
    ads: store.ads.filter((ad) => ad.active)
  });
});

app.post("/api/ads/:adId/impression", (request, response) => {
  const store = migrateStore(readStore());
  const ad = store.ads.find((item) => item.id === request.params.adId);
  if (!ad) {
    response.status(404).json({ error: "Ad not found." });
    return;
  }

  ad.impressions += 1;
  writeStore(store);
  response.json({
    adId: ad.id,
    impressions: ad.impressions,
    estimatedRevenue: Number((ad.impressions * REVENUE_PER_IMPRESSION).toFixed(2))
  });
});

app.post("/api/ads/:adId/click", (request, response) => {
  const store = migrateStore(readStore());
  const ad = store.ads.find((item) => item.id === request.params.adId);
  if (!ad) {
    response.status(404).json({ error: "Ad not found." });
    return;
  }

  ad.clicks += 1;
  writeStore(store);
  response.json({ adId: ad.id, clicks: ad.clicks });
});

app.get("/api/admin/earnings", requireAdmin, (request, response) => {
  response.json({
    dashboard: buildBrandDashboard(request.store)
  });
});

app.post("/api/admin/ads", requireAdmin, (request, response) => {
  const ad = normalizeAd({
    title: request.body?.title || "Brand Campaign",
    image: request.body?.image || "",
    link: request.body?.link || "https://example.com",
    description: request.body?.description || "",
    source: "brand",
    createdByUserId: request.user.id,
    impressions: 0,
    clicks: 0
  });

  request.store.ads.unshift(ad);
  writeStore(request.store);
  response.status(201).json({ ad });
});

app.post("/api/auth/signup", (request, response) => {
  const username = sanitizeText(request.body?.username, 32).toLowerCase();
  const password = sanitizeText(request.body?.password, 80);

  if (!username || !password) {
    response.status(400).json({ error: "Username and password are required." });
    return;
  }

  const store = migrateStore(readStore());
  const exists = store.users.some((user) => user.username === username);
  if (exists) {
    response.status(409).json({ error: "Username already exists." });
    return;
  }

  const user = normalizeUser({
    id: createId("usr"),
    username,
    passwordHash: hashPassword(password),
    bio: request.body?.bio || "",
    interests: request.body?.interests || [],
    createdAt: new Date().toISOString(),
    isAdmin: false
  });

  const token = createId("token");
  store.users.push(user);
  store.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  writeStore(store);

  response.status(201).json({
    token,
    user: sanitizeUser(user)
  });
});

app.post("/api/auth/login", (request, response) => {
  const username = sanitizeText(request.body?.username, 32).toLowerCase();
  const password = sanitizeText(request.body?.password, 80);
  const store = migrateStore(readStore());
  const user = store.users.find((item) => item.username === username);

  if (!user || user.passwordHash !== hashPassword(password)) {
    response.status(401).json({ error: "Invalid credentials." });
    return;
  }

  const token = createId("token");
  store.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
  writeStore(store);

  response.json({
    token,
    user: sanitizeUser(user)
  });
});

app.get("/api/auth/me", (request, response) => {
  const store = migrateStore(readStore());
  const user = getAuthUser(request, store);
  if (!user) {
    response.status(401).json({ error: "Session expired." });
    return;
  }

  response.json({ user: sanitizeUser(user) });
});

app.put("/api/users/me", requireUser, (request, response) => {
  const nextUsername = sanitizeText(request.body?.username || request.user.username, 32).toLowerCase();
  if (!nextUsername) {
    response.status(400).json({ error: "Username is required." });
    return;
  }

  const taken = request.store.users.some((user) => user.id !== request.user.id && user.username === nextUsername);
  if (taken) {
    response.status(409).json({ error: "Username already exists." });
    return;
  }

  request.user.username = nextUsername;
  request.user.bio = sanitizeLongText(request.body?.bio, 280);
  request.user.interests = parseTags(request.body?.interests || []);

  request.store.posts.forEach((post) => {
    if (post.creatorUserId === request.user.id) {
      post.creatorUsername = nextUsername;
      post.ownership.creatorUsername = nextUsername;
    }
  });

  writeStore(request.store);
  response.json({ user: sanitizeUser(request.user) });
});

app.post("/api/posts", requireUser, (request, response) => {
  const title = sanitizeText(request.body?.title, 80);
  const description = sanitizeLongText(request.body?.description, 800);

  if (!title || !description) {
    response.status(400).json({ error: "Title and description are required." });
    return;
  }

  const designId = `FVX-${Date.now().toString(36).toUpperCase()}-${slugify(title).toUpperCase() || "POST"}`;
  const createdAt = new Date().toISOString();
  const post = normalizePost({
    id: createId("post"),
    designId,
    title,
    description,
    tags: request.body?.tags || [],
    style: request.body?.style || "",
    color: request.body?.color || "",
    type: request.body?.type || "",
    imageData: request.body?.imageData || "",
    creatorUserId: request.user.id,
    creatorUsername: request.user.username,
    likes: [],
    saves: [],
    createdAt
  });

  request.store.posts.unshift(post);
  writeStore(request.store);

  response.status(201).json({
    post,
    ownershipRecord: {
      designId: post.designId,
      timestamp: post.ownership.timestamp,
      creatorUserId: post.creatorUserId
    }
  });
});

app.post("/api/posts/:postId/:action(like|save)", requireUser, (request, response) => {
  const post = request.store.posts.find((item) => item.id === request.params.postId);
  if (!post) {
    response.status(404).json({ error: "Post not found." });
    return;
  }

  const field = request.params.action === "like" ? "likes" : "saves";
  const list = post[field];
  const index = list.indexOf(request.user.id);

  if (index >= 0) {
    list.splice(index, 1);
  } else {
    list.push(request.user.id);
  }

  writeStore(request.store);
  response.json({ post });
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("*", (_request, response) => {
  response.sendFile(path.join(__dirname, "index.html"));
});

ensureStore();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`FASHN VAULT X running on http://localhost:${PORT}`);
  });
}
app.get("/", (req, res) => {res.send("FASHN VAULT X is live");});
module.exports = app;
