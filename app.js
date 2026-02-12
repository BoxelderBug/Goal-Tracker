const TRACKERS_STORAGE_KEY = "goal-tracker-trackers-v3";
const ENTRIES_STORAGE_KEY = "goal-tracker-entries-v1";
const SCHEDULE_STORAGE_KEY = "goal-tracker-schedules-v1";
const SETTINGS_STORAGE_KEY = "goal-tracker-settings-v1";
const LEGACY_TRACKERS_KEY = "goal-tracker-trackers-v2";
const USERS_STORAGE_KEY = "goal-tracker-users-v1";
const SESSION_STORAGE_KEY = "goal-tracker-session-v1";
const DAY_MS = 24 * 60 * 60 * 1000;

const appShell = document.querySelector("#app-shell");
const authPanel = document.querySelector("#auth-panel");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const loginUsername = document.querySelector("#login-username");
const loginPassword = document.querySelector("#login-password");
const registerUsername = document.querySelector("#register-username");
const registerPassword = document.querySelector("#register-password");
const registerPasswordConfirm = document.querySelector("#register-password-confirm");
const authMessage = document.querySelector("#auth-message");
const logoutButton = document.querySelector("#logout-btn");
const activeUserLabel = document.querySelector("#active-user-label");

const menuButtons = document.querySelectorAll(".menu-btn");
const dropdowns = document.querySelectorAll("[data-dropdown]");
const tabPanels = document.querySelectorAll(".tab-panel");

const goalForm = document.querySelector("#goal-form");
const goalName = document.querySelector("#goal-name");
const goalUnit = document.querySelector("#goal-unit");
const goalWeekly = document.querySelector("#goal-weekly");
const goalMonthly = document.querySelector("#goal-monthly");
const goalYearly = document.querySelector("#goal-yearly");
const manageList = document.querySelector("#manage-list");
const manageEmpty = document.querySelector("#manage-empty");
const manageTable = document.querySelector("#manage-table");
const manageGoalsForm = document.querySelector("#manage-goals-form");

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
const csvUploadForm = document.querySelector("#csv-upload-form");
const csvUploadFile = document.querySelector("#csv-upload-file");
const csvUploadStatus = document.querySelector("#csv-upload-status");

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
const themeSelect = document.querySelector("#theme-select");

const weekRangeLabel = document.querySelector("#week-range");
const monthRangeLabel = document.querySelector("#month-range");
const yearRangeLabel = document.querySelector("#year-range");
const weekSummary = document.querySelector("#week-summary");
const monthSummary = document.querySelector("#month-summary");
const yearSummary = document.querySelector("#year-summary");
const weekPrevButton = document.querySelector("#week-prev");
const weekThisButton = document.querySelector("#week-this");
const weekNextButton = document.querySelector("#week-next");
const monthPrevButton = document.querySelector("#month-prev");
const monthThisButton = document.querySelector("#month-this");
const monthNextButton = document.querySelector("#month-next");
const yearPrevButton = document.querySelector("#year-prev");
const yearThisButton = document.querySelector("#year-this");
const yearNextButton = document.querySelector("#year-next");
const weekList = document.querySelector("#week-list");
const monthList = document.querySelector("#month-list");
const yearList = document.querySelector("#year-list");
const weekEmpty = document.querySelector("#week-empty");
const monthEmpty = document.querySelector("#month-empty");
const yearEmpty = document.querySelector("#year-empty");
const graphModal = document.querySelector("#graph-modal");
const graphModalBody = document.querySelector("#graph-modal-body");
const graphModalTitle = document.querySelector("#graph-modal-title");
const graphModalClose = document.querySelector("#graph-modal-close");

let trackers = [];
let entries = [];
let schedules = [];
let settings = getDefaultSettings();
let activeTab = "manage";
let entryListSortMode = "date_desc";
let scheduleWeekAnchor = normalizeDate(new Date());
let weekViewAnchor = normalizeDate(new Date());
let monthViewAnchor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let yearViewAnchor = new Date(new Date().getFullYear(), 0, 1);
let users = [];
let currentUser = null;
const goalCompareState = {
  week: {},
  month: {},
  year: {}
};
const graphPointsState = {
  week: {},
  month: {},
  year: {}
};
const inlineGraphState = {
  week: {},
  month: {},
  year: {}
};
const flippedScheduleDays = {};
const graphModalState = {
  open: false,
  period: "",
  trackerId: "",
  avgMode: "week",
  historyMetric: "avg"
};

entryDate.value = getDateKey(normalizeDate(new Date()));
scheduleDate.value = getDateKey(normalizeDate(new Date()));
if (goalUnit) {
  goalUnit.value = "units";
}
if (entryListSort) {
  entryListSort.value = entryListSortMode;
}
if (csvUploadStatus) {
  csvUploadStatus.textContent = "";
}
initializeAuth();

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!currentUser) {
      return;
    }
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

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = normalizeUsername(loginUsername.value);
  const password = String(loginPassword.value || "");
  if (!username || !password) {
    showAuthMessage("Enter username and password.", true);
    return;
  }

  const user = users.find((item) => item.usernameKey === getUsernameKey(username));
  if (!user) {
    showAuthMessage("Account not found.", true);
    return;
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.passwordHash) {
    showAuthMessage("Invalid password.", true);
    return;
  }

  currentUser = user;
  saveSessionUserId(currentUser.id);
  migrateLegacyDataToUser();
  initializeData();
  resetUiStateForLogin();
  loginForm.reset();
  showAuthMessage("");
  render();
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = normalizeUsername(registerUsername.value);
  const usernameKey = getUsernameKey(username);
  const password = String(registerPassword.value || "");
  const passwordConfirm = String(registerPasswordConfirm.value || "");
  if (username.length < 3) {
    showAuthMessage("Username must be at least 3 characters.", true);
    return;
  }
  if (password.length < 6) {
    showAuthMessage("Password must be at least 6 characters.", true);
    return;
  }
  if (password !== passwordConfirm) {
    showAuthMessage("Passwords do not match.", true);
    return;
  }
  if (users.some((item) => item.usernameKey === usernameKey)) {
    showAuthMessage("Username already exists.", true);
    return;
  }

  const newUser = {
    id: createId(),
    username,
    usernameKey,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString()
  };
  users.unshift(newUser);
  saveUsers();
  currentUser = newUser;
  saveSessionUserId(currentUser.id);
  initializeData();
  resetUiStateForLogin();
  registerForm.reset();
  showAuthMessage("");
  render();
});

logoutButton.addEventListener("click", () => {
  currentUser = null;
  clearSessionUserId();
  trackers = [];
  entries = [];
  schedules = [];
  settings = getDefaultSettings();
  activeTab = "manage";
  scheduleWeekAnchor = normalizeDate(new Date());
  resetViewAnchors();
  resetGoalCompareState();
  resetScheduleTileFlips();
  resetGraphPointsState();
  resetInlineGraphState();
  closeGraphModal();
  if (csvUploadStatus) {
    csvUploadStatus.textContent = "";
  }
  render();
});

goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser) {
    return;
  }
  const name = goalName.value.trim();
  const unit = normalizeGoalUnit(goalUnit.value);
  const weeklyGoal = normalizePositiveInt(goalWeekly.value, 1);
  const monthlyGoal = normalizePositiveInt(goalMonthly.value, 1);
  const yearlyGoal = normalizePositiveInt(goalYearly.value, 1);
  if (!name || !unit || weeklyGoal < 1 || monthlyGoal < 1 || yearlyGoal < 1) {
    return;
  }

  trackers.unshift({
    id: createId(),
    name,
    unit,
    weeklyGoal,
    monthlyGoal,
    yearlyGoal
  });

  saveTrackers();
  goalForm.reset();
  goalUnit.value = "units";
  goalWeekly.value = "5";
  goalMonthly.value = "22";
  goalYearly.value = "260";
  render();
});

