const TRACKERS_STORAGE_KEY = "goal-tracker-trackers-v3";
const ENTRIES_STORAGE_KEY = "goal-tracker-entries-v1";
const SCHEDULE_STORAGE_KEY = "goal-tracker-schedules-v1";
const SETTINGS_STORAGE_KEY = "goal-tracker-settings-v1";
const LEGACY_TRACKERS_KEY = "goal-tracker-trackers-v2";
const DAY_MS = 24 * 60 * 60 * 1000;

const menuButtons = document.querySelectorAll(".menu-btn");
const dropdowns = document.querySelectorAll("[data-dropdown]");
const tabPanels = document.querySelectorAll(".tab-panel");

const goalForm = document.querySelector("#goal-form");
const goalName = document.querySelector("#goal-name");
const goalWeekly = document.querySelector("#goal-weekly");
const goalMonthly = document.querySelector("#goal-monthly");
const goalYearly = document.querySelector("#goal-yearly");
const manageList = document.querySelector("#manage-list");
const manageEmpty = document.querySelector("#manage-empty");

const entryForm = document.querySelector("#entry-form");
const entryTracker = document.querySelector("#entry-tracker");
const entryDate = document.querySelector("#entry-date");
const entryAmount = document.querySelector("#entry-amount");
const entryNotes = document.querySelector("#entry-notes");
const todayEntriesList = document.querySelector("#today-entries-list");
const todayEntriesEmpty = document.querySelector("#today-entries-empty");

const entryListAll = document.querySelector("#entry-list-all");
const entryListEmpty = document.querySelector("#entry-list-empty");
const entryListSort = document.querySelector("#entry-list-sort");

const scheduleForm = document.querySelector("#schedule-form");
const scheduleGoal = document.querySelector("#schedule-goal");
const scheduleDate = document.querySelector("#schedule-date");
const scheduleStartTime = document.querySelector("#schedule-start-time");
const scheduleEndTime = document.querySelector("#schedule-end-time");
const scheduleNotes = document.querySelector("#schedule-notes");
const scheduleList = document.querySelector("#schedule-list");
const scheduleEmpty = document.querySelector("#schedule-empty");
const scheduleWeekRange = document.querySelector("#schedule-week-range");
const schedulePrevWeek = document.querySelector("#schedule-prev-week");
const scheduleThisWeek = document.querySelector("#schedule-this-week");
const scheduleNextWeek = document.querySelector("#schedule-next-week");

const settingsForm = document.querySelector("#settings-form");
const weekStartSelect = document.querySelector("#week-start-select");
const compareDefaultSelect = document.querySelector("#compare-default-select");

const weekRangeLabel = document.querySelector("#week-range");
const monthRangeLabel = document.querySelector("#month-range");
const yearRangeLabel = document.querySelector("#year-range");
const weekSummary = document.querySelector("#week-summary");
const monthSummary = document.querySelector("#month-summary");
const yearSummary = document.querySelector("#year-summary");
const weekList = document.querySelector("#week-list");
const monthList = document.querySelector("#month-list");
const yearList = document.querySelector("#year-list");
const weekEmpty = document.querySelector("#week-empty");
const monthEmpty = document.querySelector("#month-empty");
const yearEmpty = document.querySelector("#year-empty");

let trackers = [];
let entries = [];
let schedules = [];
let settings = {
  weekStart: "monday",
  compareToLastDefault: true
};
let activeTab = "manage";
let entryListSortMode = "date_desc";
let scheduleWeekAnchor = normalizeDate(new Date());
const expandedGraphs = {};
const goalCompareState = {
  week: {},
  month: {},
  year: {}
};
const flippedScheduleDays = {};

initializeData();
entryDate.value = getDateKey(normalizeDate(new Date()));
weekStartSelect.value = settings.weekStart;
compareDefaultSelect.value = settings.compareToLastDefault ? "on" : "off";
scheduleDate.value = getDateKey(normalizeDate(new Date()));
if (entryListSort) {
  entryListSort.value = entryListSortMode;
}
render();

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeTab = button.dataset.tab;
    if (activeTab === "goal-schedule") {
      scheduleWeekAnchor = normalizeDate(new Date());
      resetScheduleTileFlips();
    }
    renderTabs();
    if (activeTab === "goal-schedule") {
      renderGoalScheduleTab();
    }
  });
});

goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = goalName.value.trim();
  const weeklyGoal = normalizePositiveInt(goalWeekly.value, 1);
  const monthlyGoal = normalizePositiveInt(goalMonthly.value, 1);
  const yearlyGoal = normalizePositiveInt(goalYearly.value, 1);
  if (!name || weeklyGoal < 1 || monthlyGoal < 1 || yearlyGoal < 1) {
    return;
  }

  trackers.unshift({
    id: createId(),
    name,
    weeklyGoal,
    monthlyGoal,
    yearlyGoal
  });

  saveTrackers();
  goalForm.reset();
  goalWeekly.value = "5";
  goalMonthly.value = "22";
  goalYearly.value = "260";
  render();
});

manageList.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-action='edit-goal']");
  if (!form) {
    return;
  }
  event.preventDefault();

  const tracker = trackers.find((item) => item.id === form.dataset.id);
  if (!tracker) {
    return;
  }

  const nameValue = String(form.elements.name.value || "").trim();
  const weeklyGoal = normalizePositiveInt(form.elements.weeklyGoal.value, tracker.weeklyGoal);
  const monthlyGoal = normalizePositiveInt(form.elements.monthlyGoal.value, tracker.monthlyGoal);
  const yearlyGoal = normalizePositiveInt(form.elements.yearlyGoal.value, tracker.yearlyGoal);
  if (!nameValue) {
    return;
  }

  tracker.name = nameValue;
  tracker.weeklyGoal = weeklyGoal;
  tracker.monthlyGoal = monthlyGoal;
  tracker.yearlyGoal = yearlyGoal;

  saveTrackers();
  render();
});

