const API_BASE = "/api";
const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const CELL_MINUTES = 5;                            // 周视图底层每格 5 分钟
const SLOTS_PER_HOUR = 60 / CELL_MINUTES;          // 每小时 12 格
const CELL_HEIGHT = 6;                             // 每格高度（与 CSS 中 --cell-h 保持一致）
const HOUR_HEIGHT = CELL_HEIGHT * SLOTS_PER_HOUR;  // 每小时高度
const TOTAL_SLOTS = 24 * SLOTS_PER_HOUR;           // 全天 288 格
const DAY_MINUTES = 24 * 60;

// ---------------- DOM ----------------

const monthViewEl = document.getElementById("month-view");
const weekViewEl = document.getElementById("week-view");
const monthTitleEl = document.getElementById("month-title");
const monthGridEl = document.getElementById("month-grid");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const backBtn = document.getElementById("back-to-month");
const prevWeekBtn = document.getElementById("prev-week");
const nextWeekBtn = document.getElementById("next-week");
const weekRangeEl = document.getElementById("week-range");

const scrollEl = document.getElementById("calendar-scroll");
const headerEl = document.getElementById("cal-header");
const bodyEl = document.getElementById("cal-body");
const cornerEl = document.getElementById("corner");
const gutterEl = document.getElementById("time-gutter");
const statusEl = document.getElementById("status");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// ---------------- 状态 ----------------

const today = new Date();
let viewMonth = new Date(today.getFullYear(), today.getMonth(), 1); // 月视图当前页
let currentWeek = null;   // 周视图当前显示的那一周（周日）
let events = [];
let transitioning = false;

// ---------------- 通用工具 ----------------

const pad2 = (n) => String(n).padStart(2, "0");

function dateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// 以周日为一周起点
function startOfWeek(d) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addDays(d, n) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

function weekDayKeys(weekStart) {
  return Array.from({ length: 7 }, (_, i) => dateKey(addDays(weekStart, i)));
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

// 播放一次性动画，结束后取消动画（避免 fill 状态堆积）
function animateOnce(el, keyframes, options) {
  const anim = el.animate(keyframes, options);
  anim.addEventListener("finish", () => anim.cancel());
  return anim;
}

// ---------------- 月视图 ----------------

function buildMonthGrid() {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  monthTitleEl.textContent = `${year}年${month + 1}月`;

  const firstDay = new Date(year, month, 1);
  const gridStart = startOfWeek(firstDay);
  const weeks = 6; // 固定 6 行（42 格），保证每一页月视图行高一致

  // 每天日程数量（用于红点，最多展示 3 个）
  const counts = new Map();
  for (const event of events) {
    const key = String(event.date ?? "").slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const todayKey = dateKey(today);
  monthGridEl.innerHTML = "";

  for (let w = 0; w < weeks; w++) {
    const weekStart = addDays(gridStart, w * 7);
    const row = document.createElement("div");
    row.className = "month-week";
    row.tabIndex = 0;
    row.title = "查看这一周的日程";
    row.addEventListener("click", () => openWeek(weekStart, row));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openWeek(weekStart, row);
      }
    });

    for (let d = 0; d < 7; d++) {
      const day = addDays(weekStart, d);
      const key = dateKey(day);
      const cell = document.createElement("div");
      cell.className = "month-day";

      if (day.getMonth() !== month) cell.classList.add("is-outside");
      if (key === todayKey) cell.classList.add("is-today");

      const dotCount = Math.min(counts.get(key) ?? 0, 3);
      const dots = '<span class="dot"></span>'.repeat(dotCount);

      cell.innerHTML = `
        <span class="day-num">${day.getDate()}</span>
        <span class="dots">${dots}</span>
      `;
      row.appendChild(cell);
    }

    monthGridEl.appendChild(row);
  }
}

// ---------------- 周视图 ----------------

function buildTimeGutter() {
  for (let hour = 0; hour < 24; hour++) {
    const label = document.createElement("span");
    label.className = "hour-label";
    label.style.top = `${hour * HOUR_HEIGHT + 3}px`;
    label.textContent = `${pad2(hour)}:00`;
    gutterEl.appendChild(label);
  }
}

