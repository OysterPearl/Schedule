const API_BASE = "/api";
const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const CELL_MINUTES = 5;                            // 底层每格 5 分钟
const SLOTS_PER_HOUR = 60 / CELL_MINUTES;          // 每小时 12 格
const CELL_HEIGHT = 6;                             // 每格高度（与 CSS 中 --cell-h 保持一致）
const HOUR_HEIGHT = CELL_HEIGHT * SLOTS_PER_HOUR;  // 每小时高度
const TOTAL_SLOTS = 24 * SLOTS_PER_HOUR;           // 全天 288 格
const DAY_MINUTES = 24 * 60;

// 周次暂时固定显示 2026-11-15（周日）～ 2026-11-21（周六），
// 列顺序固定为 周日 → 周六（15 号是周日，逐列 +1 天）。
const WEEK_START = new Date(2026, 10, 15);

const scrollEl = document.getElementById("calendar-scroll");
const headerEl = document.getElementById("cal-header");
const bodyEl = document.getElementById("cal-body");
const cornerEl = document.getElementById("corner");
const gutterEl = document.getElementById("time-gutter");
const statusEl = document.getElementById("status");

const pad2 = (n) => String(n).padStart(2, "0");

function dateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(d, n) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

// 从 "2026-11-18 18:00:00" / "2026-11-18T18:00:00" / "18:00" 中取出一天内的分钟数
function minutesOfDay(value) {
  if (!value) return null;
  const match = String(value).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  return (
    Number(match[1]) * 60 +
    Number(match[2]) +
    (match[3] ? Number(match[3]) / 60 : 0)
  );
}

// 对齐到 5 分钟格
function snapToCell(minutes) {
  return Math.round(minutes / CELL_MINUTES) * CELL_MINUTES;
}

function toPx(minutes) {
  return (minutes / 60) * HOUR_HEIGHT;
}

function showStatus(message) {
  statusEl.textContent = message;
  statusEl.hidden = false;
}

// ---------------- 渲染 ----------------

function renderHeader(weekStart) {
  const todayKey = dateKey(new Date());

  cornerEl.innerHTML = `
    <span class="corner-month">${weekStart.getMonth() + 1}月</span>
    <span class="corner-year">${weekStart.getFullYear()}</span>
  `;

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const head = document.createElement("div");
    head.className = "day-head" + (dateKey(day) === todayKey ? " is-today" : "");
    head.innerHTML = `
      <span class="day-name">${WEEKDAYS[day.getDay()]}</span>
      <span class="day-date">${day.getDate()}</span>
    `;
    headerEl.appendChild(head);
  }
}

function buildTimeGutter() {
  for (let hour = 0; hour < 24; hour++) {
    const label = document.createElement("span");
    label.className = "hour-label";
    label.style.top = `${hour * HOUR_HEIGHT + 3}px`;
    label.textContent = `${pad2(hour)}:00`;
    gutterEl.appendChild(label);
  }
}

function buildDayColumns(weekStart) {
  const todayKey = dateKey(new Date());

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const column = document.createElement("div");
    column.className = "day-column" + (dateKey(day) === todayKey ? " is-today" : "");

    const fragment = document.createDocumentFragment();
    for (let slot = 0; slot < TOTAL_SLOTS; slot++) {
      const cell = document.createElement("div");
      cell.className = slot % SLOTS_PER_HOUR === 0 ? "slot slot--hour" : "slot";
      fragment.appendChild(cell);
    }
    column.appendChild(fragment);
    bodyEl.appendChild(column);
  }
}

function renderEvents(events, weekStart) {
  const dayKeys = [];
  for (let i = 0; i < 7; i++) dayKeys.push(dateKey(addDays(weekStart, i)));

  const columns = bodyEl.querySelectorAll(".day-column");

  for (const event of events) {
    // 事件落在哪一列由 date 决定
    const key = String(event.date ?? "").slice(0, 10);
    const columnIndex = dayKeys.indexOf(key);
    if (columnIndex === -1) continue;

    // 上下边由 start_time / end_time 当天的时刻决定
    const startRaw = minutesOfDay(event.start_time);
    if (startRaw === null) continue;

    let endRaw = minutesOfDay(event.end_time);
    if (endRaw === null || endRaw <= startRaw) endRaw = startRaw + CELL_MINUTES;

    const startMin = Math.max(
      0,
      Math.min(DAY_MINUTES - CELL_MINUTES, snapToCell(startRaw))
    );
    const endMin = Math.max(
      startMin + CELL_MINUTES,
      Math.min(DAY_MINUTES, snapToCell(endRaw))
    );

    const block = document.createElement("div");
    block.className = "event";
    block.style.top = `${toPx(startMin)}px`;
    block.style.height = `${toPx(endMin - startMin)}px`;
    block.innerHTML = `
      <div class="event-title">${escapeHtml(event.title)}</div>
      ${event.location ? `<div class="event-location">${escapeHtml(event.location)}</div>` : ""}
    `;

    columns[columnIndex].appendChild(block);
  }
}

function autoScroll(events) {
  const starts = events
    .map((event) => minutesOfDay(event.start_time))
    .filter((minutes) => minutes !== null);

  const focusMinute = starts.length ? Math.min(...starts) : 8 * 60;
  scrollEl.scrollTop = Math.max(0, toPx(focusMinute) - HOUR_HEIGHT);
}

// ---------------- 启动 ----------------

async function init() {
  const weekStart = WEEK_START;

  renderHeader(weekStart);
  buildTimeGutter();
  buildDayColumns(weekStart);

  let events = [];
  try {
    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    events = await res.json();
    renderEvents(events, weekStart);
  } catch (err) {
    showStatus(`加载日程失败：${err.message}`);
  }

  autoScroll(events);
}

init();