if (manageGoalsForm) {
  manageGoalsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }

    const rows = Array.from(manageList.querySelectorAll("tr[data-id]"));
    if (rows.length < 1) {
      return;
    }

    const updates = new Map();
    for (const row of rows) {
      const id = row.dataset.id;
      if (!id) {
        continue;
      }

      const tracker = trackers.find((item) => item.id === id);
      if (!tracker) {
        continue;
      }

      const nameInput = row.querySelector("input[data-field='name']");
      const unitInput = row.querySelector("input[data-field='unit']");
      const weeklyInput = row.querySelector("input[data-field='weeklyGoal']");
      const monthlyInput = row.querySelector("input[data-field='monthlyGoal']");
      const yearlyInput = row.querySelector("input[data-field='yearlyGoal']");
      if (!nameInput || !unitInput || !weeklyInput || !monthlyInput || !yearlyInput) {
        continue;
      }

      const nameValue = String(nameInput.value || "").trim();
      const unitValue = normalizeGoalUnit(unitInput.value);
      if (!nameValue || !unitValue) {
        alert("Each goal needs a name and unit before saving.");
        if (!nameValue) {
          nameInput.focus();
        } else {
          unitInput.focus();
        }
        return;
      }

      updates.set(id, {
        name: nameValue,
        unit: unitValue,
        weeklyGoal: normalizePositiveInt(weeklyInput.value, tracker.weeklyGoal),
        monthlyGoal: normalizePositiveInt(monthlyInput.value, tracker.monthlyGoal),
        yearlyGoal: normalizePositiveInt(yearlyInput.value, tracker.yearlyGoal)
      });
    }

    trackers = trackers.map((tracker) => {
      const update = updates.get(tracker.id);
      if (!update) {
        return tracker;
      }
      return {
        ...tracker,
        ...update
      };
    });

    saveTrackers();
    render();
  });
}

manageList.addEventListener("click", (event) => {
  if (!currentUser) {
    return;
  }
  const button = event.target.closest("button[data-action='delete-goal']");
  if (!button) {
    return;
  }
  const id = button.dataset.id;
  const tracker = trackers.find((item) => item.id === id);
  if (!tracker) {
    return;
  }
  const confirmed = confirm(`Delete goal "${tracker.name}"? This also removes related entries and schedule items.`);
  if (!confirmed) {
    return;
  }
  trackers = trackers.filter((item) => item.id !== id);
  entries = entries.filter((entry) => entry.trackerId !== id);
  schedules = schedules.filter((item) => item.trackerId !== id);
  Object.keys(goalCompareState).forEach((periodName) => {
    delete goalCompareState[periodName][id];
  });
  Object.keys(graphPointsState).forEach((periodName) => {
    delete graphPointsState[periodName][id];
  });
  Object.keys(inlineGraphState).forEach((periodName) => {
    delete inlineGraphState[periodName][id];
  });
  if (graphModalState.trackerId === id) {
    closeGraphModal();
  }
  saveTrackers();
  saveEntries();
  saveSchedules();
  render();
});

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser) {
    return;
  }
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
  if (!currentUser) {
    return;
  }
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
  if (!currentUser) {
    return;
  }
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
  if (!currentUser) {
    return;
  }
  scheduleWeekAnchor = addDays(scheduleWeekAnchor, -7);
  resetScheduleTileFlips();
  renderGoalScheduleTab();
});

scheduleThisWeek.addEventListener("click", () => {
  if (!currentUser) {
    return;
  }
  scheduleWeekAnchor = normalizeDate(new Date());
  resetScheduleTileFlips();
  renderGoalScheduleTab();
});

scheduleNextWeek.addEventListener("click", () => {
  if (!currentUser) {
    return;
  }
  scheduleWeekAnchor = addDays(scheduleWeekAnchor, 7);
  resetScheduleTileFlips();
  renderGoalScheduleTab();
});

entryListAll.addEventListener("submit", (event) => {
  if (!currentUser) {
    return;
  }
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
  if (!currentUser) {
    return;
  }
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

if (csvUploadForm) {
  csvUploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }
    const file = csvUploadFile.files && csvUploadFile.files[0];
    if (!file) {
      csvUploadStatus.textContent = "Select a CSV file.";
      return;
    }

    let text = "";
    try {
      text = await file.text();
    } catch {
      csvUploadStatus.textContent = "Unable to read CSV file.";
      return;
    }

    const result = importEntriesFromCsv(text);
    if (result.error) {
      csvUploadStatus.textContent = result.error;
      return;
    }

    if (result.changed) {
      saveEntries();
      render();
    }
    csvUploadStatus.textContent = result.message;
    csvUploadForm.reset();
  });
}

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser) {
    return;
  }
  const priorCompareDefault = settings.compareToLastDefault;
  settings.weekStart = weekStartSelect.value === "sunday" ? "sunday" : "monday";
  settings.compareToLastDefault = compareDefaultSelect.value !== "off";
  settings.theme = normalizeThemeKey(themeSelect ? themeSelect.value : settings.theme);
  if (priorCompareDefault !== settings.compareToLastDefault) {
    resetGoalCompareState();
  }
  saveSettings();
  applyTheme();
  scheduleWeekAnchor = normalizeDate(new Date());
  resetScheduleTileFlips();
  renderGoalScheduleTab();
  renderPeriodTabs();
});

weekPrevButton.addEventListener("click", () => {
  if (!currentUser) {
    return;
  }
  weekViewAnchor = addDays(weekViewAnchor, -7);
  renderPeriodTabs();
});

weekThisButton.addEventListener("click", () => {
  if (!currentUser) {
    return;
  }
  weekViewAnchor = normalizeDate(new Date());
  renderPeriodTabs();
});

weekNextButton.addEventListener("click", () => {
  if (!currentUser) {
    return;
  }
  weekViewAnchor = addDays(weekViewAnchor, 7);
  renderPeriodTabs();
});

monthPrevButton.addEventListener("click", () => {
  if (!currentUser) {
    return;
  }
  monthViewAnchor = addMonths(monthViewAnchor, -1);
  renderPeriodTabs();
});

monthThisButton.addEventListener("click", () => {
  if (!currentUser) {
    return;
  }
  monthViewAnchor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  renderPeriodTabs();
});

monthNextButton.addEventListener("click", () => {
  if (!currentUser) {
    return;
  }
  monthViewAnchor = addMonths(monthViewAnchor, 1);
  renderPeriodTabs();
});

yearPrevButton.addEventListener("click", () => {
  if (!currentUser) {
    return;
  }
  yearViewAnchor = addYears(yearViewAnchor, -1);
  renderPeriodTabs();
});

yearThisButton.addEventListener("click", () => {
  if (!currentUser) {
    return;
  }
  yearViewAnchor = new Date(new Date().getFullYear(), 0, 1);
  renderPeriodTabs();
});

yearNextButton.addEventListener("click", () => {
  if (!currentUser) {
    return;
  }
  yearViewAnchor = addYears(yearViewAnchor, 1);
  renderPeriodTabs();
});

weekList.addEventListener("click", handleGraphCardActions);
monthList.addEventListener("click", handleGraphCardActions);
yearList.addEventListener("click", handleGraphCardActions);
[weekList, monthList, yearList].forEach((listElement) => {
  listElement.addEventListener("change", handleViewControlChange);
});

[weekList, monthList, yearList].forEach((listElement) => {
  listElement.addEventListener("mousemove", handleGraphHover);
  listElement.addEventListener("mouseleave", () => hideTooltipsInList(listElement));
});
if (graphModalBody) {
  graphModalBody.addEventListener("click", handleGraphCardActions);
  graphModalBody.addEventListener("mousemove", handleGraphHover);
  graphModalBody.addEventListener("mouseleave", () => hideTooltipsInList(graphModalBody));
}
document.addEventListener("click", (event) => {
  if (!event.target.closest(".download-menu-wrap")) {
    hideAllDownloadMenus();
  }
});

if (graphModalClose) {
  graphModalClose.addEventListener("click", () => {
    if (!currentUser) {
      return;
    }
    closeGraphModal();
    renderPeriodTabs();
  });
}
if (graphModal) {
  graphModal.addEventListener("click", (event) => {
    if (event.target.closest("[data-action='close-graph-modal']")) {
      closeGraphModal();
      if (currentUser) {
        renderPeriodTabs();
      }
    }
  });
}

