const RECORDS_URL = new URL("../Assets/records.json", import.meta.url);
const PLACEHOLDER_IMAGE_URL = new URL("../Assets/images/placeholder.png", import.meta.url);
const PERSON_PARAM = "person";

function asNonEmptyString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeStatus(status) {
  const normalized = asNonEmptyString(status)?.toLowerCase();
  if (normalized === "former") return "former";
  return "current";
}

function resolveImageHref(value) {
  const raw = asNonEmptyString(value);
  if (!raw) return PLACEHOLDER_IMAGE_URL.href;

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;

  if (raw.startsWith("Assets/")) {
    return new URL(`../${raw}`, import.meta.url).href;
  }

  return new URL(`../Assets/${raw.replace(/^\.?\//, "")}`, import.meta.url).href;
}

function safeFootageHref(value) {
  const raw = asNonEmptyString(value);
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;

  return raw;
}

function normalizeRecord(raw, index) {
  if (!raw || typeof raw !== "object") return null;

  const name = asNonEmptyString(raw.name);
  const title = asNonEmptyString(raw.title);
  const description = asNonEmptyString(raw.description);
  const year = Number(raw.year);

  if (!name || !title || !description || !Number.isFinite(year)) {
    console.warn("Skipping invalid record at index", index, raw);
    return null;
  }

  return {
    name,
    title,
    description,
    image: asNonEmptyString(raw.image),
    footage: safeFootageHref(raw.footage),
    year,
    status: normalizeStatus(raw.status),
  };
}