manageList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='delete-goal']");
  if (!button) {
    return;
  }
  const id = button.dataset.id;
  trackers = trackers.filter((item) => item.id !== id);
  entries = entries.filter((entry) => entry.trackerId !== id);
  schedules = schedules.filter((item) => item.trackerId !== id);
  Object.keys(expandedGraphs).forEach((key) => {
    if (key.endsWith(`:${id}`)) {
      delete expandedGraphs[key];
    }
  });
  Object.keys(goalCompareState).forEach((periodName) => {
    delete goalCompareState[periodName][id];
  });
  saveTrackers();
  saveEntries();
  saveSchedules();
  render();
});

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const tracker = trackers.find((item) => item.id === entryTracker.value);
  if (!tracker) {
    return;
  }

  const dateValue = entryDate.value;
  if (!isDateKey(dateValue)) {
    return;
  }

  const amount = normalizePositiveAmount(entryAmount.value, 1);
  if (amount <= 0) {
    return;
  }

  entries.unshift({
    id: createId(),
    trackerId: tracker.id,
    date: dateValue,
    amount,
    notes: String(entryNotes.value || "").trim(),
    createdAt: new Date().toISOString()
  });

  saveEntries();
  entryAmount.value = "1.00";
  entryNotes.value = "";
  entryDate.value = getDateKey(normalizeDate(new Date()));
  render();
});

scheduleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const tracker = trackers.find((item) => item.id === scheduleGoal.value);
  if (!tracker) {
    return;
  }
  const dateValue = scheduleDate.value;
  const startTimeValue = scheduleStartTime.value;
  const endTimeValue = scheduleEndTime.value;
  if (!isDateKey(dateValue) || !isTimeKey(startTimeValue) || !isTimeKey(endTimeValue)) {
    return;
  }
  if (timeToMinutes(endTimeValue) <= timeToMinutes(startTimeValue)) {
    scheduleEndTime.setCustomValidity("End time must be after start time.");
    scheduleEndTime.reportValidity();
    return;
  }
  scheduleEndTime.setCustomValidity("");

  schedules.unshift({
    id: createId(),
    trackerId: tracker.id,
    date: dateValue,
    startTime: startTimeValue,
    endTime: endTimeValue,
    notes: String(scheduleNotes.value || "").trim(),
    createdAt: new Date().toISOString()
  });

  saveSchedules();
  scheduleNotes.value = "";
  renderGoalScheduleTab();
});

scheduleStartTime.addEventListener("input", () => {
  scheduleEndTime.setCustomValidity("");
});

scheduleEndTime.addEventListener("input", () => {
  scheduleEndTime.setCustomValidity("");
});

scheduleList.addEventListener("click", (event) => {
  const flipButton = event.target.closest("button[data-action='toggle-day-flip']");
  if (flipButton) {
    const dateKey = String(flipButton.dataset.date || "");
    if (isDateKey(dateKey)) {
      flippedScheduleDays[dateKey] = !Boolean(flippedScheduleDays[dateKey]);
      renderGoalScheduleTab();
    }
    return;
  }

  const button = event.target.closest("button[data-action='delete-schedule']");
  if (!button) {
    return;
  }
  schedules = schedules.filter((item) => item.id !== button.dataset.id);
  saveSchedules();
  renderGoalScheduleTab();
});

schedulePrevWeek.addEventListener("click", () => {
  scheduleWeekAnchor = addDays(scheduleWeekAnchor, -7);
  resetScheduleTileFlips();
  renderGoalScheduleTab();
});

scheduleThisWeek.addEventListener("click", () => {
  scheduleWeekAnchor = normalizeDate(new Date());
  resetScheduleTileFlips();
  renderGoalScheduleTab();
});

scheduleNextWeek.addEventListener("click", () => {
  scheduleWeekAnchor = addDays(scheduleWeekAnchor, 7);
  resetScheduleTileFlips();
  renderGoalScheduleTab();
});

entryListAll.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-action='edit-entry']");
  if (!form) {
    return;
  }
  event.preventDefault();

  const entry = entries.find((item) => item.id === form.dataset.id);
  if (!entry) {
    return;
  }

  const trackerId = String(form.elements.trackerId.value || "");
  const date = String(form.elements.date.value || "");
  const amount = normalizePositiveAmount(form.elements.amount.value, entry.amount);
  const notes = String(form.elements.notes.value || "").trim();
  if (!trackers.some((item) => item.id === trackerId) || !isDateKey(date) || amount <= 0) {
    return;
  }

  entry.trackerId = trackerId;
  entry.date = date;
  entry.amount = amount;
  entry.notes = notes;

  saveEntries();
  render();
});

entryListAll.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='delete-entry']");
  if (!button) {
    return;
  }
  entries = entries.filter((item) => item.id !== button.dataset.id);
  saveEntries();
  render();
});

if (entryListSort) {
  entryListSort.addEventListener("change", () => {
    entryListSortMode = entryListSort.value === "goal_asc" ? "goal_asc" : "date_desc";
    renderEntryListTab();
  });
}

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const priorCompareDefault = settings.compareToLastDefault;
  settings.weekStart = weekStartSelect.value === "sunday" ? "sunday" : "monday";
  settings.compareToLastDefault = compareDefaultSelect.value !== "off";
  if (priorCompareDefault !== settings.compareToLastDefault) {
    resetGoalCompareState();
  }
  saveSettings();
  scheduleWeekAnchor = normalizeDate(new Date());
  resetScheduleTileFlips();
  renderGoalScheduleTab();
  renderPeriodTabs();
});

weekList.addEventListener("click", handleGraphToggle);
monthList.addEventListener("click", handleGraphToggle);
yearList.addEventListener("click", handleGraphToggle);
[weekList, monthList, yearList].forEach((listElement) => {
  listElement.addEventListener("change", handleGoalCompareToggle);
});

[weekList, monthList, yearList].forEach((listElement) => {
  listElement.addEventListener("mousemove", handleGraphHover);
  listElement.addEventListener("mouseleave", () => hideTooltipsInList(listElement));
});

function handleGraphToggle(event) {
  const button = event.target.closest("button[data-action='toggle-graph']");
  if (!button) {
    return;
  }
  const period = button.dataset.period;
  const id = button.dataset.id;
  if (!period || !id) {
    return;
  }
  const key = graphKey(period, id);
  expandedGraphs[key] = !expandedGraphs[key];
  renderPeriodTabs();
}

function handleGoalCompareToggle(event) {
  const input = event.target.closest("input[data-action='toggle-compare']");
  if (!input) {
    return;
  }
  const period = input.dataset.period;
  const id = input.dataset.id;
  if (!period || !id || !goalCompareState[period]) {
    return;
  }
  goalCompareState[period][id] = input.checked;
  renderPeriodTabs();
}