function handleGraphCardActions(event) {
  if (!currentUser) {
    return;
  }

  const downloadToggleButton = event.target.closest("button[data-action='toggle-download-menu']");
  if (downloadToggleButton) {
    const menuWrap = downloadToggleButton.closest(".download-menu-wrap");
    const menu = menuWrap ? menuWrap.querySelector(".download-menu") : null;
    if (!menu) {
      return;
    }
    const shouldOpen = menu.classList.contains("hidden");
    hideAllDownloadMenus();
    menu.classList.toggle("hidden", !shouldOpen);
    return;
  }

  const downloadButton = event.target.closest("button[data-action='download-chart']");
  if (downloadButton) {
    const format = String(downloadButton.dataset.format || "").toLowerCase();
    const period = downloadButton.dataset.period;
    const id = downloadButton.dataset.id;
    const context = downloadButton.dataset.context;
    if (!format || !period || !id) {
      return;
    }
    const tracker = trackers.find((item) => item.id === id);
    if (!tracker) {
      return;
    }
    const meta = getPeriodMeta(period);
    const range = meta ? meta.range : null;
    const filename = buildChartFilename(tracker.name, period, range);
    const scope = context === "modal" ? graphModalBody : downloadButton.closest(".graph-wrap");
    const svg = scope ? scope.querySelector(".graph-svg") : null;
    if (svg) {
      downloadChartFromSvg(svg, format, filename);
    }
    hideAllDownloadMenus();
    return;
  }

  const avgModeButton = event.target.closest("button[data-action='set-avg-mode']");
  if (avgModeButton) {
    graphModalState.avgMode = normalizePeriodMode(avgModeButton.dataset.mode);
    renderGraphModal();
    return;
  }

  const historyMetricButton = event.target.closest("button[data-action='set-history-metric']");
  if (historyMetricButton) {
    graphModalState.historyMetric = normalizeHistoryMetric(historyMetricButton.dataset.metric);
    renderGraphModal();
    return;
  }

  const toggleButton = event.target.closest("button[data-action='toggle-inline-chart']");
  if (toggleButton) {
    const period = toggleButton.dataset.period;
    const id = toggleButton.dataset.id;
    if (!period || !id || !inlineGraphState[period]) {
      return;
    }
    inlineGraphState[period][id] = !getInlineGraphVisible(period, id);
    renderPeriodTabs();
    return;
  }

  const deepDiveButton = event.target.closest("button[data-action='deep-dive-graph']");
  if (!deepDiveButton) {
    return;
  }
  const period = deepDiveButton.dataset.period;
  const id = deepDiveButton.dataset.id;
  if (!period || !id) {
    return;
  }
  graphModalState.open = true;
  graphModalState.period = period;
  graphModalState.trackerId = id;
  graphModalState.avgMode = period;
  graphModalState.historyMetric = "avg";
  renderPeriodTabs();
}

function closeGraphModal() {
  graphModalState.open = false;
  graphModalState.period = "";
  graphModalState.trackerId = "";
  graphModalState.avgMode = "week";
  graphModalState.historyMetric = "avg";
  if (graphModal) {
    graphModal.classList.add("hidden");
    graphModal.setAttribute("aria-hidden", "true");
  }
}

function renderGraphModal() {
  if (!graphModal || !graphModalBody || !graphModalTitle) {
    return;
  }
  if (!currentUser || !graphModalState.open) {
    graphModal.classList.add("hidden");
    graphModal.setAttribute("aria-hidden", "true");
    return;
  }

  const tracker = trackers.find((item) => item.id === graphModalState.trackerId);
  const periodMeta = getPeriodMeta(graphModalState.period);
  if (!tracker || !periodMeta) {
    closeGraphModal();
    return;
  }

  const index = buildEntryIndex(entries);
  const range = periodMeta.range;
  const series = getDailySeries(index, tracker.id, range);
  const compareEnabled = getGoalCompareEnabled(graphModalState.period, tracker.id);
  const overlayRange = compareEnabled ? getOverlayRange(graphModalState.period, range) : null;
  const overlaySeries = overlayRange ? getAlignedOverlaySeries(index, tracker.id, range, overlayRange) : null;
  const pointsEnabled = getGraphPointsEnabled(graphModalState.period, tracker.id);
  const target = periodMeta.targetFn(tracker);

  graphModalTitle.textContent = `${tracker.name} | ${periodMeta.title} Chart`;
  graphModalBody.innerHTML = `
    <div class="graph-modal-tools">
      ${createDownloadMenuMarkup(graphModalState.period, tracker.id, "modal")}
    </div>
  `;
  graphModalBody.innerHTML += createCumulativeGraphSvg(series, target, range, overlaySeries, overlayRange, {
    showPoints: pointsEnabled,
    large: true,
    unit: tracker.unit
  });
  graphModalBody.innerHTML += createDeepDiveInsightsMarkup(
    tracker,
    graphModalState.period,
    range,
    series,
    index,
    normalizePeriodMode(graphModalState.avgMode || graphModalState.period),
    normalizeHistoryMetric(graphModalState.historyMetric)
  );
  graphModalBody.innerHTML += createExpandedTargetStatusMarkup(tracker, index, normalizeDate(new Date()));

  graphModal.classList.remove("hidden");
  graphModal.setAttribute("aria-hidden", "false");
}

function getPeriodMeta(periodName) {
  if (periodName === "week") {
    return {
      title: "Week",
      range: getWeekRange(weekViewAnchor),
      targetFn: (tracker) => tracker.weeklyGoal
    };
  }
  if (periodName === "month") {
    return {
      title: "Month",
      range: getMonthRange(monthViewAnchor),
      targetFn: (tracker) => tracker.monthlyGoal
    };
  }
  if (periodName === "year") {
    return {
      title: "Year",
      range: getYearRange(yearViewAnchor),
      targetFn: (tracker) => tracker.yearlyGoal
    };
  }
  return null;
}

function createExpandedTargetStatusMarkup(tracker, index, now) {
  const periods = ["week", "month", "year"];
  const items = periods.map((periodName) => {
    const status = getTrackerPeriodStatus(tracker, periodName, index, now);
    if (!status) {
      return "";
    }
    return `
      <article class="target-status-card">
        <div class="target-status-top">
          <h4>${escapeHtml(status.title)}</h4>
          <span class="pace-chip ${status.onPace ? "pace-on" : "pace-off"}">${status.onPace ? "On pace" : "Off pace"}</span>
        </div>
        <p class="target-status-line">${status.rangeLabel}</p>
        <p class="target-status-line">${formatAmountWithUnit(status.progress, tracker.unit)}/${formatAmountWithUnit(status.target, tracker.unit)} (${status.completion}%)</p>
        <div class="progress"><span style="width:${Math.min(status.completion, 100)}%"></span></div>
      </article>
    `;
  }).join("");

  return `
    <section class="target-status-grid-wrap">
      <h4 class="target-status-title">Week/Month/Year Target Status</h4>
      <div class="target-status-grid">${items}</div>
    </section>
  `;
}

function getTrackerPeriodStatus(tracker, periodName, index, now) {
  let range = null;
  let target = 0;
  let title = "";
  if (periodName === "week") {
    range = getWeekRange(weekViewAnchor);
    target = tracker.weeklyGoal;
    title = "Week";
  } else if (periodName === "month") {
    range = getMonthRange(monthViewAnchor);
    target = tracker.monthlyGoal;
    title = "Month";
  } else if (periodName === "year") {
    range = getYearRange(yearViewAnchor);
    target = tracker.yearlyGoal;
    title = "Year";
  } else {
    return null;
  }

  const totalDays = getRangeDays(range);
  const elapsedDays = getElapsedDays(range, now);
  const progress = sumTrackerRange(index, tracker.id, range);
  const completion = percent(progress, target);
  const avgPerDay = safeDivide(progress, elapsedDays);
  const projected = avgPerDay * totalDays;
  return {
    title,
    progress,
    target,
    completion,
    onPace: projected >= target,
    rangeLabel: `${formatDate(range.start)} to ${formatDate(range.end)}`
  };
}

