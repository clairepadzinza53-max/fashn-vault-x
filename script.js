const state = {
  token: localStorage.getItem("fvx-token") || "",
  user: null,
  posts: [],
  feed: [],
  trends: null,
  dashboard: null,
  filters: {
    q: "",
    tag: "",
    style: "",
    color: "",
    type: ""
  },
  seenAds: new Set(),
  toastTimer: null
};

const elements = {
  signupForm: document.querySelector("#signup-form"),
  loginForm: document.querySelector("#login-form"),
  profileForm: document.querySelector("#profile-form"),
  uploadForm: document.querySelector("#upload-form"),
  filterForm: document.querySelector("#filter-form"),
  clearFilters: document.querySelector("#clear-filters"),
  adForm: document.querySelector("#ad-form"),
  sessionState: document.querySelector("#session-state"),
  profileSnapshot: document.querySelector("#profile-snapshot"),
  ownershipRecord: document.querySelector("#ownership-record"),
  activeFilters: document.querySelector("#active-filters"),
  feedGrid: document.querySelector("#feed-grid"),
  trendingStyles: document.querySelector("#trending-styles"),
  risingTags: document.querySelector("#rising-tags"),
  mostLikedTypes: document.querySelector("#most-liked-types"),
  activeCreators: document.querySelector("#active-creators"),
  adPerformance: document.querySelector("#ad-performance"),
  earningsDashboard: document.querySelector("#earnings-dashboard"),
  topAds: document.querySelector("#top-ads"),
  heroTrend: document.querySelector("#hero-trend"),
  heroRevenue: document.querySelector("#hero-revenue"),
  heroAssets: document.querySelector("#hero-assets"),
  toast: document.querySelector("#toast")
};

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2600);
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function listMarkup(items, renderItem, emptyText = "No data yet.") {
  if (!items || items.length === 0) {
    return `<div class="metric-row"><strong>${emptyText}</strong></div>`;
  }

  return items.map(renderItem).join("");
}