function handleGraphHover(event) {
  const svg = event.target.closest(".graph-svg");
  if (!svg) {
    hideTooltipsInList(event.currentTarget);
    return;
  }

  const frame = svg.closest(".graph-frame");
  const tooltip = frame ? frame.querySelector("[data-tooltip]") : null;
  if (!frame || !tooltip) {
    return;
  }

  const points = Array.from(svg.querySelectorAll("circle[data-point='1']"));
  if (points.length < 1) {
    tooltip.classList.add("hidden");
    return;
  }

  const rect = svg.getBoundingClientRect();
  const view = svg.viewBox.baseVal;
  if (rect.width <= 0 || rect.height <= 0 || view.width <= 0 || view.height <= 0) {
    tooltip.classList.add("hidden");
    return;
  }

  const mouseX = ((event.clientX - rect.left) / rect.width) * view.width;
  let nearest = points[0];
  let nearestDistance = Math.abs(Number(points[0].getAttribute("cx")) - mouseX);
  for (let i = 1; i < points.length; i += 1) {
    const cx = Number(points[i].getAttribute("cx"));
    const distance = Math.abs(cx - mouseX);
    if (distance < nearestDistance) {
      nearest = points[i];
      nearestDistance = distance;
    }
  }

  const cx = Number(nearest.getAttribute("cx"));
  const cy = Number(nearest.getAttribute("cy"));
  const px = (cx / view.width) * rect.width;
  const py = (cy / view.height) * rect.height;

  const dateLabel = nearest.dataset.dateLabel || "";
  const amountLabel = nearest.dataset.amount || "0";
  const cumulativeLabel = nearest.dataset.cumulative || "0";
  const seriesLabel = nearest.dataset.seriesLabel || "Current";
  tooltip.textContent = `${seriesLabel} | ${dateLabel} | Amount ${amountLabel} | Cum ${cumulativeLabel}`;
  tooltip.style.left = `${Math.min(Math.max(px, 10), rect.width - 10)}px`;
  tooltip.style.top = `${Math.max(py - 8, 8)}px`;
  tooltip.classList.remove("hidden");
}

function hideTooltipsInList(listElement) {
  listElement.querySelectorAll(".graph-tooltip").forEach((tooltip) => {
    tooltip.classList.add("hidden");
  });
}

function render() {
  renderTabs();
  renderManageGoals();
  renderEntryTab();
  renderEntryListTab();
  renderGoalScheduleTab();
  renderPeriodTabs();
}