function createDeepDiveInsightsMarkup(tracker, periodName, range, series, index, averageMode, historyMetric) {
  const unit = normalizeGoalUnit(tracker.unit);
  const today = normalizeDate(new Date());
  const todayKey = getDateKey(today);
  const dailyTotals = getTrackerDailyTotals(index, tracker.id);
  const bestDay = getBestDay(dailyTotals);
  const currentDayAmount = index.trackerDateTotals.get(`${tracker.id}|${todayKey}`) || 0;
  const streakStats = getStreakStats(dailyTotals, todayKey);

  const bestWeek = getBestPeriodRecord(index, tracker.id, "week");
  const bestMonth = getBestPeriodRecord(index, tracker.id, "month");
  const bestYear = getBestPeriodRecord(index, tracker.id, "year");

  const currentWeek = sumTrackerRange(index, tracker.id, getWeekRange(today));
  const currentMonth = sumTrackerRange(index, tracker.id, getMonthRange(today));
  const currentYear = sumTrackerRange(index, tracker.id, getYearRange(today));

  const selectedMode = normalizePeriodMode(averageMode || periodName);
  const selectedMetric = normalizeHistoryMetric(historyMetric);
  const averageRange = getCurrentRangeForMode(selectedMode, today);
  const history = getAverageHistoryForPeriod(tracker, selectedMode, averageRange, index, selectedMetric);
  const maxMetricValue = Math.max(...history.map((item) => item.value), 1);
  const barsMarkup = history.map((item) => {
    const heightPct = Math.max(Math.round((item.value / maxMetricValue) * 100), 2);
    const isCurrent = item.offset === 0;
    return `
      <article class="avg-bar-item${isCurrent ? " is-current" : ""}" title="${escapeAttr(item.rangeLabel)}">
        <p class="avg-bar-value">${escapeHtml(formatAmount(item.value))}</p>
        <div class="avg-bar-track"><span style="height:${heightPct}%"></span></div>
        <p class="avg-bar-label">${escapeHtml(item.label)}</p>
      </article>
    `;
  }).join("");

  const modeButtons = [
    { key: "week", label: "Weeks" },
    { key: "month", label: "Months" },
    { key: "year", label: "Years" }
  ].map((item) => `
    <button
      type="button"
      class="avg-mode-btn${selectedMode === item.key ? " active" : ""}"
      data-action="set-avg-mode"
      data-mode="${item.key}"
    >${item.label}</button>
  `).join("");

  const metricButtons = [
    { key: "avg", label: "Avg" },
    { key: "sum", label: "Sum" }
  ].map((item) => `
    <button
      type="button"
      class="avg-mode-btn${selectedMetric === item.key ? " active" : ""}"
      data-action="set-history-metric"
      data-metric="${item.key}"
    >${item.label}</button>
  `).join("");

  const bestDayText = bestDay
    ? `${formatAmountWithUnit(bestDay.amount, unit)} on ${formatDate(parseDateKey(bestDay.date))}`
    : "No non-zero day";
  const currentDayText = `${formatAmountWithUnit(currentDayAmount, unit)} on ${formatDate(today)}`;

  const longestStreakText = formatStreakLabel(streakStats.longest);
  const currentStreakText = formatStreakLabel(streakStats.current);
  const currentWeekLabel = getPeriodRecordLabel("week", getWeekRange(today));
  const currentMonthLabel = getPeriodRecordLabel("month", getMonthRange(today));
  const currentYearLabel = getPeriodRecordLabel("year", getYearRange(today));
  const historyTitle = selectedMetric === "sum" ? "Sum vs last 5 periods" : "Average/day vs last 5 periods";

  return `
    <section class="deep-dive-insights">
      <h4 class="target-status-title">Deep Dive Insights</h4>
      <div class="deep-dive-grid">
        <article class="deep-dive-card">
          <div class="best-kpi-item">
            <p class="best-kpi-current"><strong>Current Day</strong>: ${escapeHtml(currentDayText)}</p>
            <p class="best-kpi-best">Best Day: ${escapeHtml(bestDayText)}</p>
          </div>
          <div class="best-kpi-item">
            <p class="best-kpi-current"><strong>Current Streak</strong>: ${escapeHtml(currentStreakText)}</p>
            <p class="best-kpi-best">Best Streak: ${escapeHtml(longestStreakText)}</p>
          </div>
          <div class="best-kpi-item">
            <p class="best-kpi-current"><strong>Current Week</strong>: ${escapeHtml(formatCurrentPeriodText(currentWeek, unit, currentWeekLabel))}</p>
            <p class="best-kpi-best">Best Week: ${escapeHtml(formatBestPeriodText(bestWeek, unit))}</p>
          </div>
          <div class="best-kpi-item">
            <p class="best-kpi-current"><strong>Current Month</strong>: ${escapeHtml(formatCurrentPeriodText(currentMonth, unit, currentMonthLabel))}</p>
            <p class="best-kpi-best">Best Month: ${escapeHtml(formatBestPeriodText(bestMonth, unit))}</p>
          </div>
          <div class="best-kpi-item">
            <p class="best-kpi-current"><strong>Current Year</strong>: ${escapeHtml(formatCurrentPeriodText(currentYear, unit, currentYearLabel))}</p>
            <p class="best-kpi-best">Best Year: ${escapeHtml(formatBestPeriodText(bestYear, unit))}</p>
          </div>
        </article>
        <article class="deep-dive-card">
          <p class="target-status-line"><strong>${escapeHtml(historyTitle)}</strong> (${escapeHtml(unit)})</p>
          <div class="avg-controls-row">
            <div class="avg-mode-toggle">${modeButtons}</div>
            <div class="avg-mode-toggle avg-mode-toggle-right">${metricButtons}</div>
          </div>
          <div class="avg-bars">${barsMarkup}</div>
        </article>
      </div>
    </section>
  `;
}

function normalizePeriodMode(value) {
  if (value === "month" || value === "year") {
    return value;
  }
  return "week";
}

function normalizeHistoryMetric(value) {
  if (value === "sum") {
    return "sum";
  }
  return "avg";
}

function getCurrentRangeForMode(mode, date) {
  if (mode === "month") {
    return getMonthRange(date);
  }
  if (mode === "year") {
    return getYearRange(date);
  }
  return getWeekRange(date);
}

function getTrackerDailyTotals(index, trackerId) {
  const prefix = `${trackerId}|`;
  const totals = [];
  index.trackerDateTotals.forEach((amount, key) => {
    if (!String(key).startsWith(prefix)) {
      return;
    }
    const date = String(key).slice(prefix.length);
    if (!isDateKey(date)) {
      return;
    }
    totals.push({
      date,
      amount: Number(amount) || 0
    });
  });
  totals.sort((a, b) => a.date.localeCompare(b.date));
  return totals;
}

function getBestDay(dailyTotals) {
  let best = null;
  dailyTotals.forEach((point) => {
    if (point.amount <= 0) {
      return;
    }
    if (!best || point.amount > best.amount) {
      best = point;
    }
  });
  return best;
}

function getStreakStats(dailyTotals, todayKey) {
  const positiveDates = dailyTotals
    .filter((point) => point.amount > 0)
    .map((point) => point.date)
    .sort((a, b) => a.localeCompare(b));
  const positiveSet = new Set(positiveDates);

  let longest = { length: 0, startDate: "", endDate: "" };
  let runLength = 0;
  let runStart = "";
  let runEnd = "";

  positiveDates.forEach((date, index) => {
    if (runLength === 0) {
      runLength = 1;
      runStart = date;
      runEnd = date;
    } else {
      const prevDate = positiveDates[index - 1];
      const isNextDay = getDateKey(addDays(parseDateKey(prevDate), 1)) === date;
      if (isNextDay) {
        runLength += 1;
        runEnd = date;
      } else {
        if (runLength > longest.length) {
          longest = { length: runLength, startDate: runStart, endDate: runEnd };
        }
        runLength = 1;
        runStart = date;
        runEnd = date;
      }
    }
  });
  if (runLength > longest.length) {
    longest = { length: runLength, startDate: runStart, endDate: runEnd };
  }

  const current = { length: 0, startDate: "", endDate: "" };
  if (positiveSet.has(todayKey)) {
    let cursor = todayKey;
    current.endDate = todayKey;
    while (positiveSet.has(cursor)) {
      current.length += 1;
      current.startDate = cursor;
      cursor = getDateKey(addDays(parseDateKey(cursor), -1));
    }
  }

  return { longest, current };
}

function formatStreakLabel(streak) {
  if (!streak || streak.length < 1) {
    return "0 day(s)";
  }
  return `${streak.length} day(s) | ${formatDate(parseDateKey(streak.startDate))} to ${formatDate(parseDateKey(streak.endDate))}`;
}

function getBestPeriodRecord(index, trackerId, periodName) {
  const buckets = aggregatePeriodBuckets(index, trackerId, periodName);
  if (buckets.length < 1) {
    return null;
  }
  return buckets.reduce((best, current) => (current.total > best.total ? current : best), buckets[0]);
}