function buildWeekHeader(weekStart) {
  headerEl.querySelectorAll(".day-head").forEach((el) => el.remove());

  const todayKey = dateKey(today);

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

function buildWeekColumns(weekStart) {
  bodyEl.querySelectorAll(".day-column").forEach((el) => el.remove());

  const todayKey = dateKey(today);

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const column = document.createElement("div");
    column.className = "day-column";
    if (dateKey(day) === todayKey) column.classList.add("is-today");

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

function renderWeekEvents(weekStart) {
  bodyEl.querySelectorAll(".event").forEach((el) => el.remove());

  const dayKeys = weekDayKeys(weekStart);
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

function scrollToWeekEvents(weekStart) {
  const dayKeys = weekDayKeys(weekStart);
  const starts = events
    .filter((event) => dayKeys.includes(String(event.date ?? "").slice(0, 10)))
    .map((event) => minutesOfDay(event.start_time))
    .filter((minutes) => minutes !== null);

  const focusMinute = starts.length ? Math.min(...starts) : 8 * 60;
  scrollEl.scrollTop = Math.max(0, toPx(focusMinute) - HOUR_HEIGHT);
}

function formatWeekRange(weekStart) {
  const end = addDays(weekStart, 6);
  const sameMonth =
    weekStart.getFullYear() === end.getFullYear() &&
    weekStart.getMonth() === end.getMonth();
  const endText = sameMonth
    ? `${end.getDate()}日`
    : `${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`;

  return `${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月${weekStart.getDate()}日 – ${endText}`;
}

function prepareWeekContent(weekStart) {
  currentWeek = weekStart;
  weekRangeEl.textContent = formatWeekRange(weekStart);
  buildWeekHeader(weekStart);
  buildWeekColumns(weekStart);
  renderWeekEvents(weekStart);
}

// ---------------- 视图切换（带动画） ----------------

// 克隆被点击的那一行，作为“飞到顶部”的动画元素
function createGhostRow(row, rect) {
  const ghost = row.cloneNode(true);
  ghost.classList.add("week-ghost");
  ghost.removeAttribute("tabindex");
  ghost.removeAttribute("title");
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.margin = "0";
  return ghost;
}

function openWeek(weekStart, sourceRow) {
  if (transitioning) return;

  // 减少动态偏好：直接切换，不做动画
  if (prefersReducedMotion.matches) {
    prepareWeekContent(weekStart);
    monthViewEl.hidden = true;
    weekViewEl.hidden = false;
    scrollToWeekEvents(weekStart);
    return;
  }

  transitioning = true;

  const rowRect = sourceRow ? sourceRow.getBoundingClientRect() : null;
  const ghost = rowRect ? createGhostRow(sourceRow, rowRect) : null;
  if (ghost) document.body.appendChild(ghost);

  // 1. 月视图整体淡出、轻微上移
  const monthCard = monthViewEl.querySelector(".card");
  const fadeOut = monthCard.animate(
    [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(-10px)" }
    ],
    { duration: 190, easing: "ease-in", fill: "forwards" }
  );

  setTimeout(() => {
    fadeOut.cancel();
    monthViewEl.hidden = true;

    // 2. 准备并显示周视图（先隐身布局，避免闪烁）
    weekViewEl.hidden = false;
    weekViewEl.style.visibility = "hidden";
    prepareWeekContent(weekStart);
    scrollToWeekEvents(weekStart);
    const headerRect = headerEl.getBoundingClientRect();

    // 表头 7 个日期列的横向范围：飞行行最终会收缩到这个宽度
    const heads = headerEl.querySelectorAll(".day-head");
    const firstHeadRect = heads[0].getBoundingClientRect();
    const lastHeadRect = heads[6].getBoundingClientRect();
    const targetLeft = firstHeadRect.left;
    const targetWidth = lastHeadRect.right - firstHeadRect.left;

    weekViewEl.style.visibility = "";

    // 3. 周视图内容稍晚浮现，与“行收缩落位”衔接
    animateOnce(
      weekViewEl,
      [
        { opacity: 0, transform: "translateY(14px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      {
        duration: 300,
        delay: 80,
        easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
        fill: "both"
      }
    );

    // 4. 表头日期逐列淡入
    heads.forEach((el, i) => {
      animateOnce(
        el,
        [
          { opacity: 0, transform: "translateY(-6px)" },
          { opacity: 1, transform: "translateY(0)" }
        ],
        {
          duration: 220,
          delay: 140 + i * 20,
          easing: "ease-out",
          fill: "both"
        }
      );
    });

    // 5. 被点击的周行上移 + 压缩到表头高度，横向对齐到 7 个日列，落位后淡出
    if (ghost) {
      const deltaY = headerRect.top - rowRect.top;
      const flight = ghost.animate(
        [
          {
            left: `${rowRect.left}px`,
            width: `${rowRect.width}px`,
            height: `${rowRect.height}px`,
            transform: "translateY(0)",
            opacity: 1,
            offset: 0
          },
          {
            left: `${targetLeft}px`,
            width: `${targetWidth}px`,
            height: `${headerRect.height}px`,
            transform: `translateY(${deltaY}px)`,
            opacity: 1,
            offset: 0.72
          },
          {
            left: `${targetLeft}px`,
            width: `${targetWidth}px`,
            height: `${headerRect.height}px`,
            transform: `translateY(${deltaY}px)`,
            opacity: 0,
            offset: 1
          }
        ],
        {
          duration: 460,
          easing: "cubic-bezier(0.4, 0.08, 0.2, 1)",
          fill: "forwards"
        }
      );
      flight.addEventListener("finish", () => {
        flight.cancel();
        ghost.remove();
      });
      setTimeout(() => ghost.remove(), 1200);
    }

    setTimeout(() => {
      transitioning = false;
    }, 780);
  }, 170);
}

// 周视图内切换上一周 / 下一周（可跨月、跨年）
function shiftWeek(offset) {
  if (transitioning || !currentWeek) return;

  const target = addDays(currentWeek, offset * 7);

  // 返回月视图时，月视图页同步到当前周的月份
  const syncMonth = () => {
    viewMonth = new Date(target.getFullYear(), target.getMonth(), 1);
    buildMonthGrid();
  };

  if (prefersReducedMotion.matches) {
    prepareWeekContent(target);
    syncMonth();
    return;
  }

  transitioning = true;

  const dir = offset > 0 ? 1 : -1;
  const scrollTop = scrollEl.scrollTop; // 翻周时保持垂直位置

  // 旧的一周向反方向淡出
  const out = weekViewEl.animate(
    [
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 0, transform: `translateX(${-20 * dir}px)` }
    ],
    { duration: 150, easing: "ease-in", fill: "forwards" }
  );

  out.addEventListener("finish", () => {
    out.cancel();
    prepareWeekContent(target);
    syncMonth();
    scrollEl.scrollTop = scrollTop;

    // 新的一周从翻页方向滑入
    const enter = weekViewEl.animate(
      [
        { opacity: 0, transform: `translateX(${24 * dir}px)` },
        { opacity: 1, transform: "translateX(0)" }
      ],
      {
        duration: 230,
        easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
        fill: "both"
      }
    );
    enter.addEventListener("finish", () => {
      enter.cancel();
      transitioning = false;
    });
  });
}

function closeWeek() {
  if (transitioning) return;

  if (prefersReducedMotion.matches) {
    weekViewEl.hidden = true;
    monthViewEl.hidden = false;
    return;
  }

  transitioning = true;

  // 1. 周视图淡出
  const fadeOut = weekViewEl.animate(
    [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(10px)" }
    ],
    { duration: 170, easing: "ease-in", fill: "forwards" }
  );

  fadeOut.addEventListener("finish", () => {
    fadeOut.cancel();
    weekViewEl.hidden = true;
    monthViewEl.hidden = false;

    // 2. 月视图淡入 + 上浮
    const monthCard = monthViewEl.querySelector(".card");
    const enter = monthCard.animate(
      [
        { opacity: 0, transform: "translateY(12px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      { duration: 260, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "both" }
    );
    enter.addEventListener("finish", () => {
      enter.cancel();
      transitioning = false;
    });
  });
}

// ---------------- 数据与启动 ----------------

async function loadEvents() {
  try {
    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    events = await res.json();
    buildMonthGrid(); // 数据到达后刷新红点
    if (!weekViewEl.hidden && currentWeek) {
      renderWeekEvents(currentWeek);
    }
  } catch (err) {
    showStatus(`加载日程失败：${err.message}`);
  }
}

function init() {
  buildTimeGutter();
  buildMonthGrid();

  prevMonthBtn.addEventListener("click", () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    buildMonthGrid();
  });

  nextMonthBtn.addEventListener("click", () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    buildMonthGrid();
  });

  backBtn.addEventListener("click", closeWeek);
  prevWeekBtn.addEventListener("click", () => shiftWeek(-1));
  nextWeekBtn.addEventListener("click", () => shiftWeek(1));

  loadEvents();
}

init();