function renderTabs() {
  tabPanels.forEach((panel) => {
    const visible = panel.dataset.tabPanel === activeTab;
    panel.hidden = !visible;
    panel.classList.toggle("active", visible);
  });

  menuButtons.forEach((button) => {
    const isActive = button.dataset.tab === activeTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  dropdowns.forEach((dropdown) => {
    const hasActive = Boolean(dropdown.querySelector(`.menu-btn[data-tab="${activeTab}"]`));
    dropdown.classList.toggle("active", hasActive);
  });
}
function renderManageGoals() {
  if (trackers.length < 1) {
    manageList.innerHTML = "";
    manageEmpty.style.display = "block";
    return;
  }

  manageEmpty.style.display = "none";
  manageList.innerHTML = trackers
    .map((tracker, index) => `
      <li class="goal-card" style="--stagger:${index}">
        <form data-action="edit-goal" data-id="${tracker.id}" class="goal-edit-form">
          <div class="form-grid form-grid-goal">
            <label>
              Name
              <input name="name" type="text" maxlength="90" value="${escapeHtml(tracker.name)}" required />
            </label>
            <label>
              Weekly
              <input name="weeklyGoal" type="number" min="1" max="1000000" value="${tracker.weeklyGoal}" required />
            </label>
            <label>
              Monthly
              <input name="monthlyGoal" type="number" min="1" max="1000000" value="${tracker.monthlyGoal}" required />
            </label>
            <label>
              Yearly
              <input name="yearlyGoal" type="number" min="1" max="1000000" value="${tracker.yearlyGoal}" required />
            </label>
          </div>
          <p class="muted small">Targets are tracked independently: week, month, year.</p>
          <div class="actions">
            <button class="btn" type="submit">Save</button>
            <button class="btn btn-danger" type="button" data-action="delete-goal" data-id="${tracker.id}">Delete</button>
          </div>
        </form>
      </li>
    `)
    .join("");
}

function renderEntryTab() {
  if (!isDateKey(entryDate.value)) {
    entryDate.value = getDateKey(normalizeDate(new Date()));
  }

  if (trackers.length < 1) {
    entryTracker.innerHTML = "<option value=''>No goals</option>";
    entryTracker.disabled = true;
    todayEntriesList.innerHTML = "";
    todayEntriesEmpty.textContent = "Create goals in Manage Goals to start entering data.";
    todayEntriesEmpty.style.display = "block";
    return;
  }

  const selected = entryTracker.value;
  entryTracker.disabled = false;
  entryTracker.innerHTML = trackers
    .map((tracker) => `<option value="${tracker.id}">${escapeHtml(tracker.name)}</option>`)
    .join("");
  if (trackers.some((tracker) => tracker.id === selected)) {
    entryTracker.value = selected;
  }

  const todayKey = getDateKey(normalizeDate(new Date()));
  const trackerById = new Map(trackers.map((tracker) => [tracker.id, tracker]));
  const todayEntries = entries
    .filter((entry) => entry.date === todayKey)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  if (todayEntries.length < 1) {
    todayEntriesList.innerHTML = "";
    todayEntriesEmpty.textContent = "No entries added today yet.";
    todayEntriesEmpty.style.display = "block";
    return;
  }

  todayEntriesEmpty.style.display = "none";
  todayEntriesList.innerHTML = todayEntries
    .map((entry, index) => {
      const tracker = trackerById.get(entry.trackerId);
      const createdAt = new Date(entry.createdAt || `${todayKey}T00:00:00`);
      const timeLabel = Number.isNaN(createdAt.getTime())
        ? "--:--"
        : createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const notes = entry.notes ? `<p class="muted small">${escapeHtml(entry.notes)}</p>` : "";
      return `
        <li class="quick-item today-entry-item" style="--stagger:${index}">
          <div>
            <strong>${escapeHtml(tracker ? tracker.name : "Unknown Goal")}</strong>
            <p class="muted small">${timeLabel} | Amount ${formatAmount(entry.amount)}</p>
            ${notes}
          </div>
        </li>
      `;
    })
    .join("");
}

function renderEntryListTab() {
  if (entryListSort) {
    entryListSort.value = entryListSortMode;
  }

  if (entries.length < 1 || trackers.length < 1) {
    entryListAll.innerHTML = "";
    entryListEmpty.style.display = "block";
    return;
  }

  const trackerNameById = new Map(trackers.map((tracker) => [tracker.id, tracker.name]));
  const sortedEntries = [...entries].sort((a, b) => {
    if (entryListSortMode === "goal_asc") {
      const nameA = (trackerNameById.get(a.trackerId) || "").toLowerCase();
      const nameB = (trackerNameById.get(b.trackerId) || "").toLowerCase();
      if (nameA !== nameB) {
        return nameA.localeCompare(nameB);
      }
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    }

    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });

  const trackerOptions = (selectedId) => trackers
    .map((tracker) => `<option value="${tracker.id}" ${tracker.id === selectedId ? "selected" : ""}>${escapeHtml(tracker.name)}</option>`)
    .join("");

  entryListEmpty.style.display = "none";
  entryListAll.innerHTML = sortedEntries
    .map((entry, index) => `
      <li class="entry-card" style="--stagger:${index}">
        <form data-action="edit-entry" data-id="${entry.id}" class="entry-edit-form">
          <div class="form-grid form-grid-entry">
            <label>
              Date
              <input name="date" type="date" value="${entry.date}" required />
            </label>
            <label>
              Goal
              <select name="trackerId">${trackerOptions(entry.trackerId)}</select>
            </label>
            <label>
              Quantity
              <input name="amount" type="number" min="0.01" step="0.01" value="${formatAmount(entry.amount)}" required />
            </label>
          </div>
          <label>
            Notes
            <textarea name="notes" rows="2" maxlength="280">${escapeHtml(entry.notes || "")}</textarea>
          </label>
          <div class="actions">
            <button class="btn" type="submit">Save Entry</button>
            <button class="btn btn-danger" type="button" data-action="delete-entry" data-id="${entry.id}">Delete</button>
          </div>
        </form>
      </li>
    `)
    .join("");
}

function renderGoalScheduleTab() {
  if (!isDateKey(scheduleDate.value)) {
    scheduleDate.value = getDateKey(normalizeDate(new Date()));
  }
  if (!isTimeKey(scheduleStartTime.value)) {
    scheduleStartTime.value = "09:00";
  }
  if (!isTimeKey(scheduleEndTime.value) || timeToMinutes(scheduleEndTime.value) <= timeToMinutes(scheduleStartTime.value)) {
    scheduleEndTime.value = addMinutesToTime(scheduleStartTime.value, 60);
  }

  const week = getWeekRange(scheduleWeekAnchor);
  const weekMode = settings.weekStart === "sunday" ? "Sun-Sat" : "Mon-Sun";
  scheduleWeekRange.textContent = `${weekMode} | ${formatDate(week.start)} to ${formatDate(week.end)}`;

  if (trackers.length < 1) {
    scheduleGoal.innerHTML = "<option value=''>No goals</option>";
    scheduleGoal.disabled = true;
    scheduleList.innerHTML = "";
    scheduleEmpty.textContent = "Create goals in Manage Goals before scheduling.";
    scheduleEmpty.style.display = "block";
    return;
  }

  const selectedGoal = scheduleGoal.value;
  scheduleGoal.disabled = false;
  scheduleGoal.innerHTML = trackers
    .map((tracker) => `<option value="${tracker.id}">${escapeHtml(tracker.name)}</option>`)
    .join("");
  if (trackers.some((tracker) => tracker.id === selectedGoal)) {
    scheduleGoal.value = selectedGoal;
  }

  const trackerById = new Map(trackers.map((tracker) => [tracker.id, tracker]));
  const weekSchedules = schedules
    .filter((item) => {
      const itemDate = parseDateKey(item.date);
      return itemDate >= week.start && itemDate <= week.end;
    })
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      const timeCompare = String(a.startTime || "").localeCompare(String(b.startTime || ""));
      if (timeCompare !== 0) {
        return timeCompare;
      }
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });

  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(week.start, index));
  const daySchedules = new Map(weekDays.map((date) => [getDateKey(date), []]));
  weekSchedules.forEach((item) => {
    if (daySchedules.has(item.date)) {
      daySchedules.get(item.date).push(item);
    }
  });

  const todayKey = getDateKey(normalizeDate(new Date()));
  const hasSchedules = weekSchedules.length > 0;
  scheduleEmpty.textContent = "No schedule items in this week.";
  scheduleEmpty.style.display = hasSchedules ? "none" : "block";
  scheduleList.innerHTML = weekDays
    .map((date, dayIndex) => {
      const dateKey = getDateKey(date);
      const items = daySchedules.get(dateKey) || [];
      const isToday = dateKey === todayKey;
      const isFlipped = Boolean(flippedScheduleDays[dateKey]);
      const dayTotalMinutes = items.reduce((total, item) => total + getScheduleMinutes(item), 0);
      const daySummaryLine = items.length > 0
        ? `${items.length} scheduled | ${formatDuration(dayTotalMinutes)} planned`
        : "No schedule items";

      const frontPreview = items.length > 0
        ? `<p class="schedule-day-preview">${escapeHtml(items.slice(0, 2).map((item) => {
            const tracker = trackerById.get(item.trackerId);
            return tracker ? tracker.name : "Unknown Goal";
          }).join(" | "))}${items.length > 2 ? " ..." : ""}</p>`
        : "";

      const itemsMarkup = items.length > 0
        ? items
          .map((item, itemIndex) => {
            const tracker = trackerById.get(item.trackerId);
            const goalName = tracker ? tracker.name : "Unknown Goal";
            const timeLabel = `${escapeHtml(item.startTime || "--:--")} - ${escapeHtml(item.endTime || "--:--")}`;
            const durationLabel = formatDuration(getScheduleMinutes(item));
            const notes = item.notes ? `<p class="muted small">${escapeHtml(item.notes)}</p>` : "";
            return `
              <article class="schedule-event" style="--stagger:${itemIndex}">
                <div class="schedule-item-top">
                  <strong class="schedule-goal-title" title="${escapeAttr(goalName)}">${escapeHtml(goalName)}</strong>
                  <button class="schedule-delete-btn" type="button" data-action="delete-schedule" data-id="${item.id}" aria-label="Delete schedule item" title="Delete">x</button>
                </div>
                <p class="muted small schedule-event-time">${timeLabel}</p>
                <p class="muted small">Duration: ${durationLabel}</p>
                ${notes}
              </article>
            `;
          })
          .join("")
        : "<p class='schedule-day-empty'>No items</p>";

      return `
        <section class="schedule-day${isToday ? " is-today" : ""}${isFlipped ? " is-flipped" : ""}" style="--stagger:${dayIndex}">
          <div class="schedule-day-inner">
            <article class="schedule-day-face schedule-day-front">
              <header class="schedule-day-head">
                <div>
                  <p class="schedule-day-label">${formatWeekday(date)}</p>
                  <p class="schedule-day-date">${formatDate(date)}${isToday ? " | Today" : ""}</p>
                </div>
                <button class="schedule-flip-btn" type="button" data-action="toggle-day-flip" data-date="${dateKey}" aria-pressed="${isFlipped ? "true" : "false"}">Details</button>
              </header>
              <div class="schedule-day-body">
                <p class="schedule-day-summary">${escapeHtml(daySummaryLine)}</p>
                ${frontPreview}
              </div>
            </article>
            <article class="schedule-day-face schedule-day-back">
              <header class="schedule-day-head">
                <div>
                  <p class="schedule-day-label">${formatWeekday(date)} Details</p>
                  <p class="schedule-day-date">${formatDate(date)}${isToday ? " | Today" : ""}</p>
                </div>
                <button class="schedule-flip-btn" type="button" data-action="toggle-day-flip" data-date="${dateKey}" aria-pressed="${isFlipped ? "true" : "false"}">Back</button>
              </header>
              <div class="schedule-day-body">
                ${itemsMarkup}
              </div>
            </article>
          </div>
        </section>
      `;
    })
    .join("");
}