function aggregatePeriodBuckets(index, trackerId, periodName) {
  const dailyTotals = getTrackerDailyTotals(index, trackerId);
  const buckets = new Map();
  dailyTotals.forEach((item) => {
    const date = parseDateKey(item.date);
    const range = getCurrentRangeForMode(periodName, date);
    const key = getDateKey(range.start);
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        total: 0,
        range,
        label: getPeriodRecordLabel(periodName, range)
      });
    }
    const bucket = buckets.get(key);
    bucket.total = addAmount(bucket.total, item.amount);
  });
  return Array.from(buckets.values()).sort((a, b) => a.range.start - b.range.start);
}

function getPeriodRecordLabel(periodName, range) {
  if (periodName === "year") {
    return String(range.start.getFullYear());
  }
  if (periodName === "month") {
    return range.start.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }
  return `${formatDate(range.start)} to ${formatDate(range.end)}`;
}

function formatBestPeriodText(record, unit) {
  if (!record) {
    return "No data";
  }
  return `${formatAmountWithUnit(record.total, unit)} | ${record.label}`;
}

function formatCurrentPeriodText(total, unit, label) {
  return `${formatAmountWithUnit(total, unit)} | ${label}`;
}

function getAverageHistoryForPeriod(tracker, periodName, currentRange, index, metricType = "avg") {
  const selectedMetric = normalizeHistoryMetric(metricType);
  const history = [];
  const firstEntryDate = getTrackerFirstEntryDate(tracker.id);
  for (let offset = 0; offset <= 5; offset += 1) {
    const range = shiftPeriodRange(periodName, currentRange, offset);
    if (offset > 0) {
      if (!firstEntryDate || range.end < firstEntryDate) {
        break;
      }
    }
    const total = sumTrackerRange(index, tracker.id, range);
    const days = getRangeDays(range);
    const value = selectedMetric === "sum" ? total : safeDivide(total, days);
    history.push({
      offset,
      value,
      label: getAverageBarLabel(periodName, offset),
      rangeLabel: `${formatDate(range.start)} to ${formatDate(range.end)}`
    });
  }
  return history;
}

function getTrackerFirstEntryDate(trackerId) {
  const trackerEntries = entries
    .filter((entry) => entry && entry.trackerId === trackerId && isDateKey(entry.date))
    .map((entry) => parseDateKey(entry.date));
  if (trackerEntries.length < 1) {
    return null;
  }
  trackerEntries.sort((a, b) => a - b);
  return trackerEntries[0];
}