async function loadRecords() {
  const response = await fetch(RECORDS_URL.href, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load records.json (${response.status})`);
  }

  const json = await response.json();
  if (!Array.isArray(json)) {
    throw new Error("records.json must be an array.");
  }

  return json.map(normalizeRecord).filter(Boolean);
}

function compareRecords(a, b) {
  if (a.year !== b.year) return b.year - a.year;
  if (a.status !== b.status) return a.status.localeCompare(b.status);
  return a.title.localeCompare(b.title);
}

function ordinal(rank) {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

function createMedal(rank) {
  const colors = {
    1: { fill: "#fbbf24", stroke: "#b45309" },
    2: { fill: "#cbd5e1", stroke: "#64748b" },
    3: { fill: "#fb923c", stroke: "#c2410c" },
  };
  const palette = colors[rank];
  if (!palette) return null;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("medal");

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "12");
  circle.setAttribute("cy", "13");
  circle.setAttribute("r", "6.5");
  circle.setAttribute("fill", palette.fill);
  circle.setAttribute("stroke", palette.stroke);
  circle.setAttribute("stroke-width", "1");

  const ribbonLeft = document.createElementNS("http://www.w3.org/2000/svg", "path");
  ribbonLeft.setAttribute("d", "M7.2 2.5h4.4l-2.2 6.1L7.2 2.5Z");
  ribbonLeft.setAttribute("fill", "rgba(99, 102, 241, 0.85)");

  const ribbonRight = document.createElementNS("http://www.w3.org/2000/svg", "path");
  ribbonRight.setAttribute("d", "M12.4 2.5h4.4l-2.2 6.1L12.4 2.5Z");
  ribbonRight.setAttribute("fill", "rgba(14, 165, 233, 0.75)");

  const star = document.createElementNS("http://www.w3.org/2000/svg", "path");
  star.setAttribute(
    "d",
    "M12 9.5l1.4 2.9 3.2.5-2.3 2.3.6 3.2-2.9-1.6-2.9 1.6.6-3.2-2.3-2.3 3.2-.5L12 9.5Z",
  );
  star.setAttribute("fill", "rgba(15, 23, 42, 0.85)");

  svg.append(ribbonLeft, ribbonRight, circle, star);
  return svg;
}

function statusBadge(status) {
  const span = document.createElement("span");
  span.className = `badge badge--${status}`;
  span.textContent = status === "former" ? "Former" : "Current";
  return span;
}

function renderCertificate(record) {
  const article = document.createElement("article");
  article.className = "certificate";

  const inner = document.createElement("div");
  inner.className = "certInner";

  const top = document.createElement("div");
  top.className = "certTop";

  const seal = document.createElement("div");
  seal.className = "seal";
  seal.textContent = `Year ${record.year}`;

  top.append(seal, statusBadge(record.status));

  const personRow = document.createElement("div");
  personRow.className = "personRow";

  const img = document.createElement("img");
  img.className = "thumb";
  img.loading = "lazy";
  img.decoding = "async";
  img.alt = `${record.title} image`;
  img.src = resolveImageHref(record.image);
  img.addEventListener(
    "error",
    () => {
      img.src = PLACEHOLDER_IMAGE_URL.href;
    },
    { once: true },
  );

  const headline = document.createElement("div");

  const person = document.createElement("p");
  person.className = "person";
  person.textContent = record.name;

  const title = document.createElement("p");
  title.className = "title";
  title.textContent = record.title;

  headline.append(person, title);
  personRow.append(img, headline);

  const desc = document.createElement("p");
  desc.className = "desc";
  desc.textContent = record.description;

  const bottom = document.createElement("div");
  bottom.className = "certBottom";

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `${record.year} • ${record.status}`;

  const footage = document.createElement("div");
  footage.className = "footage";

  if (record.footage) {
    const link = document.createElement("a");
    link.href = record.footage;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Footage";
    footage.append(link);
  } else {
    footage.textContent = "No footage";
  }

  bottom.append(meta, footage);

  inner.append(top, personRow, desc, bottom);
  article.append(inner);
  return article;
}

function setEmpty(container, message) {
  container.innerHTML = "";
  const div = document.createElement("div");
  div.className = "empty";
  div.textContent = message;
  container.append(div);
}

function setError(container, message) {
  container.innerHTML = "";
  const div = document.createElement("div");
  div.className = "error";
  div.textContent = message;
  container.append(div);
}

function setListMessage(list, message, className) {
  list.innerHTML = "";
  const li = document.createElement("li");
  li.className = className;
  li.textContent = message;
  list.append(li);
}

function renderGrid(container, records) {
  container.innerHTML = "";
  if (records.length === 0) {
    setEmpty(container, "No records to display.");
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const record of records) fragment.append(renderCertificate(record));
  container.append(fragment);
}

function pointsForRecord(record) {
  return record.status === "former" ? 5 : 10;
}

function groupRecordsByPerson(records) {
  const map = new Map();
  for (const record of records) {
    if (!map.has(record.name)) {
      map.set(record.name, { name: record.name, points: 0, records: [] });
    }
    const entry = map.get(record.name);
    entry.records.push(record);
    entry.points += pointsForRecord(record);
  }

  const leaders = Array.from(map.values());
  leaders.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name);
  });
  return leaders;
}

function setPersonParam(personName, { replace = false } = {}) {
  const url = new URL(window.location.href);
  if (personName) url.searchParams.set(PERSON_PARAM, personName);
  else url.searchParams.delete(PERSON_PARAM);

  const method = replace ? "replaceState" : "pushState";
  window.history[method](null, "", url);
}

function getPersonParam() {
  const url = new URL(window.location.href);
  const value = url.searchParams.get(PERSON_PARAM);
  return asNonEmptyString(value);
}

function renderLeaderboard(list, leaders, { onOpenProfile } = {}) {
  list.innerHTML = "";

  if (leaders.length === 0) {
    setListMessage(list, "No people yet.", "empty");
    return;
  }

  const fragment = document.createDocumentFragment();
  leaders.forEach((leader, idx) => {
    const rank = idx + 1;
    const li = document.createElement("li");
    li.className = "leaderItem";

    const left = document.createElement("div");
    left.className = "leaderLeft";

    const pill = document.createElement("span");
    pill.className = "rankPill";
    pill.textContent = ordinal(rank);

    left.append(pill);

    const medal = createMedal(rank);
    if (medal) left.append(medal);

    const name = document.createElement("span");
    name.className = "leaderName";
    name.textContent = leader.name;
    left.append(name);

    const arrow = document.createElement("button");
    arrow.className = "arrowBtn";
    arrow.type = "button";
    arrow.setAttribute("aria-label", `View ${leader.name}'s profile`);
    arrow.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.2 5.5a1 1 0 0 0 0 1.4l4.1 4.1H4.8a1 1 0 0 0 0 2h12.5l-4.1 4.1a1 1 0 1 0 1.4 1.4l5.8-5.8a1 1 0 0 0 0-1.4l-5.8-5.8a1 1 0 0 0-1.4 0Z"/></svg>';
    arrow.addEventListener("click", () => {
      onOpenProfile?.(leader.name);
    });

    li.append(left, arrow);
    fragment.append(li);
  });

  list.append(fragment);
}