function renderPeriodTabs() {
  syncGoalCompareState();

  const now = normalizeDate(new Date());
  const week = getWeekRange(now);
  const month = getMonthRange(now);
  const year = getYearRange(now);

  const weekMode = settings.weekStart === "sunday" ? "Sun-Sat" : "Mon-Sun";
  weekRangeLabel.textContent = `${weekMode} | ${formatDate(week.start)} to ${formatDate(week.end)}`;
  monthRangeLabel.textContent = `${formatDate(month.start)} to ${formatDate(month.end)}`;
  yearRangeLabel.textContent = `${year.start.getFullYear()}`;

  const index = buildEntryIndex(entries);
  renderPeriod("week", week, now, weekSummary, weekList, weekEmpty, (tracker) => tracker.weeklyGoal, index);
  renderPeriod("month", month, now, monthSummary, monthList, monthEmpty, (tracker) => tracker.monthlyGoal, index);
  renderPeriod("year", year, now, yearSummary, yearList, yearEmpty, (tracker) => tracker.yearlyGoal, index);
}

function renderPeriod(periodName, range, now, summaryEl, listEl, emptyEl, targetFn, index) {
  if (trackers.length < 1) {
    summaryEl.innerHTML = "";
    listEl.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";
  const totalDays = getRangeDays(range);
  const elapsedDays = getElapsedDays(range, now);
  const toDateRange = {
    start: new Date(range.start),
    end: addDays(range.start, elapsedDays - 1)
  };

  let totalProgress = 0;
  let totalTarget = 0;

  trackers.forEach((tracker) => {
    const periodProgress = sumTrackerRange(index, tracker.id, range);
    const goalTarget = targetFn(tracker);
    totalProgress = addAmount(totalProgress, periodProgress);
    totalTarget = addAmount(totalTarget, goalTarget);
  });

  const completion = percent(totalProgress, totalTarget);
  const avgPerDay = safeDivide(totalProgress, elapsedDays);
  const neededPerDay = safeDivide(totalTarget, totalDays);
  const projected = avgPerDay * totalDays;
  const onPace = projected >= totalTarget;

  summaryEl.innerHTML = `
    <article class="summary-card">
      <p>Total Progress</p>
      <strong>${formatAmount(totalProgress)}</strong>
    </article>
    <article class="summary-card">
      <p>Total Goal</p>
      <strong>${formatAmount(totalTarget)}</strong>
    </article>
    <article class="summary-card">
      <p>Avg Per Day</p>
      <strong>${formatAmount(avgPerDay)}</strong>
    </article>
    <article class="summary-card">
      <p>Needed/Day</p>
      <strong>${formatAmount(neededPerDay)}</strong>
    </article>
    <article class="summary-card">
      <p>On Pace</p>
      <strong class="${onPace ? "pace-on" : "pace-off"}">${onPace ? "Yes" : "No"}</strong>
    </article>
    <article class="summary-card">
      <p>Completion</p>
      <strong>${completion}%</strong>
    </article>
  `;

  listEl.innerHTML = trackers
    .map((tracker, indexPosition) => {
      const progress = sumTrackerRange(index, tracker.id, range);
      const target = targetFn(tracker);
      const pct = percent(progress, target);
      const avg = safeDivide(progress, elapsedDays);
      const needed = safeDivide(target, totalDays);
      const projectedTracker = avg * totalDays;
      const isOnPace = projectedTracker >= target;
      const isExpanded = Boolean(expandedGraphs[graphKey(periodName, tracker.id)]);
      const compareEnabled = getGoalCompareEnabled(periodName, tracker.id);
      const compareLabel = getOverlayControlLabel(periodName);
      const comparison = compareEnabled ? getPeriodComparison(periodName, range, elapsedDays) : null;

      const series = getDailySeries(index, tracker.id, range);
      const overlayRange = compareEnabled ? getOverlayRange(periodName, range) : null;
      const overlaySeries = overlayRange ? getAlignedOverlaySeries(index, tracker.id, range, overlayRange) : null;
      const graphMarkup = createCumulativeGraphSvg(series, target, range, overlaySeries, overlayRange);
      const details = getPeriodSyncDetails(periodName, tracker);

      const comparisonLine = comparison
        ? (() => {
            const currentToDate = sumTrackerRange(index, tracker.id, toDateRange);
            const previousToDate = sumTrackerRange(index, tracker.id, comparison.previousRange);
            const delta = currentToDate - previousToDate;
            return `<p class="metric-line">${comparison.shortLabel}: ${formatSignedAmount(delta)} ${formatPercentChange(currentToDate, previousToDate)}</p>`;
          })()
        : "";

      return `
        <li class="metric-card" style="--stagger:${indexPosition}">
          <div class="metric-top">
            <h3>${escapeHtml(tracker.name)}</h3>
            <div class="metric-controls">
              <label class="check-inline check-compact">
                <input type="checkbox" data-action="toggle-compare" data-period="${periodName}" data-id="${tracker.id}" ${compareEnabled ? "checked" : ""} />
                ${compareLabel}
              </label>
              <button type="button" class="btn btn-graph" data-action="toggle-graph" data-period="${periodName}" data-id="${tracker.id}">
                ${isExpanded ? "Hide Graph" : "Show Graph"}
              </button>
            </div>
          </div>
          <p class="muted small">${details}</p>
          <p class="metric-line">${formatAmount(progress)}/${formatAmount(target)} (${pct}%)</p>
          <div class="progress"><span style="width:${Math.min(pct, 100)}%"></span></div>
          <p class="metric-line">Avg/day ${formatAmount(avg)} | Needed/day ${formatAmount(needed)}</p>
          ${comparisonLine}
          <p class="pace-line">
            <span class="pace-chip ${isOnPace ? "pace-on" : "pace-off"}">${isOnPace ? "On pace" : "Off pace"}</span>
            Projected ${formatAmount(projectedTracker)}/${formatAmount(target)}
          </p>
          <div class="graph-wrap ${isExpanded ? "" : "hidden"}">
            ${graphMarkup}
          </div>
        </li>
      `;
    })
    .join("");
}
function createCumulativeGraphSvg(series, target, range, overlaySeries = null, overlayRange = null) {
  const cumulative = [];
  let running = 0;
  series.forEach((point) => {
    running = addAmount(running, point.amount);
    cumulative.push(running);
  });

  const overlayCumulative = [];
  if (overlaySeries) {
    let overlayRunning = 0;
    overlaySeries.forEach((point) => {
      overlayRunning = addAmount(overlayRunning, point.amount);
      overlayCumulative.push(overlayRunning);
    });
  }

  const pointCount = cumulative.length || 1;
  const width = 760;
  const height = 220;
  const pad = 22;
  const innerWidth = width - pad * 2;
  const innerHeight = height - pad * 2;
  const maxValue = Math.max(
    target,
    cumulative[cumulative.length - 1] || 0,
    overlayCumulative[overlayCumulative.length - 1] || 0,
    1
  );

  const toX = (index) => {
    if (pointCount === 1) {
      return pad + innerWidth / 2;
    }
    return pad + (index / (pointCount - 1)) * innerWidth;
  };
  const toY = (value) => height - pad - (value / maxValue) * innerHeight;

  const linePoints = cumulative.map((value, index) => `${toX(index).toFixed(2)},${toY(value).toFixed(2)}`).join(" ");
  const areaPoints = `${pad},${height - pad} ${linePoints} ${width - pad},${height - pad}`;
  const targetY = toY(target).toFixed(2);

  const overlayLinePoints = overlayCumulative
    .map((value, index) => `${toX(index).toFixed(2)},${toY(value).toFixed(2)}`)
    .join(" ");

  const pointDots = series.map((point, index) => {
    const cx = toX(index).toFixed(2);
    const cy = toY(cumulative[index]).toFixed(2);
    const dateLabel = formatDate(parseDateKey(point.date));
    return `
      <circle
        data-point="1"
        class="graph-point"
        cx="${cx}"
        cy="${cy}"
        r="3.4"
        data-date-label="${escapeAttr(dateLabel)}"
        data-amount="${escapeAttr(formatAmount(point.amount))}"
        data-cumulative="${escapeAttr(formatAmount(cumulative[index]))}"
        data-series-label="Current"
      ></circle>
    `;
  }).join("");

  const overlayDots = overlaySeries
    ? overlaySeries.map((point, index) => {
        const cx = toX(index).toFixed(2);
        const cy = toY(overlayCumulative[index]).toFixed(2);
        const dateLabel = formatDate(parseDateKey(point.date));
        return `
          <circle
            data-point="1"
            class="graph-point graph-point-overlay"
            cx="${cx}"
            cy="${cy}"
            r="3.2"
            data-date-label="${escapeAttr(dateLabel)}"
            data-amount="${escapeAttr(formatAmount(point.amount))}"
            data-cumulative="${escapeAttr(formatAmount(overlayCumulative[index]))}"
            data-series-label="Previous"
          ></circle>
        `;
      }).join("")
    : "";

  const overlayLegend = overlaySeries
    ? `<span class="legend-item"><span class="legend-swatch legend-overlay"></span>Previous Period</span>`
    : "";

  const overlayLabel = overlaySeries && overlayRange
    ? ` | overlay ${formatDate(overlayRange.start)} to ${formatDate(overlayRange.end)}`
    : "";

  return `
    <div class="graph-legend">
      <span class="legend-item"><span class="legend-swatch legend-line"></span>Current Cumulative</span>
      ${overlayLegend}
      <span class="legend-item"><span class="legend-swatch legend-target"></span>Target</span>
    </div>
    <div class="graph-frame">
      <svg class="graph-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Cumulative progress line graph">
        <rect x="${pad}" y="${pad}" width="${innerWidth}" height="${innerHeight}" class="graph-grid" />
        <line x1="${pad}" y1="${targetY}" x2="${width - pad}" y2="${targetY}" class="graph-target" />
        <polygon points="${areaPoints}" class="graph-area"></polygon>
        ${overlaySeries ? `<polyline points="${overlayLinePoints}" class="graph-line-overlay"></polyline>` : ""}
        <polyline points="${linePoints}" class="graph-line"></polyline>
        ${overlayDots}
        ${pointDots}
      </svg>
      <div class="graph-tooltip hidden" data-tooltip></div>
    </div>
    <p class="graph-label">${formatDate(range.start)} to ${formatDate(range.end)} | date on x-axis, cumulative amount on line${overlayLabel}</p>
  `;
}

function getPeriodComparison(periodName, range, elapsedDays) {
  if (periodName === "week") {
    const previousStart = addDays(range.start, -7);
    const previousEnd = addDays(previousStart, elapsedDays - 1);
    return {
      label: "WTD vs Last Week",
      shortLabel: "WTD vs last week",
      previousRange: { start: previousStart, end: previousEnd }
    };
  }

  if (periodName === "month") {
    const previousStart = new Date(range.start.getFullYear(), range.start.getMonth() - 1, 1);
    const previousEndOfMonth = new Date(range.start.getFullYear(), range.start.getMonth(), 0);
    const previousDays = getRangeDays({ start: previousStart, end: previousEndOfMonth });
    const compareDays = Math.min(elapsedDays, previousDays);
    return {
      label: "MTD vs Last Month",
      shortLabel: "MTD vs last month",
      previousRange: { start: previousStart, end: addDays(previousStart, compareDays - 1) }
    };
  }

  return null;
}

function getOverlayControlLabel(periodName) {
  if (periodName === "week") {
    return "Overlay last week";
  }
  if (periodName === "month") {
    return "Overlay last month";
  }
  return "Overlay last year";
}

function getGoalCompareEnabled(periodName, trackerId) {
  if (!goalCompareState[periodName]) {
    return Boolean(settings.compareToLastDefault);
  }
  if (typeof goalCompareState[periodName][trackerId] !== "boolean") {
    goalCompareState[periodName][trackerId] = Boolean(settings.compareToLastDefault);
  }
  return goalCompareState[periodName][trackerId];
}

function syncGoalCompareState() {
  const trackerIds = new Set(trackers.map((tracker) => tracker.id));
  Object.keys(goalCompareState).forEach((periodName) => {
    Object.keys(goalCompareState[periodName]).forEach((trackerId) => {
      if (!trackerIds.has(trackerId)) {
        delete goalCompareState[periodName][trackerId];
      }
    });
  });
}

function resetGoalCompareState() {
  Object.keys(goalCompareState).forEach((periodName) => {
    goalCompareState[periodName] = {};
  });
}

function getPeriodSyncDetails(periodName, tracker) {
  if (periodName === "week") {
    return `Weekly goal ${formatAmount(tracker.weeklyGoal)} | Monthly ${formatAmount(tracker.monthlyGoal)} | Yearly ${formatAmount(tracker.yearlyGoal)}.`;
  }
  if (periodName === "month") {
    return `Monthly goal ${formatAmount(tracker.monthlyGoal)} | Weekly ${formatAmount(tracker.weeklyGoal)} | Yearly ${formatAmount(tracker.yearlyGoal)}.`;
  }
  return `Yearly goal ${formatAmount(tracker.yearlyGoal)} | Monthly ${formatAmount(tracker.monthlyGoal)} | Weekly ${formatAmount(tracker.weeklyGoal)}.`;
}

function buildEntryIndex(allEntries) {
  const trackerDateTotals = new Map();
  allEntries.forEach((entry) => {
    if (!entry || !entry.trackerId || !isDateKey(entry.date)) {
      return;
    }
    const key = `${entry.trackerId}|${entry.date}`;
    const prior = trackerDateTotals.get(key) || 0;
    trackerDateTotals.set(key, addAmount(prior, Number(entry.amount || 0)));
  });
  return { trackerDateTotals };
}

function getDailySeries(index, trackerId, range) {
  const series = [];
  const current = new Date(range.start);
  while (current <= range.end) {
    const dateKey = getDateKey(current);
    const value = index.trackerDateTotals.get(`${trackerId}|${dateKey}`) || 0;
    series.push({ date: dateKey, amount: value });
    current.setDate(current.getDate() + 1);
  }
  return series;
}

function getOverlayRange(periodName, range) {
  if (periodName === "week") {
    const start = addDays(range.start, -7);
    return { start, end: addDays(start, 6) };
  }
  if (periodName === "month") {
    const start = new Date(range.start.getFullYear(), range.start.getMonth() - 1, 1);
    const end = new Date(range.start.getFullYear(), range.start.getMonth(), 0);
    return { start, end };
  }
  if (periodName === "year") {
    const start = new Date(range.start.getFullYear() - 1, 0, 1);
    const end = new Date(range.start.getFullYear() - 1, 11, 31);
    return { start, end };
  }
  return null;
}

function getAlignedOverlaySeries(index, trackerId, currentRange, overlayRange) {
  const series = [];
  const currentDays = getRangeDays(currentRange);
  const overlayDays = getRangeDays(overlayRange);

  for (let day = 0; day < currentDays; day += 1) {
    if (day < overlayDays) {
      const overlayDate = addDays(overlayRange.start, day);
      const dateKey = getDateKey(overlayDate);
      const value = index.trackerDateTotals.get(`${trackerId}|${dateKey}`) || 0;
      series.push({ date: dateKey, amount: value });
    } else {
      series.push({ date: getDateKey(addDays(currentRange.start, day)), amount: 0 });
    }
  }

  return series;
}

function sumTrackerRange(index, trackerId, range) {
  let total = 0;
  const current = new Date(range.start);
  while (current <= range.end) {
    const key = `${trackerId}|${getDateKey(current)}`;
    total = addAmount(total, index.trackerDateTotals.get(key) || 0);
    current.setDate(current.getDate() + 1);
  }
  return total;
}

function getWeekRange(date) {
  const start = normalizeDate(date);
  if (settings.weekStart === "sunday") {
    start.setDate(start.getDate() - start.getDay());
  } else {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  }
  const end = addDays(start, 6);
  return { start, end };
}

function getMonthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

function getYearRange(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear(), 11, 31);
  return { start, end };
}