function shiftPeriodRange(periodName, currentRange, offset) {
  if (periodName === "week") {
    const start = addDays(currentRange.start, -7 * offset);
    return { start, end: addDays(start, 6) };
  }
  if (periodName === "month") {
    const start = new Date(currentRange.start.getFullYear(), currentRange.start.getMonth() - offset, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { start, end };
  }
  const start = new Date(currentRange.start.getFullYear() - offset, 0, 1);
  const end = new Date(start.getFullYear(), 11, 31);
  return { start, end };
}

function getAverageBarLabel(periodName, offset) {
  if (offset === 0) {
    return "Current";
  }
  if (periodName === "week") {
    return `W-${offset}`;
  }
  if (periodName === "month") {
    return `M-${offset}`;
  }
  return `Y-${offset}`;
}

function handleViewControlChange(event) {
  if (!currentUser) {
    return;
  }

  const input = event.target.closest("input[data-action='toggle-compare']");
  if (input) {
    const period = input.dataset.period;
    const id = input.dataset.id;
    if (!period || !id || !goalCompareState[period]) {
      return;
    }
    goalCompareState[period][id] = input.checked;
    renderPeriodTabs();
    renderGraphModal();
    return;
  }

  const pointsInput = event.target.closest("input[data-action='toggle-points']");
  if (pointsInput) {
    const period = pointsInput.dataset.period;
    const id = pointsInput.dataset.id;
    if (!period || !id || !graphPointsState[period]) {
      return;
    }
    graphPointsState[period][id] = pointsInput.checked;
    renderPeriodTabs();
    renderGraphModal();
    return;
  }
}

function handleGraphHover(event) {
  if (!currentUser) {
    return;
  }
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
  const unitLabel = nearest.dataset.unit ? ` ${nearest.dataset.unit}` : "";
  const seriesLabel = nearest.dataset.seriesLabel || "Current";
  tooltip.textContent = `${seriesLabel} | ${dateLabel} | Amount ${amountLabel}${unitLabel} | Cum ${cumulativeLabel}${unitLabel}`;
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
  applyTheme();
  renderAuthState();
  if (!currentUser) {
    return;
  }
  renderTabs();
  renderManageGoals();
  renderEntryTab();
  renderEntryListTab();
  renderGoalScheduleTab();
  renderPeriodTabs();
}

function renderTabs() {
  if (!currentUser) {
    return;
  }
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

function renderAuthState() {
  const isAuthenticated = Boolean(currentUser);
  appShell.hidden = !isAuthenticated;
  authPanel.hidden = isAuthenticated;
  activeUserLabel.textContent = isAuthenticated ? `Signed in as ${currentUser.username}` : "";
  if (isAuthenticated) {
    showAuthMessage("");
  } else if (graphModal) {
    graphModal.classList.add("hidden");
    graphModal.setAttribute("aria-hidden", "true");
  }
}

function renderManageGoals() {
  if (!currentUser) {
    manageList.innerHTML = "";
    manageEmpty.style.display = "none";
    if (manageGoalsForm) {
      manageGoalsForm.style.display = "none";
    }
    if (manageTable) {
      manageTable.style.display = "none";
    }
    return;
  }

  if (trackers.length < 1) {
    manageList.innerHTML = "";
    manageEmpty.style.display = "block";
    if (manageGoalsForm) {
      manageGoalsForm.style.display = "none";
    }
    if (manageTable) {
      manageTable.style.display = "none";
    }
    return;
  }

  manageEmpty.style.display = "none";
  if (manageGoalsForm) {
    manageGoalsForm.style.display = "block";
  }
  if (manageTable) {
    manageTable.style.display = "table";
  }
  manageList.innerHTML = trackers
    .map((tracker, index) => `
      <tr class="goal-row" style="--stagger:${index}" data-id="${tracker.id}">
        <td>
          <input data-field="name" type="text" maxlength="90" value="${escapeHtml(tracker.name)}" required />
        </td>
        <td>
          <input data-field="unit" type="text" maxlength="20" value="${escapeHtml(tracker.unit || "units")}" required />
        </td>
        <td>
          <input data-field="weeklyGoal" type="number" min="1" max="1000000" value="${tracker.weeklyGoal}" required />
        </td>
        <td>
          <input data-field="monthlyGoal" type="number" min="1" max="1000000" value="${tracker.monthlyGoal}" required />
        </td>
        <td>
          <input data-field="yearlyGoal" type="number" min="1" max="1000000" value="${tracker.yearlyGoal}" required />
        </td>
        <td class="goal-actions-cell">
          <div class="actions actions-inline">
            <button class="btn btn-danger" type="button" data-action="delete-goal" data-id="${tracker.id}">Delete</button>
          </div>
        </td>
      </tr>
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
    .map((tracker) => `<option value="${tracker.id}">${escapeHtml(tracker.name)} (${escapeHtml(tracker.unit || "units")})</option>`)
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
                <button class="schedule-peel-btn" type="button" data-action="toggle-day-flip" data-date="${dateKey}" aria-pressed="${isFlipped ? "true" : "false"}" aria-label="Flip day card">
                  <span class="visually-hidden">Flip day card</span>
                </button>
              </header>
              <div class="schedule-day-body">
                <p class="schedule-day-summary">${escapeHtml(daySummaryLine)}</p>
                ${frontPreview}
              </div>
            </article>
            <article class="schedule-day-face schedule-day-back">
              <header class="schedule-day-head">
                <div>
                  <p class="schedule-day-label">${formatWeekday(date)}</p>
                  <p class="schedule-day-date">${formatDate(date)}${isToday ? " | Today" : ""}</p>
                </div>
                <button class="schedule-peel-btn" type="button" data-action="toggle-day-flip" data-date="${dateKey}" aria-pressed="${isFlipped ? "true" : "false"}" aria-label="Flip day card">
                  <span class="visually-hidden">Flip day card</span>
                </button>
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
  const week = getWeekRange(weekViewAnchor);
  const month = getMonthRange(monthViewAnchor);
  const year = getYearRange(yearViewAnchor);

  const weekMode = settings.weekStart === "sunday" ? "Sun-Sat" : "Mon-Sun";
  weekRangeLabel.textContent = `${weekMode} | ${formatDate(week.start)} to ${formatDate(week.end)}`;
  monthRangeLabel.textContent = `${formatDate(month.start)} to ${formatDate(month.end)}`;
  yearRangeLabel.textContent = `${year.start.getFullYear()}`;

  const index = buildEntryIndex(entries);
  renderPeriod("week", week, now, weekSummary, weekList, weekEmpty, (tracker) => tracker.weeklyGoal, index);
  renderPeriod("month", month, now, monthSummary, monthList, monthEmpty, (tracker) => tracker.monthlyGoal, index);
  renderPeriod("year", year, now, yearSummary, yearList, yearEmpty, (tracker) => tracker.yearlyGoal, index);
  renderGraphModal();
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
  const projected = avgPerDay * totalDays;
  const onPace = projected >= totalTarget;

  summaryEl.innerHTML = `
    <article class="summary-card">
      <p>Completion</p>
      <strong>${completion}%</strong>
    </article>
    <article class="summary-card">
      <p>On Pace</p>
      <strong class="${onPace ? "pace-on" : "pace-off"}">${onPace ? "Yes" : "No"}</strong>
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
      const compareEnabled = getGoalCompareEnabled(periodName, tracker.id);
      const pointsEnabled = getGraphPointsEnabled(periodName, tracker.id);
      const graphVisible = getInlineGraphVisible(periodName, tracker.id);
      const compareLabel = getOverlayControlLabel(periodName);
      const comparison = compareEnabled ? getPeriodComparison(periodName, range, elapsedDays) : null;

      let graphMarkup = "";
      if (graphVisible) {
        const series = getDailySeries(index, tracker.id, range);
        const overlayRange = compareEnabled ? getOverlayRange(periodName, range) : null;
        const overlaySeries = overlayRange ? getAlignedOverlaySeries(index, tracker.id, range, overlayRange) : null;
        graphMarkup = createCumulativeGraphSvg(series, target, range, overlaySeries, overlayRange, {
          showPoints: pointsEnabled,
          large: false,
          unit: tracker.unit
        });
      }

      const comparisonLine = comparison
        ? (() => {
            const currentToDate = sumTrackerRange(index, tracker.id, toDateRange);
            const previousToDate = sumTrackerRange(index, tracker.id, comparison.previousRange);
            const delta = currentToDate - previousToDate;
            return `<p class="metric-line">${comparison.shortLabel}: ${formatSignedAmountWithUnit(delta, tracker.unit)} ${formatPercentChange(currentToDate, previousToDate)}</p>`;
          })()
        : "";

      return `
        <li class="metric-card" style="--stagger:${indexPosition}">
          <div class="metric-top">
            <h3>${escapeHtml(tracker.name)}</h3>
            <div class="metric-controls">
              <label class="check-inline check-compact compare-control">
                <input type="checkbox" data-action="toggle-compare" data-period="${periodName}" data-id="${tracker.id}" ${compareEnabled ? "checked" : ""} />
                ${compareLabel}
              </label>
            </div>
          </div>
          <p class="metric-line">${formatAmountWithUnit(progress, tracker.unit)}/${formatAmountWithUnit(target, tracker.unit)} (${pct}%)</p>
          <div class="progress"><span style="width:${Math.min(pct, 100)}%"></span></div>
          <p class="metric-line">Avg/day ${formatAmountWithUnit(avg, tracker.unit)} | Needed/day ${formatAmountWithUnit(needed, tracker.unit)}</p>
          ${comparisonLine}
          <p class="pace-line">
            <span class="pace-chip ${isOnPace ? "pace-on" : "pace-off"}">${isOnPace ? "On pace" : "Off pace"}</span>
            Projected ${formatAmountWithUnit(projectedTracker, tracker.unit)}/${formatAmountWithUnit(target, tracker.unit)}
          </p>
          <div class="graph-wrap ${graphVisible ? "" : "hidden"}">
            ${graphMarkup}
            <div class="graph-inline-controls graph-inline-controls-bottom">
              <label class="check-inline check-compact graph-check">
                <input type="checkbox" data-action="toggle-points" data-period="${periodName}" data-id="${tracker.id}" ${pointsEnabled ? "checked" : ""} />
                Show points
              </label>
              <div class="graph-action-group">
                ${createDownloadMenuMarkup(periodName, tracker.id, "inline")}
              </div>
            </div>
          </div>
          <div class="metric-footer-actions">
            <button type="button" class="btn btn-graph" data-action="deep-dive-graph" data-period="${periodName}" data-id="${tracker.id}">Deep Dive</button>
            <button
              type="button"
              class="btn btn-icon"
              data-action="toggle-inline-chart"
              data-period="${periodName}"
              data-id="${tracker.id}"
              aria-expanded="${graphVisible ? "true" : "false"}"
              aria-label="${graphVisible ? "Hide chart" : "Show chart"}"
              title="${graphVisible ? "Hide chart" : "Show chart"}"
            >${graphVisible ? "-" : "+"}</button>
          </div>
        </li>
      `;
    })
    .join("");
}

function createDownloadMenuMarkup(periodName, trackerId, context) {
  return `
    <div class="download-menu-wrap">
      <button type="button" class="btn btn-graph" data-action="toggle-download-menu">Download</button>
      <div class="download-menu hidden" role="menu" aria-label="Download chart as">
        <button type="button" class="download-menu-btn" data-action="download-chart" data-format="png" data-period="${periodName}" data-id="${trackerId}" data-context="${context}">PNG</button>
        <button type="button" class="download-menu-btn" data-action="download-chart" data-format="svg" data-period="${periodName}" data-id="${trackerId}" data-context="${context}">SVG</button>
        <button type="button" class="download-menu-btn" data-action="download-chart" data-format="webp" data-period="${periodName}" data-id="${trackerId}" data-context="${context}">WEBP</button>
      </div>
    </div>
  `;
}

function hideAllDownloadMenus() {
  document.querySelectorAll(".download-menu").forEach((menu) => {
    menu.classList.add("hidden");
  });
}

function buildChartFilename(goalName, periodName, range) {
  const cleanGoal = String(goalName || "goal")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "goal";
  const cleanPeriod = String(periodName || "period").toLowerCase().replace(/[^a-z0-9]+/g, "") || "period";
  const rangePart = range ? `${getDateKey(range.start)}-to-${getDateKey(range.end)}` : getDateKey(normalizeDate(new Date()));
  return `${cleanGoal}-${cleanPeriod}-${rangePart}`;
}

function downloadChartFromSvg(svgElement, format, filenameBase) {
  const svgMarkup = createSvgMarkup(svgElement);
  if (format === "svg") {
    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    triggerBlobDownload(blob, `${filenameBase}.svg`);
    return;
  }

  if (format === "png" || format === "webp") {
    rasterizeAndDownload(svgMarkup, svgElement, format, filenameBase);
  }
}

function createSvgMarkup(svgElement) {
  const clone = svgElement.cloneNode(true);
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  if (!clone.getAttribute("xmlns:xlink")) {
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}`;
}

function rasterizeAndDownload(svgMarkup, svgElement, format, filenameBase) {
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  const image = new Image();
  image.onload = () => {
    const view = svgElement.viewBox && svgElement.viewBox.baseVal ? svgElement.viewBox.baseVal : null;
    const width = Math.max(Math.round(view && view.width ? view.width : svgElement.clientWidth || 800), 1);
    const height = Math.max(Math.round(view && view.height ? view.height : svgElement.clientHeight || 400), 1);
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(svgUrl);
      return;
    }
    context.scale(scale, scale);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(svgUrl);

    const mimeType = format === "webp" ? "image/webp" : "image/png";
    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      triggerBlobDownload(blob, `${filenameBase}.${format}`);
    }, mimeType, 0.95);
  };
  image.onerror = () => {
    URL.revokeObjectURL(svgUrl);
  };
  image.src = svgUrl;
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
function createCumulativeGraphSvg(series, target, range, overlaySeries = null, overlayRange = null, options = {}) {
  const showPoints = Boolean(options.showPoints);
  const large = Boolean(options.large);
  const unit = normalizeGoalUnit(options.unit);
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
  const width = large ? 1080 : 760;
  const height = large ? 420 : 220;
  const padLeft = large ? 74 : 58;
  const padRight = large ? 24 : 20;
  const padTop = 20;
  const padBottom = large ? 64 : 48;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const axisY = height - padBottom;
  const maxValue = Math.max(
    target,
    cumulative[cumulative.length - 1] || 0,
    overlayCumulative[overlayCumulative.length - 1] || 0,
    1
  );

  const toX = (index) => {
    if (pointCount === 1) {
      return padLeft + innerWidth / 2;
    }
    return padLeft + (index / (pointCount - 1)) * innerWidth;
  };
  const toY = (value) => axisY - (value / maxValue) * innerHeight;

  const linePoints = cumulative.map((value, index) => `${toX(index).toFixed(2)},${toY(value).toFixed(2)}`).join(" ");
  const areaPoints = `${padLeft},${axisY} ${linePoints} ${width - padRight},${axisY}`;
  const targetY = toY(target).toFixed(2);

  const overlayLinePoints = overlayCumulative
    .map((value, index) => `${toX(index).toFixed(2)},${toY(value).toFixed(2)}`)
    .join(" ");

  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, index) => (maxValue * index) / yTickCount);
  const yTickMarkup = yTicks.map((value) => {
    const y = toY(value).toFixed(2);
    return `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="graph-grid-line" />
      <text x="${padLeft - 8}" y="${y}" class="graph-tick graph-tick-y">${escapeHtml(formatAmount(value))}</text>
    `;
  }).join("");

  const xTickIndexes = Array.from(new Set([0, Math.floor((pointCount - 1) / 2), pointCount - 1]))
    .filter((value) => value >= 0)
    .sort((a, b) => a - b);
  const xTickMarkup = xTickIndexes.map((index) => {
    const x = toX(index).toFixed(2);
    return `
      <line x1="${x}" y1="${axisY}" x2="${x}" y2="${axisY + 6}" class="graph-axis" />
      <text x="${x}" y="${axisY + 20}" class="graph-tick graph-tick-x">${escapeHtml(`${index + 1}d`)}</text>
    `;
  }).join("");

  const pointDots = showPoints
    ? series.map((point, index) => {
        const cx = toX(index).toFixed(2);
        const cy = toY(cumulative[index]).toFixed(2);
        const dateLabel = formatDate(parseDateKey(point.date));
        return `
          <circle
            data-point="1"
            class="graph-point"
            cx="${cx}"
            cy="${cy}"
            r="${large ? "3.8" : "3.4"}"
            data-date-label="${escapeAttr(dateLabel)}"
            data-amount="${escapeAttr(formatAmount(point.amount))}"
            data-cumulative="${escapeAttr(formatAmount(cumulative[index]))}"
            data-series-label="Current"
            data-unit="${escapeAttr(unit)}"
          ></circle>
        `;
      }).join("")
    : "";

  const overlayDots = overlaySeries && showPoints
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
            r="${large ? "3.6" : "3.2"}"
            data-date-label="${escapeAttr(dateLabel)}"
            data-amount="${escapeAttr(formatAmount(point.amount))}"
            data-cumulative="${escapeAttr(formatAmount(overlayCumulative[index]))}"
            data-series-label="Previous"
            data-unit="${escapeAttr(unit)}"
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
      <svg class="graph-svg${large ? " graph-svg-large" : ""}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cumulative progress line graph">
        <rect x="${padLeft}" y="${padTop}" width="${innerWidth}" height="${innerHeight}" class="graph-grid" />
        ${yTickMarkup}
        <line x1="${padLeft}" y1="${targetY}" x2="${width - padRight}" y2="${targetY}" class="graph-target" />
        <line x1="${padLeft}" y1="${axisY}" x2="${width - padRight}" y2="${axisY}" class="graph-axis" />
        <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${axisY}" class="graph-axis" />
        ${xTickMarkup}
        <text x="${padLeft + innerWidth / 2}" y="${height - 12}" class="graph-axis-label graph-axis-label-x">Days (d)</text>
        <text x="16" y="${padTop + innerHeight / 2}" class="graph-axis-label graph-axis-label-y" transform="rotate(-90 16 ${padTop + innerHeight / 2})">${escapeHtml(`Amount (${unit})`)}</text>
        <polygon points="${areaPoints}" class="graph-area"></polygon>
        ${overlaySeries ? `<polyline points="${overlayLinePoints}" class="graph-line-overlay"></polyline>` : ""}
        <polyline points="${linePoints}" class="graph-line"></polyline>
        ${overlayDots}
        ${pointDots}
      </svg>
      <div class="graph-tooltip hidden" data-tooltip></div>
    </div>
    <p class="graph-label">${formatDate(range.start)} to ${formatDate(range.end)} | x-axis days (d), y-axis amount (${escapeHtml(unit)})${overlayLabel}</p>
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
    return "Comp Last Wk";
  }
  if (periodName === "month") {
    return "Comp Last Mo";
  }
  return "Comp Last Yr";
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

function getGraphPointsEnabled(periodName, trackerId) {
  if (!graphPointsState[periodName]) {
    return false;
  }
  if (typeof graphPointsState[periodName][trackerId] !== "boolean") {
    graphPointsState[periodName][trackerId] = false;
  }
  return graphPointsState[periodName][trackerId];
}

function getInlineGraphVisible(periodName, trackerId) {
  if (!inlineGraphState[periodName]) {
    return false;
  }
  if (typeof inlineGraphState[periodName][trackerId] !== "boolean") {
    inlineGraphState[periodName][trackerId] = false;
  }
  return inlineGraphState[periodName][trackerId];
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
  Object.keys(graphPointsState).forEach((periodName) => {
    Object.keys(graphPointsState[periodName]).forEach((trackerId) => {
      if (!trackerIds.has(trackerId)) {
        delete graphPointsState[periodName][trackerId];
      }
    });
  });
  Object.keys(inlineGraphState).forEach((periodName) => {
    Object.keys(inlineGraphState[periodName]).forEach((trackerId) => {
      if (!trackerIds.has(trackerId)) {
        delete inlineGraphState[periodName][trackerId];
      }
    });
  });
}

function resetGoalCompareState() {
  Object.keys(goalCompareState).forEach((periodName) => {
    goalCompareState[periodName] = {};
  });
}

function resetGraphPointsState() {
  Object.keys(graphPointsState).forEach((periodName) => {
    graphPointsState[periodName] = {};
  });
}

function resetInlineGraphState() {
  Object.keys(inlineGraphState).forEach((periodName) => {
    inlineGraphState[periodName] = {};
  });
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

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addYears(date, years) {
  return new Date(date.getFullYear() + years, 0, 1);
}

function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function initializeAuth() {
  users = loadUsers();
  const sessionUserId = loadSessionUserId();
  currentUser = users.find((user) => user.id === sessionUserId) || null;
  if (sessionUserId && !currentUser) {
    clearSessionUserId();
  }
  if (!currentUser) {
    settings = getDefaultSettings();
    render();
    return;
  }

  migrateLegacyDataToUser();
  initializeData();
  resetUiStateForLogin();
  render();
}

function resetUiStateForLogin() {
  activeTab = "manage";
  scheduleWeekAnchor = normalizeDate(new Date());
  resetViewAnchors();
  resetGoalCompareState();
  resetScheduleTileFlips();
  resetGraphPointsState();
  resetInlineGraphState();
  closeGraphModal();
  weekStartSelect.value = settings.weekStart;
  compareDefaultSelect.value = settings.compareToLastDefault ? "on" : "off";
  if (themeSelect) {
    themeSelect.value = normalizeThemeKey(settings.theme);
  }
  applyTheme();
  if (goalUnit) {
    goalUnit.value = "units";
  }
  if (csvUploadStatus) {
    csvUploadStatus.textContent = "";
  }
}

function resetViewAnchors() {
  const now = new Date();
  weekViewAnchor = normalizeDate(now);
  monthViewAnchor = new Date(now.getFullYear(), now.getMonth(), 1);
  yearViewAnchor = new Date(now.getFullYear(), 0, 1);
}

function importEntriesFromCsv(text) {
  if (!currentUser) {
    return { error: "Sign in before importing CSV.", changed: false, message: "" };
  }

  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    return { error: "CSV requires a header row and at least one data row.", changed: false, message: "" };
  }

  const headers = rows[0].map((cell) => String(cell || "").trim());
  if (headers.length < 2) {
    return { error: "CSV must include Date plus at least one goal column.", changed: false, message: "" };
  }
  if (getUsernameKey(headers[0]) !== "date") {
    return { error: "Column A header must be Date.", changed: false, message: "" };
  }

  const trackerByName = new Map(trackers.map((tracker) => [getUsernameKey(tracker.name), tracker]));
  const mappedColumns = [];
  let ignoredGoalColumns = 0;

  for (let index = 1; index < headers.length; index += 1) {
    const headerName = headers[index];
    const tracker = trackerByName.get(getUsernameKey(headerName));
    if (tracker) {
      mappedColumns.push({ index, tracker });
    } else if (headerName) {
      ignoredGoalColumns += 1;
    }
  }

  if (mappedColumns.length < 1) {
    return { error: "No goal headers matched existing goals in Manage Goals.", changed: false, message: "" };
  }

  const replacementValues = new Map();
  let skippedRows = 0;

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row || row.every((cell) => !String(cell || "").trim())) {
      continue;
    }

    const dateKey = parseCsvDateToKey(row[0]);
    if (!dateKey) {
      skippedRows += 1;
      continue;
    }

    mappedColumns.forEach((column) => {
      const raw = row[column.index];
      const normalized = parseCsvAmount(raw);
      if (normalized === null) {
        return;
      }
      replacementValues.set(`${column.tracker.id}|${dateKey}`, normalized);
    });
  }

  if (replacementValues.size < 1) {
    return { error: "No valid date/value pairs found to import.", changed: false, message: "" };
  }

  const keysToReplace = new Set(replacementValues.keys());
  entries = entries.filter((entry) => !keysToReplace.has(`${entry.trackerId}|${entry.date}`));

  let inserted = 0;
  replacementValues.forEach((amount, entryKey) => {
    if (amount <= 0) {
      return;
    }
    const [trackerId, date] = entryKey.split("|");
    entries.unshift({
      id: createId(),
      trackerId,
      date,
      amount,
      notes: "CSV Upload",
      createdAt: new Date().toISOString()
    });
    inserted += 1;
  });

  const cleared = replacementValues.size - inserted;
  return {
    changed: true,
    error: "",
    message: `CSV import complete. Updated ${inserted} entries${cleared > 0 ? `, cleared ${cleared}` : ""}${skippedRows > 0 ? `, skipped ${skippedRows} invalid row(s)` : ""}${ignoredGoalColumns > 0 ? `, ignored ${ignoredGoalColumns} unmatched goal column(s)` : ""}.`
  };
}

function parseCsvRows(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "\"") {
      if (inQuotes && text[index + 1] === "\"") {
        currentCell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }
    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function parseCsvDateToKey(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  if (isDateKey(raw)) {
    return raw;
  }

  const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    const parsedSlash = new Date(year, month - 1, day);
    if (
      parsedSlash.getFullYear() === year
      && parsedSlash.getMonth() === month - 1
      && parsedSlash.getDate() === day
    ) {
      return getDateKey(parsedSlash);
    }
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return getDateKey(normalizeDate(parsed));
}

function parseCsvAmount(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  const numeric = Number(raw.replaceAll(",", ""));
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  return Math.round(numeric * 100) / 100;
}

function getDefaultSettings() {
  return {
    weekStart: "monday",
    compareToLastDefault: true,
    theme: "teal"
  };
}

function normalizeThemeKey(value) {
  const allowed = new Set(["teal", "ocean", "forest", "sunset", "amber", "berry", "slate", "midnight"]);
  const key = String(value || "").toLowerCase().trim();
  if (allowed.has(key)) {
    return key;
  }
  return "teal";
}

function applyTheme() {
  const theme = normalizeThemeKey(settings && settings.theme);
  document.body.setAttribute("data-theme", theme);
}

function showAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("auth-error", Boolean(isError && message));
}

function normalizeUsername(value) {
  return String(value || "").trim();
}

function getUsernameKey(username) {
  return normalizeUsername(username).toLowerCase();
}

async function hashPassword(value) {
  const plain = String(value || "");
  if (!plain) {
    return "";
  }
  if (window.crypto && window.crypto.subtle) {
    const bytes = new TextEncoder().encode(plain);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return plain;
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
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
        username: normalizeUsername(item.username) || "User",
        usernameKey: typeof item.usernameKey === "string" && item.usernameKey ? item.usernameKey : getUsernameKey(item.username),
        passwordHash: typeof item.passwordHash === "string" ? item.passwordHash : "",
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
      }))
      .filter((item) => item.usernameKey && item.passwordHash);
  } catch {
    return [];
  }
}

function saveUsers() {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function loadSessionUserId() {
  const value = localStorage.getItem(SESSION_STORAGE_KEY);
  return typeof value === "string" && value ? value : "";
}

function saveSessionUserId(userId) {
  localStorage.setItem(SESSION_STORAGE_KEY, String(userId || ""));
}

function clearSessionUserId() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function getScopedStorageKey(key) {
  if (!currentUser) {
    return `${key}:anonymous`;
  }
  return `${key}:${currentUser.id}`;
}

function migrateLegacyDataToUser() {
  if (!currentUser) {
    return;
  }
  const keys = [
    TRACKERS_STORAGE_KEY,
    ENTRIES_STORAGE_KEY,
    SCHEDULE_STORAGE_KEY,
    SETTINGS_STORAGE_KEY,
    LEGACY_TRACKERS_KEY
  ];
  keys.forEach((key) => {
    const scopedKey = getScopedStorageKey(key);
    if (localStorage.getItem(scopedKey) !== null) {
      return;
    }
    const legacyValue = localStorage.getItem(key);
    if (legacyValue !== null) {
      localStorage.setItem(scopedKey, legacyValue);
    }
  });
}

function initializeData() {
  if (!currentUser) {
    trackers = [];
    entries = [];
    schedules = [];
    settings = getDefaultSettings();
    return;
  }

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
    if (!currentUser) {
      return { trackers: [], legacyLogs: [] };
    }
    const raw = localStorage.getItem(getScopedStorageKey(TRACKERS_STORAGE_KEY))
      || localStorage.getItem(getScopedStorageKey(LEGACY_TRACKERS_KEY));
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
        unit: normalizeGoalUnit(item.unit),
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
    if (!currentUser) {
      return [];
    }
    const raw = localStorage.getItem(getScopedStorageKey(ENTRIES_STORAGE_KEY));
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
    if (!currentUser) {
      return [];
    }
    const raw = localStorage.getItem(getScopedStorageKey(SCHEDULE_STORAGE_KEY));
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
    if (!currentUser) {
      return getDefaultSettings();
    }
    const raw = localStorage.getItem(getScopedStorageKey(SETTINGS_STORAGE_KEY));
    if (!raw) {
      return getDefaultSettings();
    }
    const parsed = JSON.parse(raw);
    return {
      weekStart: parsed && parsed.weekStart === "sunday" ? "sunday" : "monday",
      compareToLastDefault: parsed && parsed.compareToLastDefault === false ? false : true,
      theme: normalizeThemeKey(parsed && parsed.theme)
    };
  } catch {
    return getDefaultSettings();
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
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(TRACKERS_STORAGE_KEY), JSON.stringify(trackers));
}

function saveEntries() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(ENTRIES_STORAGE_KEY), JSON.stringify(entries));
}

function saveSchedules() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(SCHEDULE_STORAGE_KEY), JSON.stringify(schedules));
}

function saveSettings() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(SETTINGS_STORAGE_KEY), JSON.stringify(settings));
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

function normalizeGoalUnit(value) {
  const unit = String(value || "").trim();
  return unit || "units";
}

function formatAmountWithUnit(value, unit) {
  return `${formatAmount(value)} ${normalizeGoalUnit(unit)}`;
}

function formatSignedAmount(value) {
  const sign = Number(value) > 0 ? "+" : "";
  return `${sign}${formatAmount(value)}`;
}

function formatSignedAmountWithUnit(value, unit) {
  return `${formatSignedAmount(value)} ${normalizeGoalUnit(unit)}`;
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