function renderSession() {
  if (!state.user) {
    elements.sessionState.textContent = "No active session.";
    elements.profileSnapshot.innerHTML = "Login to upload fashion assets, like looks, save inspiration, and access admin tools.";
    elements.profileForm.reset();
    return;
  }

  elements.sessionState.textContent = `Logged in as @${state.user.username}${state.user.isAdmin ? " (admin)" : ""}.`;
  elements.profileSnapshot.innerHTML = `
    <strong>@${escapeHtml(state.user.username)}</strong>
    <p>${escapeHtml(state.user.bio || "No bio yet.")}</p>
    <div class="tag-row">${(state.user.interests || []).map((item) => `<span class="tag">#${escapeHtml(item)}</span>`).join("") || "<span class='tag'>No interests set</span>"}</div>
  `;
  elements.profileForm.elements.bio.value = state.user.bio || "";
  elements.profileForm.elements.interests.value = (state.user.interests || []).join(", ");
}

function renderActiveFilters() {
  const entries = Object.entries(state.filters).filter(([, value]) => value);
  elements.activeFilters.innerHTML = entries.length
    ? entries.map(([key, value]) => `<span class="filter-chip">${escapeHtml(key)}: ${escapeHtml(value)}</span>`).join("")
    : '<span class="filter-chip muted">Showing all posts</span>';
}

function renderHero() {
  elements.heroAssets.textContent = String(state.posts.length);
  elements.heroTrend.textContent = state.trends?.trendingStyles?.[0]?.label || "Collecting signals";
  elements.heroRevenue.textContent = formatCurrency(state.dashboard?.estimatedAdRevenue || 0);
}

function buildPostCard(post) {
  const imageStyle = post.imageData
    ? `style="background-image: linear-gradient(180deg, rgba(7,7,7,0.06), rgba(7,7,7,0.68)), url('${String(post.imageData).replace(/'/g, "%27")}');"`
    : "";

  return `
    <article class="feed-card">
      <div class="feed-image" ${imageStyle}></div>
      <div class="feed-body">
        <div class="asset-meta">
          <span class="pill">${escapeHtml(post.designId)}</span>
          <span class="pill">${new Date(post.createdAt).toLocaleString()}</span>
        </div>
        <div>
          <h3>${escapeHtml(post.title)}</h3>
          <p class="muted-line">@${escapeHtml(post.creatorUsername)} • ${escapeHtml(post.style || "Unclassified")} • ${escapeHtml(post.type || "Unclassified")}</p>
        </div>
        <p>${escapeHtml(post.description)}</p>
        <div class="tag-row">${(post.tags || []).map((tag) => `<button class="tag action-tag" type="button" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`).join("")}</div>
        <div class="asset-meta">
          <span>${post.likes.length} likes</span>
          <span>${post.saves.length} saves</span>
          <span>${escapeHtml(post.color || "No color tag")}</span>
        </div>
        <div class="action-row">
          <button class="button button-ghost action-trigger" type="button" data-action="like" data-post-id="${escapeHtml(post.id)}">Like</button>
          <button class="button button-ghost action-trigger" type="button" data-action="save" data-post-id="${escapeHtml(post.id)}">Save</button>
        </div>
      </div>
    </article>
  `;
}

function buildAdCard(ad) {
  const imageStyle = ad.image
    ? `style="background-image: linear-gradient(180deg, rgba(13,13,13,0.18), rgba(13,13,13,0.8)), url('${String(ad.image).replace(/'/g, "%27")}');"`
    : "";

  return `
    <article class="feed-card ad-card" data-ad-id="${escapeHtml(ad.id)}">
      <div class="feed-image ad-image" ${imageStyle}></div>
      <div class="feed-body">
        <div class="asset-meta">
          <span class="pill ad-pill">AD SPACE</span>
          <span class="pill">${escapeHtml(ad.source)}</span>
        </div>
        <div>
          <h3>${escapeHtml(ad.title)}</h3>
          <p>${escapeHtml(ad.description)}</p>
        </div>
        <div class="asset-meta">
          <span>${ad.impressions} impressions</span>
          <span>${ad.clicks} clicks</span>
        </div>
        <button class="button button-light ad-click" type="button" data-ad-id="${escapeHtml(ad.id)}">Mock ad click</button>
      </div>
    </article>
  `;
}

function renderFeed() {
  if (!state.feed.length) {
    elements.feedGrid.innerHTML = '<div class="empty-state">No fashion assets match the current filters.</div>';
    return;
  }

  elements.feedGrid.innerHTML = state.feed.map((item) => (
    item.kind === "ad" ? buildAdCard(item.data) : buildPostCard(item.data)
  )).join("");

  elements.feedGrid.querySelectorAll(".action-trigger").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!state.user) {
        showToast("Login first to interact with posts.");
        return;
      }

      try {
        await api(`/api/posts/${button.dataset.postId}/${button.dataset.action}`, { method: "POST" });
        await loadFeed();
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  elements.feedGrid.querySelectorAll(".action-tag").forEach((button) => {
    button.addEventListener("click", async () => {
      state.filters.tag = button.dataset.tag;
      elements.filterForm.elements.tag.value = button.dataset.tag;
      await loadFeed();
    });
  });

  elements.feedGrid.querySelectorAll(".ad-click").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await api(`/api/ads/${button.dataset.adId}/click`, { method: "POST" });
        showToast("Mock ad click tracked.");
        await loadDashboard();
        await loadFeed();
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  trackVisibleAds();
}

function renderTrends() {
  elements.trendingStyles.innerHTML = listMarkup(
    state.trends?.trendingStyles,
    (item) => `<div class="metric-row"><strong>${escapeHtml(item.label)}</strong><small>${item.count} posts</small></div>`
  );

  elements.risingTags.innerHTML = listMarkup(
    state.trends?.risingTags,
    (item) => `<div class="metric-row"><strong>#${escapeHtml(item.tag)}</strong><small>+${item.growth} momentum</small></div>`
  );

  elements.mostLikedTypes.innerHTML = listMarkup(
    state.trends?.mostLikedFashionTypes,
    (item) => `<div class="metric-row"><strong>${escapeHtml(item.label)}</strong><small>${item.likes} likes</small></div>`
  );
}

function renderDashboard() {
  const creators = state.dashboard?.mostActiveCreators || [];
  const adMetrics = state.dashboard?.adMetrics;
  const topAds = adMetrics?.topAds || [];

  elements.activeCreators.innerHTML = listMarkup(
    creators,
    (item) => `<div class="metric-row"><strong>@${escapeHtml(item.username)}</strong><small>${item.postCount} posts • ${item.totalLikes} likes</small></div>`
  );

  elements.adPerformance.innerHTML = adMetrics
    ? `
      <div class="metric-row"><strong>${adMetrics.totalImpressions}</strong><small>Total impressions</small></div>
      <div class="metric-row"><strong>${adMetrics.totalClicks}</strong><small>Total clicks</small></div>
      <div class="metric-row"><strong>${adMetrics.ctr}%</strong><small>CTR</small></div>
    `
    : '<div class="metric-row"><strong>No ad data yet.</strong></div>';

  elements.earningsDashboard.innerHTML = adMetrics
    ? `
      <div class="metric-row"><strong>${formatCurrency(adMetrics.estimatedRevenue)}</strong><small>Revenue = impressions × ${formatCurrency(adMetrics.ratePerImpression)}</small></div>
      <div class="metric-row"><strong>${state.dashboard.trendingStyles?.[0]?.label || "No leader yet"}</strong><small>Current leading style</small></div>
    `
    : '<div class="metric-row"><strong>No earnings yet.</strong></div>';

  elements.topAds.innerHTML = listMarkup(
    topAds,
    (item) => `<div class="metric-row"><strong>${escapeHtml(item.title)}</strong><small>${item.impressions} views • ${formatCurrency(item.revenue)}</small></div>`
  );
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Image upload failed."));
    reader.readAsDataURL(file);
  });
}