function getRangeDays(range) {
  return Math.max(Math.floor((range.end - range.start) / DAY_MS) + 1, 1);
}

function getElapsedDays(range, now) {
  if (now < range.start) {
    return 1;
  }
  if (now > range.end) {
    return getRangeDays(range);
  }
  return Math.max(Math.floor((now - range.start) / DAY_MS) + 1, 1);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function initializeData() {
  const loadedTrackers = loadTrackers();
  trackers = loadedTrackers.trackers;

  settings = loadSettings();
  entries = loadEntries().filter((entry) => trackers.some((tracker) => tracker.id === entry.trackerId));
  schedules = loadSchedules().filter((item) => trackers.some((tracker) => tracker.id === item.trackerId));

  if (entries.length < 1 && loadedTrackers.legacyLogs.length > 0) {
    entries = migrateLegacyLogs(loadedTrackers.legacyLogs, trackers);
    saveEntries();
  }
}

function loadTrackers() {
  try {
    const raw = localStorage.getItem(TRACKERS_STORAGE_KEY) || localStorage.getItem(LEGACY_TRACKERS_KEY);
    if (!raw) {
      return { trackers: [], legacyLogs: [] };
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { trackers: [], legacyLogs: [] };
    }

    const loadedTrackers = [];
    const legacyLogs = [];

    parsed.forEach((item) => {
      if (!item || typeof item.id !== "string") {
        return;
      }
      const yearlyGoal = normalizePositiveInt(item.yearlyGoal, 1);
      const monthlyGoal = normalizePositiveInt(item.monthlyGoal, Math.max(Math.ceil(yearlyGoal / 12), 1));
      loadedTrackers.push({
        id: item.id,
        name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Untitled goal",
        weeklyGoal: normalizePositiveInt(item.weeklyGoal, 1),
        monthlyGoal,
        yearlyGoal
      });
      if (item.logs && typeof item.logs === "object") {
        legacyLogs.push({ trackerId: item.id, logs: item.logs });
      }
    });

    return { trackers: loadedTrackers, legacyLogs };
  } catch {
    return { trackers: [], legacyLogs: [] };
  }
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(ENTRIES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item) => item && typeof item.id === "string")
      .map((item) => ({
        id: item.id,
        trackerId: typeof item.trackerId === "string" ? item.trackerId : "",
        date: isDateKey(item.date) ? item.date : getDateKey(normalizeDate(new Date())),
        amount: normalizePositiveAmount(item.amount, 1),
        notes: typeof item.notes === "string" ? item.notes.trim() : "",
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
      }))
      .filter((item) => item.trackerId && item.amount > 0);
  } catch {
    return [];
  }
}

