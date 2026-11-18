const API_BASE = "/api";

const listEl = document.getElementById("event-list");
const statusEl = document.getElementById("status");

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

// 后端返回的 time 形如 "09:00:00"，展示时截成 "09:00"
function shortTime(value) {
  return value ? String(value).slice(0, 5) : "";
}

function renderEvents(events) {
  if (!events.length) {
    listEl.innerHTML = '<p class="empty">暂无日程</p>';
    return;
  }

  listEl.innerHTML = events
    .map((event) => {
      const time = event.start_time
        ? `${shortTime(event.start_time)}${event.end_time ? " - " + shortTime(event.end_time) : ""}`
        : "全天";
      return `
        <article class="event-card" data-id="${event.id}">
          <div class="event-time">${escapeHtml(event.date)} · ${escapeHtml(time)}</div>
          <div class="event-title">${escapeHtml(event.title)}</div>
          <div class="event-meta">
            ${event.location ? escapeHtml(event.location) : ""}
            ${event.remark ? " · " + escapeHtml(event.remark) : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadEvents() {
  statusEl.textContent = "加载中…";
  try {
    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const events = await res.json();
    renderEvents(events);
    statusEl.textContent = `共 ${events.length} 条日程`;
  } catch (err) {
    statusEl.textContent = `加载失败：${err.message}`;
  }
}

document.getElementById("refresh-btn").addEventListener("click", loadEvents);
loadEvents();