async function loadSession() {
  if (!state.token) {
    state.user = null;
    renderSession();
    return;
  }

  try {
    const data = await api("/api/auth/me");
    state.user = data.user;
  } catch (_error) {
    state.token = "";
    state.user = null;
    localStorage.removeItem("fvx-token");
  }

  renderSession();
}

async function loadFeed() {
  const query = new URLSearchParams();
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });

  const data = await api(`/api/posts${query.toString() ? `?${query.toString()}` : ""}`);
  state.posts = data.posts || [];
  state.feed = data.feed || [];
  renderActiveFilters();
  renderFeed();
  renderHero();
}

async function loadTrends() {
  state.trends = await api("/api/trends");
  renderTrends();
  renderHero();
}

async function loadDashboard() {
  state.dashboard = await api("/api/dashboard/brands");
  renderDashboard();
  renderHero();
}

async function trackVisibleAds() {
  const adCards = [...document.querySelectorAll("[data-ad-id]")];
  for (const card of adCards) {
    const adId = card.dataset.adId;
    if (!adId || state.seenAds.has(adId)) {
      continue;
    }

    state.seenAds.add(adId);
    try {
      await api(`/api/ads/${adId}/impression`, { method: "POST" });
    } catch (_error) {
      state.seenAds.delete(adId);
    }
  }

  await loadDashboard();
}

elements.signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    const data = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
        bio: form.get("bio"),
        interests: parseList(form.get("interests"))
      })
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("fvx-token", state.token);
    event.currentTarget.reset();
    renderSession();
    await Promise.all([loadFeed(), loadDashboard()]);
    showToast("Account created.");
  } catch (error) {
    showToast(error.message);
  }
});

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password")
      })
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("fvx-token", state.token);
    event.currentTarget.reset();
    renderSession();
    await Promise.all([loadFeed(), loadDashboard()]);
    showToast("Welcome back to FASHN VAULT X.");
  } catch (error) {
    showToast(error.message);
  }
});

elements.profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.user) {
    showToast("Login first to edit your profile.");
    return;
  }

  const form = new FormData(event.currentTarget);

  try {
    const data = await api("/api/users/me", {
      method: "PUT",
      body: JSON.stringify({
        username: state.user.username,
        bio: form.get("bio"),
        interests: parseList(form.get("interests"))
      })
    });
    state.user = data.user;
    renderSession();
    showToast("Profile updated.");
  } catch (error) {
    showToast(error.message);
  }
});

elements.uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.user) {
    showToast("Login first to upload a fashion asset.");
    return;
  }

  const form = new FormData(event.currentTarget);
  const file = form.get("imageFile");
  let imageData = String(form.get("imageUrl") || "").trim();

  if (file && file.size) {
    imageData = await fileToDataUrl(file);
  }

  try {
    const data = await api("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        tags: parseList(form.get("tags")),
        style: form.get("style"),
        color: form.get("color"),
        type: form.get("type"),
        imageData
      })
    });

    elements.ownershipRecord.innerHTML = `
      <strong>${escapeHtml(data.ownershipRecord.designId)}</strong>
      <div class="metric-row"><small>Timestamp: ${new Date(data.ownershipRecord.timestamp).toLocaleString()}</small></div>
      <div class="metric-row"><small>Creator user ID: ${escapeHtml(data.ownershipRecord.creatorUserId)}</small></div>
    `;
    event.currentTarget.reset();
    await Promise.all([loadFeed(), loadTrends(), loadDashboard()]);
    showToast("Fashion asset record created.");
  } catch (error) {
    showToast(error.message);
  }
});

elements.filterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.filters = {
    q: String(form.get("q") || "").trim(),
    tag: String(form.get("tag") || "").trim().toLowerCase(),
    style: String(form.get("style") || "").trim(),
    color: String(form.get("color") || "").trim(),
    type: String(form.get("type") || "").trim()
  };
  state.seenAds.clear();
  await loadFeed();
});

elements.clearFilters.addEventListener("click", async () => {
  elements.filterForm.reset();
  state.filters = { q: "", tag: "", style: "", color: "", type: "" };
  state.seenAds.clear();
  await loadFeed();
});

elements.adForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.user?.isAdmin) {
    showToast("Only the admin demo account can create brand ads in this MVP.");
    return;
  }

  const form = new FormData(event.currentTarget);

  try {
    await api("/api/admin/ads", {
      method: "POST",
      body: JSON.stringify({
        title: form.get("title"),
        image: form.get("image"),
        link: form.get("link"),
        description: form.get("description")
      })
    });
    event.currentTarget.reset();
    state.seenAds.clear();
    await Promise.all([loadFeed(), loadDashboard()]);
    showToast("Brand ad placeholder created.");
  } catch (error) {
    showToast(error.message);
  }
});

async function boot() {
  renderSession();
  renderActiveFilters();
  try {
    await loadSession();
    await Promise.all([loadFeed(), loadTrends(), loadDashboard()]);
  } catch (error) {
    showToast(error.message);
  }
}

boot();