function loadSchedules() {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item) => item && typeof item.id === "string")
      .map((item) => {
        const legacyTime = isTimeKey(item.time) ? item.time : "09:00";
        const startTime = isTimeKey(item.startTime) ? item.startTime : legacyTime;
        const endTime = isTimeKey(item.endTime) && timeToMinutes(item.endTime) > timeToMinutes(startTime)
          ? item.endTime
          : addMinutesToTime(startTime, 60);

        return {
          id: item.id,
          trackerId: typeof item.trackerId === "string" ? item.trackerId : "",
          date: isDateKey(item.date) ? item.date : getDateKey(normalizeDate(new Date())),
          startTime,
          endTime,
          notes: typeof item.notes === "string" ? item.notes.trim() : "",
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
        };
      })
      .filter((item) => item.trackerId);
  } catch {
    return [];
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { weekStart: "monday", compareToLastDefault: true };
    }
    const parsed = JSON.parse(raw);
    return {
      weekStart: parsed && parsed.weekStart === "sunday" ? "sunday" : "monday",
      compareToLastDefault: parsed && parsed.compareToLastDefault === false ? false : true
    };
  } catch {
    return { weekStart: "monday", compareToLastDefault: true };
  }
}

function migrateLegacyLogs(legacyLogs, existingTrackers) {
  const trackerIds = new Set(existingTrackers.map((tracker) => tracker.id));
  const migrated = [];
  legacyLogs.forEach(({ trackerId, logs }) => {
    if (!trackerIds.has(trackerId) || !logs || typeof logs !== "object") {
      return;
    }
    Object.entries(logs).forEach(([date, amount]) => {
      if (!isDateKey(date)) {
        return;
      }
      const normalizedAmount = normalizePositiveAmount(amount, 0);
      if (normalizedAmount <= 0) {
        return;
      }
      migrated.push({
        id: createId(),
        trackerId,
        date,
        amount: normalizedAmount,
        notes: "",
        createdAt: new Date().toISOString()
      });
    });
  });
  return migrated.sort((a, b) => b.date.localeCompare(a.date));
}