function renderProfile(grid, leader) {
  renderGrid(grid, leader.records.slice().sort(compareRecords));
}

function updateStats(records) {
  const total = document.getElementById("statTotal");
  const current = document.getElementById("statCurrent");
  const former = document.getElementById("statFormer");
  if (!total || !current || !former) return;

  const formerCount = records.filter((r) => r.status === "former").length;
  const currentCount = records.length - formerCount;

  total.textContent = String(records.length);
  current.textContent = String(currentCount);
  former.textContent = String(formerCount);
}

export async function initRecords() {
  const recordsGrid = document.getElementById("recordsGrid");
  const formerGrid = document.getElementById("formerGrid");
  const peopleLeaderboard = document.getElementById("peopleLeaderboard");
  const leaderboardList = document.getElementById("leaderboardList");
  const peopleProfile = document.getElementById("peopleProfile");
  const profileBackBtn = document.getElementById("profileBackBtn");
  const profileName = document.getElementById("profileName");
  const profileGrid = document.getElementById("profileGrid");

  if (
    !recordsGrid ||
    !formerGrid ||
    !peopleLeaderboard ||
    !leaderboardList ||
    !peopleProfile ||
    !profileBackBtn ||
    !profileName ||
    !profileGrid
  ) {
    return;
  }

  setEmpty(recordsGrid, "Loading records…");
  setEmpty(formerGrid, "Loading records…");
  setListMessage(leaderboardList, "Loading people…", "empty");
  setEmpty(profileGrid, "Loading…");

  try {
    const records = (await loadRecords()).sort(compareRecords);
    updateStats(records);

    renderGrid(recordsGrid, records);
    renderGrid(
      formerGrid,
      records.filter((r) => r.status === "former"),
    );

    const leaders = groupRecordsByPerson(records);

    const showLeaderboard = ({ updateUrl = true, replaceUrl = false } = {}) => {
      peopleLeaderboard.hidden = false;
      peopleProfile.hidden = true;
      profileName.textContent = "";
      if (updateUrl) setPersonParam(null, { replace: replaceUrl });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const showProfile = (personName, { updateUrl = true, replaceUrl = false } = {}) => {
      const leader = leaders.find((l) => l.name === personName);
      if (!leader) return;

      peopleLeaderboard.hidden = true;
      peopleProfile.hidden = false;
      profileName.textContent = leader.name;
      renderProfile(profileGrid, leader);
      if (updateUrl) setPersonParam(leader.name, { replace: replaceUrl });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    renderLeaderboard(leaderboardList, leaders, {
      onOpenProfile: (personName) => showProfile(personName),
    });

    profileBackBtn.addEventListener("click", () => showLeaderboard());

    const initialPerson = getPersonParam();
    if (initialPerson) {
      showProfile(initialPerson, { updateUrl: false });
    } else {
      peopleLeaderboard.hidden = false;
      peopleProfile.hidden = true;
    }

    window.addEventListener("popstate", () => {
      const person = getPersonParam();
      if (person) showProfile(person, { updateUrl: false });
      else showLeaderboard({ updateUrl: false });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    setError(recordsGrid, message);
    setError(formerGrid, message);
    peopleLeaderboard.innerHTML = "";
    setError(peopleLeaderboard, message);
    setError(profileGrid, message);
  }
}