function saveTrackers() {
  localStorage.setItem(TRACKERS_STORAGE_KEY, JSON.stringify(trackers));
}

function saveEntries() {
  localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
}

function saveSchedules() {
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
}

function saveSettings() {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function graphKey(periodName, trackerId) {
  return `${periodName}:${trackerId}`;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePositiveInt(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return fallback;
  }
  return Math.max(Math.floor(numeric), 1);
}

function normalizePositiveAmount(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.round(numeric * 100) / 100;
}

function addAmount(a, b) {
  return Math.round((Number(a) + Number(b)) * 100) / 100;
}

function percent(progress, target) {
  if (!target || target <= 0) {
    return 0;
  }
  return Math.round((progress / target) * 100);
}

function safeDivide(value, by) {
  if (!Number.isFinite(value) || !Number.isFinite(by) || by <= 0) {
    return 0;
  }
  return value / by;
}

function formatAmount(value) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatSignedAmount(value) {
  const sign = Number(value) > 0 ? "+" : "";
  return `${sign}${formatAmount(value)}`;
}

function formatPercentChange(current, previous) {
  if (!previous || previous <= 0) {
    return "(n/a)";
  }
  const change = ((current - previous) / previous) * 100;
  const sign = change > 0 ? "+" : "";
  return `(${sign}${change.toFixed(1)}%)`;
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function isTimeKey(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value));
}

function timeToMinutes(value) {
  if (!isTimeKey(value)) {
    return 0;
  }
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
}

function addMinutesToTime(value, minutesToAdd) {
  const base = timeToMinutes(value);
  const normalized = (base + minutesToAdd + (24 * 60)) % (24 * 60);
  const hour = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minute = String(normalized % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

function getScheduleMinutes(item) {
  const start = timeToMinutes(item && item.startTime);
  const end = timeToMinutes(item && item.endTime);
  return Math.max(end - start, 0);
}

function formatDuration(totalMinutes) {
  const minutes = Math.max(Number(totalMinutes) || 0, 0);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 1) {
    return `${remainder}m`;
  }
  if (remainder < 1) {
    return `${hours}h`;
  }
  return `${hours}h ${remainder}m`;
}

function resetScheduleTileFlips() {
  Object.keys(flippedScheduleDays).forEach((dateKey) => {
    delete flippedScheduleDays[dateKey];
  });
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return normalizeDate(new Date());
  }
  return date;
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatWeekday(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short"
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}
