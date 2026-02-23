import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  limit,
  getDocs,
  addDoc,
  onSnapshot,
  updateDoc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  getDefaultSettings,
  normalizeProjectionAverageSource,
  normalizeGoalPoints,
  normalizeGoalPriority,
  compareTrackersByPriority,
  normalizeThemeKey,
  normalizeDefaultGoalType
} from "./modules/settings-core.js";
import { createUndoToastController } from "./modules/ui-feedback.js";

const TRACKERS_STORAGE_KEY = "goal-tracker-trackers-v3";
const ENTRIES_STORAGE_KEY = "goal-tracker-entries-v1";
const CHECKINS_STORAGE_KEY = "goal-tracker-checkins-v1";
const CHECKIN_ENTRIES_STORAGE_KEY = "goal-tracker-checkin-entries-v1";
const GOAL_JOURNAL_STORAGE_KEY = "goal-tracker-goal-journal-v1";
const SCHEDULE_STORAGE_KEY = "goal-tracker-schedules-v1";
const SETTINGS_STORAGE_KEY = "goal-tracker-settings-v1";
const FRIENDS_STORAGE_KEY = "goal-tracker-friends-v1";
const PERIOD_SNAPSHOTS_STORAGE_KEY = "goal-tracker-period-snapshots-v1";
const REWARDS_STORAGE_KEY = "goal-tracker-rewards-v1";
const REWARD_PURCHASES_STORAGE_KEY = "goal-tracker-reward-purchases-v1";
const POINT_TRANSACTIONS_STORAGE_KEY = "goal-tracker-point-transactions-v1";
const GOAL_HIT_NOTIFICATIONS_STORAGE_KEY = "goal-tracker-goal-hit-notifications-v1";
const LEGACY_TRACKERS_KEY = "goal-tracker-trackers-v2";
const USERS_STORAGE_KEY = "goal-tracker-users-v1";
const SESSION_STORAGE_KEY = "goal-tracker-session-v1";
const ENTRY_UI_PREFS_STORAGE_KEY = "goal-tracker-entry-ui-prefs-v1";
const DAY_MS = 24 * 60 * 60 * 1000;
const CLOUD_LOCAL_UPDATED_AT_KEY = "goal-tracker-cloud-local-updated-v1";
const CLOUD_PROFILE_COLLECTION = "goalTrackerProfiles";
const CLOUD_DATA_COLLECTION = "goalTrackerData";
const CLOUD_NOTIFICATION_COLLECTION = "goalTrackerNotifications";
const CLOUD_GOAL_SHARE_COLLECTION = "goalTrackerGoalShares";

const appShell = document.querySelector("#app-shell");
const authPanel = document.querySelector("#auth-panel");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const loginUsername = document.querySelector("#login-username");
const loginPassword = document.querySelector("#login-password");
const loginShowPassword = document.querySelector("#login-show-password");
const registerFirstName = document.querySelector("#register-first-name");
const registerLastName = document.querySelector("#register-last-name");
const registerEmail = document.querySelector("#register-email");
const registerUsername = document.querySelector("#register-username");
const registerPassword = document.querySelector("#register-password");
const registerPasswordConfirm = document.querySelector("#register-password-confirm");
const registerShowPassword = document.querySelector("#register-show-password");
const authMessage = document.querySelector("#auth-message");
const authModeButtons = document.querySelectorAll("[data-auth-mode]");
const authForms = document.querySelectorAll("[data-auth-form]");
const logoutButton = document.querySelector("#logout-btn");
const activeUserLabel = document.querySelector("#active-user-label");
const notificationsToggleButton = document.querySelector("#notifications-toggle-btn");
const notificationsBadge = document.querySelector("#notifications-unread-count");
const notificationsPanel = document.querySelector("#notifications-panel");
const notificationsList = document.querySelector("#notifications-list");
const notificationsEmpty = document.querySelector("#notifications-empty");
const notificationsMarkReadButton = document.querySelector("#notifications-mark-read-btn");

const menuButtons = document.querySelectorAll(".menu-btn");
const dropdowns = document.querySelectorAll("[data-dropdown]");
const tabPanels = document.querySelectorAll(".tab-panel");
const tabStripPanel = document.querySelector(".tab-strip-panel");
const mobileMenuToggle = document.querySelector("#mobile-menu-toggle");

const goalForm = document.querySelector("#goal-form");
const goalName = document.querySelector("#goal-name");
const goalType = document.querySelector("#goal-type");
const goalUnit = document.querySelector("#goal-unit");
const goalPriority = document.querySelector("#goal-priority");
const goalTags = document.querySelector("#goal-tags");
const goalWeekly = document.querySelector("#goal-weekly");
const goalMonthly = document.querySelector("#goal-monthly");
const goalYearly = document.querySelector("#goal-yearly");
const goalRewardPointsWrap = document.querySelector("#goal-reward-points-wrap");
const goalRewardWeeklyPoints = document.querySelector("#goal-reward-weekly-points");
const goalRewardMonthlyPoints = document.querySelector("#goal-reward-monthly-points");
const goalRewardYearlyPoints = document.querySelector("#goal-reward-yearly-points");
const manageList = document.querySelector("#manage-list");
const manageEmpty = document.querySelector("#manage-empty");
const manageTable = document.querySelector("#manage-table");
const manageGoalsForm = document.querySelector("#manage-goals-form");
const setupWizard = document.querySelector("#setup-wizard");
const setupWizardForm = document.querySelector("#setup-wizard-form");
const setupWizardSkipButton = document.querySelector("#setup-wizard-skip");
const setupWeekStart = document.querySelector("#setup-week-start");
const setupDefaultGoalType = document.querySelector("#setup-default-goal-type");
const setupDefaultTags = document.querySelector("#setup-default-tags");
const setupRewardPoints = document.querySelector("#setup-reward-points");
const setupBucketList = document.querySelector("#setup-bucket-list");
const setupTemplateFitness = document.querySelector("#setup-template-fitness");
const setupTemplateLearning = document.querySelector("#setup-template-learning");
const setupTemplateRoutine = document.querySelector("#setup-template-routine");

const entryForm = document.querySelector("#entry-form");
const entryModeSelect = document.querySelector("#entry-mode-select");
const soloEntrySection = document.querySelector("#solo-entry-section");
const weekUpdateSection = document.querySelector("#week-update-section");
const entryTracker = document.querySelector("#entry-tracker");
const entryDate = document.querySelector("#entry-date");
const entryAmountLabel = document.querySelector("#entry-amount-label");
const entryAmount = document.querySelector("#entry-amount");
const entryYesNoLabel = document.querySelector("#entry-yesno-label");
const entryYesNo = document.querySelector("#entry-yesno");
const entryNotes = document.querySelector("#entry-notes");
const todayEntriesList = document.querySelector("#today-entries-list");
const todayEntriesEmpty = document.querySelector("#today-entries-empty");
const weekEntryForm = document.querySelector("#week-entry-form");
const weekEntryHead = document.querySelector("#week-entry-head");
const weekEntryBody = document.querySelector("#week-entry-body");
const weekEntryEmpty = document.querySelector("#week-entry-empty");
const weekEntryStatus = document.querySelector("#week-entry-status");
const weekEntryRange = document.querySelector("#week-entry-range");
const weekEntryPrevButton = document.querySelector("#week-entry-prev");
const weekEntryThisButton = document.querySelector("#week-entry-this");
const weekEntryNextButton = document.querySelector("#week-entry-next");

const bucketEntryForm = document.querySelector("#bucket-entry-form");
const bucketEntryGoal = document.querySelector("#bucket-entry-goal");
const bucketEntryDate = document.querySelector("#bucket-entry-date");
const bucketEntryNotes = document.querySelector("#bucket-entry-notes");
const recentBucketEntriesList = document.querySelector("#recent-bucket-entries-list");
const recentBucketEntriesEmpty = document.querySelector("#recent-bucket-entries-empty");

const checkinForm = document.querySelector("#checkin-form");
const checkinName = document.querySelector("#checkin-name");
const checkinCadence = document.querySelector("#checkin-cadence");
const checkinList = document.querySelector("#checkin-list");
const checkinEmpty = document.querySelector("#checkin-empty");
const checkinTable = document.querySelector("#checkin-table");
const manageCheckinsForm = document.querySelector("#manage-checkins-form");

const checkinEntryForm = document.querySelector("#checkin-entry-form");
const checkinEntryItem = document.querySelector("#checkin-entry-item");
const checkinEntryDate = document.querySelector("#checkin-entry-date");
const checkinEntryStatus = document.querySelector("#checkin-entry-status");
const checkinEntryNotes = document.querySelector("#checkin-entry-notes");
const recentCheckinEntriesList = document.querySelector("#recent-checkin-entries-list");
const recentCheckinEntriesEmpty = document.querySelector("#recent-checkin-entries-empty");

const entryListAll = document.querySelector("#entry-list-all");
const entryListEmpty = document.querySelector("#entry-list-empty");
const entryListSort = document.querySelector("#entry-list-sort");
const entryListTypeFilterSelect = document.querySelector("#entry-list-type-filter");
const entryListStatusFilterSelect = document.querySelector("#entry-list-status-filter");
const entryListBucketFilterSelect = document.querySelector("#entry-list-bucket-filter");
const csvUploadForm = document.querySelector("#csv-upload-form");
const csvUploadFile = document.querySelector("#csv-upload-file");
const csvUploadStatus = document.querySelector("#csv-upload-status");
const goalJournalForm = document.querySelector("#goal-journal-form");
const goalJournalDate = document.querySelector("#goal-journal-date");
const goalJournalGoal = document.querySelector("#goal-journal-goal");
const goalJournalTitle = document.querySelector("#goal-journal-title");
const goalJournalContent = document.querySelector("#goal-journal-content");
const goalJournalList = document.querySelector("#goal-journal-list");
const goalJournalEmpty = document.querySelector("#goal-journal-empty");

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
const projectionAverageSelect = document.querySelector("#projection-average-select");
const rewardPointsEnabledSelect = document.querySelector("#reward-points-enabled-select");
const bucketListEnabledSelect = document.querySelector("#bucket-list-enabled-select");
const themeSelect = document.querySelector("#theme-select");
const compactModeSelect = document.querySelector("#compact-mode-select");
const goalHitNotificationsSelect = document.querySelector("#goal-hit-notifications-select");
const pointStoreMenuButton = document.querySelector("#point-store-menu-btn");
const pointStoreSettingsSection = document.querySelector("#point-store-settings-section");
const pointStoreToggleForm = document.querySelector("#point-store-toggle-form");
const pointStoreEnabledSelect = document.querySelector("#point-store-enabled-select");
const pointAdjustForm = document.querySelector("#point-adjust-form");
const pointAdjustDirectionSelect = document.querySelector("#point-adjust-direction");
const pointAdjustAmount = document.querySelector("#point-adjust-amount");
const pointAdjustNote = document.querySelector("#point-adjust-note");
const rewardForm = document.querySelector("#reward-form");
const rewardName = document.querySelector("#reward-name");
const rewardCost = document.querySelector("#reward-cost");
const rewardNotes = document.querySelector("#reward-notes");
const rewardSettingsList = document.querySelector("#reward-settings-list");
const rewardSettingsEmpty = document.querySelector("#reward-settings-empty");
const pointBankBalance = document.querySelector("#point-bank-balance");
const pointBankEarned = document.querySelector("#point-bank-earned");
const pointBankSpent = document.querySelector("#point-bank-spent");
const pointStoreRewardList = document.querySelector("#point-store-reward-list");
const pointStoreRewardEmpty = document.querySelector("#point-store-reward-empty");
const pointStoreActiveList = document.querySelector("#point-store-active-list");
const pointStoreActiveEmpty = document.querySelector("#point-store-active-empty");
const pointStoreClosedList = document.querySelector("#point-store-closed-list");
const pointStoreClosedEmpty = document.querySelector("#point-store-closed-empty");
const pointStoreClearClosedButton = document.querySelector("#point-store-clear-closed-btn");
const pointStoreHistoryList = document.querySelector("#point-store-history-list");
const pointStoreHistoryEmpty = document.querySelector("#point-store-history-empty");

const weekRangeLabel = document.querySelector("#week-range");
const monthRangeLabel = document.querySelector("#month-range");
const yearRangeLabel = document.querySelector("#year-range");
const weekSummary = document.querySelector("#week-summary");
const monthSummary = document.querySelector("#month-summary");
const yearSummary = document.querySelector("#year-summary");
const weekPrevButton = document.querySelector("#week-prev");
const weekThisButton = document.querySelector("#week-this");
const weekNextButton = document.querySelector("#week-next");
const weekCloseoutButton = document.querySelector("#week-closeout");
const monthPrevButton = document.querySelector("#month-prev");
const monthThisButton = document.querySelector("#month-this");
const monthNextButton = document.querySelector("#month-next");
const monthCloseoutButton = document.querySelector("#month-closeout");
const yearPrevButton = document.querySelector("#year-prev");
const yearThisButton = document.querySelector("#year-this");
const yearNextButton = document.querySelector("#year-next");
const yearCloseoutButton = document.querySelector("#year-closeout");
const weekList = document.querySelector("#week-list");
const monthList = document.querySelector("#month-list");
const yearList = document.querySelector("#year-list");
const weekEmpty = document.querySelector("#week-empty");
const monthEmpty = document.querySelector("#month-empty");
const yearEmpty = document.querySelector("#year-empty");
const weekGoalTypeFilterSelect = document.querySelector("#week-goal-type-filter");
const weekGoalStatusFilterSelect = document.querySelector("#week-goal-status-filter");
const weekGoalTagFilterSelect = document.querySelector("#week-goal-tag-filter");
const monthGoalTypeFilterSelect = document.querySelector("#month-goal-type-filter");
const monthGoalStatusFilterSelect = document.querySelector("#month-goal-status-filter");
const monthGoalTagFilterSelect = document.querySelector("#month-goal-tag-filter");
const yearGoalTypeFilterSelect = document.querySelector("#year-goal-type-filter");
const yearGoalStatusFilterSelect = document.querySelector("#year-goal-status-filter");
const yearGoalTagFilterSelect = document.querySelector("#year-goal-tag-filter");
const bucketListSummary = document.querySelector("#bucket-list-summary");
const bucketListViewList = document.querySelector("#bucket-list-view-list");
const bucketListViewEmpty = document.querySelector("#bucket-list-view-empty");
const bucketListGoalStatusFilterSelect = document.querySelector("#bucket-list-goal-status-filter");
const bucketListItemStatusFilterSelect = document.querySelector("#bucket-list-item-status-filter");
const graphModal = document.querySelector("#graph-modal");
const graphModalBody = document.querySelector("#graph-modal-body");
const graphModalTitle = document.querySelector("#graph-modal-title");
const graphModalClose = document.querySelector("#graph-modal-close");
const undoToastContainer = document.querySelector("#undo-toast");
const undoToastMessage = document.querySelector("#undo-toast-message");
const undoToastAction = document.querySelector("#undo-toast-action");
const undoToastDismiss = document.querySelector("#undo-toast-dismiss");
const goalHitToast = document.querySelector("#goal-hit-toast");
const goalHitToastMessage = document.querySelector("#goal-hit-toast-message");
const goalHitToastDismiss = document.querySelector("#goal-hit-toast-dismiss");

let trackers = [];
let entries = [];
let checkIns = [];
let checkInEntries = [];
let goalJournalEntries = [];
let schedules = [];
let friends = [];
let periodSnapshots = [];
let rewards = [];
let rewardPurchases = [];
let pointTransactions = [];
let settings = getDefaultSettings();
let activeTab = "manage";
let entryMode = "solo";
let entryListSortMode = "date_desc";
let entryListTypeFilter = "all";
let entryListStatusFilter = "active";
let entryListBucketFilter = "all";
let authMode = "signin";
let scheduleWeekAnchor = normalizeDate(new Date());
let weekEntryAnchor = normalizeDate(new Date());
let weekEntryStatusMessage = "";
let entrySoloInitialized = false;
let weekViewAnchor = normalizeDate(new Date());
let monthViewAnchor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let yearViewAnchor = new Date(new Date().getFullYear(), 0, 1);
const periodGoalFilterState = {
  week: { type: "all", status: "active", tag: "all" },
  month: { type: "all", status: "active", tag: "all" },
  year: { type: "all", status: "active", tag: "all" }
};
let bucketListGoalStatusFilter = "active";
let bucketListItemStatusFilter = "all";
let users = [];
let currentUser = null;
let notifications = [];
let notificationsPanelOpen = false;
let notificationsUnsubscribe = null;
let goalSharePartnerUnsubscribe = null;
let goalShareOwnerUnsubscribe = null;
let sharedGoalShares = [];
let sharedGoalOwnerData = new Map();
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let cloudSyncTimer = null;
let cloudSyncInFlight = false;
let suppressCloudSync = false;
let entryUiPrefs = getDefaultEntryUiPrefs();
let goalHitNotificationKeys = [];
let goalHitToastTimer = null;
const undoToast = createUndoToastController({
  container: undoToastContainer,
  messageElement: undoToastMessage,
  undoButton: undoToastAction,
  dismissButton: undoToastDismiss
});
let firebaseConfigured = false;
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
const projectionLineState = {
  week: {},
  month: {},
  year: {}
};
const inlineGraphState = {
  week: {},
  month: {},
  year: {}
};
const periodAccordionState = {
  week: { goals: true, checkins: true, shared: false, snapshots: false },
  month: { goals: true, checkins: true, shared: false, snapshots: false },
  year: { goals: true, checkins: true, shared: false, snapshots: false }
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
if (bucketEntryDate) {
  bucketEntryDate.value = getDateKey(normalizeDate(new Date()));
}
if (checkinEntryDate) {
  checkinEntryDate.value = getDateKey(normalizeDate(new Date()));
}
if (goalJournalDate) {
  goalJournalDate.value = getDateKey(normalizeDate(new Date()));
}
if (goalUnit) {
  goalUnit.value = "units";
}
if (entryListSort) {
  entryListSort.value = entryListSortMode;
}
if (entryListTypeFilterSelect) {
  entryListTypeFilterSelect.value = entryListTypeFilter;
}
if (entryListStatusFilterSelect) {
  entryListStatusFilterSelect.value = entryListStatusFilter;
}
if (entryListBucketFilterSelect) {
  entryListBucketFilterSelect.value = entryListBucketFilter;
}
if (entryModeSelect) {
  entryModeSelect.value = entryMode;
}
if (weekGoalTypeFilterSelect) {
  weekGoalTypeFilterSelect.value = periodGoalFilterState.week.type;
}
if (weekGoalStatusFilterSelect) {
  weekGoalStatusFilterSelect.value = periodGoalFilterState.week.status;
}
if (weekGoalTagFilterSelect) {
  weekGoalTagFilterSelect.value = periodGoalFilterState.week.tag;
}
if (monthGoalTypeFilterSelect) {
  monthGoalTypeFilterSelect.value = periodGoalFilterState.month.type;
}
if (monthGoalStatusFilterSelect) {
  monthGoalStatusFilterSelect.value = periodGoalFilterState.month.status;
}
if (monthGoalTagFilterSelect) {
  monthGoalTagFilterSelect.value = periodGoalFilterState.month.tag;
}
if (yearGoalTypeFilterSelect) {
  yearGoalTypeFilterSelect.value = periodGoalFilterState.year.type;
}
if (yearGoalStatusFilterSelect) {
  yearGoalStatusFilterSelect.value = periodGoalFilterState.year.status;
}
if (yearGoalTagFilterSelect) {
  yearGoalTagFilterSelect.value = periodGoalFilterState.year.tag;
}
if (bucketListGoalStatusFilterSelect) {
  bucketListGoalStatusFilterSelect.value = bucketListGoalStatusFilter;
}
if (bucketListItemStatusFilterSelect) {
  bucketListItemStatusFilterSelect.value = bucketListItemStatusFilter;
}
if (csvUploadStatus) {
  csvUploadStatus.textContent = "";
}
updateGoalTypeFields();
setAuthMode("signin");
initializeAuth();
applyPasswordVisibilityToggle();
setMobileMenuOpen(false);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    flushCloudSync();
  }
});

function closeAllDropdownMenus() {
  dropdowns.forEach((dropdown) => {
    dropdown.classList.remove("open");
  });
}

function closeAllViewFilterDisclosures() {
  document.querySelectorAll(".view-filters-disclosure[open]").forEach((item) => {
    item.open = false;
  });
}

function isMobileMenuMode() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function setMobileMenuOpen(open) {
  if (!tabStripPanel || !mobileMenuToggle) {
    return;
  }
  const shouldOpen = Boolean(open && isMobileMenuMode());
  tabStripPanel.classList.toggle("mobile-menu-open", shouldOpen);
  mobileMenuToggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  mobileMenuToggle.textContent = shouldOpen ? "Close Menu" : "Menu";
  if (!shouldOpen) {
    closeAllDropdownMenus();
  }
}

function scrollActivePanelIntoView() {
  if (!isMobileMenuMode()) {
    return;
  }
  const panel = document.querySelector(`.tab-panel[data-tab-panel="${activeTab}"]`);
  if (!panel) {
    return;
  }
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener("click", () => {
    const currentlyOpen = tabStripPanel ? tabStripPanel.classList.contains("mobile-menu-open") : false;
    setMobileMenuOpen(!currentlyOpen);
  });
}

window.addEventListener("resize", () => {
  if (!isMobileMenuMode()) {
    setMobileMenuOpen(false);
  }
});

dropdowns.forEach((dropdown) => {
  const toggle = dropdown.querySelector("[data-dropdown-toggle]");
  if (!toggle) {
    return;
  }
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const shouldOpen = !dropdown.classList.contains("open");
    closeAllDropdownMenus();
    if (shouldOpen) {
      dropdown.classList.add("open");
    }
  });
  dropdown.querySelectorAll(".menu-btn").forEach((button) => {
    button.addEventListener("click", () => {
      closeAllDropdownMenus();
    });
  });
});

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (isMobileMenuMode() && tabStripPanel && (!target || !target.closest(".tab-strip-panel"))) {
    setMobileMenuOpen(false);
  }
  if (mobileMenuToggle && target && target.closest("#mobile-menu-toggle")) {
    return;
  }
  if (!target || !target.closest("[data-dropdown]")) {
    closeAllDropdownMenus();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAllDropdownMenus();
    closeAllViewFilterDisclosures();
    setMobileMenuOpen(false);
  }
});

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!currentUser) {
      return;
    }
    closeAllDropdownMenus();
    activeTab = button.dataset.tab;
    if (!isBucketListEnabled() && (activeTab === "bucket-entry" || activeTab === "bucket-list")) {
      activeTab = "entry";
      renderTabs();
      return;
    }
    if (!isPointStoreRewardsEnabled() && activeTab === "point-store") {
      activeTab = "manage";
      renderTabs();
      return;
    }
    if (activeTab === "goal-schedule") {
      scheduleWeekAnchor = normalizeDate(new Date());
      resetScheduleTileFlips();
    }
    renderTabs();
    if (activeTab === "goal-schedule") {
      renderGoalScheduleTab();
    }
    if (isMobileMenuMode()) {
      setMobileMenuOpen(false);
      scrollActivePanelIntoView();
    }
  });
});

authModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAuthMode(button.dataset.authMode);
  });
});

if (entryTracker) {
  entryTracker.addEventListener("change", () => {
    entryUiPrefs.trackerId = String(entryTracker.value || "");
    saveEntryUiPrefs();
    updateEntryFormMode();
  });
}

if (entryDate) {
  entryDate.addEventListener("change", () => {
    if (!isDateKey(entryDate.value)) {
      return;
    }
    entryUiPrefs.date = entryDate.value;
    saveEntryUiPrefs();
  });
}

if (entryModeSelect) {
  entryModeSelect.addEventListener("change", () => {
    entryMode = normalizeEntryMode(entryModeSelect.value);
    entryUiPrefs.mode = entryMode;
    saveEntryUiPrefs();
    weekEntryStatusMessage = "";
    if (entryMode === "solo") {
      entrySoloInitialized = false;
    }
    renderEntryTab();
  });
}

if (weekEntryPrevButton) {
  weekEntryPrevButton.addEventListener("click", () => {
    weekEntryAnchor = addDays(weekEntryAnchor, -7);
    weekEntryStatusMessage = "";
    renderEntryTab();
  });
}

if (weekEntryThisButton) {
  weekEntryThisButton.addEventListener("click", () => {
    weekEntryAnchor = normalizeDate(new Date());
    weekEntryStatusMessage = "";
    renderEntryTab();
  });
}

if (weekEntryNextButton) {
  weekEntryNextButton.addEventListener("click", () => {
    weekEntryAnchor = addDays(weekEntryAnchor, 7);
    weekEntryStatusMessage = "";
    renderEntryTab();
  });
}

if (authPanel) {
  authPanel.addEventListener("click", (event) => {
    const modeTargetButton = event.target.closest("button[data-auth-mode-target]");
    if (!modeTargetButton) {
      return;
    }
    setAuthMode(modeTargetButton.dataset.authModeTarget);
  });
}

function applyPasswordVisibilityToggle() {
  const loginVisible = Boolean(loginShowPassword && loginShowPassword.checked);
  if (loginPassword) {
    loginPassword.type = loginVisible ? "text" : "password";
  }
  const registerVisible = Boolean(registerShowPassword && registerShowPassword.checked);
  if (registerPassword) {
    registerPassword.type = registerVisible ? "text" : "password";
  }
  if (registerPasswordConfirm) {
    registerPasswordConfirm.type = registerVisible ? "text" : "password";
  }
}

if (loginShowPassword) {
  loginShowPassword.addEventListener("change", applyPasswordVisibilityToggle);
}

if (registerShowPassword) {
  registerShowPassword.addEventListener("change", applyPasswordVisibilityToggle);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = normalizeEmail(loginUsername.value);
  const password = String(loginPassword.value || "");
  if (!firebaseConfigured || !firebaseAuth) {
    showAuthMessage("Firebase is not configured yet. Add your config in firebase-config.js.", true);
    return;
  }
  if (!email || !password) {
    showAuthMessage("Enter email and password.", true);
    return;
  }
  try {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    loginForm.reset();
    applyPasswordVisibilityToggle();
    showAuthMessage("");
  } catch (error) {
    const code = getFirebaseErrorCode(error);
    if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
      showAuthMessage("Invalid email or password.", true);
      return;
    }
    if (code === "auth/too-many-requests") {
      showAuthMessage("Too many attempts. Try again in a bit.", true);
      return;
    }
    showAuthMessage(getFirebaseAuthErrorMessage(error, "Unable to sign in right now."), true);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!firebaseConfigured || !firebaseAuth || !firebaseDb) {
    showAuthMessage("Firebase is not configured yet. Add your config in firebase-config.js.", true);
    return;
  }
  const firstName = normalizeProfileName(registerFirstName ? registerFirstName.value : "");
  const lastName = normalizeProfileName(registerLastName ? registerLastName.value : "");
  const email = normalizeEmail(registerEmail ? registerEmail.value : "");
  const username = normalizeUsername(registerUsername.value);
  const usernameKey = getUsernameKey(username);
  const password = String(registerPassword.value || "");
  const passwordConfirm = String(registerPasswordConfirm.value || "");
  if (!firstName || !lastName) {
    showAuthMessage("Enter first name and last name.", true);
    return;
  }
  if (!isValidEmail(email)) {
    showAuthMessage("Enter a valid email address.", true);
    return;
  }
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
  let credential = null;
  try {
    credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  } catch (error) {
    showAuthMessage(getFirebaseAuthErrorMessage(error, "Unable to create account right now."), true);
    return;
  }
  try {
    const profileDocRef = doc(firebaseDb, CLOUD_PROFILE_COLLECTION, credential.user.uid);
    await setDoc(profileDocRef, {
      firstName,
      lastName,
      email,
      username,
      usernameKey,
      createdAt: new Date().toISOString()
    }, { merge: true });
    registerForm.reset();
    applyPasswordVisibilityToggle();
    showAuthMessage("");
  } catch (error) {
    // Account was created, but Firestore profile sync failed.
    const code = getFirebaseErrorCode(error);
    showAuthMessage(code ? `Account created, but profile sync failed (${code}).` : "Account created, but profile sync failed.", true);
  }
});

logoutButton.addEventListener("click", async () => {
  if (firebaseConfigured && firebaseAuth) {
    try {
      await signOut(firebaseAuth);
      return;
    } catch {
      // Fall through and reset local state even if sign-out request fails.
    }
  }
  resetStateForSignedOutUser();
  render();
});

if (notificationsToggleButton) {
  notificationsToggleButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }
    notificationsPanelOpen = !notificationsPanelOpen;
    renderNotifications();
  });
}

if (notificationsMarkReadButton) {
  notificationsMarkReadButton.addEventListener("click", async () => {
    if (!currentUser) {
      return;
    }
    await markAllNotificationsRead();
  });
}

if (notificationsList) {
  notificationsList.addEventListener("click", async (event) => {
    if (!currentUser) {
      return;
    }
    const actionButton = event.target.closest("button[data-action='approve-share-invite'], button[data-action='reject-share-invite']");
    if (!actionButton) {
      return;
    }
    const shareId = String(actionButton.dataset.shareId || "");
    const notificationId = String(actionButton.dataset.notificationId || "");
    const approve = actionButton.dataset.action === "approve-share-invite";
    const result = await respondToGoalShareInvite(notificationId, shareId, approve);
    if (!result.success && result.message) {
      alert(result.message);
    }
  });
}

if (goalType) {
  goalType.addEventListener("change", () => {
    updateGoalTypeFields();
  });
}

goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser) {
    return;
  }
  const normalizedGoalType = normalizeGoalType(goalType ? goalType.value : "quantity");
  if (normalizedGoalType === "bucket" && !isBucketListEnabled()) {
    return;
  }
  const name = goalName.value.trim();
  const lockedUnit = getLockedUnitForGoalType(normalizedGoalType);
  const unit = lockedUnit || normalizeGoalUnit(goalUnit.value);
  const priority = normalizeGoalPriority(goalPriority ? goalPriority.value : 0, 0);
  const tags = normalizeGoalTags(goalTags ? goalTags.value : "");
  const weeklyGoal = normalizePositiveInt(goalWeekly.value, 1);
  const monthlyGoal = normalizePositiveInt(goalMonthly.value, 1);
  const yearlyGoal = normalizePositiveInt(goalYearly.value, 1);
  const rewardWeeklyPoints = normalizeGoalPoints(goalRewardWeeklyPoints ? goalRewardWeeklyPoints.value : 1, 1);
  const rewardMonthlyPoints = normalizeGoalPoints(goalRewardMonthlyPoints ? goalRewardMonthlyPoints.value : 3, 3);
  const rewardYearlyPoints = normalizeGoalPoints(goalRewardYearlyPoints ? goalRewardYearlyPoints.value : 10, 10);
  if (!name || !unit || weeklyGoal < 1 || monthlyGoal < 1 || yearlyGoal < 1) {
    return;
  }

  trackers.unshift({
    id: createId(),
    name,
    goalType: normalizedGoalType,
    archived: false,
    priority,
    tags,
    unit,
    weeklyGoal,
    monthlyGoal,
    yearlyGoal,
    goalPointsWeekly: rewardWeeklyPoints,
    goalPointsMonthly: rewardMonthlyPoints,
    goalPointsYearly: rewardYearlyPoints,
    accountabilityPartnerEmail: "",
    accountabilityPartnerName: "",
    accountabilityPartnerId: "",
    accountabilityShareId: "",
    accountabilityStatus: "none"
  });

  saveTrackers();
  if (!settings.onboardingComplete) {
    settings.onboardingComplete = true;
    saveSettings();
  }
  goalForm.reset();
  if (goalType) {
    const defaultGoalType = normalizeDefaultGoalType(settings.defaultGoalType);
    goalType.value = !isBucketListEnabled() && defaultGoalType === "bucket"
      ? "quantity"
      : defaultGoalType;
  }
  goalUnit.value = "units";
  if (goalPriority) {
    goalPriority.value = "0";
  }
  if (goalTags) {
    goalTags.value = formatGoalTags(settings.defaultGoalTags || "");
  }
  goalWeekly.value = "5";
  goalMonthly.value = "22";
  goalYearly.value = "260";
  if (goalRewardWeeklyPoints) {
    goalRewardWeeklyPoints.value = "1";
  }
  if (goalRewardMonthlyPoints) {
    goalRewardMonthlyPoints.value = "3";
  }
  if (goalRewardYearlyPoints) {
    goalRewardYearlyPoints.value = "10";
  }
  updateGoalTypeFields();
  render();
});

if (manageGoalsForm) {
  manageGoalsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }

    const rows = Array.from(manageList.querySelectorAll("tr[data-id]"));
    if (rows.length < 1) {
      return;
    }

    const previousTrackersById = new Map(trackers.map((item) => [item.id, { ...item }]));
    const friendByEmail = new Map(
      friends
        .filter((item) => item && item.email)
        .map((item) => [normalizeEmail(item.email), item])
    );
    const updates = new Map();
    const deleteIds = new Set();
    const deleteNames = [];
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
      const goalTypeInput = row.querySelector("select[data-field='goalType']");
      const archivedInput = row.querySelector("select[data-field='archived']");
      const priorityInput = row.querySelector("input[data-field='priority']");
      const tagsInput = row.querySelector("input[data-field='tags']");
      const unitInput = row.querySelector("input[data-field='unit']");
      const weeklyInput = row.querySelector("input[data-field='weeklyGoal']");
      const monthlyInput = row.querySelector("input[data-field='monthlyGoal']");
      const yearlyInput = row.querySelector("input[data-field='yearlyGoal']");
      const goalPointsWeeklyInput = row.querySelector("input[data-field='goalPointsWeekly']");
      const goalPointsMonthlyInput = row.querySelector("input[data-field='goalPointsMonthly']");
      const goalPointsYearlyInput = row.querySelector("input[data-field='goalPointsYearly']");
      const accountabilityPartnerInput = row.querySelector("select[data-field='accountabilityPartner']");
      if (!nameInput || !unitInput || !weeklyInput || !monthlyInput || !yearlyInput) {
        continue;
      }

      const statusValue = archivedInput
        ? String(archivedInput.value || "active")
        : (tracker.archived ? "archived" : "active");
      if (statusValue === "delete") {
        deleteIds.add(id);
        deleteNames.push(tracker.name);
        continue;
      }

      const nameValue = String(nameInput.value || "").trim();
      const goalTypeValue = normalizeGoalType(goalTypeInput ? goalTypeInput.value : tracker.goalType);
      const lockedUnit = getLockedUnitForGoalType(goalTypeValue);
      const unitValue = lockedUnit || normalizeGoalUnit(unitInput.value);
      const selectedPartnerEmail = normalizeEmail(
        accountabilityPartnerInput ? accountabilityPartnerInput.value : tracker.accountabilityPartnerEmail
      );
      const selectedFriend = friendByEmail.get(selectedPartnerEmail) || null;
      if (!nameValue || (!lockedUnit && !unitValue)) {
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
        goalType: goalTypeValue,
        archived: statusValue === "archived",
        priority: normalizeGoalPriority(priorityInput ? priorityInput.value : tracker.priority, tracker.priority),
        tags: normalizeGoalTags(tagsInput ? tagsInput.value : tracker.tags),
        unit: unitValue,
        weeklyGoal: normalizePositiveInt(weeklyInput.value, tracker.weeklyGoal),
        monthlyGoal: normalizePositiveInt(monthlyInput.value, tracker.monthlyGoal),
        yearlyGoal: normalizePositiveInt(yearlyInput.value, tracker.yearlyGoal),
        goalPointsWeekly: normalizeGoalPoints(
          goalPointsWeeklyInput ? goalPointsWeeklyInput.value : getTrackerGoalPointsForPeriod(tracker, "week"),
          getTrackerGoalPointsForPeriod(tracker, "week")
        ),
        goalPointsMonthly: normalizeGoalPoints(
          goalPointsMonthlyInput ? goalPointsMonthlyInput.value : getTrackerGoalPointsForPeriod(tracker, "month"),
          getTrackerGoalPointsForPeriod(tracker, "month")
        ),
        goalPointsYearly: normalizeGoalPoints(
          goalPointsYearlyInput ? goalPointsYearlyInput.value : getTrackerGoalPointsForPeriod(tracker, "year"),
          getTrackerGoalPointsForPeriod(tracker, "year")
        ),
        accountabilityPartnerEmail: selectedPartnerEmail,
        accountabilityPartnerName: selectedPartnerEmail
          ? (selectedFriend ? selectedFriend.name : (tracker.accountabilityPartnerName || selectedPartnerEmail))
          : "",
        accountabilityPartnerId: selectedPartnerEmail
          ? (selectedPartnerEmail === normalizeEmail(tracker.accountabilityPartnerEmail) ? (tracker.accountabilityPartnerId || "") : "")
          : "",
        accountabilityStatus: selectedPartnerEmail
          ? (selectedPartnerEmail === normalizeEmail(tracker.accountabilityPartnerEmail)
            ? normalizeAccountabilityStatus(tracker.accountabilityStatus)
            : "pending")
          : "none",
        accountabilityShareId: selectedPartnerEmail
          ? (selectedPartnerEmail === normalizeEmail(tracker.accountabilityPartnerEmail) ? (tracker.accountabilityShareId || "") : "")
          : ""
      });
    }

    const hasDelete = deleteIds.size > 0;
    const deleteSnapshot = hasDelete
      ? {
        trackers: deepCloneValue(trackers),
        entries: deepCloneValue(entries),
        schedules: deepCloneValue(schedules)
      }
      : null;

    if (hasDelete) {
      const prompt = deleteNames.length === 1
        ? `Delete goal "${deleteNames[0]}"? This also removes related entries and schedule items.`
        : `Delete ${deleteIds.size} goals? This also removes related entries and schedule items.`;
      const confirmed = confirm(prompt);
      if (!confirmed) {
        return;
      }
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

    if (hasDelete) {
      deleteIds.forEach((id) => {
        removeGoalWithRelatedData(id);
      });
      saveEntries();
      saveSchedules();
    }
    const accountabilitySyncErrors = await syncTrackerAccountabilityShares(previousTrackersById, deleteIds);
    if (accountabilitySyncErrors.length > 0) {
      alert(`Some accountability updates could not be sent: ${accountabilitySyncErrors.slice(0, 3).join(" | ")}${accountabilitySyncErrors.length > 3 ? " ..." : ""}`);
    }
    saveTrackers();
    render();
    if (hasDelete && deleteSnapshot) {
      queueUndoableAction(
        `${deleteIds.size} goal${deleteIds.size === 1 ? "" : "s"} deleted.`,
        null,
        () => {
          trackers = deleteSnapshot.trackers;
          entries = deleteSnapshot.entries;
          schedules = deleteSnapshot.schedules;
          saveTrackers();
          saveEntries();
          saveSchedules();
        },
        { renderAfter: false }
      );
    }
  });
}

function removeGoalWithRelatedData(id) {
  trackers = trackers.filter((item) => item.id !== id);
  entries = entries.filter((entry) => entry.trackerId !== id);
  schedules = schedules.filter((item) => item.trackerId !== id);
  Object.keys(goalCompareState).forEach((periodName) => {
    delete goalCompareState[periodName][id];
  });
  Object.keys(graphPointsState).forEach((periodName) => {
    delete graphPointsState[periodName][id];
  });
  Object.keys(projectionLineState).forEach((periodName) => {
    delete projectionLineState[periodName][id];
  });
  Object.keys(inlineGraphState).forEach((periodName) => {
    delete inlineGraphState[periodName][id];
  });
  if (graphModalState.trackerId === id) {
    closeGraphModal();
  }
}

if (manageList) {
  manageList.addEventListener("change", (event) => {
    const typeSelect = event.target.closest("select[data-field='goalType']");
    if (!typeSelect) {
      return;
    }
    const row = typeSelect.closest("tr[data-id]");
    if (!row) {
      return;
    }
    const unitInput = row.querySelector("input[data-field='unit']");
    if (!unitInput) {
      return;
    }
    let normalizedType = normalizeGoalType(typeSelect.value);
    if (normalizedType === "bucket" && !isBucketListEnabled()) {
      typeSelect.value = "quantity";
      normalizedType = "quantity";
    }
    const lockedUnit = getLockedUnitForGoalType(normalizedType);
    unitInput.disabled = Boolean(lockedUnit);
    if (lockedUnit) {
      unitInput.value = lockedUnit;
    } else if (!String(unitInput.value || "").trim()) {
      unitInput.value = "units";
    }
  });
}

if (checkinForm) {
  checkinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }
    const name = String(checkinName ? checkinName.value : "").trim();
    const cadence = normalizeCheckInCadence(checkinCadence ? checkinCadence.value : "weekly");
    if (!name) {
      return;
    }
    checkIns.unshift({
      id: createId(),
      name,
      cadence
    });
    saveCheckIns();
    if (!settings.onboardingComplete) {
      settings.onboardingComplete = true;
      saveSettings();
    }
    checkinForm.reset();
    if (checkinCadence) {
      checkinCadence.value = "weekly";
    }
    render();
  });
}

if (manageCheckinsForm) {
  manageCheckinsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }
    const rows = Array.from(checkinList.querySelectorAll("tr[data-id]"));
    if (rows.length < 1) {
      return;
    }

    const updates = new Map();
    for (const row of rows) {
      const id = row.dataset.id;
      if (!id) {
        continue;
      }
      const checkIn = checkIns.find((item) => item.id === id);
      if (!checkIn) {
        continue;
      }
      const nameInput = row.querySelector("input[data-field='name']");
      const cadenceInput = row.querySelector("select[data-field='cadence']");
      if (!nameInput || !cadenceInput) {
        continue;
      }
      const nameValue = String(nameInput.value || "").trim();
      if (!nameValue) {
        alert("Each check-in needs a name before saving.");
        nameInput.focus();
        return;
      }
      updates.set(id, {
        name: nameValue,
        cadence: normalizeCheckInCadence(cadenceInput.value)
      });
    }

    checkIns = checkIns.map((item) => {
      const update = updates.get(item.id);
      if (!update) {
        return item;
      }
      return {
        ...item,
        ...update
      };
    });

    saveCheckIns();
    render();
  });
}

if (checkinList) {
  checkinList.addEventListener("click", (event) => {
    if (!currentUser) {
      return;
    }
    const button = event.target.closest("button[data-action='delete-checkin']");
    if (!button) {
      return;
    }
    const id = String(button.dataset.id || "");
    const checkIn = checkIns.find((item) => item.id === id);
    if (!checkIn) {
      return;
    }
    const confirmed = confirm(`Delete check-in "${checkIn.name}"? This removes related check-in entries.`);
    if (!confirmed) {
      return;
    }
    const snapshot = {
      checkIns: deepCloneValue(checkIns),
      checkInEntries: deepCloneValue(checkInEntries)
    };
    checkIns = checkIns.filter((item) => item.id !== id);
    checkInEntries = checkInEntries.filter((item) => item.checkInId !== id);
    saveCheckIns();
    saveCheckInEntries();
    render();
    queueUndoableAction(
      `Deleted check-in "${checkIn.name}".`,
      null,
      () => {
        checkIns = snapshot.checkIns;
        checkInEntries = snapshot.checkInEntries;
        saveCheckIns();
        saveCheckInEntries();
      },
      { renderAfter: false }
    );
  });
}

if (checkinEntryForm) {
  checkinEntryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }
    const checkInId = String(checkinEntryItem ? checkinEntryItem.value : "");
    const checkIn = checkIns.find((item) => item.id === checkInId);
    if (!checkIn) {
      return;
    }
    const dateValue = String(checkinEntryDate ? checkinEntryDate.value : "");
    if (!isDateKey(dateValue)) {
      return;
    }
    const completed = String(checkinEntryStatus ? checkinEntryStatus.value : "yes") === "yes";
    checkInEntries.unshift({
      id: createId(),
      checkInId: checkIn.id,
      date: dateValue,
      completed,
      notes: String(checkinEntryNotes ? checkinEntryNotes.value : "").trim(),
      createdAt: new Date().toISOString()
    });
    saveCheckInEntries();
    if (checkinEntryDate) {
      checkinEntryDate.value = getDateKey(normalizeDate(new Date()));
    }
    if (checkinEntryStatus) {
      checkinEntryStatus.value = "yes";
    }
    if (checkinEntryNotes) {
      checkinEntryNotes.value = "";
    }
    render();
  });
}

if (bucketEntryForm) {
  bucketEntryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }
    const trackerId = String(bucketEntryGoal ? bucketEntryGoal.value : "");
    const dateValue = String(bucketEntryDate ? bucketEntryDate.value : "");
    const notes = String(bucketEntryNotes ? bucketEntryNotes.value : "").trim();
    const result = closeOutBucketGoal(trackerId, dateValue, notes);
    if (!result.success) {
      alert(result.message);
      return;
    }
    if (bucketEntryDate) {
      bucketEntryDate.value = getDateKey(normalizeDate(new Date()));
    }
    if (bucketEntryNotes) {
      bucketEntryNotes.value = "";
    }
    render();
  });
}

if (bucketListViewList) {
  bucketListViewList.addEventListener("click", (event) => {
    if (!currentUser) {
      return;
    }
    const closeButton = event.target.closest("button[data-action='close-bucket-goal']");
    if (closeButton) {
      const trackerId = String(closeButton.dataset.id || "");
      const todayKey = getDateKey(normalizeDate(new Date()));
      const result = closeOutBucketGoal(trackerId, todayKey, "Closed from Bucket List view");
      if (!result.success) {
        alert(result.message);
        return;
      }
      render();
      return;
    }
    const reopenButton = event.target.closest("button[data-action='reopen-bucket-goal']");
    if (reopenButton) {
      const trackerId = String(reopenButton.dataset.id || "");
      const todayKey = getDateKey(normalizeDate(new Date()));
      const result = reopenBucketGoal(trackerId, todayKey, "Reopened from Bucket List view");
      if (!result.success) {
        alert(result.message);
        return;
      }
      render();
      return;
    }
  });
}

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser) {
    return;
  }
  const tracker = trackers.find((item) => item.id === entryTracker.value);
  if (!tracker) {
    return;
  }
  if (normalizeGoalType(tracker.goalType) === "bucket" || tracker.archived) {
    return;
  }

  const dateValue = entryDate.value;
  if (!isDateKey(dateValue)) {
    return;
  }

  const isBinaryGoal = isBinaryGoalType(tracker.goalType);
  const amount = isBinaryGoal
    ? (String(entryYesNo ? entryYesNo.value : "yes") === "yes" ? 1 : 0)
    : normalizePositiveAmount(entryAmount.value, 1);
  if (amount < 0) {
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
  notifyAccountabilityPartnerEntryUpdate(tracker, amount, dateValue);

  saveEntries();
  entryUiPrefs.mode = "solo";
  entryUiPrefs.trackerId = tracker.id;
  entryUiPrefs.date = dateValue;
  saveEntryUiPrefs();
  if (isBinaryGoal) {
    if (entryYesNo) {
      entryYesNo.value = "yes";
    }
  } else {
    entryAmount.value = "1.00";
  }
  entryNotes.value = "";
  entryDate.value = dateValue;
  weekEntryStatusMessage = "";
  entrySoloInitialized = true;
  render();
});

if (weekEntryForm) {
  weekEntryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }

    const standardTrackers = getStandardEntryTrackers();
    if (standardTrackers.length < 1) {
      return;
    }

    const trackerById = new Map(standardTrackers.map((tracker) => [tracker.id, tracker]));
    const validTrackerIds = new Set(standardTrackers.map((tracker) => tracker.id));
    const weekRange = getWeekRange(weekEntryAnchor);
    const weekDateKeys = [];
    for (let offset = 0; offset < 7; offset += 1) {
      weekDateKeys.push(getDateKey(addDays(weekRange.start, offset)));
    }
    const validDateKeys = new Set(weekDateKeys);
    const keysToReplace = new Set();
    validTrackerIds.forEach((trackerId) => {
      weekDateKeys.forEach((dateKey) => {
        keysToReplace.add(`${trackerId}|${dateKey}`);
      });
    });

    const latestNotesByKey = new Map();
    entries.forEach((entry) => {
      const key = `${entry.trackerId}|${entry.date}`;
      if (!latestNotesByKey.has(key)) {
        latestNotesByKey.set(key, String(entry.notes || "").trim());
      }
    });

    const controls = Array.from(weekEntryForm.querySelectorAll("[data-week-entry='1']"));
    const replacementValues = new Map();
    const invalidCells = [];
    controls.forEach((control) => {
      const trackerId = String(control.dataset.trackerId || "");
      const date = String(control.dataset.date || "");
      if (!validTrackerIds.has(trackerId) || !validDateKeys.has(date)) {
        return;
      }
      const tracker = trackerById.get(trackerId);
      if (!tracker) {
        return;
      }
      const parsed = parseWeekEntryInputValue(control.value, tracker);
      if (!parsed.valid) {
        invalidCells.push(`${tracker.name} (${formatDate(parseDateKey(date))})`);
        return;
      }
      replacementValues.set(`${trackerId}|${date}`, parsed.amount);
    });

    if (invalidCells.length > 0) {
      alert(`Fix invalid week update values: ${invalidCells.slice(0, 4).join(", ")}${invalidCells.length > 4 ? "..." : ""}`);
      return;
    }

    const removedCount = entries.reduce((count, entry) => (
      keysToReplace.has(`${entry.trackerId}|${entry.date}`) ? count + 1 : count
    ), 0);

    entries = entries.filter((entry) => !keysToReplace.has(`${entry.trackerId}|${entry.date}`));

    let insertedCount = 0;
    replacementValues.forEach((amount, key) => {
      if (amount === null) {
        return;
      }
      const [trackerId, date] = key.split("|");
      const tracker = trackerById.get(trackerId) || null;
      entries.unshift({
        id: createId(),
        trackerId,
        date,
        amount,
        notes: latestNotesByKey.get(key) || "Week Update",
        createdAt: new Date().toISOString()
      });
      if (tracker) {
        notifyAccountabilityPartnerEntryUpdate(tracker, amount, date);
      }
      insertedCount += 1;
    });

    weekEntryStatusMessage = `Week update saved. ${insertedCount} value${insertedCount === 1 ? "" : "s"} set, ${removedCount} prior row${removedCount === 1 ? "" : "s"} replaced.`;
    entryUiPrefs.mode = "week";
    saveEntryUiPrefs();
    saveEntries();
    render();
  });
}

scheduleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser) {
    return;
  }
  const tracker = trackers.find((item) => item.id === scheduleGoal.value);
  if (!tracker || tracker.archived) {
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
      const scheduleDay = flipButton.closest(".schedule-day");
      const nextFlipped = scheduleDay
        ? !scheduleDay.classList.contains("is-flipped")
        : !Boolean(flippedScheduleDays[dateKey]);
      flippedScheduleDays[dateKey] = nextFlipped;
      if (scheduleDay) {
        scheduleDay.classList.toggle("is-flipped", nextFlipped);
        scheduleDay.querySelectorAll("button[data-action='toggle-day-flip']").forEach((button) => {
          button.setAttribute("aria-pressed", nextFlipped ? "true" : "false");
        });
      } else {
        renderGoalScheduleTab();
      }
    }
    return;
  }

  const button = event.target.closest("button[data-action='delete-schedule']");
  if (!button) {
    return;
  }
  const scheduleId = String(button.dataset.id || "");
  const deletedItem = schedules.find((item) => item.id === scheduleId);
  if (!deletedItem) {
    return;
  }
  schedules = schedules.filter((item) => item.id !== scheduleId);
  saveSchedules();
  renderGoalScheduleTab();
  queueUndoableAction(
    "Schedule item deleted.",
    null,
    () => {
      schedules.unshift(deletedItem);
      saveSchedules();
      renderGoalScheduleTab();
    },
    { renderAfter: false, renderAfterUndo: false }
  );
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
  if (!trackers.some((item) => item.id === trackerId) || !isDateKey(date) || amount < 0) {
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
  const snapshotButton = event.target.closest("button[data-action='reopen-snapshot'], button[data-action='delete-snapshot']");
  if (snapshotButton) {
    handleSnapshotActionClick(event);
    return;
  }
  const button = event.target.closest("button[data-action='delete-entry']");
  if (!button) {
    return;
  }
  const entryId = String(button.dataset.id || "");
  const deletedEntry = entries.find((item) => item.id === entryId);
  if (!deletedEntry) {
    return;
  }
  entries = entries.filter((item) => item.id !== entryId);
  saveEntries();
  render();
  queueUndoableAction(
    "Entry deleted.",
    null,
    () => {
      entries.unshift(deletedEntry);
      saveEntries();
    },
    { renderAfter: false }
  );
});

if (entryListSort) {
  entryListSort.addEventListener("change", () => {
    entryListSortMode = entryListSort.value === "goal_asc" ? "goal_asc" : "date_desc";
    renderEntryListTab();
  });
}

if (entryListTypeFilterSelect) {
  entryListTypeFilterSelect.addEventListener("change", () => {
    entryListTypeFilter = normalizeGoalTypeFilterValue(entryListTypeFilterSelect.value);
    renderEntryListTab();
  });
}

if (entryListStatusFilterSelect) {
  entryListStatusFilterSelect.addEventListener("change", () => {
    entryListStatusFilter = normalizeGoalStatusFilterValue(entryListStatusFilterSelect.value);
    renderEntryListTab();
  });
}

if (entryListBucketFilterSelect) {
  entryListBucketFilterSelect.addEventListener("change", () => {
    entryListBucketFilter = normalizeBucketStatusFilterValue(entryListBucketFilterSelect.value);
    renderEntryListTab();
  });
}

bindPeriodGoalFilters("week", weekGoalTypeFilterSelect, weekGoalStatusFilterSelect, weekGoalTagFilterSelect);
bindPeriodGoalFilters("month", monthGoalTypeFilterSelect, monthGoalStatusFilterSelect, monthGoalTagFilterSelect);
bindPeriodGoalFilters("year", yearGoalTypeFilterSelect, yearGoalStatusFilterSelect, yearGoalTagFilterSelect);

if (bucketListGoalStatusFilterSelect) {
  bucketListGoalStatusFilterSelect.addEventListener("change", () => {
    bucketListGoalStatusFilter = normalizeGoalStatusFilterValue(bucketListGoalStatusFilterSelect.value);
    renderBucketListViewTab();
  });
}

if (bucketListItemStatusFilterSelect) {
  bucketListItemStatusFilterSelect.addEventListener("change", () => {
    bucketListItemStatusFilter = normalizeBucketStatusFilterValue(bucketListItemStatusFilterSelect.value);
    renderBucketListViewTab();
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

if (goalJournalForm) {
  goalJournalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }
    const dateValue = String(goalJournalDate ? goalJournalDate.value : "");
    if (!isDateKey(dateValue)) {
      return;
    }
    const trackerId = String(goalJournalGoal ? goalJournalGoal.value : "");
    const tracker = trackerId ? trackers.find((item) => item.id === trackerId) : null;
    const title = String(goalJournalTitle ? goalJournalTitle.value : "").trim();
    const content = String(goalJournalContent ? goalJournalContent.value : "").trim();
    if (!content) {
      return;
    }
    goalJournalEntries.unshift({
      id: createId(),
      date: dateValue,
      trackerId: tracker ? tracker.id : "",
      goalName: tracker ? tracker.name : "",
      title,
      content,
      createdAt: new Date().toISOString()
    });
    saveGoalJournalEntries();
    if (goalJournalDate) {
      goalJournalDate.value = getDateKey(normalizeDate(new Date()));
    }
    if (goalJournalTitle) {
      goalJournalTitle.value = "";
    }
    if (goalJournalContent) {
      goalJournalContent.value = "";
    }
    renderGoalJournalTab();
  });
}

if (goalJournalList) {
  goalJournalList.addEventListener("click", (event) => {
    if (!currentUser) {
      return;
    }
    const deleteButton = event.target.closest("button[data-action='delete-goal-journal']");
    if (!deleteButton) {
      return;
    }
    const journalId = String(deleteButton.dataset.id || "");
    if (!journalId) {
      return;
    }
    const deletedEntry = goalJournalEntries.find((item) => item.id === journalId);
    if (!deletedEntry) {
      return;
    }
    goalJournalEntries = goalJournalEntries.filter((item) => item.id !== journalId);
    saveGoalJournalEntries();
    renderGoalJournalTab();
    queueUndoableAction(
      "Journal entry deleted.",
      null,
      () => {
        goalJournalEntries.unshift(deletedEntry);
        saveGoalJournalEntries();
        renderGoalJournalTab();
      },
      { renderAfter: false, renderAfterUndo: false }
    );
  });
}

if (pointStoreToggleForm) {
  pointStoreToggleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser || !isRewardPointsEnabled() || !pointStoreEnabledSelect) {
      return;
    }
    settings.pointStoreRewardsEnabled = pointStoreEnabledSelect.value !== "off";
    saveSettings();
    applyRewardPointsFeatureVisibility();
    renderTabs();
    renderRewardsSettings();
    renderPointStoreTab();
  });
}

if (pointAdjustForm) {
  pointAdjustForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser || !isRewardPointsEnabled()) {
      return;
    }
    const direction = pointAdjustDirectionSelect && pointAdjustDirectionSelect.value === "remove"
      ? "remove"
      : "add";
    const amount = normalizePositiveAmount(pointAdjustAmount ? pointAdjustAmount.value : 0, 0);
    if (amount <= 0) {
      alert("Enter an amount greater than zero.");
      return;
    }
    if (direction === "remove" && getPointBankBalance() < amount) {
      alert("You cannot remove more points than are in your point bank.");
      return;
    }
    const signedAmount = direction === "remove" ? -amount : amount;
    const note = String(pointAdjustNote ? pointAdjustNote.value : "").trim();
    pointTransactions.unshift({
      id: createId(),
      type: "adjustment",
      amount: signedAmount,
      createdAt: new Date().toISOString(),
      note: note || (direction === "remove" ? "Manual point removal" : "Manual point addition")
    });
    savePointTransactions();
    if (pointAdjustNote) {
      pointAdjustNote.value = "";
    }
    renderPointStoreTab();
    renderAuthState();
  });
}

if (rewardForm) {
  rewardForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser || !isPointStoreRewardsEnabled()) {
      return;
    }
    const name = String(rewardName ? rewardName.value : "").trim();
    const cost = normalizePositiveInt(rewardCost ? rewardCost.value : 1, 1);
    const notes = String(rewardNotes ? rewardNotes.value : "").trim();
    if (!name || cost < 1) {
      return;
    }
    rewards.unshift({
      id: createId(),
      name,
      cost,
      notes,
      createdAt: new Date().toISOString()
    });
    saveRewards();
    rewardForm.reset();
    if (rewardCost) {
      rewardCost.value = "10";
    }
    renderRewardsSettings();
    renderPointStoreTab();
  });
}

if (rewardSettingsList) {
  rewardSettingsList.addEventListener("click", (event) => {
    if (!currentUser || !isPointStoreRewardsEnabled()) {
      return;
    }
    const saveButton = event.target.closest("button[data-action='save-reward']");
    if (saveButton) {
      const rewardId = String(saveButton.dataset.id || "");
      const card = saveButton.closest("li[data-reward-id]");
      if (!rewardId || !card) {
        return;
      }
      const nameInput = card.querySelector("input[data-field='name']");
      const costInput = card.querySelector("input[data-field='cost']");
      const notesInput = card.querySelector("input[data-field='notes']");
      const reward = rewards.find((item) => item.id === rewardId);
      if (!reward || !nameInput || !costInput || !notesInput) {
        return;
      }
      const nextName = String(nameInput.value || "").trim();
      const nextCost = normalizePositiveInt(costInput.value, reward.cost);
      const nextNotes = String(notesInput.value || "").trim();
      if (!nextName || nextCost < 1) {
        return;
      }
      reward.name = nextName;
      reward.cost = nextCost;
      reward.notes = nextNotes;
      saveRewards();
      renderRewardsSettings();
      renderPointStoreTab();
      return;
    }

    const deleteButton = event.target.closest("button[data-action='delete-reward']");
    if (!deleteButton) {
      return;
    }
    const rewardId = String(deleteButton.dataset.id || "");
    const reward = rewards.find((item) => item.id === rewardId);
    if (!reward) {
      return;
    }
    const confirmed = confirm(`Delete reward "${reward.name}"?`);
    if (!confirmed) {
      return;
    }
    const deletedReward = deepCloneValue(reward);
    rewards = rewards.filter((item) => item.id !== rewardId);
    saveRewards();
    renderRewardsSettings();
    renderPointStoreTab();
    queueUndoableAction(
      `Deleted reward "${reward.name}".`,
      null,
      () => {
        rewards.unshift(deletedReward);
        saveRewards();
        renderRewardsSettings();
        renderPointStoreTab();
      },
      { renderAfter: false, renderAfterUndo: false }
    );
  });
}

if (pointStoreRewardList) {
  pointStoreRewardList.addEventListener("click", (event) => {
    if (!currentUser || !isPointStoreRewardsEnabled()) {
      return;
    }
    const redeemButton = event.target.closest("button[data-action='redeem-reward']");
    if (!redeemButton) {
      return;
    }
    const rewardId = String(redeemButton.dataset.id || "");
    const result = redeemReward(rewardId);
    if (!result.success && result.message) {
      alert(result.message);
    }
    if (result.success) {
      renderPointStoreTab();
      renderRewardsSettings();
      renderAuthState();
    }
  });
}

if (pointStoreActiveList) {
  pointStoreActiveList.addEventListener("click", (event) => {
    if (!currentUser || !isPointStoreRewardsEnabled()) {
      return;
    }
    const closeButton = event.target.closest("button[data-action='close-active-reward']");
    if (closeButton) {
      const purchaseId = String(closeButton.dataset.id || "");
      const result = closeRewardPurchase(purchaseId);
      if (!result.success && result.message) {
        alert(result.message);
      }
      if (result.success) {
        renderPointStoreTab();
      }
      return;
    }

    const refundButton = event.target.closest("button[data-action='refund-active-reward']");
    if (!refundButton) {
      return;
    }
    const purchaseId = String(refundButton.dataset.id || "");
    const result = refundRewardPurchase(purchaseId);
    if (!result.success && result.message) {
      alert(result.message);
    }
    if (result.success) {
      renderPointStoreTab();
      renderAuthState();
    }
  });
}

if (pointStoreClearClosedButton) {
  pointStoreClearClosedButton.addEventListener("click", () => {
    if (!currentUser || !isPointStoreRewardsEnabled()) {
      return;
    }
    const closedCount = rewardPurchases.filter((item) => item && item.status !== "active").length;
    if (closedCount < 1) {
      return;
    }
    const confirmed = confirm(`Clear ${closedCount} closed reward${closedCount === 1 ? "" : "s"}?`);
    if (!confirmed) {
      return;
    }
    const priorPurchases = deepCloneValue(rewardPurchases);
    clearClosedRewardPurchases();
    renderPointStoreTab();
    queueUndoableAction(
      `Cleared ${closedCount} closed reward${closedCount === 1 ? "" : "s"}.`,
      null,
      () => {
        rewardPurchases = priorPurchases;
        saveRewardPurchases();
        renderPointStoreTab();
      },
      { renderAfter: false, renderAfterUndo: false }
    );
  });
}

if (setupWizardForm) {
  setupWizardForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }
    applySetupWizardSelections({ createTemplates: true });
    render();
    queueUndoableAction(
      "Quick setup applied.",
      () => {},
      null,
      { canUndo: false, renderAfter: false }
    );
  });
}

if (setupWizardSkipButton) {
  setupWizardSkipButton.addEventListener("click", () => {
    if (!currentUser) {
      return;
    }
    settings.onboardingComplete = true;
    saveSettings();
    renderManageSetupWizard();
    queueUndoableAction(
      "Setup skipped. You can still configure everything in Settings.",
      () => {},
      null,
      { canUndo: false, renderAfter: false }
    );
  });
}

if (goalHitToastDismiss) {
  goalHitToastDismiss.addEventListener("click", () => {
    hideGoalHitToast();
  });
}

if (friendForm) {
  friendForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser || !friendNameInput) {
      return;
    }
    const name = String(friendNameInput.value || "").trim();
    const email = String(friendEmailInput ? friendEmailInput.value : "").trim();
    if (!name) {
      return;
    }
    friends.unshift({
      id: createId(),
      name,
      email,
      createdAt: new Date().toISOString()
    });
    saveFriends();
    friendForm.reset();
    renderFriendsSettings();
    if (email) {
      await sendFriendAddedNotification(name, email);
    }
  });
}

if (friendList) {
  friendList.addEventListener("click", (event) => {
    if (!currentUser) {
      return;
    }
    const deleteButton = event.target.closest("button[data-action='delete-friend']");
    if (!deleteButton) {
      return;
    }
    const friendId = String(deleteButton.dataset.id || "");
    const friend = friends.find((item) => item.id === friendId);
    if (!friend) {
      return;
    }
    const shouldDelete = confirm(`Delete friend "${friend.name}"?`);
    if (!shouldDelete) {
      return;
    }
    friends = friends.filter((item) => item.id !== friendId);
    saveFriends();
    renderFriendsSettings();
  });
}

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser) {
    return;
  }
  settings.weekStart = weekStartSelect.value === "sunday" ? "sunday" : "monday";
  settings.compareToLastDefault = compareDefaultSelect.value !== "off";
  settings.projectionAverageSource = normalizeProjectionAverageSource(
    projectionAverageSelect ? projectionAverageSelect.value : settings.projectionAverageSource
  );
  settings.rewardPointsEnabled = rewardPointsEnabledSelect ? rewardPointsEnabledSelect.value === "on" : false;
  settings.goalHitNotificationsEnabled = goalHitNotificationsSelect ? goalHitNotificationsSelect.value !== "off" : true;
  settings.bucketListEnabled = bucketListEnabledSelect ? bucketListEnabledSelect.value !== "off" : true;
  settings.theme = normalizeThemeKey(themeSelect ? themeSelect.value : settings.theme);
  settings.compactMode = compactModeSelect ? compactModeSelect.value === "on" : false;
  if (priorCompareDefault !== settings.compareToLastDefault) {
    resetGoalCompareState();
  }
  saveSettings();
  applyTheme();
  applyDensityMode();
  applyBucketListFeatureVisibility();
  applyRewardPointsFeatureVisibility();
  scheduleWeekAnchor = normalizeDate(new Date());
  resetScheduleTileFlips();
  if (!isGoalHitNotificationsEnabled()) {
    hideGoalHitToast();
  }
  render();

  if (settings.goalHitNotificationsEnabled && typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
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

if (weekCloseoutButton) {
  weekCloseoutButton.addEventListener("click", () => {
    closeOutPeriod("week");
  });
}

if (monthCloseoutButton) {
  monthCloseoutButton.addEventListener("click", () => {
    closeOutPeriod("month");
  });
}

if (yearCloseoutButton) {
  yearCloseoutButton.addEventListener("click", () => {
    closeOutPeriod("year");
  });
}

weekList.addEventListener("click", handleGraphCardActions);
monthList.addEventListener("click", handleGraphCardActions);
yearList.addEventListener("click", handleGraphCardActions);
[weekList, monthList, yearList].forEach((listElement) => {
  listElement.addEventListener("change", handleViewControlChange);
  listElement.addEventListener("submit", handleSharedGoalEntrySubmit);
  listElement.addEventListener("click", (event) => {
    const summary = event.target.closest("summary.accordion-summary");
    if (!summary) {
      return;
    }
    const details = summary.closest("details[data-accordion-period][data-accordion-section]");
    if (!details) {
      return;
    }
    setTimeout(() => {
      const period = String(details.dataset.accordionPeriod || "");
      const section = String(details.dataset.accordionSection || "");
      if (!periodAccordionState[period] || !(section in periodAccordionState[period])) {
        return;
      }
      periodAccordionState[period][section] = details.open;
    }, 0);
  });
});

[weekList, monthList, yearList].forEach((listElement) => {
  listElement.addEventListener("mousemove", handleGraphHover);
  listElement.addEventListener("mouseleave", () => hideTooltipsInList(listElement));
});
if (graphModalBody) {
  graphModalBody.addEventListener("click", handleGraphCardActions);
  graphModalBody.addEventListener("change", handleViewControlChange);
  graphModalBody.addEventListener("mousemove", handleGraphHover);
  graphModalBody.addEventListener("mouseleave", () => hideTooltipsInList(graphModalBody));
}
document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const closeFiltersButton = target ? target.closest("button[data-action='close-view-filters']") : null;
  if (closeFiltersButton) {
    const disclosure = closeFiltersButton.closest(".view-filters-disclosure");
    if (disclosure) {
      disclosure.open = false;
    }
    return;
  }
  if (!event.target.closest(".download-menu-wrap")) {
    hideAllDownloadMenus();
  }
  if (!event.target.closest(".pace-chip-wrap")) {
    hideAllPaceDetailPopovers();
  }
  if (!target || !target.closest(".view-filters-disclosure")) {
    closeAllViewFilterDisclosures();
  }
  if (
    notificationsPanelOpen
    && !target?.closest("#notifications-panel")
    && !target?.closest("#notifications-toggle-btn")
  ) {
    notificationsPanelOpen = false;
    renderNotifications();
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
  const snapshotButton = event.target.closest("button[data-action='reopen-snapshot'], button[data-action='delete-snapshot']");
  if (snapshotButton) {
    handleSnapshotActionClick(event);
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

  const paceDetailButton = event.target.closest("button[data-action='toggle-pace-detail']");
  if (paceDetailButton) {
    const wrap = paceDetailButton.closest(".pace-chip-wrap");
    if (!wrap) {
      return;
    }
    const shouldOpen = !wrap.classList.contains("show-pace-detail");
    hideAllPaceDetailPopovers(event.currentTarget, wrap);
    wrap.classList.toggle("show-pace-detail", shouldOpen);
    paceDetailButton.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
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
  const now = normalizeDate(new Date());
  const chartRange = getChartDisplayRange(index, tracker.id, range, now);
  const series = getDailySeries(index, tracker.id, chartRange);
  const compareEnabled = getGoalCompareEnabled(graphModalState.period, tracker.id);
  const overlayRange = compareEnabled ? getOverlayRange(graphModalState.period, range) : null;
  const overlaySeries = overlayRange ? getAlignedOverlaySeries(index, tracker.id, range, overlayRange) : null;
  const pointsEnabled = getGraphPointsEnabled(graphModalState.period, tracker.id);
  const projectionAllowed = shouldAllowProjectionLine(graphModalState.period, range, now);
  const projectionEnabled = projectionAllowed ? getProjectionLineEnabled(graphModalState.period, tracker.id) : false;
  const projection = projectionAllowed && projectionEnabled
    ? getProjectionSeries(index, tracker.id, range, chartRange, series)
    : null;
  const target = periodMeta.targetFn(tracker);
  const periodProgress = sumTrackerRange(index, tracker.id, range);
  const goalHit = target > 0 && periodProgress >= target;

  graphModalTitle.textContent = `${tracker.name} | ${periodMeta.title} Chart`;
  const projectionControl = projectionAllowed
    ? `
      <label class="check-inline check-compact graph-check">
        <input type="checkbox" data-action="toggle-projection" data-period="${graphModalState.period}" data-id="${tracker.id}" ${projectionEnabled ? "checked" : ""} />
        Projection
      </label>
    `
    : "";
  graphModalBody.innerHTML = `
    <div class="graph-modal-tools">
      <div class="graph-action-group">
        <label class="check-inline check-compact graph-check">
          <input type="checkbox" data-action="toggle-points" data-period="${graphModalState.period}" data-id="${tracker.id}" ${pointsEnabled ? "checked" : ""} />
          Show points
        </label>
        ${projectionControl}
      </div>
      ${createDownloadMenuMarkup(graphModalState.period, tracker.id, "modal")}
    </div>
  `;
  graphModalBody.innerHTML += createCumulativeGraphSvg(series, target, range, overlaySeries, overlayRange, {
    showCurrentPoints: pointsEnabled,
    showOverlayPoints: pointsEnabled,
    showProjectionPoints: pointsEnabled,
    large: true,
    periodName: graphModalState.period,
    unit: tracker.unit,
    domainDays: getRangeDays(range),
    projection,
    goalHit
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
        <p class="target-status-line">${formatProgressAgainstGoal(status.progress, status.target, tracker.unit)} (${status.completion}%)</p>
        <div class="progress"><span class="progress-fill" style="width:${Math.min(status.completion, 100)}%"></span></div>
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

  const progress = sumTrackerRange(index, tracker.id, range);
  const completion = percent(progress, target);
  const projectionMeta = getTrackerProjectionForRange(index, tracker.id, range, now);
  const projected = projectionMeta.projected;
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
  const lastEnteredDay = dailyTotals.length > 0 ? dailyTotals[dailyTotals.length - 1] : null;
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

  const modeSelect = `
    <label class="avg-select-control">
      Previous Periods
      <select data-action="set-avg-mode">
        <option value="week" ${selectedMode === "week" ? "selected" : ""}>Weeks</option>
        <option value="month" ${selectedMode === "month" ? "selected" : ""}>Months</option>
        <option value="year" ${selectedMode === "year" ? "selected" : ""}>Years</option>
      </select>
    </label>
  `;

  const metricSelect = `
    <label class="avg-select-control">
      Metric
      <select data-action="set-history-metric">
        <option value="avg" ${selectedMetric === "avg" ? "selected" : ""}>Average</option>
        <option value="total" ${selectedMetric === "total" ? "selected" : ""}>Total</option>
      </select>
    </label>
  `;

  const bestDayText = bestDay
    ? `${formatAmountWithUnit(bestDay.amount, unit)} on ${formatDate(parseDateKey(bestDay.date))}`
    : "No non-zero day";
  const lastEnteredDayText = lastEnteredDay
    ? `${formatAmountWithUnit(lastEnteredDay.amount, unit)} on ${formatDate(parseDateKey(lastEnteredDay.date))}`
    : "No entries yet";

  const longestStreakText = formatStreakLabel(streakStats.longest);
  const currentStreakText = formatStreakLabel(streakStats.current);
  const currentWeekLabel = getPeriodRecordLabel("week", getWeekRange(today));
  const currentMonthLabel = getPeriodRecordLabel("month", getMonthRange(today));
  const currentYearLabel = getPeriodRecordLabel("year", getYearRange(today));
  const historyTitle = selectedMetric === "total" ? "Total vs last 4 periods" : "Average/day vs last 4 periods";

  return `
    <section class="deep-dive-insights">
      <h4 class="target-status-title">Deep Dive Insights</h4>
      <div class="deep-dive-grid">
        <article class="deep-dive-card">
          <div class="best-kpi-item">
            <p class="best-kpi-current"><strong>Last Day Entered</strong>: ${escapeHtml(lastEnteredDayText)}</p>
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
            <div class="avg-mode-toggle">${modeSelect}</div>
            <div class="avg-mode-toggle avg-mode-toggle-right">
              ${metricSelect}
            </div>
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
  if (value === "total" || value === "sum") {
    return "total";
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
  totals.sort((a, b) => dateKeyToDayNumber(a.date) - dateKeyToDayNumber(b.date));
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
  const todayDay = dateKeyToDayNumber(todayKey);
  const ordered = dailyTotals
    .filter((point) => isDateKey(point.date) && dateKeyToDayNumber(point.date) <= todayDay)
    .sort((a, b) => dateKeyToDayNumber(a.date) - dateKeyToDayNumber(b.date));

  const positiveDays = ordered
    .filter((point) => (Number(point.amount) || 0) > 0)
    .map((point) => dateKeyToDayNumber(point.date));

  let longest = { length: 0, startDate: "", endDate: "" };
  let runLength = 0;
  let runStartDay = 0;
  let runEndDay = 0;
  positiveDays.forEach((dayNumber, index) => {
    if (runLength === 0) {
      runLength = 1;
      runStartDay = dayNumber;
      runEndDay = dayNumber;
    } else {
      const prevDay = positiveDays[index - 1];
      if (dayNumber === prevDay + 1) {
        runLength += 1;
        runEndDay = dayNumber;
      } else {
        if (runLength > longest.length) {
          longest = {
            length: runLength,
            startDate: dayNumberToDateKey(runStartDay),
            endDate: dayNumberToDateKey(runEndDay)
          };
        }
        runLength = 1;
        runStartDay = dayNumber;
        runEndDay = dayNumber;
      }
    }
  });
  if (runLength > longest.length) {
    longest = {
      length: runLength,
      startDate: dayNumberToDateKey(runStartDay),
      endDate: dayNumberToDateKey(runEndDay)
    };
  }

  // Current streak only resets on an explicit 0 entry.
  const current = { length: 0, startDate: "", endDate: "" };
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const point = ordered[index];
    const amount = Number(point.amount) || 0;
    if (amount === 0) {
      break;
    }
    if (amount > 0) {
      if (current.length === 0) {
        current.endDate = point.date;
      }
      current.length += 1;
      current.startDate = point.date;
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
  for (let offset = 0; offset <= 4; offset += 1) {
    const compareRange = shiftPeriodRange(periodName, currentRange, offset);
    if (offset > 0) {
      if (!firstEntryDate || compareRange.end < firstEntryDate) {
        break;
      }
    }
    const total = sumTrackerRange(index, tracker.id, compareRange);
    const days = getRangeDays(compareRange);
    const value = selectedMetric === "total" ? total : safeDivide(total, days);
    history.push({
      offset,
      value,
      label: getAverageBarLabel(periodName, offset),
      rangeLabel: `${formatDate(compareRange.start)} to ${formatDate(compareRange.end)}`
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

  const projectionInput = event.target.closest("input[data-action='toggle-projection']");
  if (projectionInput) {
    const period = projectionInput.dataset.period;
    const id = projectionInput.dataset.id;
    if (!period || !id || !projectionLineState[period]) {
      return;
    }
    projectionLineState[period][id] = projectionInput.checked;
    renderPeriodTabs();
    renderGraphModal();
    return;
  }

  const avgModeSelect = event.target.closest("select[data-action='set-avg-mode']");
  if (avgModeSelect) {
    graphModalState.avgMode = normalizePeriodMode(avgModeSelect.value);
    renderGraphModal();
    return;
  }

  const historyMetricSelect = event.target.closest("select[data-action='set-history-metric']");
  if (historyMetricSelect) {
    graphModalState.historyMetric = normalizeHistoryMetric(historyMetricSelect.value);
    renderGraphModal();
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
  const hoveredPoint = event.target.closest("circle[data-point='1']");
  if (!hoveredPoint || !svg.contains(hoveredPoint)) {
    tooltip.classList.add("hidden");
    return;
  }

  const rect = svg.getBoundingClientRect();
  const view = svg.viewBox.baseVal;
  if (rect.width <= 0 || rect.height <= 0 || view.width <= 0 || view.height <= 0) {
    tooltip.classList.add("hidden");
    return;
  }

  hideTooltipsInList(event.currentTarget);
  const cx = Number(hoveredPoint.getAttribute("cx"));
  const cy = Number(hoveredPoint.getAttribute("cy"));
  const px = (cx / view.width) * rect.width;
  const py = (cy / view.height) * rect.height;

  const dateLabel = hoveredPoint.dataset.dateLabel || "";
  const amountLabel = hoveredPoint.dataset.amount || "0";
  const cumulativeLabel = hoveredPoint.dataset.cumulative || "0";
  const unitLabel = hoveredPoint.dataset.unit ? ` ${hoveredPoint.dataset.unit}` : "";
  const seriesLabel = hoveredPoint.dataset.seriesLabel || "Current";
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

function hideAllPaceDetailPopovers(scope = document, exceptWrap = null) {
  if (!scope || !scope.querySelectorAll) {
    return;
  }
  scope.querySelectorAll(".pace-chip-wrap.show-pace-detail").forEach((wrap) => {
    if (exceptWrap && wrap === exceptWrap) {
      return;
    }
    wrap.classList.remove("show-pace-detail");
    const button = wrap.querySelector("button[data-action='toggle-pace-detail']");
    if (button) {
      button.setAttribute("aria-expanded", "false");
    }
  });
}

function render() {
  applyTheme();
  applyDensityMode();
  renderAuthState();
  if (!currentUser) {
    return;
  }
  updateGoalTypeFields();
  applyBucketListFeatureVisibility();
  applyRewardPointsFeatureVisibility();
  renderTabs();
  renderManageGoals();
  renderManageSetupWizard();
  renderCheckinsTab();
  renderEntryTab();
  renderGoalJournalTab();
  renderBucketEntryTab();
  renderCheckinEntryTab();
  renderEntryListTab();
  renderGoalScheduleTab();
  renderPeriodTabs();
  renderBucketListViewTab();
  renderFriendsSettings();
  renderRewardsSettings();
  renderPointStoreTab();
  refreshGoalHitNotifications(true);
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
  const username = isAuthenticated ? getUserDisplayName(currentUser) : "";
  const pointSuffix = isAuthenticated
    ? ` | ${formatAmount(getPointBankBalance())} pts`
    : "";
  activeUserLabel.textContent = isAuthenticated ? `${username}${pointSuffix}` : "";
  renderNotifications();
  if (isAuthenticated) {
    showAuthMessage("");
  } else if (graphModal) {
    graphModal.classList.add("hidden");
    graphModal.setAttribute("aria-hidden", "true");
  }
}

async function handleSharedGoalEntrySubmit(event) {
  if (!currentUser) {
    return;
  }
  const form = event.target.closest("form[data-action='add-shared-goal-entry']");
  if (!form) {
    return;
  }
  event.preventDefault();
  const shareId = String(form.dataset.shareId || "");
  const ownerId = String(form.dataset.ownerId || "");
  const goalId = String(form.dataset.goalId || "");
  const dateValue = String(form.elements.date ? form.elements.date.value : "");
  const amount = normalizePositiveAmount(form.elements.amount ? form.elements.amount.value : "", -1);
  const notes = String(form.elements.notes ? form.elements.notes.value : "").trim();
  if (!shareId || !ownerId || !goalId || !isDateKey(dateValue) || amount < 0) {
    alert("Enter a valid date and amount for the shared goal update.");
    return;
  }
  const result = await addSharedGoalEntryUpdate(shareId, ownerId, goalId, dateValue, amount, notes);
  if (!result.success && result.message) {
    alert(result.message);
    return;
  }
  if (form.elements.amount) {
    form.elements.amount.value = "1.00";
  }
  if (form.elements.notes) {
    form.elements.notes.value = "";
  }
  await refreshSharedGoalOwnerData();
  renderPeriodTabs();
}

function renderNotifications() {
  if (
    !notificationsToggleButton
    || !notificationsBadge
    || !notificationsPanel
    || !notificationsList
    || !notificationsEmpty
    || !notificationsMarkReadButton
  ) {
    return;
  }
  const isAuthenticated = Boolean(currentUser);
  notificationsToggleButton.hidden = !isAuthenticated;
  if (!isAuthenticated) {
    notificationsPanelOpen = false;
    notificationsBadge.hidden = true;
    notificationsBadge.textContent = "0";
    notificationsPanel.classList.add("hidden");
    notificationsPanel.setAttribute("aria-hidden", "true");
    notificationsToggleButton.setAttribute("aria-expanded", "false");
    notificationsList.innerHTML = "";
    notificationsEmpty.style.display = "none";
    notificationsMarkReadButton.disabled = true;
    return;
  }

  const unreadCount = notifications.reduce((count, item) => count + (item.read ? 0 : 1), 0);
  notificationsBadge.textContent = String(unreadCount);
  notificationsBadge.hidden = unreadCount < 1;
  notificationsToggleButton.setAttribute("aria-expanded", notificationsPanelOpen ? "true" : "false");
  notificationsPanel.classList.toggle("hidden", !notificationsPanelOpen);
  notificationsPanel.setAttribute("aria-hidden", notificationsPanelOpen ? "false" : "true");
  notificationsMarkReadButton.disabled = unreadCount < 1;

  if (notifications.length < 1) {
    notificationsList.innerHTML = "";
    notificationsEmpty.style.display = "block";
    return;
  }

  notificationsEmpty.style.display = "none";
  notificationsList.innerHTML = notifications
    .slice(0, 30)
    .map((item, index) => {
      const canRespondToInvite = item.type === "goal-share-invite" && !item.actioned;
      const inviteActions = canRespondToInvite
        ? `
          <div class="actions">
            <button class="btn btn-primary" type="button" data-action="approve-share-invite" data-notification-id="${item.id}" data-share-id="${item.shareId}">Approve</button>
            <button class="btn btn-danger" type="button" data-action="reject-share-invite" data-notification-id="${item.id}" data-share-id="${item.shareId}">Decline</button>
          </div>
        `
        : "";
      return `
        <li class="quick-item" style="--stagger:${index}">
          <div class="metric-top">
            <strong>${escapeHtml(getNotificationMessage(item))}</strong>
            <span class="pace-chip${item.read ? "" : " pace-on"}">${item.read ? "Read" : "New"}</span>
          </div>
          <p class="muted small">${escapeHtml(formatSnapshotClosedAt(item.createdAt))}</p>
          ${inviteActions}
        </li>
      `;
    })
    .join("");
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

  applyGoalFormDefaults();

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
  const bucketTypeEnabled = isBucketListEnabled();
  const rewardPointsEnabled = isRewardPointsEnabled();
  const friendOptionsMarkup = (selectedEmail = "") => {
    const selected = normalizeEmail(selectedEmail);
    const friendOptions = friends
      .map((item) => {
        const email = normalizeEmail(item.email);
        if (!email) {
          return "";
        }
        const selectedAttr = email === selected ? "selected" : "";
        const label = item.name ? `${item.name} (${email})` : email;
        return `<option value="${escapeAttr(email)}" ${selectedAttr}>${escapeHtml(label)}</option>`;
      })
      .join("");
    return `
      <option value="">None</option>
      ${friendOptions}
    `;
  };
  document.querySelectorAll(".goal-points-col").forEach((cell) => {
    cell.hidden = !rewardPointsEnabled;
  });
  manageList.innerHTML = [...trackers]
    .sort(compareTrackersByPriority)
    .map((tracker, index) => `
      <tr class="goal-row" style="--stagger:${index}" data-id="${tracker.id}">
        <td>
          <input data-field="name" type="text" maxlength="90" value="${escapeHtml(tracker.name)}" required />
        </td>
        <td>
          <select data-field="goalType">
            <option value="quantity" ${normalizeGoalType(tracker.goalType) === "quantity" ? "selected" : ""}>Quantity</option>
            <option value="yesno" ${normalizeGoalType(tracker.goalType) === "yesno" ? "selected" : ""}>Yes/No</option>
            ${(bucketTypeEnabled || normalizeGoalType(tracker.goalType) === "bucket")
              ? `<option value="bucket" ${normalizeGoalType(tracker.goalType) === "bucket" ? "selected" : ""}>Bucket List</option>`
              : ""}
            <option value="floating" ${normalizeGoalType(tracker.goalType) === "floating" ? "selected" : ""}>Floating</option>
          </select>
        </td>
        <td>
          <input data-field="tags" type="text" maxlength="140" value="${escapeHtml(formatGoalTags(tracker.tags))}" placeholder="fitness, finance" />
        </td>
        <td>
          <select data-field="accountabilityPartner">
            ${friendOptionsMarkup(tracker.accountabilityPartnerEmail || "")}
          </select>
          <p class="muted small">${escapeHtml(getAccountabilityStatusLabel(tracker.accountabilityStatus))}</p>
        </td>
        <td>
          <select data-field="archived">
            <option value="active" ${tracker.archived ? "" : "selected"}>Active</option>
            <option value="archived" ${tracker.archived ? "selected" : ""}>Archive</option>
            <option value="delete">Delete</option>
          </select>
        </td>
        <td>
          <input data-field="priority" type="number" min="0" max="1000" value="${normalizeGoalPriority(tracker.priority, 0)}" />
        </td>
        <td>
          <input data-field="unit" type="text" maxlength="20" value="${escapeHtml(tracker.unit || "units")}" ${getLockedUnitForGoalType(tracker.goalType) ? "disabled" : ""} required />
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
        <td class="goal-points-col" ${rewardPointsEnabled ? "" : "hidden"}>
          <input data-field="goalPointsWeekly" type="number" min="0" max="1000000" value="${getTrackerGoalPointsForPeriod(tracker, "week")}" ${rewardPointsEnabled ? "" : "disabled"} />
        </td>
        <td class="goal-points-col" ${rewardPointsEnabled ? "" : "hidden"}>
          <input data-field="goalPointsMonthly" type="number" min="0" max="1000000" value="${getTrackerGoalPointsForPeriod(tracker, "month")}" ${rewardPointsEnabled ? "" : "disabled"} />
        </td>
        <td class="goal-points-col" ${rewardPointsEnabled ? "" : "hidden"}>
          <input data-field="goalPointsYearly" type="number" min="0" max="1000000" value="${getTrackerGoalPointsForPeriod(tracker, "year")}" ${rewardPointsEnabled ? "" : "disabled"} />
        </td>
      </tr>
    `)
    .join("");
}

function renderManageSetupWizard() {
  if (!setupWizard) {
    return;
  }
  if (!currentUser) {
    setupWizard.hidden = true;
    return;
  }
  const noContent = trackers.length < 1 && checkIns.length < 1 && entries.length < 1;
  const shouldShow = !Boolean(settings && settings.onboardingComplete) && noContent;
  setupWizard.hidden = !shouldShow;
  if (!shouldShow) {
    return;
  }
  if (setupWeekStart) {
    setupWeekStart.value = settings.weekStart === "sunday" ? "sunday" : "monday";
  }
  if (setupDefaultGoalType) {
    setupDefaultGoalType.value = normalizeDefaultGoalType(settings.defaultGoalType);
  }
  if (setupDefaultTags) {
    setupDefaultTags.value = formatGoalTags(settings.defaultGoalTags || "");
  }
  if (setupRewardPoints) {
    setupRewardPoints.value = isRewardPointsEnabled() ? "on" : "off";
  }
  if (setupBucketList) {
    setupBucketList.value = isBucketListEnabled() ? "on" : "off";
  }
}

function renderCheckinsTab() {
  if (!currentUser) {
    if (checkinList) {
      checkinList.innerHTML = "";
    }
    if (checkinEmpty) {
      checkinEmpty.style.display = "none";
    }
    if (manageCheckinsForm) {
      manageCheckinsForm.style.display = "none";
    }
    if (checkinTable) {
      checkinTable.style.display = "none";
    }
    return;
  }

  if (!checkinList || !checkinEmpty || !manageCheckinsForm || !checkinTable) {
    return;
  }

  if (checkIns.length < 1) {
    checkinList.innerHTML = "";
    checkinEmpty.style.display = "block";
    manageCheckinsForm.style.display = "none";
    checkinTable.style.display = "none";
    return;
  }

  checkinEmpty.style.display = "none";
  manageCheckinsForm.style.display = "block";
  checkinTable.style.display = "table";
  checkinList.innerHTML = checkIns
    .map((item, index) => `
      <tr class="goal-row" style="--stagger:${index}" data-id="${item.id}">
        <td>
          <input data-field="name" type="text" maxlength="90" value="${escapeHtml(item.name)}" required />
        </td>
        <td>
          <select data-field="cadence">
            <option value="weekly" ${normalizeCheckInCadence(item.cadence) === "weekly" ? "selected" : ""}>Weekly</option>
            <option value="monthly" ${normalizeCheckInCadence(item.cadence) === "monthly" ? "selected" : ""}>Monthly</option>
            <option value="yearly" ${normalizeCheckInCadence(item.cadence) === "yearly" ? "selected" : ""}>Yearly</option>
          </select>
        </td>
        <td class="goal-actions-cell">
          <div class="actions actions-inline">
            <button class="btn btn-danger" type="button" data-action="delete-checkin" data-id="${item.id}">Delete</button>
          </div>
        </td>
      </tr>
    `)
    .join("");
}

function renderEntryTab() {
  if (!entryTracker || !entryDate || !todayEntriesList || !todayEntriesEmpty) {
    return;
  }

  if (!isDateKey(entryDate.value)) {
    entryDate.value = getDateKey(normalizeDate(new Date()));
  }

  entryMode = normalizeEntryMode(entryMode);
  if (entryModeSelect) {
    entryModeSelect.value = entryMode;
  }
  if (soloEntrySection) {
    soloEntrySection.hidden = entryMode !== "solo";
  }
  if (weekUpdateSection) {
    weekUpdateSection.hidden = entryMode !== "week";
  }

  const standardTrackers = getStandardEntryTrackers();
  renderSoloEntrySection(standardTrackers);
  renderWeekEntrySection(standardTrackers);
}

function renderSoloEntrySection(standardTrackers) {
  if (standardTrackers.length < 1) {
    entryTracker.innerHTML = "<option value=''>No goals</option>";
    entryTracker.disabled = true;
    todayEntriesList.innerHTML = "";
    todayEntriesEmpty.textContent = "Create active quantity/yes-no/floating goals or use Bucket List Entry for bucket goals.";
    todayEntriesEmpty.style.display = "block";
    updateEntryFormMode();
    return;
  }

  const selected = entryTracker.value;
  entryTracker.disabled = false;
  entryTracker.innerHTML = standardTrackers
    .map((tracker) => {
      const trackerType = normalizeGoalType(tracker.goalType);
      const suffix = trackerType === "floating"
        ? `${escapeHtml(tracker.unit || "items")} | Floating`
        : isBinaryGoalType(trackerType)
        ? "Yes/No"
        : escapeHtml(tracker.unit || "units");
      return `<option value="${tracker.id}">${escapeHtml(tracker.name)} (${suffix})</option>`;
    })
    .join("");
  const validTrackerIds = new Set(standardTrackers.map((tracker) => tracker.id));
  let nextTrackerId = "";
  if (validTrackerIds.has(selected)) {
    nextTrackerId = selected;
  } else if (!entrySoloInitialized && validTrackerIds.has(entryUiPrefs.trackerId)) {
    nextTrackerId = entryUiPrefs.trackerId;
  } else {
    const recentEntry = [...entries]
      .filter((item) => validTrackerIds.has(item.trackerId))
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0];
    nextTrackerId = recentEntry ? recentEntry.trackerId : standardTrackers[0].id;
  }
  if (nextTrackerId) {
    entryTracker.value = nextTrackerId;
  }

  const todayKey = getDateKey(normalizeDate(new Date()));
  const trackerById = new Map(trackers.map((tracker) => [tracker.id, tracker]));
  const allowedTrackerIds = new Set(standardTrackers.map((tracker) => tracker.id));
  if (!entrySoloInitialized) {
    let preferredDate = "";
    if (isDateKey(entryUiPrefs.date)) {
      preferredDate = entryUiPrefs.date;
    } else {
      const latestForTracker = [...entries]
        .filter((item) => item.trackerId === entryTracker.value && isDateKey(item.date))
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0];
      preferredDate = latestForTracker ? latestForTracker.date : "";
    }
    entryDate.value = isDateKey(preferredDate) ? preferredDate : todayKey;
    entryUiPrefs.trackerId = String(entryTracker.value || "");
    entryUiPrefs.date = entryDate.value;
    saveEntryUiPrefs();
    entrySoloInitialized = true;
  }
  const todayEntries = entries
    .filter((entry) => entry.date === todayKey && allowedTrackerIds.has(entry.trackerId))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  if (todayEntries.length < 1) {
    todayEntriesList.innerHTML = "";
    todayEntriesEmpty.textContent = "No entries added today yet.";
    todayEntriesEmpty.style.display = "block";
    updateEntryFormMode();
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
      const amountLabel = isBinaryGoalType(tracker && tracker.goalType)
        ? (entry.amount > 0 ? "Yes" : "No")
        : `Amount ${formatAmount(entry.amount)}`;
      const notes = entry.notes ? `<p class="muted small">${escapeHtml(entry.notes)}</p>` : "";
      return `
        <li class="quick-item today-entry-item" style="--stagger:${index}">
          <div>
            <strong>${escapeHtml(tracker ? tracker.name : "Unknown Goal")}</strong>
            <p class="muted small">${timeLabel} | ${amountLabel}</p>
            ${notes}
          </div>
        </li>
      `;
    })
    .join("");
  updateEntryFormMode();
}

function renderWeekEntrySection(standardTrackers) {
  if (!weekEntryForm || !weekEntryHead || !weekEntryBody || !weekEntryEmpty || !weekEntryRange) {
    return;
  }

  const weekRange = getWeekRange(weekEntryAnchor);
  weekEntryRange.textContent = `${formatDate(weekRange.start)} to ${formatDate(weekRange.end)}`;
  if (weekEntryStatus) {
    weekEntryStatus.textContent = weekEntryStatusMessage;
  }

  if (standardTrackers.length < 1) {
    weekEntryForm.style.display = "none";
    weekEntryHead.innerHTML = "";
    weekEntryBody.innerHTML = "";
    weekEntryEmpty.style.display = "block";
    weekEntryEmpty.textContent = "Create active quantity/yes-no/floating goals before using Week Update.";
    if (weekEntryStatus) {
      weekEntryStatus.textContent = "";
    }
    return;
  }

  weekEntryForm.style.display = "block";
  weekEntryEmpty.style.display = "none";
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekRange.start, index));
  const weekDateKeys = weekDates.map((date) => getDateKey(date));
  const existingValues = buildWeekEntryValuesMap(standardTrackers, weekDateKeys);

  weekEntryHead.innerHTML = `
    <tr>
      <th>Goal</th>
      ${weekDates.map((date) => (
        `<th class="week-entry-date-head">${escapeHtml(formatWeekday(date))}<span class="muted">${escapeHtml(formatDate(date))}</span></th>`
      )).join("")}
    </tr>
  `;

  weekEntryBody.innerHTML = standardTrackers
    .map((tracker, trackerIndex) => {
      const type = normalizeGoalType(tracker.goalType);
      const binary = isBinaryGoalType(type);
      const goalTypeLabel = type === "floating"
        ? "Floating"
        : type === "yesno"
        ? "Yes/No"
        : "Quantity";
      const rowCells = weekDateKeys.map((dateKey) => {
        const key = `${tracker.id}|${dateKey}`;
        const cell = existingValues.get(key);
        if (binary) {
          const value = !cell || !cell.hasEntry ? "" : (cell.amount > 0 ? "yes" : "no");
          return `
            <td>
              <select
                class="week-entry-value week-entry-value-select"
                data-week-entry="1"
                data-tracker-id="${tracker.id}"
                data-date="${dateKey}"
              >
                <option value="" ${value === "" ? "selected" : ""}>-</option>
                <option value="yes" ${value === "yes" ? "selected" : ""}>Yes</option>
                <option value="no" ${value === "no" ? "selected" : ""}>No</option>
              </select>
            </td>
          `;
        }
        return `
          <td>
            <input
              class="week-entry-value"
              type="number"
              min="0"
              step="0.01"
              value="${cell && cell.hasEntry ? escapeAttr(formatEditableAmount(cell.amount)) : ""}"
              data-week-entry="1"
              data-tracker-id="${tracker.id}"
              data-date="${dateKey}"
            />
          </td>
        `;
      }).join("");
      return `
        <tr class="goal-row" style="--stagger:${trackerIndex}">
          <td class="week-entry-goal-cell">
            <strong>${escapeHtml(tracker.name)}</strong>
            <span class="muted small">${escapeHtml(normalizeGoalUnit(tracker.unit))} | ${goalTypeLabel}</span>
          </td>
          ${rowCells}
        </tr>
      `;
    })
    .join("");
}

function renderGoalJournalTab() {
  if (!goalJournalForm || !goalJournalList || !goalJournalEmpty || !goalJournalDate || !goalJournalGoal) {
    return;
  }

  if (!isDateKey(goalJournalDate.value)) {
    goalJournalDate.value = getDateKey(normalizeDate(new Date()));
  }

  const selectedGoalId = goalJournalGoal.value;
  const goalOptions = [
    "<option value=''>General Journal</option>",
    ...trackers.map((tracker) => `<option value="${tracker.id}">${escapeHtml(tracker.name)}${tracker.archived ? " (Archived)" : ""}</option>`)
  ];
  goalJournalGoal.innerHTML = goalOptions.join("");
  if (selectedGoalId && trackers.some((tracker) => tracker.id === selectedGoalId)) {
    goalJournalGoal.value = selectedGoalId;
  } else {
    goalJournalGoal.value = "";
  }

  if (goalJournalEntries.length < 1) {
    goalJournalList.innerHTML = "";
    goalJournalEmpty.style.display = "block";
    goalJournalEmpty.textContent = "No journal entries yet.";
    return;
  }

  const trackerById = new Map(trackers.map((tracker) => [tracker.id, tracker]));
  const sortedEntries = [...goalJournalEntries].sort((a, b) => {
    const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });

  goalJournalEmpty.style.display = "none";
  goalJournalList.innerHTML = sortedEntries
    .map((item, index) => {
      const tracker = item.trackerId ? trackerById.get(item.trackerId) : null;
      const goalLabel = tracker
        ? tracker.name
        : item.goalName
        ? item.goalName
        : "General Journal";
      const titleMarkup = item.title ? `<strong>${escapeHtml(item.title)}</strong>` : "<strong>Journal Entry</strong>";
      const contentHtml = escapeHtml(item.content || "").replaceAll("\n", "<br />");
      return `
        <li class="entry-card" style="--stagger:${index}">
          <div class="metric-top">
            <div>
              ${titleMarkup}
              <p class="muted small">${formatDate(parseDateKey(item.date))} | ${escapeHtml(goalLabel)}</p>
            </div>
            <button class="btn btn-danger" type="button" data-action="delete-goal-journal" data-id="${item.id}">Delete</button>
          </div>
          <p class="metric-line">${contentHtml}</p>
        </li>
      `;
    })
    .join("");
}

function renderBucketEntryTab() {
  if (!bucketEntryGoal || !recentBucketEntriesList || !recentBucketEntriesEmpty || !bucketEntryDate) {
    return;
  }
  if (!isBucketListEnabled()) {
    bucketEntryGoal.innerHTML = "<option value=''>Bucket List is turned off</option>";
    bucketEntryGoal.disabled = true;
    recentBucketEntriesList.innerHTML = "";
    recentBucketEntriesEmpty.textContent = "Turn Bucket List on in Settings to use this view.";
    recentBucketEntriesEmpty.style.display = "block";
    return;
  }
  const submitButton = bucketEntryForm ? bucketEntryForm.querySelector("button[type='submit']") : null;

  if (!isDateKey(bucketEntryDate.value)) {
    bucketEntryDate.value = getDateKey(normalizeDate(new Date()));
  }

  const bucketTrackers = getBucketTrackers("active");
  if (bucketTrackers.length < 1) {
    bucketEntryGoal.innerHTML = "<option value=''>No bucket goals</option>";
    bucketEntryGoal.disabled = true;
    if (submitButton) {
      submitButton.disabled = true;
    }
    recentBucketEntriesList.innerHTML = "";
    recentBucketEntriesEmpty.textContent = "Create a Bucket List goal in Manage Goals first.";
    recentBucketEntriesEmpty.style.display = "block";
    return;
  }

  const selected = bucketEntryGoal.value;
  const bucketStatusMap = getBucketStatusMap(bucketTrackers);
  const openBucketTrackers = bucketTrackers.filter((tracker) => {
    const status = bucketStatusMap.get(tracker.id);
    return !(status && status.isClosed);
  });
  if (openBucketTrackers.length < 1) {
    bucketEntryGoal.innerHTML = "<option value=''>All bucket goals are already closed</option>";
    bucketEntryGoal.disabled = true;
    if (submitButton) {
      submitButton.disabled = true;
    }
  } else {
    bucketEntryGoal.disabled = false;
    if (submitButton) {
      submitButton.disabled = false;
    }
    bucketEntryGoal.innerHTML = openBucketTrackers
      .map((tracker) => `<option value="${tracker.id}">${escapeHtml(tracker.name)} (Open)</option>`)
      .join("");
    if (openBucketTrackers.some((tracker) => tracker.id === selected)) {
      bucketEntryGoal.value = selected;
    }
  }

  const bucketIds = new Set(bucketTrackers.map((tracker) => tracker.id));
  const recentCloseEntries = [...entries]
    .filter((entry) => bucketIds.has(entry.trackerId) && Number(entry.amount || 0) > 0 && isDateKey(entry.date))
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    })
    .slice(0, 8);

  if (recentCloseEntries.length < 1) {
    recentBucketEntriesList.innerHTML = "";
    recentBucketEntriesEmpty.textContent = "No bucket goals have been closed yet.";
    recentBucketEntriesEmpty.style.display = "block";
    return;
  }

  const trackerById = new Map(bucketTrackers.map((tracker) => [tracker.id, tracker]));
  recentBucketEntriesEmpty.style.display = "none";
  recentBucketEntriesList.innerHTML = recentCloseEntries
    .map((entry, index) => {
      const tracker = trackerById.get(entry.trackerId);
      const notes = entry.notes ? `<p class="muted small">${escapeHtml(entry.notes)}</p>` : "";
      return `
        <li class="quick-item today-entry-item" style="--stagger:${index}">
          <div>
            <strong>${escapeHtml(tracker ? tracker.name : "Unknown Bucket Goal")}</strong>
            <p class="muted small">${formatDate(parseDateKey(entry.date))} | Closed</p>
            ${notes}
          </div>
        </li>
      `;
    })
    .join("");
}

function renderCheckinEntryTab() {
  if (!checkinEntryItem || !recentCheckinEntriesList || !recentCheckinEntriesEmpty) {
    return;
  }

  if (!isDateKey(checkinEntryDate.value)) {
    checkinEntryDate.value = getDateKey(normalizeDate(new Date()));
  }

  if (checkIns.length < 1) {
    checkinEntryItem.innerHTML = "<option value=''>No check-ins</option>";
    checkinEntryItem.disabled = true;
    recentCheckinEntriesList.innerHTML = "";
    recentCheckinEntriesEmpty.textContent = "Create check-ins in Settings > Check-ins to start logging.";
    recentCheckinEntriesEmpty.style.display = "block";
    return;
  }

  const selected = checkinEntryItem.value;
  checkinEntryItem.disabled = false;
  checkinEntryItem.innerHTML = checkIns
    .map((item) => `<option value="${item.id}">${escapeHtml(item.name)} (${formatCheckInCadence(item.cadence)})</option>`)
    .join("");
  if (checkIns.some((item) => item.id === selected)) {
    checkinEntryItem.value = selected;
  }

  const checkinById = new Map(checkIns.map((item) => [item.id, item]));
  const recent = [...checkInEntries]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 8);

  if (recent.length < 1) {
    recentCheckinEntriesList.innerHTML = "";
    recentCheckinEntriesEmpty.textContent = "No check-ins logged yet.";
    recentCheckinEntriesEmpty.style.display = "block";
    return;
  }

  recentCheckinEntriesEmpty.style.display = "none";
  recentCheckinEntriesList.innerHTML = recent
    .map((item, index) => {
      const checkIn = checkinById.get(item.checkInId);
      const statusLabel = item.completed ? "Completed" : "Not completed";
      const notes = item.notes ? `<p class="muted small">${escapeHtml(item.notes)}</p>` : "";
      return `
        <li class="quick-item today-entry-item" style="--stagger:${index}">
          <div>
            <strong>${escapeHtml(checkIn ? checkIn.name : "Unknown Check-in")}</strong>
            <p class="muted small">${formatDate(parseDateKey(item.date))} | ${statusLabel}</p>
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
  if (entryListTypeFilterSelect) {
    entryListTypeFilterSelect.value = entryListTypeFilter;
  }
  if (entryListStatusFilterSelect) {
    entryListStatusFilterSelect.value = entryListStatusFilter;
  }
  if (entryListBucketFilterSelect) {
    entryListBucketFilterSelect.value = entryListBucketFilter;
  }

  const snapshotCards = buildSnapshotEntryCardsMarkup(0);
  const snapshotMarkup = snapshotCards.markup;
  const snapshotCount = snapshotCards.count;

  if (entries.length < 1 || trackers.length < 1) {
    if (snapshotCount < 1) {
      entryListAll.innerHTML = "";
      entryListEmpty.style.display = "block";
      entryListEmpty.textContent = "No entries yet.";
      return;
    }
    entryListEmpty.style.display = "none";
    entryListAll.innerHTML = snapshotMarkup;
    return;
  }

  const trackerById = new Map(trackers.map((tracker) => [tracker.id, tracker]));
  const trackerNameById = new Map(trackers.map((tracker) => [tracker.id, tracker.name]));
  const bucketStatusMap = getBucketStatusMap(getBucketTrackers("all"));

  const filteredEntries = entries.filter((entry) => {
    const tracker = trackerById.get(entry.trackerId);
    if (!tracker) {
      return false;
    }
    const trackerType = normalizeGoalType(tracker.goalType);
    const goalStatus = tracker.archived ? "archived" : "active";
    if (entryListTypeFilter !== "all" && trackerType !== entryListTypeFilter) {
      return false;
    }
    if (entryListStatusFilter !== "all" && goalStatus !== entryListStatusFilter) {
      return false;
    }
    if (entryListBucketFilter !== "all") {
      if (trackerType !== "bucket") {
        return false;
      }
      const bucketStatus = bucketStatusMap.get(tracker.id);
      const isClosed = Boolean(bucketStatus && bucketStatus.isClosed);
      if (entryListBucketFilter === "closed" && !isClosed) {
        return false;
      }
      if (entryListBucketFilter === "open" && isClosed) {
        return false;
      }
    }
    return true;
  });

  if (filteredEntries.length < 1) {
    if (snapshotCount < 1) {
      entryListAll.innerHTML = "";
      entryListEmpty.style.display = "block";
      entryListEmpty.textContent = "No entries match your filters.";
      return;
    }
    entryListEmpty.style.display = "none";
    entryListAll.innerHTML = snapshotMarkup;
    return;
  }

  const sortedEntries = [...filteredEntries].sort((a, b) => {
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
    .map((tracker) => `<option value="${tracker.id}" ${tracker.id === selectedId ? "selected" : ""}>${escapeHtml(tracker.name)}${tracker.archived ? " (Archived)" : ""}</option>`)
    .join("");

  entryListEmpty.style.display = "none";
  entryListEmpty.textContent = "No entries yet.";
  const entryMarkup = sortedEntries
    .map((entry, index) => `
      <li class="entry-card" style="--stagger:${index + snapshotCount}">
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
              <input name="amount" type="number" min="0" step="0.01" value="${formatAmount(entry.amount)}" required />
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
  entryListAll.innerHTML = `${snapshotMarkup}${entryMarkup}`;
}

function buildSnapshotEntryCardsMarkup(startIndex = 0) {
  const snapshotItems = [...periodSnapshots]
    .sort((a, b) => String(b.closedAt || "").localeCompare(String(a.closedAt || "")));
  if (snapshotItems.length < 1) {
    return { count: 0, markup: "" };
  }
  const markup = snapshotItems
    .map((snapshot, index) => {
      const summary = snapshot.summary || {};
      const rangeLabel = `${formatDate(parseDateKey(snapshot.rangeStart))} to ${formatDate(parseDateKey(snapshot.rangeEnd))}`;
      const totalProgress = formatAmount(summary.totalProgress || 0);
      const totalTarget = formatAmount(summary.totalTarget || 0);
      const completion = String(Math.max(Math.round(Number(summary.completion) || 0), 0));
      return `
        <li class="entry-card" style="--stagger:${startIndex + index}">
          <div class="snapshot-item-top">
            <strong>Snapshot | ${escapeHtml(getSnapshotPeriodTitle(snapshot.period))}</strong>
            <span class="pace-chip">${escapeHtml(rangeLabel)}</span>
          </div>
          <p class="muted small">Closed ${escapeHtml(formatSnapshotClosedAt(snapshot.closedAt))}</p>
          <p class="metric-line">Completion ${escapeHtml(completion)}% | Progress ${escapeHtml(totalProgress)}/${escapeHtml(totalTarget)}</p>
          <p class="muted small">Pace: ${escapeHtml(normalizeSnapshotOnPaceLabel(summary.onPaceLabel))}</p>
          <div class="actions">
            <button class="btn" type="button" data-action="reopen-snapshot" data-id="${snapshot.id}">Reopen</button>
            <button class="btn btn-danger" type="button" data-action="delete-snapshot" data-id="${snapshot.id}">Delete</button>
          </div>
        </li>
      `;
    })
    .join("");
  return {
    count: snapshotItems.length,
    markup
  };
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
  scheduleWeekRange.textContent = `${formatDate(week.start)} to ${formatDate(week.end)}`;

  const schedulableTrackers = trackers.filter((tracker) => !tracker.archived);
  if (schedulableTrackers.length < 1) {
    scheduleGoal.innerHTML = "<option value=''>No goals</option>";
    scheduleGoal.disabled = true;
    scheduleList.innerHTML = "";
    scheduleEmpty.textContent = "Create active goals in Manage Goals before scheduling.";
    scheduleEmpty.style.display = "block";
    return;
  }

  const selectedGoal = scheduleGoal.value;
  scheduleGoal.disabled = false;
  scheduleGoal.innerHTML = schedulableTrackers
    .map((tracker) => `<option value="${tracker.id}">${escapeHtml(tracker.name)}</option>`)
    .join("");
  if (schedulableTrackers.some((tracker) => tracker.id === selectedGoal)) {
    scheduleGoal.value = selectedGoal;
  }

  const trackerById = new Map(schedulableTrackers.map((tracker) => [tracker.id, tracker]));
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
            return tracker ? tracker.name : "Archived/Unknown Goal";
          }).join(" | "))}${items.length > 2 ? " ..." : ""}</p>`
        : "";

      const itemsMarkup = items.length > 0
        ? items
          .map((item, itemIndex) => {
            const tracker = trackerById.get(item.trackerId);
            const goalName = tracker ? tracker.name : "Archived/Unknown Goal";
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

  weekRangeLabel.textContent = `${formatDate(week.start)} to ${formatDate(week.end)}`;
  monthRangeLabel.textContent = `${formatDate(month.start)} to ${formatDate(month.end)}`;
  yearRangeLabel.textContent = `${year.start.getFullYear()}`;

  periodGoalFilterState.week.type = normalizeGoalTypeFilterValue(periodGoalFilterState.week.type);
  periodGoalFilterState.week.status = normalizeGoalStatusFilterValue(periodGoalFilterState.week.status);
  periodGoalFilterState.week.tag = normalizeGoalTagFilterValue(periodGoalFilterState.week.tag);
  periodGoalFilterState.month.type = normalizeGoalTypeFilterValue(periodGoalFilterState.month.type);
  periodGoalFilterState.month.status = normalizeGoalStatusFilterValue(periodGoalFilterState.month.status);
  periodGoalFilterState.month.tag = normalizeGoalTagFilterValue(periodGoalFilterState.month.tag);
  periodGoalFilterState.year.type = normalizeGoalTypeFilterValue(periodGoalFilterState.year.type);
  periodGoalFilterState.year.status = normalizeGoalStatusFilterValue(periodGoalFilterState.year.status);
  periodGoalFilterState.year.tag = normalizeGoalTagFilterValue(periodGoalFilterState.year.tag);

  if (weekGoalTypeFilterSelect) {
    weekGoalTypeFilterSelect.value = periodGoalFilterState.week.type;
  }
  if (weekGoalStatusFilterSelect) {
    weekGoalStatusFilterSelect.value = periodGoalFilterState.week.status;
  }
  if (weekGoalTagFilterSelect) {
    syncPeriodTagFilterOptions("week", weekGoalTagFilterSelect);
    weekGoalTagFilterSelect.value = periodGoalFilterState.week.tag;
  }
  if (monthGoalTypeFilterSelect) {
    monthGoalTypeFilterSelect.value = periodGoalFilterState.month.type;
  }
  if (monthGoalStatusFilterSelect) {
    monthGoalStatusFilterSelect.value = periodGoalFilterState.month.status;
  }
  if (monthGoalTagFilterSelect) {
    syncPeriodTagFilterOptions("month", monthGoalTagFilterSelect);
    monthGoalTagFilterSelect.value = periodGoalFilterState.month.tag;
  }
  if (yearGoalTypeFilterSelect) {
    yearGoalTypeFilterSelect.value = periodGoalFilterState.year.type;
  }
  if (yearGoalStatusFilterSelect) {
    yearGoalStatusFilterSelect.value = periodGoalFilterState.year.status;
  }
  if (yearGoalTagFilterSelect) {
    syncPeriodTagFilterOptions("year", yearGoalTagFilterSelect);
    yearGoalTagFilterSelect.value = periodGoalFilterState.year.tag;
  }

  const index = buildEntryIndex(entries);
  renderPeriod("week", week, now, weekSummary, weekList, weekEmpty, (tracker) => tracker.weeklyGoal, index);
  renderPeriod("month", month, now, monthSummary, monthList, monthEmpty, (tracker) => tracker.monthlyGoal, index);
  renderPeriod("year", year, now, yearSummary, yearList, yearEmpty, (tracker) => tracker.yearlyGoal, index);
  renderSharedGoalsSection("week", week, weekList);
  renderSharedGoalsSection("month", month, monthList);
  renderSharedGoalsSection("year", year, yearList);
  renderPeriodSnapshots("week", week, weekList, weekEmpty);
  renderPeriodSnapshots("month", month, monthList, monthEmpty);
  renderPeriodSnapshots("year", year, yearList, yearEmpty);
  renderGraphModal();
  renderAuthState();
}

function renderPeriod(periodName, range, now, summaryEl, listEl, emptyEl, targetFn, index) {
  const filteredTrackers = getTrackersForPeriod(periodName);
  const dueCheckIns = getCheckInsForPeriod(periodName);
  if (filteredTrackers.length < 1 && dueCheckIns.length < 1) {
    summaryEl.innerHTML = "";
    listEl.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";
  const totalDays = getRangeDays(range);

  let goalsProgressTotal = 0;
  let goalsTargetTotal = 0;
  let projectedGoalsTotal = 0;
  let paceTargetTotal = 0;
  let completedGoalsCount = 0;
  let goalPointsEarned = 0;
  const rewardPointsEnabled = isRewardPointsEnabled();

  filteredTrackers.forEach((tracker) => {
    const periodProgress = sumTrackerRange(index, tracker.id, range);
    const goalTarget = targetFn(tracker);
    goalsProgressTotal = addAmount(goalsProgressTotal, periodProgress);
    goalsTargetTotal = addAmount(goalsTargetTotal, goalTarget);
    if (goalTarget > 0 && periodProgress >= goalTarget) {
      completedGoalsCount += 1;
      if (rewardPointsEnabled) {
        goalPointsEarned = addAmount(goalPointsEarned, getTrackerGoalPointsForPeriod(tracker, periodName));
      }
    }
    if (!isFloatingGoalType(tracker.goalType)) {
      const projectionMeta = getTrackerProjectionForRange(index, tracker.id, range, now);
      projectedGoalsTotal = addAmount(projectedGoalsTotal, projectionMeta.projected);
      paceTargetTotal = addAmount(paceTargetTotal, goalTarget);
    }
  });

  let checkInProgressTotal = 0;
  const checkInTargetTotal = dueCheckIns.length;
  dueCheckIns.forEach((item) => {
    const status = getCheckInStatusForRange(item, range);
    checkInProgressTotal = addAmount(checkInProgressTotal, status.completed ? 1 : 0);
  });

  const totalProgress = addAmount(goalsProgressTotal, checkInProgressTotal);
  const totalTarget = addAmount(goalsTargetTotal, checkInTargetTotal);

  const completion = percent(totalProgress, totalTarget);
  const projectedGoals = projectedGoalsTotal;
  const projected = addAmount(projectedGoals, checkInProgressTotal);
  const paceTargetWithCheckIns = addAmount(paceTargetTotal, checkInTargetTotal);
  const onPace = paceTargetWithCheckIns > 0 ? projected >= paceTargetWithCheckIns : null;
  const onPaceLabel = onPace === null ? "N/A" : onPace ? "Yes" : "No";
  const onPaceClass = onPace === null ? "" : onPace ? "pace-on" : "pace-off";
  summaryEl.innerHTML = `
    <article class="summary-card">
      <p>Completion</p>
      <strong>${completion}%</strong>
    </article>
    <article class="summary-card">
      <p>On Pace</p>
      <strong class="${onPaceClass}">${onPaceLabel}</strong>
    </article>
  `;

  const goalCardsMarkup = filteredTrackers
    .map((tracker, indexPosition) => {
      const isFloating = isFloatingGoalType(tracker.goalType);
      const progress = sumTrackerRange(index, tracker.id, range);
      const target = targetFn(tracker);
      const goalHit = target > 0 && progress >= target;
      const pct = percent(progress, target);
      const projectionMeta = getTrackerProjectionForRange(index, tracker.id, range, now);
      const avg = projectionMeta.averagePerDay;
      const needed = safeDivide(target, totalDays);
      const projectedTracker = projectionMeta.projected;
      const isOnPace = projectedTracker >= target;
      const isPastPeriod = range.end < now;
      const hasAllEntriesLogged = hasTrackerEntriesForEveryDay(index, tracker.id, range);
      const useFinalPaceLabel = isPastPeriod && hasAllEntriesLogged;
      const paceLabel = goalHit
        ? "Hit"
        : useFinalPaceLabel
          ? (isOnPace ? "Hit" : "Missed")
          : (isOnPace ? "On pace" : "Off pace");
      const compareEnabled = isFloating ? false : getGoalCompareEnabled(periodName, tracker.id);
      const pointsEnabled = getGraphPointsEnabled(periodName, tracker.id);
      const graphVisible = getInlineGraphVisible(periodName, tracker.id);
      const projectionAllowed = !isFloating && shouldAllowProjectionLine(periodName, range, now);
      const projectionEnabled = projectionAllowed ? getProjectionLineEnabled(periodName, tracker.id) : false;

      let graphMarkup = "";
      if (graphVisible) {
        const chartRange = getChartDisplayRange(index, tracker.id, range, now);
        const series = getDailySeries(index, tracker.id, chartRange);
        const overlayRange = compareEnabled ? getOverlayRange(periodName, range) : null;
        const overlaySeries = overlayRange ? getAlignedOverlaySeries(index, tracker.id, range, overlayRange) : null;
        const projection = projectionAllowed && projectionEnabled
          ? getProjectionSeries(index, tracker.id, range, chartRange, series)
          : null;
        graphMarkup = createCumulativeGraphSvg(series, target, range, overlaySeries, overlayRange, {
          showCurrentPoints: pointsEnabled,
          showOverlayPoints: pointsEnabled,
          showProjectionPoints: pointsEnabled,
          large: false,
          periodName,
          unit: tracker.unit,
          domainDays: getRangeDays(range),
          projection,
          goalHit
        });
      }

      const paceDetailText = isFloating
        ? `Avg/day ${formatAmountWithUnit(avg, tracker.unit)} | Projected ${formatAmountWithUnit(projectedTracker, tracker.unit)} | Floating goal`
        : `Avg/day ${formatAmountWithUnit(avg, tracker.unit)} | Needed/day ${formatAmountWithUnit(needed, tracker.unit)} | Projected ${formatAmountWithUnit(projectedTracker, tracker.unit)}`;
      const paceStatusChip = isFloating
        ? `
            <span class="pace-chip-wrap">
              <button
                type="button"
                class="pace-chip pace-chip-detail"
                data-action="toggle-pace-detail"
                data-detail="${escapeAttr(paceDetailText)}"
                title="${escapeAttr(paceDetailText)}"
                aria-expanded="false"
              >Floating</button>
              <span class="pace-detail-popover">${escapeHtml(paceDetailText)}</span>
            </span>
          `
        : `
            <span class="pace-chip-wrap">
              <button
                type="button"
                class="pace-chip pace-chip-detail ${isOnPace ? "pace-on" : "pace-off"}"
                data-action="toggle-pace-detail"
                data-detail="${escapeAttr(paceDetailText)}"
                title="${escapeAttr(paceDetailText)}"
                aria-expanded="false"
              >${paceLabel}</button>
              <span class="pace-detail-popover">${escapeHtml(paceDetailText)}</span>
            </span>
        `;

      const progressLabel = `${formatProgressAgainstGoal(progress, target, tracker.unit)} (${pct}%)`;

      return `
        <li class="metric-card" style="--stagger:${indexPosition}">
          <div class="metric-top">
            <h3>${escapeHtml(tracker.name)}</h3>
          </div>
          <div class="progress progress-with-label">
            <span class="progress-fill ${goalHit ? "progress-hit" : ""}" style="width:${Math.min(pct, 100)}%"></span>
            <span class="progress-label progress-label-track">${escapeHtml(progressLabel)}</span>
            <span class="progress-label progress-label-fill" style="width:${Math.min(pct, 100)}%">${escapeHtml(progressLabel)}</span>
          </div>
          ${paceDetailLine}
          <div class="pace-line">
            ${paceStatusChip}
            <span class="pace-actions">
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
            </span>
          </div>
          <div class="graph-wrap ${graphVisible ? "" : "hidden"}">
            ${graphMarkup}
            <div class="graph-inline-controls graph-inline-controls-bottom">
              <label class="check-inline check-compact graph-check">
                <input type="checkbox" data-action="toggle-points" data-period="${periodName}" data-id="${tracker.id}" ${pointsEnabled ? "checked" : ""} />
                Show points
              </label>
              ${projectionAllowed ? `
              <label class="check-inline check-compact graph-check">
                <input type="checkbox" data-action="toggle-projection" data-period="${periodName}" data-id="${tracker.id}" ${projectionEnabled ? "checked" : ""} />
                Projection
              </label>
              ` : ""}
              <div class="graph-action-group">
                ${createDownloadMenuMarkup(periodName, tracker.id, "inline")}
              </div>
            </div>
          </div>
        </li>
      `;
    })
    .join("");

  const checkInCardsMarkup = dueCheckIns
    .map((item, indexPosition) => {
      const status = getCheckInStatusForRange(item, range);
      const pct = status.completed ? 100 : 0;
      const statusLabel = status.completed ? "Completed" : "Not completed";
      const statusClass = status.completed ? "pace-on" : "pace-off";
      const latestLabel = status.completedEntry
        ? `Completed on ${formatDate(parseDateKey(status.completedEntry.date))}`
        : status.latestEntry
        ? `${formatDate(parseDateKey(status.latestEntry.date))} | Not completed`
        : "No check-in logged in this period";
      const notesLine = status.latestEntry && status.latestEntry.notes
        ? `<p class="metric-line">${escapeHtml(status.latestEntry.notes)}</p>`
        : "";
      return `
        <li class="metric-card" style="--stagger:${indexPosition}">
          <div class="metric-top">
            <h3>${escapeHtml(item.name)}</h3>
            <div class="metric-controls">
              <span class="pace-chip">${formatCheckInCadence(item.cadence)}</span>
            </div>
          </div>
          <p class="metric-line">Status: <strong class="${statusClass}">${statusLabel}</strong></p>
          <div class="progress"><span class="progress-fill" style="width:${pct}%"></span></div>
          <p class="metric-line">${latestLabel}</p>
          ${notesLine}
        </li>
      `;
    })
    .join("");
  const checkInPeriodLabel = periodName === "year" ? "yearly" : periodName === "month" ? "monthly" : "weekly";

  listEl.innerHTML = `
    ${createPeriodAccordionSectionMarkup(periodName, "goals", "Goals", goalCardsMarkup, "No goals configured.")}
    ${createPeriodAccordionSectionMarkup(periodName, "checkins", "Check-ins", checkInCardsMarkup, `No ${checkInPeriodLabel} check-ins configured.`)}
  `;
}

function normalizeGoalShareStatus(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "approved") {
    return "approved";
  }
  if (normalized === "rejected") {
    return "rejected";
  }
  if (normalized === "removed") {
    return "removed";
  }
  return "pending";
}

function normalizeAccountabilityStatus(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "approved") {
    return "approved";
  }
  if (normalized === "rejected") {
    return "rejected";
  }
  if (normalized === "pending") {
    return "pending";
  }
  return "none";
}

function getAccountabilityStatusLabel(value) {
  const status = normalizeAccountabilityStatus(value);
  if (status === "approved") {
    return "Approved";
  }
  if (status === "rejected") {
    return "Declined";
  }
  if (status === "pending") {
    return "Pending approval";
  }
  return "None";
}

function normalizeGoalShareRecord(raw, id) {
  const item = raw && typeof raw === "object" ? raw : {};
  const createdAt = new Date(item.createdAt);
  return {
    id: String(id || createId()),
    ownerId: typeof item.ownerId === "string" ? item.ownerId : "",
    ownerGoalId: typeof item.ownerGoalId === "string" ? item.ownerGoalId : "",
    ownerUsername: typeof item.ownerUsername === "string" ? item.ownerUsername : "",
    ownerEmail: typeof item.ownerEmail === "string" ? item.ownerEmail : "",
    partnerId: typeof item.partnerId === "string" ? item.partnerId : "",
    partnerEmail: typeof item.partnerEmail === "string" ? item.partnerEmail : "",
    partnerName: typeof item.partnerName === "string" ? item.partnerName : "",
    goalName: typeof item.goalName === "string" ? item.goalName : "",
    goalUnit: typeof item.goalUnit === "string" ? item.goalUnit : "units",
    status: normalizeGoalShareStatus(item.status),
    createdAt: Number.isNaN(createdAt.getTime()) ? new Date().toISOString() : createdAt.toISOString(),
    approvedAt: typeof item.approvedAt === "string" ? item.approvedAt : "",
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : ""
  };
}

function getApprovedSharedGoalShares() {
  return sharedGoalShares
    .filter((item) => item && item.status === "approved")
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

function renderSharedGoalsSection(periodName, range, listEl) {
  if (!listEl || !currentUser) {
    return;
  }
  const approvedShares = getApprovedSharedGoalShares();
  if (approvedShares.length < 1) {
    return;
  }
  const cardsMarkup = buildSharedGoalCardsMarkup(periodName, range, approvedShares);
  listEl.insertAdjacentHTML(
    "beforeend",
    createPeriodAccordionSectionMarkup(
      periodName,
      "shared",
      "Shared Goals",
      cardsMarkup,
      "No shared goals available."
    )
  );
}

function buildSharedGoalCardsMarkup(periodName, range, approvedShares) {
  const todayKey = getDateKey(normalizeDate(new Date()));
  return approvedShares
    .map((share, indexPosition) => {
      const ownerData = sharedGoalOwnerData.get(share.ownerId);
      if (!ownerData) {
        return `
          <li class="metric-card" style="--stagger:${indexPosition}">
            <div class="metric-top">
              <h3>${escapeHtml(share.goalName || "Shared Goal")}</h3>
              <span class="pace-chip">Loading</span>
            </div>
            <p class="metric-line">Shared by ${escapeHtml(share.ownerUsername || "friend")}.</p>
          </li>
        `;
      }

      const tracker = ownerData.trackers.find((item) => item.id === share.ownerGoalId);
      if (!tracker) {
        return `
          <li class="metric-card" style="--stagger:${indexPosition}">
            <div class="metric-top">
              <h3>${escapeHtml(share.goalName || "Shared Goal")}</h3>
              <span class="pace-chip pace-off">Unavailable</span>
            </div>
            <p class="metric-line">This shared goal is no longer available.</p>
          </li>
        `;
      }

      const index = buildEntryIndex(ownerData.entries);
      const target = getTrackerTargetForPeriod(tracker, periodName);
      const progress = sumTrackerRange(index, tracker.id, range);
      const pct = percent(progress, target);
      const goalHit = target > 0 && progress >= target;
      const ownerLabel = share.ownerUsername || "Friend";
      return `
        <li class="metric-card" style="--stagger:${indexPosition}">
          <div class="metric-top">
            <h3>${escapeHtml(tracker.name)}</h3>
            <span class="pace-chip">${escapeHtml(ownerLabel)}</span>
          </div>
          <p class="metric-line">${formatAmountWithUnit(progress, tracker.unit)}/${formatAmountWithUnit(target, tracker.unit)} (${pct}%)</p>
          <div class="progress"><span class="${goalHit ? "progress-hit" : ""}" style="width:${Math.min(pct, 100)}%"></span></div>
          <form data-action="add-shared-goal-entry" data-share-id="${share.id}" data-owner-id="${share.ownerId}" data-goal-id="${tracker.id}" class="entry-edit-form">
            <div class="form-grid form-grid-3">
              <label>
                Date
                <input name="date" type="date" value="${todayKey}" required />
              </label>
              <label>
                Amount
                <input name="amount" type="number" min="0" step="0.01" value="1.00" required />
              </label>
              <label>
                Notes
                <input name="notes" type="text" maxlength="180" placeholder="Optional update note" />
              </label>
            </div>
            <div class="actions">
              <button class="btn btn-primary" type="submit">Add Update</button>
            </div>
          </form>
        </li>
      `;
    })
    .join("");
}

function closeOutPeriod(periodName) {
  if (!currentUser) {
    return;
  }
  const normalizedPeriod = normalizePeriodMode(periodName);
  const range = getPeriodRange(normalizedPeriod);
  if (!range) {
    return;
  }
  const now = normalizeDate(new Date());
  const index = buildEntryIndex(entries);
  const snapshot = buildPeriodCloseoutSnapshot(normalizedPeriod, range, now, index);
  if (!snapshot) {
    alert(`No goals or check-ins to snapshot for this ${normalizedPeriod}.`);
    return;
  }

  const existingIndex = periodSnapshots.findIndex((item) => (
    item
    && item.period === snapshot.period
    && item.rangeStart === snapshot.rangeStart
    && item.rangeEnd === snapshot.rangeEnd
  ));

  if (existingIndex >= 0) {
    const shouldReplace = confirm(
      `A ${normalizedPeriod} snapshot for ${formatDate(range.start)} to ${formatDate(range.end)} already exists. Replace it?`
    );
    if (!shouldReplace) {
      return;
    }
    periodSnapshots.splice(existingIndex, 1);
  }

  periodSnapshots.unshift(snapshot);
  periodSnapshots.sort((a, b) => String(b.closedAt || "").localeCompare(String(a.closedAt || "")));
  savePeriodSnapshots();
  if (isRewardPointsEnabled()) {
    upsertCloseoutPointAward(snapshot);
    savePointTransactions();
  }
  renderPeriodTabs();
}

function buildPeriodCloseoutSnapshot(periodName, range, now, index) {
  const trackersForPeriod = getTrackersForPeriod(periodName);
  const dueCheckIns = getCheckInsForPeriod(periodName);
  if (trackersForPeriod.length < 1 && dueCheckIns.length < 1) {
    return null;
  }

  const totalDays = getRangeDays(range);
  let goalsProgressTotal = 0;
  let goalsTargetTotal = 0;
  let projectedGoalsTotal = 0;
  let paceTargetTotal = 0;
  let completedGoalsCount = 0;
  let goalPointsEarned = 0;
  const rewardPointsEnabled = isRewardPointsEnabled();

  const goalSnapshots = trackersForPeriod.map((tracker) => {
    const target = getTrackerTargetForPeriod(tracker, periodName);
    const progress = sumTrackerRange(index, tracker.id, range);
    const isFloating = isFloatingGoalType(tracker.goalType);
    const projectionMeta = getTrackerProjectionForRange(index, tracker.id, range, now);
    const avgPerDay = projectionMeta.averagePerDay;
    const neededPerDay = safeDivide(target, totalDays);
    const projected = projectionMeta.projected;
    const onPaceLabel = isFloating ? "N/A" : projected >= target ? "Yes" : "No";

    goalsProgressTotal = addAmount(goalsProgressTotal, progress);
    goalsTargetTotal = addAmount(goalsTargetTotal, target);
    if (target > 0 && progress >= target) {
      completedGoalsCount += 1;
      if (rewardPointsEnabled) {
        goalPointsEarned = addAmount(goalPointsEarned, getTrackerGoalPointsForPeriod(tracker, periodName));
      }
    }
    if (!isFloating) {
      projectedGoalsTotal = addAmount(projectedGoalsTotal, projected);
      paceTargetTotal = addAmount(paceTargetTotal, target);
    }

    return {
      trackerId: tracker.id,
      name: tracker.name,
      goalType: normalizeGoalType(tracker.goalType),
      archived: Boolean(tracker.archived),
      unit: normalizeGoalUnit(tracker.unit),
      progress,
      target,
      completion: percent(progress, target),
      avgPerDay,
      neededPerDay,
      projected,
      onPaceLabel
    };
  });

  let checkInProgressTotal = 0;
  const checkInTargetTotal = dueCheckIns.length;
  const checkInSnapshots = dueCheckIns.map((item) => {
    const status = getCheckInStatusForRange(item, range);
    if (status.completed) {
      checkInProgressTotal = addAmount(checkInProgressTotal, 1);
    }
    return {
      checkInId: item.id,
      name: item.name,
      cadence: normalizeCheckInCadence(item.cadence),
      completed: Boolean(status.completed),
      latestDate: status.latestEntry && isDateKey(status.latestEntry.date) ? status.latestEntry.date : "",
      latestNotes: status.latestEntry && status.latestEntry.notes ? String(status.latestEntry.notes) : ""
    };
  });

  const totalProgress = addAmount(goalsProgressTotal, checkInProgressTotal);
  const totalTarget = addAmount(goalsTargetTotal, checkInTargetTotal);
  const completion = percent(completedGoalsCount, trackersForPeriod.length);
  const projectedGoals = projectedGoalsTotal;
  const projected = addAmount(projectedGoals, checkInProgressTotal);
  const paceTargetWithCheckIns = addAmount(paceTargetTotal, checkInTargetTotal);
  const onPace = paceTargetWithCheckIns > 0 ? projected >= paceTargetWithCheckIns : null;
  const onPaceLabel = onPace === null ? "N/A" : onPace ? "On pace" : "Off pace";
  const periodState = periodGoalFilterState[periodName] || { type: "all", status: "active", tag: "all" };

  return {
    id: createId(),
    period: periodName,
    rangeStart: getDateKey(range.start),
    rangeEnd: getDateKey(range.end),
    closedAt: new Date().toISOString(),
    filters: {
      type: normalizeGoalTypeFilterValue(periodState.type),
      status: normalizeGoalStatusFilterValue(periodState.status),
      tag: normalizeGoalTagFilterValue(periodState.tag)
    },
    summary: {
      completion,
      onPaceLabel,
      totalProgress,
      totalTarget,
      goalsCount: trackersForPeriod.length,
      checkInsCount: dueCheckIns.length,
      completedGoalsCount,
      goalPointsEarned
    },
    goals: goalSnapshots,
    checkIns: checkInSnapshots
  };
}

function getPeriodRange(periodName) {
  if (periodName === "month") {
    return getMonthRange(monthViewAnchor);
  }
  if (periodName === "year") {
    return getYearRange(yearViewAnchor);
  }
  return getWeekRange(weekViewAnchor);
}

function getTrackerTargetForPeriod(tracker, periodName) {
  if (periodName === "month") {
    return tracker.monthlyGoal;
  }
  if (periodName === "year") {
    return tracker.yearlyGoal;
  }
  return tracker.weeklyGoal;
}

function getTrackerGoalPointsForPeriod(tracker, periodName) {
  const normalizedPeriod = periodName === "month"
    ? "month"
    : periodName === "year"
    ? "year"
    : "week";
  const fallbackByPeriod = normalizedPeriod === "month"
    ? 3
    : normalizedPeriod === "year"
    ? 10
    : 1;
  const hasLegacyPoints = Boolean(
    tracker
    && tracker.goalPoints !== undefined
    && tracker.goalPoints !== null
    && tracker.goalPoints !== ""
  );
  const legacyPoints = hasLegacyPoints
    ? normalizeGoalPoints(tracker.goalPoints, fallbackByPeriod)
    : fallbackByPeriod;
  if (normalizedPeriod === "month") {
    return normalizeGoalPoints(tracker && tracker.goalPointsMonthly, legacyPoints);
  }
  if (normalizedPeriod === "year") {
    return normalizeGoalPoints(tracker && tracker.goalPointsYearly, legacyPoints);
  }
  return normalizeGoalPoints(tracker && tracker.goalPointsWeekly, legacyPoints);
}

function renderPeriodSnapshots(periodName, range, listEl, emptyEl = null) {
  if (!listEl || !currentUser) {
    return;
  }
  const periodItems = periodSnapshots
    .filter((item) => item && item.period === periodName)
    .sort((a, b) => String(b.closedAt || "").localeCompare(String(a.closedAt || "")));
  const currentRangeStart = getDateKey(range.start);
  const currentRangeEnd = getDateKey(range.end);
  const currentSnapshot = periodItems.find((item) => item.rangeStart === currentRangeStart && item.rangeEnd === currentRangeEnd);
  const currentSummaryText = currentSnapshot
    ? `Current range closed on ${formatSnapshotClosedAt(currentSnapshot.closedAt)}.`
    : "Current range not closed out yet.";

  if (periodItems.length < 1) {
    if (emptyEl) {
      emptyEl.style.display = "none";
    }
    listEl.insertAdjacentHTML(
      "beforeend",
      createPeriodAccordionSectionMarkup(
        periodName,
        "snapshots",
        "Snapshots",
        "",
        `${currentSummaryText} No ${periodName} snapshots saved yet.`
      )
    );
    return;
  }

  const summaryCardMarkup = `
    <li class="quick-item" style="--stagger:0">
      <p class="muted small">${escapeHtml(currentSummaryText)}</p>
    </li>
  `;
  const cardsMarkup = periodItems.slice(0, 8).map((snapshot, index) => {
    const summary = snapshot.summary || {};
    const rangeLabel = `${formatDate(parseDateKey(snapshot.rangeStart))} to ${formatDate(parseDateKey(snapshot.rangeEnd))}`;
    const filterType = normalizeGoalTypeFilterValue(snapshot.filters && snapshot.filters.type);
    const filterStatus = normalizeGoalStatusFilterValue(snapshot.filters && snapshot.filters.status);
    const filterTag = normalizeGoalTagFilterValue(snapshot.filters && snapshot.filters.tag);
    const goalsCount = Math.max(Math.floor(Number(summary.goalsCount) || 0), 0);
    const completedGoalsCount = Math.max(Math.floor(Number(summary.completedGoalsCount) || 0), 0);
    const goalsHitPct = goalsCount > 0
      ? percent(completedGoalsCount, goalsCount)
      : Math.max(Math.round(Number(summary.completion) || 0), 0);
    const filterLine = filterType === "all" && filterStatus === "active" && filterTag === "all"
      ? ""
      : `<p class="muted small">Filters: ${escapeHtml(filterType)} | ${escapeHtml(filterStatus)} | ${escapeHtml(filterTag === "all" ? "all tags" : filterTag)}</p>`;

    return `
      <li class="entry-card" style="--stagger:${index + 1}">
        <div class="snapshot-item-top">
          <strong>${escapeHtml(rangeLabel)}</strong>
          <span class="pace-chip">${escapeHtml(getSnapshotPeriodTitle(snapshot.period))}</span>
        </div>
        <p class="muted small">Closed ${escapeHtml(formatSnapshotClosedAt(snapshot.closedAt))}</p>
        <p class="metric-line">Goals Hit ${escapeHtml(String(completedGoalsCount))}/${escapeHtml(String(goalsCount))} (${escapeHtml(String(goalsHitPct))}%)</p>
        <p class="muted small">${escapeHtml(String(Math.max(Math.floor(Number(summary.goalsCount) || 0), 0)))} goals + ${escapeHtml(String(Math.max(Math.floor(Number(summary.checkInsCount) || 0), 0)))} check-ins</p>
        ${filterLine}
        <div class="actions">
          <button class="btn" type="button" data-action="reopen-snapshot" data-id="${snapshot.id}">Reopen</button>
          <button class="btn btn-danger" type="button" data-action="delete-snapshot" data-id="${snapshot.id}">Delete</button>
        </div>
      </li>
    `;
  }).join("");
  if (emptyEl) {
    emptyEl.style.display = "none";
  }
  listEl.insertAdjacentHTML(
    "beforeend",
    createPeriodAccordionSectionMarkup(
      periodName,
      "snapshots",
      "Snapshots",
      `${summaryCardMarkup}${cardsMarkup}`,
      `No ${periodName} snapshots saved yet.`
    )
  );
}

function normalizeSnapshotOnPaceLabel(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "yes" || normalized === "on pace") {
    return "On pace";
  }
  if (normalized === "no" || normalized === "off pace") {
    return "Off pace";
  }
  if (normalized === "hit") {
    return "Hit";
  }
  if (normalized === "missed") {
    return "Missed";
  }
  return "N/A";
}

function getSnapshotPeriodTitle(periodName) {
  if (periodName === "month") {
    return "Month";
  }
  if (periodName === "year") {
    return "Year";
  }
  return "Week";
}

function handleSnapshotActionClick(event) {
  if (!currentUser) {
    return;
  }
  const reopenButton = event.target.closest("button[data-action='reopen-snapshot']");
  if (reopenButton) {
    const snapshotId = String(reopenButton.dataset.id || "");
    if (!snapshotId) {
      return;
    }
    if (reopenPeriodSnapshot(snapshotId)) {
      render();
    }
    return;
  }

  const deleteButton = event.target.closest("button[data-action='delete-snapshot']");
  if (!deleteButton) {
    return;
  }
  const snapshotId = String(deleteButton.dataset.id || "");
  if (!snapshotId) {
    return;
  }
  const snapshot = periodSnapshots.find((item) => item.id === snapshotId);
  if (!snapshot) {
    return;
  }
  const shouldDelete = confirm(
    `Delete ${getSnapshotPeriodTitle(snapshot.period).toLowerCase()} snapshot for ${formatDate(parseDateKey(snapshot.rangeStart))} to ${formatDate(parseDateKey(snapshot.rangeEnd))}?`
  );
  if (!shouldDelete) {
    return;
  }
  deletePeriodSnapshot(snapshotId);
  render();
}

function reopenPeriodSnapshot(snapshotId) {
  const snapshot = periodSnapshots.find((item) => item && item.id === snapshotId);
  if (!snapshot) {
    return false;
  }
  const rangeStartDate = parseDateKey(snapshot.rangeStart);
  if (!rangeStartDate) {
    return false;
  }
  if (snapshot.period === "month") {
    monthViewAnchor = new Date(rangeStartDate.getFullYear(), rangeStartDate.getMonth(), 1);
    activeTab = "month";
  } else if (snapshot.period === "year") {
    yearViewAnchor = new Date(rangeStartDate.getFullYear(), 0, 1);
    activeTab = "year";
  } else {
    weekViewAnchor = normalizeDate(rangeStartDate);
    activeTab = "week";
  }
  return true;
}

function deletePeriodSnapshot(snapshotId) {
  const index = periodSnapshots.findIndex((item) => item && item.id === snapshotId);
  if (index < 0) {
    return;
  }
  const [removed] = periodSnapshots.splice(index, 1);
  savePeriodSnapshots();
  if (removed) {
    removeCloseoutPointAward(removed);
  }
}

function removeCloseoutPointAward(snapshot) {
  if (!snapshot || !snapshot.period || !snapshot.rangeStart || !snapshot.rangeEnd) {
    return;
  }
  const refKey = `${snapshot.period}|${snapshot.rangeStart}|${snapshot.rangeEnd}`;
  const nextTransactions = pointTransactions.filter((item) => (
    !(item && item.type === "earn-closeout" && item.refKey === refKey)
  ));
  if (nextTransactions.length === pointTransactions.length) {
    return;
  }
  pointTransactions = nextTransactions;
  savePointTransactions();
}

function formatSnapshotClosedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit"
  });
}

function upsertCloseoutPointAward(snapshot) {
  if (!snapshot || !snapshot.period || !snapshot.rangeStart || !snapshot.rangeEnd) {
    return;
  }
  const refKey = `${snapshot.period}|${snapshot.rangeStart}|${snapshot.rangeEnd}`;
  const amount = normalizePositiveAmount(snapshot.summary && snapshot.summary.goalPointsEarned, 0);
  const index = pointTransactions.findIndex((item) => (
    item
    && item.type === "earn-closeout"
    && item.refKey === refKey
  ));
  if (amount <= 0) {
    if (index >= 0) {
      pointTransactions.splice(index, 1);
    }
    return;
  }
  const nextTx = {
    id: index >= 0 && pointTransactions[index] && pointTransactions[index].id
      ? pointTransactions[index].id
      : createId(),
    type: "earn-closeout",
    amount,
    createdAt: new Date().toISOString(),
    note: `${snapshot.period} close-out`,
    refKey
  };
  if (index >= 0) {
    pointTransactions[index] = nextTx;
  } else {
    pointTransactions.unshift(nextTx);
  }
}

function getPointBankTotals() {
  const totals = pointTransactions.reduce((acc, item) => {
    const amount = Number(item && item.amount) || 0;
    acc.balance = addAmount(acc.balance, amount);
    if (amount > 0) {
      acc.earned = addAmount(acc.earned, amount);
    } else if (amount < 0) {
      acc.spent = addAmount(acc.spent, Math.abs(amount));
    }
    return acc;
  }, { balance: 0, earned: 0, spent: 0 });
  return {
    balance: Math.max(totals.balance, 0),
    earned: totals.earned,
    spent: totals.spent
  };
}

function getPointBankBalance() {
  return getPointBankTotals().balance;
}

function renderFriendsSettings() {
  if (!friendList || !friendEmpty) {
    return;
  }
  if (!currentUser) {
    friendList.innerHTML = "";
    friendEmpty.style.display = "none";
    return;
  }
  if (friends.length < 1) {
    friendList.innerHTML = "";
    friendEmpty.style.display = "block";
    return;
  }

  friendEmpty.style.display = "none";
  friendList.innerHTML = [...friends]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .map((item, index) => {
      const emailLine = item.email
        ? `<p class="muted small">${escapeHtml(item.email)}</p>`
        : `<p class="muted small">No email saved</p>`;
      return `
        <li class="quick-item" style="--stagger:${index}">
          <div class="metric-top">
            <strong>${escapeHtml(item.name)}</strong>
            <button class="btn btn-danger" type="button" data-action="delete-friend" data-id="${item.id}">Delete</button>
          </div>
          ${emailLine}
        </li>
      `;
    })
    .join("");
}

function renderRewardsSettings() {
  if (!rewardSettingsList || !rewardSettingsEmpty || !pointStoreSettingsSection) {
    return;
  }
  if (!currentUser || !isRewardPointsEnabled()) {
    if (pointStoreToggleForm) {
      pointStoreToggleForm.style.display = "none";
    }
    if (pointAdjustForm) {
      pointAdjustForm.style.display = "none";
    }
    if (rewardForm) {
      rewardForm.style.display = "none";
    }
    rewardSettingsList.innerHTML = "";
    rewardSettingsEmpty.style.display = "none";
    return;
  }
  if (pointStoreToggleForm) {
    pointStoreToggleForm.style.display = "grid";
  }
  if (pointAdjustForm) {
    pointAdjustForm.style.display = "grid";
  }
  if (pointStoreEnabledSelect) {
    pointStoreEnabledSelect.value = isPointStoreRewardsEnabled() ? "on" : "off";
  }
  if (!isPointStoreRewardsEnabled()) {
    if (rewardForm) {
      rewardForm.style.display = "none";
    }
    rewardSettingsList.innerHTML = "";
    rewardSettingsEmpty.textContent = "Point Store rewards are turned off.";
    rewardSettingsEmpty.style.display = "block";
    return;
  }
  if (rewardForm) {
    rewardForm.style.display = "grid";
  }
  rewardSettingsEmpty.textContent = "No rewards configured yet.";

  if (rewards.length < 1) {
    rewardSettingsList.innerHTML = "";
    rewardSettingsEmpty.style.display = "block";
    return;
  }

  rewardSettingsEmpty.style.display = "none";
  rewardSettingsList.innerHTML = rewards
    .map((item, index) => `
      <li class="entry-card" style="--stagger:${index}" data-reward-id="${item.id}">
        <div class="form-grid form-grid-3">
          <label>
            Name
            <input data-field="name" type="text" maxlength="90" value="${escapeHtml(item.name)}" />
          </label>
          <label>
            Cost
            <input data-field="cost" type="number" min="1" max="1000000" value="${normalizePositiveInt(item.cost, 1)}" />
          </label>
          <label>
            Notes
            <input data-field="notes" type="text" maxlength="160" value="${escapeHtml(item.notes || "")}" />
          </label>
        </div>
        <div class="actions">
          <button class="btn" type="button" data-action="save-reward" data-id="${item.id}">Save Reward</button>
          <button class="btn btn-danger" type="button" data-action="delete-reward" data-id="${item.id}">Delete Reward</button>
        </div>
      </li>
    `)
    .join("");
}

function renderPointStoreTab() {
  if (
    !pointBankBalance
    || !pointBankEarned
    || !pointBankSpent
    || !pointStoreRewardList
    || !pointStoreRewardEmpty
    || !pointStoreActiveList
    || !pointStoreActiveEmpty
    || !pointStoreClosedList
    || !pointStoreClosedEmpty
    || !pointStoreClearClosedButton
    || !pointStoreHistoryList
    || !pointStoreHistoryEmpty
  ) {
    return;
  }

  if (!currentUser || !isPointStoreRewardsEnabled()) {
    pointBankBalance.textContent = "0";
    pointBankEarned.textContent = "0";
    pointBankSpent.textContent = "0";
    pointStoreRewardList.innerHTML = "";
    pointStoreActiveList.innerHTML = "";
    pointStoreClosedList.innerHTML = "";
    pointStoreHistoryList.innerHTML = "";
    pointStoreRewardEmpty.style.display = "none";
    pointStoreActiveEmpty.style.display = "none";
    pointStoreClosedEmpty.style.display = "none";
    pointStoreClearClosedButton.hidden = true;
    pointStoreHistoryEmpty.style.display = "none";
    return;
  }

  const totals = getPointBankTotals();
  pointBankBalance.textContent = formatAmount(totals.balance);
  pointBankEarned.textContent = formatAmount(totals.earned);
  pointBankSpent.textContent = formatAmount(totals.spent);

  if (rewards.length < 1) {
    pointStoreRewardList.innerHTML = "";
    pointStoreRewardEmpty.style.display = "block";
  } else {
    pointStoreRewardEmpty.style.display = "none";
    pointStoreRewardList.innerHTML = rewards
      .map((item, index) => {
        const cost = normalizePositiveInt(item.cost, 1);
        const canRedeem = totals.balance >= cost;
        return `
          <li class="metric-card" style="--stagger:${index}">
            <div class="metric-top">
              <h3>${escapeHtml(item.name)}</h3>
              <span class="pace-chip">${formatAmount(cost)} pts</span>
            </div>
            <p class="metric-line">${escapeHtml(item.notes || "No notes")}</p>
            <div class="metric-footer-actions">
              <button class="btn btn-primary" type="button" data-action="redeem-reward" data-id="${item.id}" ${canRedeem ? "" : "disabled"}>
                ${canRedeem ? "Redeem" : "Not enough points"}
              </button>
            </div>
          </li>
        `;
      })
      .join("");
  }

  const activePurchases = rewardPurchases
    .filter((item) => item && item.status === "active")
    .sort((a, b) => String(b.purchasedAt || "").localeCompare(String(a.purchasedAt || "")));
  if (activePurchases.length < 1) {
    pointStoreActiveList.innerHTML = "";
    pointStoreActiveEmpty.style.display = "block";
  } else {
    pointStoreActiveEmpty.style.display = "none";
    pointStoreActiveList.innerHTML = activePurchases
      .map((item, index) => `
        <li class="metric-card" style="--stagger:${index}">
          <div class="metric-top">
            <h3>${escapeHtml(item.rewardName || "Reward")}</h3>
            <span class="pace-chip">${formatAmount(normalizePositiveInt(item.cost, 1))} pts</span>
          </div>
          <p class="muted small">Purchased ${escapeHtml(formatSnapshotClosedAt(item.purchasedAt))}</p>
          <p class="metric-line">${escapeHtml(item.notes || "No notes")}</p>
          <div class="metric-footer-actions">
            <button class="btn" type="button" data-action="close-active-reward" data-id="${item.id}">Close</button>
            <button class="btn btn-danger" type="button" data-action="refund-active-reward" data-id="${item.id}">Refund</button>
          </div>
        </li>
      `)
      .join("");
  }

  const closedPurchases = rewardPurchases
    .filter((item) => item && item.status !== "active")
    .sort((a, b) => {
      const dateA = String(a.refundedAt || a.closedAt || a.purchasedAt || "");
      const dateB = String(b.refundedAt || b.closedAt || b.purchasedAt || "");
      return dateB.localeCompare(dateA);
    });
  pointStoreClearClosedButton.hidden = closedPurchases.length < 1;
  if (closedPurchases.length < 1) {
    pointStoreClosedList.innerHTML = "";
    pointStoreClosedEmpty.style.display = "block";
  } else {
    pointStoreClosedEmpty.style.display = "none";
    pointStoreClosedList.innerHTML = closedPurchases
      .map((item, index) => {
        const isRefunded = item.status === "refunded";
        const statusLabel = isRefunded ? "Refunded" : "Closed";
        const statusClass = isRefunded ? "pace-on" : "";
        const when = isRefunded ? item.refundedAt : item.closedAt;
        return `
          <li class="quick-item" style="--stagger:${index}">
            <div class="metric-top">
              <strong>${escapeHtml(item.rewardName || "Reward")}</strong>
              <span class="pace-chip ${statusClass}">${statusLabel}</span>
            </div>
            <p class="muted small">${escapeHtml(formatSnapshotClosedAt(when || item.purchasedAt))}</p>
          </li>
        `;
      })
      .join("");
  }

  const history = [...pointTransactions]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 20);
  if (history.length < 1) {
    pointStoreHistoryList.innerHTML = "";
    pointStoreHistoryEmpty.style.display = "block";
    return;
  }
  pointStoreHistoryEmpty.style.display = "none";
  pointStoreHistoryList.innerHTML = history
    .map((item, index) => {
      const amount = Number(item.amount) || 0;
      const label = amount >= 0 ? `+${formatAmount(amount)}` : `-${formatAmount(Math.abs(amount))}`;
      const when = formatSnapshotClosedAt(item.createdAt);
      const note = String(item.note || item.type || "Point update");
      return `
        <li class="quick-item" style="--stagger:${index}">
          <div class="metric-top">
            <strong>${escapeHtml(note)}</strong>
            <span class="pace-chip">${escapeHtml(label)} pts</span>
          </div>
          <p class="muted small">${escapeHtml(when)}</p>
        </li>
      `;
    })
    .join("");
}

function redeemReward(rewardId) {
  if (!currentUser) {
    return { success: false, message: "Sign in before redeeming rewards." };
  }
  if (!isPointStoreRewardsEnabled()) {
    return { success: false, message: "Point Store rewards are turned off in Settings." };
  }
  const reward = rewards.find((item) => item.id === rewardId);
  if (!reward) {
    return { success: false, message: "Select a valid reward." };
  }
  const cost = normalizePositiveInt(reward.cost, 1);
  const balance = getPointBankBalance();
  if (balance < cost) {
    return { success: false, message: "Not enough points in your point bank." };
  }
  pointTransactions.unshift({
    id: createId(),
    type: "spend-reward",
    amount: -cost,
    createdAt: new Date().toISOString(),
    note: `Redeemed: ${reward.name}`,
    rewardId: reward.id
  });
  rewardPurchases.unshift({
    id: createId(),
    rewardId: reward.id,
    rewardName: reward.name,
    cost,
    notes: reward.notes || "",
    status: "active",
    purchasedAt: new Date().toISOString(),
    closedAt: "",
    refundedAt: ""
  });
  saveRewardPurchases();
  savePointTransactions();
  return { success: true, message: "" };
}

function closeRewardPurchase(purchaseId) {
  if (!currentUser) {
    return { success: false, message: "Sign in before closing rewards." };
  }
  if (!isPointStoreRewardsEnabled()) {
    return { success: false, message: "Point Store rewards are turned off in Settings." };
  }
  const purchase = rewardPurchases.find((item) => item && item.id === purchaseId);
  if (!purchase || purchase.status !== "active") {
    return { success: false, message: "Select an active reward." };
  }
  purchase.status = "closed";
  purchase.closedAt = new Date().toISOString();
  saveRewardPurchases();
  return { success: true, message: "" };
}

function refundRewardPurchase(purchaseId) {
  if (!currentUser) {
    return { success: false, message: "Sign in before refunding rewards." };
  }
  if (!isPointStoreRewardsEnabled()) {
    return { success: false, message: "Point Store rewards are turned off in Settings." };
  }
  const purchase = rewardPurchases.find((item) => item && item.id === purchaseId);
  if (!purchase || purchase.status !== "active") {
    return { success: false, message: "Select an active reward to refund." };
  }
  const amount = normalizePositiveInt(purchase.cost, 1);
  purchase.status = "refunded";
  purchase.refundedAt = new Date().toISOString();
  purchase.closedAt = purchase.refundedAt;
  pointTransactions.unshift({
    id: createId(),
    type: "refund-reward",
    amount,
    createdAt: purchase.refundedAt,
    note: `Refunded: ${purchase.rewardName || "Reward"}`,
    rewardId: purchase.rewardId || ""
  });
  saveRewardPurchases();
  savePointTransactions();
  return { success: true, message: "" };
}

function clearClosedRewardPurchases() {
  rewardPurchases = rewardPurchases.filter((item) => item && item.status === "active");
  saveRewardPurchases();
}

function getTrackersForPeriod(periodName) {
  const periodState = periodGoalFilterState[periodName] || { type: "all", status: "active", tag: "all" };
  const typeFilter = normalizeGoalTypeFilterValue(periodState.type);
  const statusFilter = normalizeGoalStatusFilterValue(periodState.status);
  const tagFilter = normalizeGoalTagFilterValue(periodState.tag);

  if (periodGoalFilterState[periodName]) {
    periodGoalFilterState[periodName].type = typeFilter;
    periodGoalFilterState[periodName].status = statusFilter;
    periodGoalFilterState[periodName].tag = tagFilter;
  }

  return trackers.filter((tracker) => {
    const trackerType = normalizeGoalType(tracker.goalType);
    const trackerStatus = tracker.archived ? "archived" : "active";
    const trackerTags = normalizeGoalTags(tracker.tags);
    if (typeFilter !== "all" && trackerType !== typeFilter) {
      return false;
    }
    if (statusFilter !== "all" && trackerStatus !== statusFilter) {
      return false;
    }
    if (tagFilter !== "all" && !trackerTags.some((tag) => getGoalTagKey(tag) === tagFilter)) {
      return false;
    }
    return true;
  }).sort(compareTrackersByPriority);
}

function getTrackersMatchingTypeStatusFilters(periodName) {
  const periodState = periodGoalFilterState[periodName] || { type: "all", status: "active" };
  const typeFilter = normalizeGoalTypeFilterValue(periodState.type);
  const statusFilter = normalizeGoalStatusFilterValue(periodState.status);
  return trackers.filter((tracker) => {
    const trackerType = normalizeGoalType(tracker.goalType);
    const trackerStatus = tracker.archived ? "archived" : "active";
    if (typeFilter !== "all" && trackerType !== typeFilter) {
      return false;
    }
    if (statusFilter !== "all" && trackerStatus !== statusFilter) {
      return false;
    }
    return true;
  });
}

function getSortedGoalTagOptions(trackersList) {
  const tagMap = new Map();
  trackersList.forEach((tracker) => {
    normalizeGoalTags(tracker && tracker.tags).forEach((tag) => {
      const key = getGoalTagKey(tag);
      if (!key || tagMap.has(key)) {
        return;
      }
      tagMap.set(key, tag);
    });
  });
  return Array.from(tagMap.entries())
    .sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: "base" }));
}

function syncPeriodTagFilterOptions(periodName, selectElement) {
  if (!selectElement) {
    return;
  }
  const currentValue = normalizeGoalTagFilterValue(periodGoalFilterState[periodName] ? periodGoalFilterState[periodName].tag : "all");
  const options = getSortedGoalTagOptions(getTrackersMatchingTypeStatusFilters(periodName));
  selectElement.innerHTML = `
    <option value="all">All Tags</option>
    ${options.map(([key, label]) => `<option value="${escapeAttr(key)}">${escapeHtml(label)}</option>`).join("")}
  `;
  const hasCurrentOption = currentValue === "all" || options.some(([key]) => key === currentValue);
  if (periodGoalFilterState[periodName]) {
    periodGoalFilterState[periodName].tag = hasCurrentOption ? currentValue : "all";
    selectElement.value = periodGoalFilterState[periodName].tag;
  } else {
    selectElement.value = hasCurrentOption ? currentValue : "all";
  }
}

function renderBucketListViewTab() {
  if (!bucketListSummary || !bucketListViewList || !bucketListViewEmpty) {
    return;
  }
  if (!isBucketListEnabled()) {
    bucketListSummary.innerHTML = "";
    bucketListViewList.innerHTML = "";
    bucketListViewEmpty.textContent = "Turn Bucket List on in Settings to use this view.";
    bucketListViewEmpty.style.display = "block";
    return;
  }
  if (!currentUser) {
    bucketListSummary.innerHTML = "";
    bucketListViewList.innerHTML = "";
    bucketListViewEmpty.style.display = "none";
    return;
  }

  if (bucketListGoalStatusFilterSelect) {
    bucketListGoalStatusFilterSelect.value = bucketListGoalStatusFilter;
  }
  if (bucketListItemStatusFilterSelect) {
    bucketListItemStatusFilterSelect.value = bucketListItemStatusFilter;
  }

  const bucketTrackers = getBucketTrackers(bucketListGoalStatusFilter);
  if (bucketTrackers.length < 1) {
    bucketListSummary.innerHTML = "";
    bucketListViewList.innerHTML = "";
    bucketListViewEmpty.textContent = "No bucket list goals for the selected filters.";
    bucketListViewEmpty.style.display = "block";
    return;
  }

  const bucketStatusMap = getBucketStatusMap(bucketTrackers);
  const closedCount = bucketTrackers.filter((tracker) => {
    const status = bucketStatusMap.get(tracker.id);
    return status && status.isClosed;
  }).length;
  const openCount = bucketTrackers.length - closedCount;

  bucketListSummary.innerHTML = `
    <article class="summary-card">
      <p>Open</p>
      <strong>${openCount}</strong>
    </article>
    <article class="summary-card">
      <p>Closed</p>
      <strong>${closedCount}</strong>
    </article>
  `;

  bucketListViewEmpty.style.display = "none";
  const filteredBucketTrackers = bucketTrackers.filter((tracker) => {
    const status = bucketStatusMap.get(tracker.id);
    const isClosed = Boolean(status && status.isClosed);
    if (bucketListItemStatusFilter === "closed") {
      return isClosed;
    }
    if (bucketListItemStatusFilter === "open") {
      return !isClosed;
    }
    return true;
  });

  if (filteredBucketTrackers.length < 1) {
    bucketListViewList.innerHTML = "";
    bucketListViewEmpty.textContent = "No bucket list items for the selected status filter.";
    bucketListViewEmpty.style.display = "block";
    return;
  }

  bucketListViewList.innerHTML = filteredBucketTrackers
    .map((tracker, index) => {
      const status = bucketStatusMap.get(tracker.id) || { isClosed: false, latestEntry: null, latestCloseEntry: null };
      const isClosed = Boolean(status.isClosed);
      const closeEntry = status.latestCloseEntry || null;
      const latestEntry = status.latestEntry || null;
      const notes = latestEntry && latestEntry.notes ? `<p class="metric-line">${escapeHtml(latestEntry.notes)}</p>` : "";
      const statusLine = isClosed
        ? `Closed on ${formatDate(parseDateKey((closeEntry || latestEntry).date))}`
        : "Open item";
      const actionButton = tracker.archived
        ? `<span class="muted small">Archived</span>`
        : isClosed
        ? `<button class="btn" type="button" data-action="reopen-bucket-goal" data-id="${tracker.id}">Reopen</button>`
        : `<button class="btn btn-primary" type="button" data-action="close-bucket-goal" data-id="${tracker.id}">Close Out</button>`;
      return `
        <li class="metric-card" style="--stagger:${index}">
          <div class="metric-top">
            <h3>${escapeHtml(tracker.name)}</h3>
            <div class="metric-controls">
              <span class="pace-chip ${isClosed ? "pace-on" : "pace-off"}">${isClosed ? "Closed" : "Open"}</span>
            </div>
          </div>
          <p class="metric-line">${statusLine}</p>
          ${notes}
          <div class="metric-footer-actions">
            ${actionButton}
          </div>
        </li>
      `;
    })
    .join("");
}

function createPeriodAccordionSectionMarkup(periodName, sectionName, label, cardsMarkup, emptyMessage) {
  const sectionState = periodAccordionState[periodName] || {};
  const isOpen = sectionState[sectionName] !== false;
  return `
    <section class="accordion-section">
      <details class="accordion-item" data-accordion-period="${periodName}" data-accordion-section="${sectionName}" ${isOpen ? "open" : ""}>
        <summary class="accordion-summary">${label}</summary>
        <div class="accordion-body">
          ${cardsMarkup ? `<ul class="card-list accordion-card-list">${cardsMarkup}</ul>` : `<p class="empty-state">${emptyMessage}</p>`}
        </div>
      </details>
    </section>
  `;
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
  const showCurrentPoints = Boolean(options.showCurrentPoints);
  const showOverlayPoints = Boolean(options.showOverlayPoints);
  const showProjectionPoints = Boolean(options.showProjectionPoints);
  const large = Boolean(options.large);
  const goalHit = Boolean(options.goalHit);
  const periodName = normalizePeriodMode(options.periodName);
  const unit = normalizeGoalUnit(options.unit);
  const domainDays = Math.max(Number(options.domainDays) || 0, series.length || 1, 1);
  const weekTicks = periodName === "week" && domainDays <= 8;
  const projection = options.projection && Array.isArray(options.projection.points) ? options.projection : null;
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

  const projectionPoints = projection
    ? projection.points
      .map((point) => ({
        ...point,
        dayIndex: Math.max(Math.min(Number(point.dayIndex) || 0, domainDays - 1), 0),
        cumulative: Number(point.cumulative) || 0,
        amount: Number(point.amount) || 0
      }))
      .sort((a, b) => a.dayIndex - b.dayIndex)
    : [];

  const width = large ? 1080 : 860;
  const height = large ? 420 : 270;
  const padLeft = large ? 74 : 58;
  const padRight = large ? 24 : 20;
  const padTop = 20;
  const padBottom = large ? 64 : (weekTicks ? 70 : 54);
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const axisY = height - padBottom;
  const maxDataValue = Math.max(
    target,
    cumulative[cumulative.length - 1] || 0,
    overlayCumulative[overlayCumulative.length - 1] || 0,
    projectionPoints[projectionPoints.length - 1] ? projectionPoints[projectionPoints.length - 1].cumulative : 0,
    1
  );
  const maxValue = addAmount(maxDataValue, Math.max(maxDataValue * 0.08, 0.5));

  const toX = (index) => {
    if (domainDays === 1) {
      return padLeft + innerWidth / 2;
    }
    return padLeft + (index / (domainDays - 1)) * innerWidth;
  };
  const toY = (value) => axisY - (value / maxValue) * innerHeight;

  const linePoints = cumulative.map((value, index) => `${toX(index).toFixed(2)},${toY(value).toFixed(2)}`).join(" ");
  const targetY = toY(target).toFixed(2);

  const overlayLinePoints = overlayCumulative
    .map((value, index) => `${toX(index).toFixed(2)},${toY(value).toFixed(2)}`)
    .join(" ");

  const projectionLinePoints = projectionPoints
    .map((point) => `${toX(point.dayIndex).toFixed(2)},${toY(point.cumulative).toFixed(2)}`)
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

  const xTickIndexes = weekTicks
    ? Array.from({ length: domainDays }, (_, index) => index)
    : Array.from(new Set([0, Math.floor((domainDays - 1) / 2), domainDays - 1]))
      .filter((value) => value >= 0)
      .sort((a, b) => a - b);
  const xTickMarkup = xTickIndexes.map((index) => {
    const x = toX(index).toFixed(2);
    const tickDate = addDays(range.start, index);
    if (weekTicks) {
      return `
      <line x1="${x}" y1="${axisY}" x2="${x}" y2="${axisY + 6}" class="graph-axis" />
      <text x="${x}" y="${axisY + 16}" class="graph-tick graph-tick-x graph-tick-week">
        <tspan x="${x}" dy="0">${escapeHtml(formatWeekday(tickDate))}</tspan>
        <tspan x="${x}" dy="12">${escapeHtml(`${tickDate.getMonth() + 1}/${tickDate.getDate()}`)}</tspan>
      </text>
    `;
    }
    return `
      <line x1="${x}" y1="${axisY}" x2="${x}" y2="${axisY + 6}" class="graph-axis" />
      <text x="${x}" y="${axisY + 22}" class="graph-tick graph-tick-x">${escapeHtml(formatMonthDay(tickDate))}</text>
    `;
  }).join("");

  const pointDots = showCurrentPoints
    ? series.map((point, index) => {
        const cx = toX(index).toFixed(2);
        const cy = toY(cumulative[index]).toFixed(2);
        const dateLabel = formatDate(parseDateKey(point.date));
        return `
          <circle
            data-point="1"
            class="graph-point${goalHit ? " graph-point-hit" : ""}"
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

  const overlayDots = overlaySeries && showOverlayPoints
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

  const projectionDots = projectionPoints.length > 1 && showProjectionPoints
    ? projectionPoints.slice(1).map((point) => {
        const cx = toX(point.dayIndex).toFixed(2);
        const cy = toY(point.cumulative).toFixed(2);
        const dateLabel = formatDate(parseDateKey(point.date));
        return `
          <circle
            data-point="1"
            class="graph-point graph-point-projection${goalHit ? " graph-point-hit" : ""}"
            cx="${cx}"
            cy="${cy}"
            r="${large ? "3.6" : "3.2"}"
            data-date-label="${escapeAttr(dateLabel)}"
            data-amount="${escapeAttr(formatAmount(point.amount))}"
            data-cumulative="${escapeAttr(formatAmount(point.cumulative))}"
            data-series-label="Projection"
            data-unit="${escapeAttr(unit)}"
          ></circle>
        `;
      }).join("")
    : "";

  const overlayLegend = overlaySeries
    ? `<span class="legend-item"><span class="legend-swatch legend-overlay"></span>Previous Period</span>`
    : "";
  const projectionLegend = projectionPoints.length > 1
    ? `<span class="legend-item"><span class="legend-swatch legend-projection${goalHit ? " legend-projection-hit" : ""}"></span>Projection</span>`
    : "";

  const rangeLabel = `${formatDate(range.start)} to ${formatDate(range.end)}`;

  return `
    <div class="graph-head">
      <div class="graph-legend">
        <span class="legend-item"><span class="legend-swatch legend-line${goalHit ? " legend-line-hit" : ""}"></span>Current Cumulative</span>
        ${overlayLegend}
        ${projectionLegend}
        <span class="legend-item"><span class="legend-swatch legend-target"></span>Target</span>
      </div>
      <p class="graph-range-inline">${escapeHtml(rangeLabel)}</p>
    </div>
    <div class="graph-frame">
      <svg class="graph-svg${large ? " graph-svg-large" : ""}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cumulative progress line graph">
        <rect x="${padLeft}" y="${padTop}" width="${innerWidth}" height="${innerHeight}" class="graph-grid" />
        ${yTickMarkup}
        <line x1="${padLeft}" y1="${targetY}" x2="${width - padRight}" y2="${targetY}" class="graph-target" />
        <line x1="${padLeft}" y1="${axisY}" x2="${width - padRight}" y2="${axisY}" class="graph-axis" />
        <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${axisY}" class="graph-axis" />
        ${xTickMarkup}
        ${overlaySeries ? `<polyline points="${overlayLinePoints}" class="graph-line-overlay"></polyline>` : ""}
        ${projectionPoints.length > 1 ? `<polyline points="${projectionLinePoints}" class="graph-line-projection${goalHit ? " graph-line-projection-hit" : ""}"></polyline>` : ""}
        <polyline points="${linePoints}" class="graph-line${goalHit ? " graph-line-hit" : ""}"></polyline>
        ${overlayDots}
        ${projectionDots}
        ${pointDots}
      </svg>
      <div class="graph-tooltip hidden" data-tooltip></div>
    </div>
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

function getGoalCompareEnabled(periodName, trackerId) {
  return Boolean(settings && settings.compareToLastDefault);
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

function getProjectionLineEnabled(periodName, trackerId) {
  if (!projectionLineState[periodName]) {
    return false;
  }
  if (typeof projectionLineState[periodName][trackerId] !== "boolean") {
    projectionLineState[periodName][trackerId] = true;
  }
  return projectionLineState[periodName][trackerId];
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
  Object.keys(projectionLineState).forEach((periodName) => {
    Object.keys(projectionLineState[periodName]).forEach((trackerId) => {
      if (!trackerIds.has(trackerId)) {
        delete projectionLineState[periodName][trackerId];
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

function resetProjectionLineState() {
  Object.keys(projectionLineState).forEach((periodName) => {
    projectionLineState[periodName] = {};
  });
}

function resetInlineGraphState() {
  Object.keys(inlineGraphState).forEach((periodName) => {
    inlineGraphState[periodName] = {};
  });
}

function resetPeriodAccordionState() {
  Object.keys(periodAccordionState).forEach((periodName) => {
    periodAccordionState[periodName] = {
      goals: true,
      checkins: true,
      shared: false,
      snapshots: false
    };
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

function getChartDisplayRange(index, trackerId, range, now) {
  const start = new Date(range.start);
  if (range.end <= now) {
    return { start, end: new Date(range.end) };
  }
  if (range.start > now) {
    return { start, end: start };
  }
  const cappedEnd = new Date(now);
  const lastLoggedDateKey = getLastLoggedDateKey(index, trackerId, { start, end: cappedEnd });
  if (!lastLoggedDateKey) {
    return { start, end: cappedEnd };
  }
  return {
    start,
    end: parseDateKey(lastLoggedDateKey)
  };
}

function getLastLoggedDateKey(index, trackerId, range) {
  const startDay = dateKeyToDayNumber(getDateKey(range.start));
  const endDay = dateKeyToDayNumber(getDateKey(range.end));
  if (endDay < startDay) {
    return "";
  }
  for (let dayNumber = endDay; dayNumber >= startDay; dayNumber -= 1) {
    const dateKey = dayNumberToDateKey(dayNumber);
    if (index.trackerDateTotals.has(`${trackerId}|${dateKey}`)) {
      return dateKey;
    }
  }
  return "";
}

function shouldAllowProjectionLine(periodName, range, now) {
  return (periodName === "week" || periodName === "month" || periodName === "year")
    && range.start <= now
    && now <= range.end;
}

function getProjectionSeries(index, trackerId, fullRange, chartRange, chartSeries) {
  if (!chartSeries || chartSeries.length < 1) {
    return null;
  }
  const fullStartDay = dateKeyToDayNumber(getDateKey(fullRange.start));
  const fullEndDay = dateKeyToDayNumber(getDateKey(fullRange.end));
  const lastActualPoint = chartSeries[chartSeries.length - 1];
  const lastActualDay = dateKeyToDayNumber(lastActualPoint.date);
  if (fullEndDay <= lastActualDay) {
    return null;
  }

  const averagePerDay = getProjectionAveragePerDay(index, trackerId, fullRange, chartRange.end);
  const projectionPoints = [];
  let running = chartSeries.reduce((sum, point) => addAmount(sum, point.amount), 0);
  projectionPoints.push({
    date: lastActualPoint.date,
    amount: Number(lastActualPoint.amount) || 0,
    cumulative: running,
    dayIndex: Math.max(lastActualDay - fullStartDay, 0)
  });

  for (let dayNumber = lastActualDay + 1; dayNumber <= fullEndDay; dayNumber += 1) {
    running = addAmount(running, averagePerDay);
    projectionPoints.push({
      date: dayNumberToDateKey(dayNumber),
      amount: averagePerDay,
      cumulative: running,
      dayIndex: Math.max(dayNumber - fullStartDay, 0)
    });
  }

  return {
    points: projectionPoints,
    averagePerDay,
    source: normalizeProjectionAverageSource(settings && settings.projectionAverageSource)
  };
}

function getProjectionAveragePerDay(index, trackerId, fullRange, chartEndDate) {
  const source = normalizeProjectionAverageSource(settings && settings.projectionAverageSource);
  if (source === "year") {
    const yearRange = getYearRange(chartEndDate);
    const range = { start: yearRange.start, end: chartEndDate };
    const days = getRangeDays(range);
    const total = sumTrackerRange(index, trackerId, range);
    return safeDivide(total, days);
  }
  const periodRange = { start: fullRange.start, end: chartEndDate };
  const days = getRangeDays(periodRange);
  const total = sumTrackerRange(index, trackerId, periodRange);
  return safeDivide(total, days);
}

function getTrackerProjectionForRange(index, trackerId, fullRange, now) {
  const normalizedNow = normalizeDate(now || new Date());
  const chartRange = getChartDisplayRange(index, trackerId, fullRange, normalizedNow);
  const averagePerDay = getProjectionAveragePerDay(index, trackerId, fullRange, chartRange.end);
  const progressSoFar = sumTrackerRange(index, trackerId, { start: fullRange.start, end: chartRange.end });
  const chartEndDay = dateKeyToDayNumber(getDateKey(chartRange.end));
  const fullEndDay = dateKeyToDayNumber(getDateKey(fullRange.end));
  const remainingDays = Math.max(fullEndDay - chartEndDay, 0);
  const projected = addAmount(progressSoFar, averagePerDay * remainingDays);
  return {
    projected,
    averagePerDay,
    progressSoFar,
    source: normalizeProjectionAverageSource(settings && settings.projectionAverageSource)
  };
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

function hasTrackerEntriesForEveryDay(index, trackerId, range) {
  const current = new Date(range.start);
  while (current <= range.end) {
    const key = `${trackerId}|${getDateKey(current)}`;
    if (!index.trackerDateTotals.has(key)) {
      return false;
    }
    current.setDate(current.getDate() + 1);
  }
  return true;
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

function hasFirebaseConfig(config) {
  if (!config || typeof config !== "object") {
    return false;
  }
  const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"];
  return requiredKeys.every((key) => String(config[key] || "").trim().length > 0);
}

function initializeFirebaseServices() {
  const config = window.GOAL_TRACKER_FIREBASE_CONFIG;
  firebaseConfigured = hasFirebaseConfig(config);
  if (!firebaseConfigured) {
    return false;
  }
  firebaseApp = initializeApp(config);
  firebaseAuth = getAuth(firebaseApp);
  firebaseDb = getFirestore(firebaseApp);
  return true;
}

function getCloudProfileRef(userId) {
  if (!firebaseDb || !userId) {
    return null;
  }
  return doc(firebaseDb, CLOUD_PROFILE_COLLECTION, userId);
}

function getCloudDataRef(userId) {
  if (!firebaseDb || !userId) {
    return null;
  }
  return doc(firebaseDb, CLOUD_DATA_COLLECTION, userId);
}

function getNotificationMessage(item) {
  if (!item || typeof item !== "object") {
    return "New notification";
  }
  const type = String(item.type || "");
  const actorName = normalizeUsername(item.actorUsername) || "Someone";
  if (type === "friend-added") {
    return `${actorName} added you as a friend.`;
  }
  if (type === "goal-share-invite") {
    const goalName = String(item.goalName || "a goal");
    return `${actorName} invited you to be an accountability partner for "${goalName}".`;
  }
  if (type === "goal-share-approved") {
    const goalName = String(item.goalName || "a goal");
    return `${actorName} approved accountability access for "${goalName}".`;
  }
  if (type === "goal-share-rejected") {
    const goalName = String(item.goalName || "a goal");
    return `${actorName} declined accountability access for "${goalName}".`;
  }
  if (type === "goal-share-entry-update") {
    const goalName = String(item.goalName || "a shared goal");
    const amount = formatAmount(normalizePositiveAmount(item.entryAmount, 0));
    const unit = normalizeGoalUnit(item.goalUnit || "units");
    const dateLabel = isDateKey(item.entryDate) ? formatDate(parseDateKey(item.entryDate)) : "today";
    return `${actorName} logged ${amount} ${unit} for "${goalName}" on ${dateLabel}.`;
  }
  return "New notification";
}

async function findUserProfileByEmail(emailValue) {
  const email = normalizeEmail(emailValue);
  if (!firebaseConfigured || !firebaseDb || !email) {
    return null;
  }
  try {
    const profileQuery = query(
      collection(firebaseDb, CLOUD_PROFILE_COLLECTION),
      where("email", "==", email),
      limit(1)
    );
    const snapshot = await getDocs(profileQuery);
    if (snapshot.empty) {
      return null;
    }
    const profileDoc = snapshot.docs[0];
    const data = profileDoc.data() || {};
    return {
      id: profileDoc.id,
      email: normalizeEmail(data.email || email),
      username: normalizeUsername(data.username) || getEmailUsernameFallback(email),
      firstName: normalizeProfileName(data.firstName),
      lastName: normalizeProfileName(data.lastName)
    };
  } catch {
    return null;
  }
}

async function createNotificationDoc(payload) {
  if (!firebaseConfigured || !firebaseDb || !payload || typeof payload !== "object") {
    return null;
  }
  try {
    const ref = await addDoc(collection(firebaseDb, CLOUD_NOTIFICATION_COLLECTION), {
      ...payload,
      createdAt: typeof payload.createdAt === "string" ? payload.createdAt : new Date().toISOString(),
      read: payload.read === true
    });
    return ref.id;
  } catch {
    return null;
  }
}

async function sendFriendAddedNotification(friendName, friendEmail) {
  if (!firebaseConfigured || !firebaseDb || !currentUser) {
    return;
  }
  const targetProfile = await findUserProfileByEmail(friendEmail);
  if (!targetProfile || !targetProfile.id || targetProfile.id === currentUser.id) {
    return;
  }
  await createNotificationDoc({
    type: "friend-added",
    recipientId: targetProfile.id,
    actorId: currentUser.id,
    actorUsername: getUserDisplayName(currentUser),
    actorEmail: normalizeEmail(currentUser.email),
    friendLabel: String(friendName || "").trim(),
    read: false
  });
}

function normalizeNotificationRecord(raw, id) {
  const item = raw && typeof raw === "object" ? raw : {};
  const createdAt = new Date(item.createdAt);
  return {
    id: String(id || createId()),
    type: typeof item.type === "string" ? item.type : "system",
    recipientId: typeof item.recipientId === "string" ? item.recipientId : "",
    actorId: typeof item.actorId === "string" ? item.actorId : "",
    actorUsername: typeof item.actorUsername === "string" ? item.actorUsername : "",
    actorEmail: typeof item.actorEmail === "string" ? item.actorEmail : "",
    shareId: typeof item.shareId === "string" ? item.shareId : "",
    goalName: typeof item.goalName === "string" ? item.goalName : "",
    goalUnit: typeof item.goalUnit === "string" ? item.goalUnit : "",
    entryAmount: normalizePositiveAmount(item.entryAmount, 0),
    entryDate: isDateKey(item.entryDate) ? item.entryDate : "",
    friendLabel: typeof item.friendLabel === "string" ? item.friendLabel : "",
    read: Boolean(item.read),
    actioned: Boolean(item.actioned),
    createdAt: Number.isNaN(createdAt.getTime()) ? new Date().toISOString() : createdAt.toISOString()
  };
}

function stopNotificationsListener() {
  if (typeof notificationsUnsubscribe === "function") {
    notificationsUnsubscribe();
  }
  notificationsUnsubscribe = null;
}

function startNotificationsListener() {
  stopNotificationsListener();
  if (!firebaseConfigured || !firebaseDb || !currentUser) {
    notifications = [];
    notificationsPanelOpen = false;
    renderNotifications();
    return;
  }
  const notificationsQuery = query(
    collection(firebaseDb, CLOUD_NOTIFICATION_COLLECTION),
    where("recipientId", "==", currentUser.id),
    limit(100)
  );
  notificationsUnsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
    notifications = snapshot.docs
      .map((item) => normalizeNotificationRecord(item.data(), item.id))
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    renderNotifications();
  }, () => {
    notifications = [];
    renderNotifications();
  });
}

async function markAllNotificationsRead() {
  if (!firebaseConfigured || !firebaseDb || !currentUser) {
    return;
  }
  const unread = notifications.filter((item) => !item.read);
  if (unread.length < 1) {
    return;
  }
  await Promise.all(unread.map(async (item) => {
    try {
      await updateDoc(doc(firebaseDb, CLOUD_NOTIFICATION_COLLECTION, item.id), {
        read: true,
        readAt: new Date().toISOString()
      });
    } catch {
      // Keep trying on next action/listener refresh.
    }
  }));
}

async function respondToGoalShareInvite(notificationId, shareId, approve) {
  if (!firebaseConfigured || !firebaseDb || !currentUser || !shareId) {
    return { success: false, message: "Unable to process invite right now." };
  }
  const shareRef = doc(firebaseDb, CLOUD_GOAL_SHARE_COLLECTION, shareId);
  let shareData = null;
  try {
    const snapshot = await getDoc(shareRef);
    if (!snapshot.exists()) {
      return { success: false, message: "This invite is no longer available." };
    }
    shareData = normalizeGoalShareRecord(snapshot.data(), snapshot.id);
  } catch {
    return { success: false, message: "Unable to load invite details." };
  }

  if (shareData.partnerId !== currentUser.id) {
    return { success: false, message: "This invite belongs to a different account." };
  }
  const nextStatus = approve ? "approved" : "rejected";
  try {
    await updateDoc(shareRef, {
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      approvedAt: approve ? new Date().toISOString() : ""
    });
  } catch {
    return { success: false, message: "Unable to update invite status." };
  }

  if (notificationId) {
    try {
      await updateDoc(doc(firebaseDb, CLOUD_NOTIFICATION_COLLECTION, notificationId), {
        read: true,
        actioned: true,
        actionedAt: new Date().toISOString()
      });
    } catch {
      // Listener-driven refresh will still show latest share state.
    }
  }

  await createNotificationDoc({
    type: approve ? "goal-share-approved" : "goal-share-rejected",
    recipientId: shareData.ownerId,
    actorId: currentUser.id,
    actorUsername: getUserDisplayName(currentUser),
    actorEmail: normalizeEmail(currentUser.email),
    shareId: shareData.id,
    goalName: shareData.goalName,
    goalUnit: shareData.goalUnit,
    read: false
  });
  return { success: true, message: approve ? "Invite approved." : "Invite declined." };
}

function stopGoalShareListeners() {
  if (typeof goalSharePartnerUnsubscribe === "function") {
    goalSharePartnerUnsubscribe();
  }
  if (typeof goalShareOwnerUnsubscribe === "function") {
    goalShareOwnerUnsubscribe();
  }
  goalSharePartnerUnsubscribe = null;
  goalShareOwnerUnsubscribe = null;
}

function startGoalShareListeners() {
  stopGoalShareListeners();
  if (!firebaseConfigured || !firebaseDb || !currentUser) {
    sharedGoalShares = [];
    sharedGoalOwnerData = new Map();
    return;
  }

  const partnerQuery = query(
    collection(firebaseDb, CLOUD_GOAL_SHARE_COLLECTION),
    where("partnerId", "==", currentUser.id),
    limit(100)
  );
  goalSharePartnerUnsubscribe = onSnapshot(partnerQuery, (snapshot) => {
    sharedGoalShares = snapshot.docs
      .map((item) => normalizeGoalShareRecord(item.data(), item.id))
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
    refreshSharedGoalOwnerData().finally(() => {
      if (currentUser) {
        renderPeriodTabs();
      }
    });
  }, () => {
    sharedGoalShares = [];
    sharedGoalOwnerData = new Map();
    if (currentUser) {
      renderPeriodTabs();
    }
  });

  const ownerQuery = query(
    collection(firebaseDb, CLOUD_GOAL_SHARE_COLLECTION),
    where("ownerId", "==", currentUser.id),
    limit(100)
  );
  goalShareOwnerUnsubscribe = onSnapshot(ownerQuery, (snapshot) => {
    const ownerShares = snapshot.docs
      .map((item) => normalizeGoalShareRecord(item.data(), item.id))
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
    let changed = false;
    trackers = trackers.map((tracker) => {
      const shareId = String(tracker.accountabilityShareId || "");
      if (!shareId) {
        return tracker;
      }
      const matchingShare = ownerShares.find((item) => item.id === shareId);
      if (!matchingShare) {
        return tracker;
      }
      const shareStatus = normalizeGoalShareStatus(matchingShare.status);
      const nextStatus = normalizeAccountabilityStatus(shareStatus);
      const nextTracker = {
        ...tracker,
        accountabilityStatus: nextStatus,
        accountabilityPartnerId: matchingShare.partnerId || tracker.accountabilityPartnerId || "",
        accountabilityPartnerEmail: matchingShare.partnerEmail || tracker.accountabilityPartnerEmail || "",
        accountabilityPartnerName: matchingShare.partnerName || tracker.accountabilityPartnerName || ""
      };
      if (shareStatus === "removed") {
        nextTracker.accountabilityStatus = "none";
        nextTracker.accountabilityShareId = "";
        nextTracker.accountabilityPartnerId = "";
        nextTracker.accountabilityPartnerEmail = "";
        nextTracker.accountabilityPartnerName = "";
      }
      const hasChanged = (
        nextTracker.accountabilityStatus !== tracker.accountabilityStatus
        || nextTracker.accountabilityPartnerId !== tracker.accountabilityPartnerId
        || nextTracker.accountabilityPartnerEmail !== tracker.accountabilityPartnerEmail
        || nextTracker.accountabilityPartnerName !== tracker.accountabilityPartnerName
        || nextTracker.accountabilityShareId !== tracker.accountabilityShareId
      );
      if (hasChanged) {
        changed = true;
      }
      return hasChanged ? nextTracker : tracker;
    });
    if (changed) {
      saveTrackers();
      render();
    }
  }, () => {
    // Keep local tracker settings if listener fails.
  });
}

async function loadSharedOwnerData(ownerId) {
  const dataRef = getCloudDataRef(ownerId);
  if (!dataRef) {
    return { trackers: [], entries: [] };
  }
  try {
    const snapshot = await getDoc(dataRef);
    if (!snapshot.exists()) {
      return { trackers: [], entries: [] };
    }
    const data = snapshot.data() || {};
    const ownerTrackers = Array.isArray(data.trackers)
      ? data.trackers
        .filter((item) => item && typeof item.id === "string")
        .map((item) => ({
          id: item.id,
          name: typeof item.name === "string" ? item.name : "Shared Goal",
          goalType: normalizeGoalType(item.goalType),
          unit: normalizeGoalUnit(item.unit),
          weeklyGoal: normalizePositiveInt(item.weeklyGoal, 1),
          monthlyGoal: normalizePositiveInt(item.monthlyGoal, 1),
          yearlyGoal: normalizePositiveInt(item.yearlyGoal, 1)
        }))
      : [];
    const trackerIds = new Set(ownerTrackers.map((item) => item.id));
    const ownerEntries = Array.isArray(data.entries)
      ? data.entries
        .filter((item) => (
          item
          && typeof item.trackerId === "string"
          && trackerIds.has(item.trackerId)
          && isDateKey(item.date)
        ))
        .map((item) => ({
          id: typeof item.id === "string" ? item.id : createId(),
          trackerId: item.trackerId,
          date: item.date,
          amount: normalizePositiveAmount(item.amount, 0),
          notes: typeof item.notes === "string" ? item.notes : "",
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
        }))
      : [];
    return { trackers: ownerTrackers, entries: ownerEntries };
  } catch {
    return { trackers: [], entries: [] };
  }
}

async function refreshSharedGoalOwnerData() {
  if (!firebaseConfigured || !firebaseDb || !currentUser) {
    sharedGoalOwnerData = new Map();
    return;
  }
  const approvedShares = getApprovedSharedGoalShares();
  const ownerIds = Array.from(new Set(approvedShares.map((item) => item.ownerId).filter(Boolean)));
  const entries = await Promise.all(ownerIds.map(async (ownerId) => {
    const ownerData = await loadSharedOwnerData(ownerId);
    return [ownerId, ownerData];
  }));
  sharedGoalOwnerData = new Map(entries);
}

async function addSharedGoalEntryUpdate(shareId, ownerId, goalId, dateValue, amount, notes = "") {
  if (!firebaseConfigured || !firebaseDb || !currentUser) {
    return { success: false, message: "Cloud sync is not configured for shared updates." };
  }
  const share = sharedGoalShares.find((item) => item.id === shareId);
  if (!share || share.status !== "approved" || share.partnerId !== currentUser.id) {
    return { success: false, message: "This shared goal is not available for updates." };
  }
  if (share.ownerId !== ownerId || share.ownerGoalId !== goalId) {
    return { success: false, message: "This shared goal update request is invalid." };
  }
  const dataRef = getCloudDataRef(ownerId);
  if (!dataRef) {
    return { success: false, message: "Unable to update this shared goal right now." };
  }
  try {
    const snapshot = await getDoc(dataRef);
    if (!snapshot.exists()) {
      return { success: false, message: "Shared goal owner data is unavailable." };
    }
    const data = snapshot.data() || {};
    const existingEntries = Array.isArray(data.entries) ? data.entries : [];
    const nextEntries = [...existingEntries, {
      id: createId(),
      trackerId: goalId,
      date: dateValue,
      amount: normalizePositiveAmount(amount, 0),
      notes: String(notes || "").trim(),
      createdAt: new Date().toISOString(),
      sharedBy: currentUser.id,
      sharedByUsername: getUserDisplayName(currentUser)
    }];
    await setDoc(dataRef, {
      entries: nextEntries,
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: serverTimestamp()
    }, { merge: true });

    await createNotificationDoc({
      type: "goal-share-entry-update",
      recipientId: share.ownerId,
      actorId: currentUser.id,
      actorUsername: getUserDisplayName(currentUser),
      actorEmail: normalizeEmail(currentUser.email),
      shareId: share.id,
      goalName: share.goalName,
      goalUnit: share.goalUnit,
      entryAmount: normalizePositiveAmount(amount, 0),
      entryDate: dateValue,
      read: false
    });
    return { success: true, message: "" };
  } catch {
    return { success: false, message: "Unable to save shared goal update right now." };
  }
}

function notifyAccountabilityPartnerEntryUpdate(tracker, amount, dateValue) {
  if (!tracker || !currentUser || !firebaseConfigured || !firebaseDb) {
    return;
  }
  if (normalizeAccountabilityStatus(tracker.accountabilityStatus) !== "approved") {
    return;
  }
  const recipientId = String(tracker.accountabilityPartnerId || "");
  if (!recipientId || recipientId === currentUser.id) {
    return;
  }
  void createNotificationDoc({
    type: "goal-share-entry-update",
    recipientId,
    actorId: currentUser.id,
    actorUsername: getUserDisplayName(currentUser),
    actorEmail: normalizeEmail(currentUser.email),
    shareId: tracker.accountabilityShareId || "",
    goalName: tracker.name || "Goal",
    goalUnit: tracker.unit || "units",
    entryAmount: normalizePositiveAmount(amount, 0),
    entryDate: isDateKey(dateValue) ? dateValue : getDateKey(normalizeDate(new Date())),
    read: false
  });
}

async function syncTrackerAccountabilityShares(previousTrackersById, deletedIds = new Set()) {
  const errors = [];
  if (!currentUser) {
    return errors;
  }
  const removeShare = async (shareId) => {
    if (!firebaseConfigured || !firebaseDb || !shareId) {
      return;
    }
    try {
      await updateDoc(doc(firebaseDb, CLOUD_GOAL_SHARE_COLLECTION, shareId), {
        status: "removed",
        updatedAt: new Date().toISOString()
      });
    } catch {
      // Keep local model even if remote cleanup fails.
    }
  };

  // Handle deleted goals that had active share links.
  const removedSharePromises = [];
  previousTrackersById.forEach((previous) => {
    if (!previous || typeof previous !== "object") {
      return;
    }
    const shareId = String(previous.accountabilityShareId || "");
    if (!shareId) {
      return;
    }
    const removed = deletedIds.has(previous.id) || !trackers.some((item) => item.id === previous.id);
    if (removed) {
      removedSharePromises.push(removeShare(shareId));
    }
  });
  if (removedSharePromises.length > 0) {
    await Promise.all(removedSharePromises);
  }

  for (const tracker of trackers) {
    const previous = previousTrackersById.get(tracker.id) || {};
    const prevEmail = normalizeEmail(previous.accountabilityPartnerEmail || "");
    const nextEmail = normalizeEmail(tracker.accountabilityPartnerEmail || "");
    const prevShareId = String(previous.accountabilityShareId || "");
    const nextShareId = String(tracker.accountabilityShareId || "");
    const unchangedShare = (
      nextEmail
      && prevEmail === nextEmail
      && nextShareId
      && normalizeAccountabilityStatus(tracker.accountabilityStatus) !== "rejected"
    );
    if (unchangedShare) {
      continue;
    }
    if (!nextEmail) {
      if (prevShareId) {
        await removeShare(prevShareId);
      }
      tracker.accountabilityPartnerEmail = "";
      tracker.accountabilityPartnerName = "";
      tracker.accountabilityPartnerId = "";
      tracker.accountabilityShareId = "";
      tracker.accountabilityStatus = "none";
      continue;
    }
    if (prevShareId && prevEmail !== nextEmail) {
      await removeShare(prevShareId);
    }
    if (!firebaseConfigured || !firebaseDb) {
      errors.push(`Cloud is not configured for "${tracker.name}".`);
      tracker.accountabilityPartnerEmail = "";
      tracker.accountabilityPartnerName = "";
      tracker.accountabilityPartnerId = "";
      tracker.accountabilityShareId = "";
      tracker.accountabilityStatus = "none";
      continue;
    }
    const partnerProfile = await findUserProfileByEmail(nextEmail);
    if (!partnerProfile || !partnerProfile.id) {
      errors.push(`No account found for ${nextEmail}.`);
      tracker.accountabilityPartnerEmail = "";
      tracker.accountabilityPartnerName = "";
      tracker.accountabilityPartnerId = "";
      tracker.accountabilityShareId = "";
      tracker.accountabilityStatus = "none";
      continue;
    }
    if (partnerProfile.id === currentUser.id) {
      errors.push(`"${tracker.name}" cannot use your own account as partner.`);
      tracker.accountabilityPartnerEmail = "";
      tracker.accountabilityPartnerName = "";
      tracker.accountabilityPartnerId = "";
      tracker.accountabilityShareId = "";
      tracker.accountabilityStatus = "none";
      continue;
    }
    try {
      const shareRef = await addDoc(collection(firebaseDb, CLOUD_GOAL_SHARE_COLLECTION), {
        ownerId: currentUser.id,
        ownerGoalId: tracker.id,
        ownerUsername: getUserDisplayName(currentUser),
        ownerEmail: normalizeEmail(currentUser.email),
        partnerId: partnerProfile.id,
        partnerEmail: partnerProfile.email,
        partnerName: partnerProfile.username,
        goalName: tracker.name,
        goalUnit: tracker.unit,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        approvedAt: ""
      });
      tracker.accountabilityPartnerEmail = partnerProfile.email;
      tracker.accountabilityPartnerName = partnerProfile.username;
      tracker.accountabilityPartnerId = partnerProfile.id;
      tracker.accountabilityShareId = shareRef.id;
      tracker.accountabilityStatus = "pending";

      await createNotificationDoc({
        type: "goal-share-invite",
        recipientId: partnerProfile.id,
        actorId: currentUser.id,
        actorUsername: getUserDisplayName(currentUser),
        actorEmail: normalizeEmail(currentUser.email),
        shareId: shareRef.id,
        goalName: tracker.name,
        goalUnit: tracker.unit,
        read: false,
        actioned: false
      });
    } catch {
      errors.push(`Unable to send invite for "${tracker.name}".`);
      tracker.accountabilityPartnerEmail = "";
      tracker.accountabilityPartnerName = "";
      tracker.accountabilityPartnerId = "";
      tracker.accountabilityShareId = "";
      tracker.accountabilityStatus = "none";
    }
  }
  return errors;
}

function loadLocalDataUpdatedAt() {
  if (!currentUser) {
    return "";
  }
  return String(localStorage.getItem(getScopedStorageKey(CLOUD_LOCAL_UPDATED_AT_KEY)) || "");
}

function markLocalDataUpdatedAt(timestamp = "") {
  if (!currentUser || suppressCloudSync) {
    return;
  }
  const value = String(timestamp || new Date().toISOString());
  localStorage.setItem(getScopedStorageKey(CLOUD_LOCAL_UPDATED_AT_KEY), value);
}

function buildCloudPayload() {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    trackers,
    entries,
    checkIns,
    checkInEntries,
    goalJournalEntries,
    schedules,
    friends,
    periodSnapshots,
    rewards,
    rewardPurchases,
    pointTransactions,
    entryUiPrefs,
    goalHitNotificationKeys,
    settings
  };
}

function queueCloudSync() {
  if (!firebaseConfigured || !currentUser || !firebaseDb || suppressCloudSync) {
    return;
  }
  if (cloudSyncTimer) {
    clearTimeout(cloudSyncTimer);
  }
  cloudSyncTimer = setTimeout(() => {
    flushCloudSync();
  }, 800);
}

async function flushCloudSync() {
  if (!firebaseConfigured || !currentUser || !firebaseDb || suppressCloudSync) {
    return;
  }
  if (cloudSyncInFlight) {
    queueCloudSync();
    return;
  }
  const dataRef = getCloudDataRef(currentUser.id);
  if (!dataRef) {
    return;
  }
  cloudSyncInFlight = true;
  try {
    const payload = buildCloudPayload();
    await setDoc(dataRef, {
      ...payload,
      serverUpdatedAt: serverTimestamp()
    }, { merge: true });
    markLocalDataUpdatedAt(payload.updatedAt);
  } catch {
    // Keep local data and retry on next save.
  } finally {
    cloudSyncInFlight = false;
  }
}

function isLocalDataEmpty() {
  const hasGoals = Array.isArray(trackers) && trackers.length > 0;
  const hasEntries = Array.isArray(entries) && entries.length > 0;
  const hasCheckIns = Array.isArray(checkIns) && checkIns.length > 0;
  const hasJournal = Array.isArray(goalJournalEntries) && goalJournalEntries.length > 0;
  const hasSchedules = Array.isArray(schedules) && schedules.length > 0;
  const hasFriends = Array.isArray(friends) && friends.length > 0;
  const hasSnapshots = Array.isArray(periodSnapshots) && periodSnapshots.length > 0;
  const hasRewards = Array.isArray(rewards) && rewards.length > 0;
  const hasRewardPurchases = Array.isArray(rewardPurchases) && rewardPurchases.length > 0;
  const hasTransactions = Array.isArray(pointTransactions) && pointTransactions.length > 0;
  const hasGoalHitNotifications = Array.isArray(goalHitNotificationKeys) && goalHitNotificationKeys.length > 0;
  return !(hasGoals || hasEntries || hasCheckIns || hasJournal || hasSchedules || hasSnapshots || hasRewards || hasRewardPurchases || hasTransactions || hasGoalHitNotifications);
}

function writeCloudPayloadToLocal(payload) {
  if (!currentUser || !payload || typeof payload !== "object") {
    return;
  }
  const keysToWrite = [
    [TRACKERS_STORAGE_KEY, Array.isArray(payload.trackers) ? payload.trackers : []],
    [ENTRIES_STORAGE_KEY, Array.isArray(payload.entries) ? payload.entries : []],
    [CHECKINS_STORAGE_KEY, Array.isArray(payload.checkIns) ? payload.checkIns : []],
    [CHECKIN_ENTRIES_STORAGE_KEY, Array.isArray(payload.checkInEntries) ? payload.checkInEntries : []],
    [GOAL_JOURNAL_STORAGE_KEY, Array.isArray(payload.goalJournalEntries) ? payload.goalJournalEntries : []],
    [SCHEDULE_STORAGE_KEY, Array.isArray(payload.schedules) ? payload.schedules : []],
    [FRIENDS_STORAGE_KEY, Array.isArray(payload.friends) ? payload.friends : []],
    [PERIOD_SNAPSHOTS_STORAGE_KEY, Array.isArray(payload.periodSnapshots) ? payload.periodSnapshots : []],
    [REWARDS_STORAGE_KEY, Array.isArray(payload.rewards) ? payload.rewards : []],
    [REWARD_PURCHASES_STORAGE_KEY, Array.isArray(payload.rewardPurchases) ? payload.rewardPurchases : []],
    [POINT_TRANSACTIONS_STORAGE_KEY, Array.isArray(payload.pointTransactions) ? payload.pointTransactions : []],
    [ENTRY_UI_PREFS_STORAGE_KEY, payload.entryUiPrefs && typeof payload.entryUiPrefs === "object" ? payload.entryUiPrefs : getDefaultEntryUiPrefs()],
    [GOAL_HIT_NOTIFICATIONS_STORAGE_KEY, Array.isArray(payload.goalHitNotificationKeys) ? payload.goalHitNotificationKeys : []],
    [SETTINGS_STORAGE_KEY, payload.settings && typeof payload.settings === "object" ? payload.settings : getDefaultSettings()]
  ];
  keysToWrite.forEach(([key, value]) => {
    localStorage.setItem(getScopedStorageKey(key), JSON.stringify(value));
  });
  if (payload.updatedAt) {
    markLocalDataUpdatedAt(String(payload.updatedAt));
  }
}

function normalizeCloudTimestamp(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}

async function syncCloudDataOnLogin() {
  if (!firebaseConfigured || !firebaseDb || !currentUser) {
    return;
  }
  const dataRef = getCloudDataRef(currentUser.id);
  if (!dataRef) {
    return;
  }
  try {
    const snapshot = await getDoc(dataRef);
    const localUpdatedAt = normalizeCloudTimestamp(loadLocalDataUpdatedAt());
    const hasLocalContent = !isLocalDataEmpty();
    if (!snapshot.exists()) {
      if (hasLocalContent) {
        queueCloudSync();
      }
      return;
    }
    const cloudData = snapshot.data() || {};
    const cloudUpdatedAt = normalizeCloudTimestamp(cloudData.updatedAt);
    const shouldPullCloud = !hasLocalContent || (cloudUpdatedAt && (!localUpdatedAt || cloudUpdatedAt > localUpdatedAt));
    if (!shouldPullCloud) {
      queueCloudSync();
      return;
    }
    suppressCloudSync = true;
    writeCloudPayloadToLocal(cloudData);
    initializeData();
    suppressCloudSync = false;
    if (cloudUpdatedAt) {
      markLocalDataUpdatedAt(cloudUpdatedAt);
    }
  } catch {
    // Leave local cache as source of truth if network fails.
  } finally {
    suppressCloudSync = false;
  }
}

async function loadCurrentUserProfile(authUser) {
  if (!authUser) {
    return null;
  }
  const fallbackUsername = getEmailUsernameFallback(authUser.email);
  const fallbackProfile = {
    id: authUser.uid,
    firstName: "",
    lastName: "",
    email: normalizeEmail(authUser.email),
    username: fallbackUsername,
    usernameKey: getUsernameKey(fallbackUsername),
    createdAt: new Date().toISOString()
  };
  if (!firebaseConfigured || !firebaseDb) {
    return fallbackProfile;
  }
  const profileRef = getCloudProfileRef(authUser.uid);
  if (!profileRef) {
    return fallbackProfile;
  }
  try {
    const snapshot = await getDoc(profileRef);
    const raw = snapshot.exists() ? (snapshot.data() || {}) : {};
    const username = normalizeUsername(raw.username) || fallbackUsername;
    const profile = {
      id: authUser.uid,
      firstName: normalizeProfileName(raw.firstName),
      lastName: normalizeProfileName(raw.lastName),
      email: normalizeEmail(raw.email || authUser.email || ""),
      username,
      usernameKey: getUsernameKey(username),
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString()
    };
    if (!snapshot.exists()) {
      await setDoc(profileRef, profile, { merge: true });
    }
    return profile;
  } catch {
    return fallbackProfile;
  }
}

function resetStateForSignedOutUser() {
  stopNotificationsListener();
  stopGoalShareListeners();
  if (cloudSyncTimer) {
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = null;
  }
  cloudSyncInFlight = false;
  suppressCloudSync = false;
  currentUser = null;
  trackers = [];
  entries = [];
  checkIns = [];
  checkInEntries = [];
  goalJournalEntries = [];
  schedules = [];
  friends = [];
  periodSnapshots = [];
  rewards = [];
  rewardPurchases = [];
  pointTransactions = [];
  goalHitNotificationKeys = [];
  settings = getDefaultSettings();
  activeTab = "manage";
  entryMode = "solo";
  entryUiPrefs = getDefaultEntryUiPrefs();
  entrySoloInitialized = false;
  entryListSortMode = "date_desc";
  entryListTypeFilter = "all";
  entryListStatusFilter = "active";
  entryListBucketFilter = "all";
  periodGoalFilterState.week.type = "all";
  periodGoalFilterState.week.status = "active";
  periodGoalFilterState.week.tag = "all";
  periodGoalFilterState.month.type = "all";
  periodGoalFilterState.month.status = "active";
  periodGoalFilterState.month.tag = "all";
  periodGoalFilterState.year.type = "all";
  periodGoalFilterState.year.status = "active";
  periodGoalFilterState.year.tag = "all";
  bucketListGoalStatusFilter = "active";
  bucketListItemStatusFilter = "all";
  scheduleWeekAnchor = normalizeDate(new Date());
  weekEntryAnchor = normalizeDate(new Date());
  weekEntryStatusMessage = "";
  resetViewAnchors();
  resetGoalCompareState();
  resetScheduleTileFlips();
  resetGraphPointsState();
  resetProjectionLineState();
  resetPeriodAccordionState();
  resetInlineGraphState();
  closeGraphModal();
  setAuthMode("signin");
  if (loginForm) {
    loginForm.reset();
  }
  if (registerForm) {
    registerForm.reset();
  }
  setMobileMenuOpen(false);
  applyPasswordVisibilityToggle();
  showAuthMessage(
    firebaseConfigured ? "" : "Add your Firebase config in firebase-config.js to enable cloud sync.",
    !firebaseConfigured
  );
  if (csvUploadStatus) {
    csvUploadStatus.textContent = "";
  }
  if (entryModeSelect) {
    entryModeSelect.value = entryMode;
  }
  if (goalHitNotificationsSelect) {
    goalHitNotificationsSelect.value = "on";
  }
  if (weekGoalTagFilterSelect) {
    weekGoalTagFilterSelect.value = periodGoalFilterState.week.tag;
  }
  if (monthGoalTagFilterSelect) {
    monthGoalTagFilterSelect.value = periodGoalFilterState.month.tag;
  }
  if (yearGoalTagFilterSelect) {
    yearGoalTagFilterSelect.value = periodGoalFilterState.year.tag;
  }
  hideGoalHitToast();
}

function initializeAuth() {
  users = loadUsers();
  const hasFirebase = initializeFirebaseServices();
  if (!hasFirebase || !firebaseAuth) {
    resetStateForSignedOutUser();
    render();
    return;
  }

  onAuthStateChanged(firebaseAuth, async (authUser) => {
    if (!authUser) {
      resetStateForSignedOutUser();
      render();
      return;
    }

    try {
      currentUser = await loadCurrentUserProfile(authUser);
      migrateLegacyDataToUser();
      initializeData();
      await syncCloudDataOnLogin();
      resetUiStateForLogin();
      startNotificationsListener();
      startGoalShareListeners();
      render();
    } catch {
      resetStateForSignedOutUser();
      showAuthMessage("Unable to load account data.", true);
      render();
    }
  });
}

function resetUiStateForLogin() {
  hideGoalHitToast();
  activeTab = "manage";
  entryMode = normalizeEntryMode(entryUiPrefs.mode);
  entrySoloInitialized = false;
  scheduleWeekAnchor = normalizeDate(new Date());
  weekEntryAnchor = normalizeDate(new Date());
  weekEntryStatusMessage = "";
  entryListSortMode = "date_desc";
  entryListTypeFilter = "all";
  entryListStatusFilter = "active";
  entryListBucketFilter = "all";
  periodGoalFilterState.week.type = "all";
  periodGoalFilterState.week.status = "active";
  periodGoalFilterState.week.tag = "all";
  periodGoalFilterState.month.type = "all";
  periodGoalFilterState.month.status = "active";
  periodGoalFilterState.month.tag = "all";
  periodGoalFilterState.year.type = "all";
  periodGoalFilterState.year.status = "active";
  periodGoalFilterState.year.tag = "all";
  bucketListGoalStatusFilter = "active";
  bucketListItemStatusFilter = "all";
  resetViewAnchors();
  resetGoalCompareState();
  resetScheduleTileFlips();
  resetGraphPointsState();
  resetProjectionLineState();
  resetInlineGraphState();
  resetPeriodAccordionState();
  closeGraphModal();
  weekStartSelect.value = settings.weekStart;
  compareDefaultSelect.value = settings.compareToLastDefault ? "on" : "off";
  if (projectionAverageSelect) {
    projectionAverageSelect.value = normalizeProjectionAverageSource(settings.projectionAverageSource);
  }
  if (rewardPointsEnabledSelect) {
    rewardPointsEnabledSelect.value = isRewardPointsEnabled() ? "on" : "off";
  }
  if (goalHitNotificationsSelect) {
    goalHitNotificationsSelect.value = settings.goalHitNotificationsEnabled === false ? "off" : "on";
  }
  if (bucketListEnabledSelect) {
    bucketListEnabledSelect.value = isBucketListEnabled() ? "on" : "off";
  }
  if (themeSelect) {
    themeSelect.value = normalizeThemeKey(settings.theme);
  }
  if (compactModeSelect) {
    compactModeSelect.value = settings.compactMode ? "on" : "off";
  }
  applyTheme();
  applyDensityMode();
  setAuthMode("signin");
  if (goalType) {
    goalType.value = normalizeDefaultGoalType(settings.defaultGoalType);
  }
  if (goalUnit) {
    goalUnit.value = "units";
  }
  if (goalPriority) {
    goalPriority.value = "0";
  }
  if (goalTags) {
    goalTags.value = formatGoalTags(settings.defaultGoalTags || "");
  }
  if (goalRewardWeeklyPoints) {
    goalRewardWeeklyPoints.value = "1";
  }
  if (goalRewardMonthlyPoints) {
    goalRewardMonthlyPoints.value = "3";
  }
  if (goalRewardYearlyPoints) {
    goalRewardYearlyPoints.value = "10";
  }
  if (checkinCadence) {
    checkinCadence.value = "weekly";
  }
  if (checkinEntryStatus) {
    checkinEntryStatus.value = "yes";
  }
  if (checkinEntryDate) {
    checkinEntryDate.value = getDateKey(normalizeDate(new Date()));
  }
  if (bucketEntryDate) {
    bucketEntryDate.value = getDateKey(normalizeDate(new Date()));
  }
  if (entryDate) {
    entryDate.value = isDateKey(entryUiPrefs.date) ? entryUiPrefs.date : getDateKey(normalizeDate(new Date()));
  }
  if (goalJournalDate) {
    goalJournalDate.value = getDateKey(normalizeDate(new Date()));
  }
  if (goalJournalGoal) {
    goalJournalGoal.value = "";
  }
  if (goalJournalTitle) {
    goalJournalTitle.value = "";
  }
  if (goalJournalContent) {
    goalJournalContent.value = "";
  }
  if (entryListSort) {
    entryListSort.value = entryListSortMode;
  }
  if (entryListTypeFilterSelect) {
    entryListTypeFilterSelect.value = entryListTypeFilter;
  }
  if (entryListStatusFilterSelect) {
    entryListStatusFilterSelect.value = entryListStatusFilter;
  }
  if (entryListBucketFilterSelect) {
    entryListBucketFilterSelect.value = entryListBucketFilter;
  }
  if (entryModeSelect) {
    entryModeSelect.value = entryMode;
  }
  if (weekGoalTypeFilterSelect) {
    weekGoalTypeFilterSelect.value = periodGoalFilterState.week.type;
  }
  if (weekGoalStatusFilterSelect) {
    weekGoalStatusFilterSelect.value = periodGoalFilterState.week.status;
  }
  if (weekGoalTagFilterSelect) {
    weekGoalTagFilterSelect.value = periodGoalFilterState.week.tag;
  }
  if (monthGoalTypeFilterSelect) {
    monthGoalTypeFilterSelect.value = periodGoalFilterState.month.type;
  }
  if (monthGoalStatusFilterSelect) {
    monthGoalStatusFilterSelect.value = periodGoalFilterState.month.status;
  }
  if (monthGoalTagFilterSelect) {
    monthGoalTagFilterSelect.value = periodGoalFilterState.month.tag;
  }
  if (yearGoalTypeFilterSelect) {
    yearGoalTypeFilterSelect.value = periodGoalFilterState.year.type;
  }
  if (yearGoalStatusFilterSelect) {
    yearGoalStatusFilterSelect.value = periodGoalFilterState.year.status;
  }
  if (yearGoalTagFilterSelect) {
    yearGoalTagFilterSelect.value = periodGoalFilterState.year.tag;
  }
  if (bucketListGoalStatusFilterSelect) {
    bucketListGoalStatusFilterSelect.value = bucketListGoalStatusFilter;
  }
  if (bucketListItemStatusFilterSelect) {
    bucketListItemStatusFilterSelect.value = bucketListItemStatusFilter;
  }
  if (csvUploadStatus) {
    csvUploadStatus.textContent = "";
  }
  primeGoalHitNotifications();
  updateGoalTypeFields();
  updateEntryFormMode();
}

function resetViewAnchors() {
  const now = new Date();
  weekViewAnchor = normalizeDate(now);
  monthViewAnchor = new Date(now.getFullYear(), now.getMonth(), 1);
  yearViewAnchor = new Date(now.getFullYear(), 0, 1);
  weekEntryAnchor = normalizeDate(now);
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
  return {
    changed: true,
    error: "",
    message: `CSV import complete. Updated ${inserted} entries${skippedRows > 0 ? `, skipped ${skippedRows} invalid row(s)` : ""}${ignoredGoalColumns > 0 ? `, ignored ${ignoredGoalColumns} unmatched goal column(s)` : ""}.`
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

function applyTheme() {
  const theme = normalizeThemeKey(settings && settings.theme);
  document.body.setAttribute("data-theme", theme);
}

function isCompactModeEnabled() {
  return Boolean(settings && settings.compactMode === true);
}

function applyDensityMode() {
  document.body.setAttribute("data-density", isCompactModeEnabled() ? "compact" : "comfortable");
}

function isBucketListEnabled() {
  return !(settings && settings.bucketListEnabled === false);
}

function isRewardPointsEnabled() {
  return Boolean(settings && settings.rewardPointsEnabled === true);
}

function isGoalHitNotificationsEnabled() {
  return !(settings && settings.goalHitNotificationsEnabled === false);
}

function applyBucketListFeatureVisibility() {
  const enabled = isBucketListEnabled();
  document.querySelectorAll("[data-tab='bucket-entry'], [data-tab='bucket-list']").forEach((button) => {
    button.hidden = !enabled;
  });
  document.querySelectorAll("[data-tab-panel='bucket-entry'], [data-tab-panel='bucket-list']").forEach((panel) => {
    if (!enabled) {
      panel.hidden = true;
      panel.classList.remove("active");
    }
  });
  document.querySelectorAll("option[value='bucket']").forEach((option) => {
    option.hidden = !enabled;
  });
  if (!enabled && goalType && goalType.value === "bucket") {
    goalType.value = "quantity";
    updateGoalTypeFields();
  }
  if (!enabled && (activeTab === "bucket-entry" || activeTab === "bucket-list")) {
    activeTab = "entry";
  }
}

function applyRewardPointsFeatureVisibility() {
  const enabled = isRewardPointsEnabled();
  const pointStoreEnabled = isPointStoreRewardsEnabled();
  if (pointStoreMenuButton) {
    pointStoreMenuButton.hidden = !pointStoreEnabled;
    if (!pointStoreEnabled) {
      pointStoreMenuButton.classList.remove("active");
      pointStoreMenuButton.setAttribute("aria-current", "false");
    }
  }
  document.querySelectorAll("[data-tab='point-store']").forEach((button) => {
    button.hidden = !pointStoreEnabled;
  });
  document.querySelectorAll("[data-tab-panel='point-store']").forEach((panel) => {
    if (!pointStoreEnabled) {
      panel.hidden = true;
      panel.classList.remove("active");
    }
  });
  if (pointStoreSettingsSection) {
    pointStoreSettingsSection.hidden = !enabled;
  }
  if (goalRewardPointsWrap) {
    goalRewardPointsWrap.hidden = !enabled;
  }
  if (goalRewardWeeklyPoints) {
    goalRewardWeeklyPoints.disabled = !enabled;
  }
  if (goalRewardMonthlyPoints) {
    goalRewardMonthlyPoints.disabled = !enabled;
  }
  if (goalRewardYearlyPoints) {
    goalRewardYearlyPoints.disabled = !enabled;
  }
  document.querySelectorAll(".goal-points-col").forEach((cell) => {
    cell.hidden = !enabled;
  });
  if (!pointStoreEnabled && activeTab === "point-store") {
    activeTab = "manage";
  }
}

function showAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("auth-error", Boolean(isError && message));
}

function normalizeAuthMode(value) {
  if (value === "register") {
    return "register";
  }
  return "signin";
}

function setAuthMode(value) {
  authMode = normalizeAuthMode(value);
  authModeButtons.forEach((button) => {
    const isActive = button.dataset.authMode === authMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  authForms.forEach((form) => {
    form.hidden = form.dataset.authForm !== authMode;
  });
  showAuthMessage("");
}

function normalizeProfileName(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function getUserDisplayName(user) {
  if (!user) {
    return "User";
  }
  return normalizeUsername(user.username) || "User";
}

function normalizeUsername(value) {
  return String(value || "").trim();
}

function getEmailUsernameFallback(emailValue) {
  const email = normalizeEmail(emailValue);
  if (!email || !email.includes("@")) {
    return "User";
  }
  const localPart = String(email.split("@")[0] || "").trim();
  return normalizeUsername(localPart) || "User";
}

function getFirebaseErrorCode(error) {
  return String(error && error.code || "").trim();
}

function getFirebaseAuthErrorMessage(error, fallbackMessage) {
  const code = getFirebaseErrorCode(error);
  if (code === "auth/email-already-in-use") {
    return "Email already exists.";
  }
  if (code === "auth/weak-password") {
    return "Password must be at least 6 characters.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Email/Password auth is not enabled in Firebase Authentication.";
  }
  if (code === "auth/invalid-api-key") {
    return "Invalid Firebase API key. Check firebase-config.js.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error connecting to Firebase. Try again.";
  }
  if (code) {
    return `${fallbackMessage} (${code})`;
  }
  const rawMessage = String(error && error.message || "").trim();
  if (rawMessage) {
    return `${fallbackMessage} (${rawMessage})`;
  }
  const nestedMessage = String(
    error
    && error.customData
    && error.customData._tokenResponse
    && error.customData._tokenResponse.error
    && error.customData._tokenResponse.error.message
    || ""
  ).trim();
  if (nestedMessage) {
    return `${fallbackMessage} (${nestedMessage})`;
  }
  return fallbackMessage;
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
        firstName: normalizeProfileName(item.firstName),
        lastName: normalizeProfileName(item.lastName),
        email: normalizeEmail(item.email),
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
    CHECKINS_STORAGE_KEY,
    CHECKIN_ENTRIES_STORAGE_KEY,
    GOAL_JOURNAL_STORAGE_KEY,
    SCHEDULE_STORAGE_KEY,
    SETTINGS_STORAGE_KEY,
    FRIENDS_STORAGE_KEY,
    PERIOD_SNAPSHOTS_STORAGE_KEY,
    REWARDS_STORAGE_KEY,
    REWARD_PURCHASES_STORAGE_KEY,
    POINT_TRANSACTIONS_STORAGE_KEY,
    ENTRY_UI_PREFS_STORAGE_KEY,
    GOAL_HIT_NOTIFICATIONS_STORAGE_KEY,
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
    checkIns = [];
    checkInEntries = [];
    goalJournalEntries = [];
    schedules = [];
    friends = [];
    periodSnapshots = [];
    rewards = [];
    rewardPurchases = [];
    pointTransactions = [];
    goalHitNotificationKeys = [];
    settings = getDefaultSettings();
    entryUiPrefs = getDefaultEntryUiPrefs();
    entryMode = "solo";
    entrySoloInitialized = false;
    return;
  }

  const loadedTrackers = loadTrackers();
  trackers = loadedTrackers.trackers;

  settings = loadSettings();
  entries = loadEntries().filter((entry) => trackers.some((tracker) => tracker.id === entry.trackerId));
  checkIns = loadCheckIns();
  checkInEntries = loadCheckInEntries().filter((entry) => checkIns.some((item) => item.id === entry.checkInId));
  goalJournalEntries = loadGoalJournalEntries();
  schedules = loadSchedules().filter((item) => trackers.some((tracker) => tracker.id === item.trackerId));
  friends = loadFriends();
  periodSnapshots = loadPeriodSnapshots();
  rewards = loadRewards();
  rewardPurchases = loadRewardPurchases();
  pointTransactions = loadPointTransactions();
  goalHitNotificationKeys = loadGoalHitNotificationKeys();
  entryUiPrefs = loadEntryUiPrefs();
  entryMode = normalizeEntryMode(entryUiPrefs.mode);
  entrySoloInitialized = false;

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
      const trackerGoalType = normalizeGoalType(item.goalType);
      const defaultYearlyGoal = trackerGoalType === "yesno"
        ? 365
        : trackerGoalType === "floating"
        ? 24
        : 1;
      const yearlyGoal = normalizePositiveInt(item.yearlyGoal, defaultYearlyGoal);
      const defaultMonthlyGoal = trackerGoalType === "yesno"
        ? 30
        : trackerGoalType === "floating"
        ? 4
        : trackerGoalType === "bucket"
        ? 1
        : Math.max(Math.ceil(yearlyGoal / 12), 1);
      const monthlyGoal = normalizePositiveInt(item.monthlyGoal, defaultMonthlyGoal);
      const defaultWeeklyGoal = trackerGoalType === "yesno" ? 7 : 1;
      const loadedUnit = getLockedUnitForGoalType(trackerGoalType)
        || (trackerGoalType === "floating" && !String(item.unit || "").trim()
          ? "items"
          : normalizeGoalUnit(item.unit));
      const hasLegacyPoints = item.goalPoints !== undefined && item.goalPoints !== null && item.goalPoints !== "";
      const legacyPoints = hasLegacyPoints ? normalizeGoalPoints(item.goalPoints, 1) : null;
      loadedTrackers.push({
        id: item.id,
        name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Untitled goal",
        goalType: trackerGoalType,
        archived: item.archived === true || item.archived === "true" || item.archived === 1,
        priority: normalizeGoalPriority(item.priority, 0),
        tags: normalizeGoalTags(item.tags),
        unit: loadedUnit,
        weeklyGoal: normalizePositiveInt(item.weeklyGoal, defaultWeeklyGoal),
        monthlyGoal,
        yearlyGoal,
        goalPointsWeekly: normalizeGoalPoints(item.goalPointsWeekly, legacyPoints === null ? 1 : legacyPoints),
        goalPointsMonthly: normalizeGoalPoints(item.goalPointsMonthly, legacyPoints === null ? 3 : legacyPoints),
        goalPointsYearly: normalizeGoalPoints(item.goalPointsYearly, legacyPoints === null ? 10 : legacyPoints),
        accountabilityPartnerEmail: normalizeEmail(item.accountabilityPartnerEmail || ""),
        accountabilityPartnerName: normalizeUsername(item.accountabilityPartnerName || ""),
        accountabilityPartnerId: typeof item.accountabilityPartnerId === "string" ? item.accountabilityPartnerId : "",
        accountabilityShareId: typeof item.accountabilityShareId === "string" ? item.accountabilityShareId : "",
        accountabilityStatus: normalizeAccountabilityStatus(item.accountabilityStatus)
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
        amount: normalizePositiveAmount(item.amount, 0),
        notes: typeof item.notes === "string" ? item.notes.trim() : "",
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
      }))
      .filter((item) => item.trackerId);
  } catch {
    return [];
  }
}

function loadCheckIns() {
  try {
    if (!currentUser) {
      return [];
    }
    const raw = localStorage.getItem(getScopedStorageKey(CHECKINS_STORAGE_KEY));
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
        name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Untitled check-in",
        cadence: normalizeCheckInCadence(item.cadence)
      }));
  } catch {
    return [];
  }
}

function loadCheckInEntries() {
  try {
    if (!currentUser) {
      return [];
    }
    const raw = localStorage.getItem(getScopedStorageKey(CHECKIN_ENTRIES_STORAGE_KEY));
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
        checkInId: typeof item.checkInId === "string" ? item.checkInId : "",
        date: isDateKey(item.date) ? item.date : getDateKey(normalizeDate(new Date())),
        completed: item.completed === true || item.completed === "true" || item.completed === 1,
        notes: typeof item.notes === "string" ? item.notes.trim() : "",
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
      }))
      .filter((item) => item.checkInId);
  } catch {
    return [];
  }
}

function loadGoalJournalEntries() {
  try {
    if (!currentUser) {
      return [];
    }
    const raw = localStorage.getItem(getScopedStorageKey(GOAL_JOURNAL_STORAGE_KEY));
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
        date: isDateKey(item.date) ? item.date : getDateKey(normalizeDate(new Date())),
        trackerId: typeof item.trackerId === "string" ? item.trackerId : "",
        goalName: typeof item.goalName === "string" ? item.goalName.trim() : "",
        title: typeof item.title === "string" ? item.title.trim() : "",
        content: typeof item.content === "string" ? item.content.trim() : "",
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
      }))
      .filter((item) => item.content);
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

function loadPeriodSnapshots() {
  try {
    if (!currentUser) {
      return [];
    }
    const raw = localStorage.getItem(getScopedStorageKey(PERIOD_SNAPSHOTS_STORAGE_KEY));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        const snapshot = item && typeof item === "object" ? item : {};
        const closedAtDate = new Date(snapshot.closedAt);
        const normalizedClosedAt = Number.isNaN(closedAtDate.getTime())
          ? new Date().toISOString()
          : closedAtDate.toISOString();
        const summaryRaw = snapshot.summary && typeof snapshot.summary === "object" ? snapshot.summary : {};
        const filterRaw = snapshot.filters && typeof snapshot.filters === "object" ? snapshot.filters : {};
        return {
          id: typeof snapshot.id === "string" ? snapshot.id : createId(),
          period: normalizePeriodMode(snapshot.period),
          rangeStart: isDateKey(snapshot.rangeStart) ? snapshot.rangeStart : "",
          rangeEnd: isDateKey(snapshot.rangeEnd) ? snapshot.rangeEnd : "",
          closedAt: normalizedClosedAt,
          filters: {
            type: normalizeGoalTypeFilterValue(filterRaw.type),
            status: normalizeGoalStatusFilterValue(filterRaw.status),
            tag: normalizeGoalTagFilterValue(filterRaw.tag)
          },
          summary: {
            completion: Math.max(Math.round(Number(summaryRaw.completion) || 0), 0),
            onPaceLabel: normalizeSnapshotOnPaceLabel(summaryRaw.onPaceLabel),
            totalProgress: normalizePositiveAmount(summaryRaw.totalProgress, 0),
            totalTarget: normalizePositiveAmount(summaryRaw.totalTarget, 0),
            goalsCount: Math.max(Math.floor(Number(summaryRaw.goalsCount) || 0), 0),
            checkInsCount: Math.max(Math.floor(Number(summaryRaw.checkInsCount) || 0), 0),
            completedGoalsCount: Math.max(Math.floor(Number(summaryRaw.completedGoalsCount) || 0), 0),
            goalPointsEarned: normalizePositiveAmount(summaryRaw.goalPointsEarned, 0)
          },
          goals: Array.isArray(snapshot.goals) ? snapshot.goals : [],
          checkIns: Array.isArray(snapshot.checkIns) ? snapshot.checkIns : []
        };
      })
      .filter((item) => item.rangeStart && item.rangeEnd)
      .sort((a, b) => String(b.closedAt || "").localeCompare(String(a.closedAt || "")));
  } catch {
    return [];
  }
}

function loadFriends() {
  try {
    if (!currentUser) {
      return [];
    }
    const raw = localStorage.getItem(getScopedStorageKey(FRIENDS_STORAGE_KEY));
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
        name: typeof item.name === "string" ? item.name.trim() : "",
        email: typeof item.email === "string" ? item.email.trim() : "",
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
      }))
      .filter((item) => item.name);
  } catch {
    return [];
  }
}

function loadRewards() {
  try {
    if (!currentUser) {
      return [];
    }
    const raw = localStorage.getItem(getScopedStorageKey(REWARDS_STORAGE_KEY));
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
        name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Untitled reward",
        cost: normalizePositiveInt(item.cost, 1),
        notes: typeof item.notes === "string" ? item.notes.trim() : "",
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
      }));
  } catch {
    return [];
  }
}

function loadRewardPurchases() {
  try {
    if (!currentUser) {
      return [];
    }
    const raw = localStorage.getItem(getScopedStorageKey(REWARD_PURCHASES_STORAGE_KEY));
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
        const statusRaw = String(item.status || "").toLowerCase();
        const status = statusRaw === "closed" || statusRaw === "refunded" ? statusRaw : "active";
        return {
          id: item.id,
          rewardId: typeof item.rewardId === "string" ? item.rewardId : "",
          rewardName: typeof item.rewardName === "string" && item.rewardName.trim() ? item.rewardName.trim() : "Reward",
          cost: normalizePositiveInt(item.cost, 1),
          notes: typeof item.notes === "string" ? item.notes.trim() : "",
          status,
          purchasedAt: typeof item.purchasedAt === "string" ? item.purchasedAt : new Date().toISOString(),
          closedAt: typeof item.closedAt === "string" ? item.closedAt : "",
          refundedAt: typeof item.refundedAt === "string" ? item.refundedAt : ""
        };
      })
      .sort((a, b) => String(b.purchasedAt || "").localeCompare(String(a.purchasedAt || "")));
  } catch {
    return [];
  }
}

function loadPointTransactions() {
  try {
    if (!currentUser) {
      return [];
    }
    const raw = localStorage.getItem(getScopedStorageKey(POINT_TRANSACTIONS_STORAGE_KEY));
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
        type: typeof item.type === "string" ? item.type : "adjustment",
        amount: Math.round((Number(item.amount) || 0) * 100) / 100,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
        note: typeof item.note === "string" ? item.note.trim() : "",
        refKey: typeof item.refKey === "string" ? item.refKey : "",
        rewardId: typeof item.rewardId === "string" ? item.rewardId : ""
      }))
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
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
      projectionAverageSource: normalizeProjectionAverageSource(parsed && parsed.projectionAverageSource),
      rewardPointsEnabled: Boolean(parsed && (parsed.rewardPointsEnabled === true || parsed.rewardPointsEnabled === "on")),
      goalHitNotificationsEnabled: !(parsed && parsed.goalHitNotificationsEnabled === false),
      bucketListEnabled: !(parsed && parsed.bucketListEnabled === false),
      theme: normalizeThemeKey(parsed && parsed.theme),
      compactMode: Boolean(parsed && (parsed.compactMode === true || parsed.compactMode === "on")),
      onboardingComplete: Boolean(parsed && parsed.onboardingComplete === true),
      defaultGoalType: normalizeDefaultGoalType(parsed && parsed.defaultGoalType),
      defaultGoalTags: normalizeGoalTags(parsed && parsed.defaultGoalTags)
    };
  } catch {
    return getDefaultSettings();
  }
}

function getDefaultEntryUiPrefs() {
  return {
    mode: "solo",
    trackerId: "",
    date: ""
  };
}

function normalizeEntryUiPrefs(raw) {
  const defaults = getDefaultEntryUiPrefs();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }
  const mode = normalizeEntryMode(raw.mode);
  const trackerId = typeof raw.trackerId === "string" ? raw.trackerId : "";
  const date = isDateKey(raw.date) ? raw.date : "";
  return { mode, trackerId, date };
}

function loadEntryUiPrefs() {
  try {
    if (!currentUser) {
      return getDefaultEntryUiPrefs();
    }
    const raw = localStorage.getItem(getScopedStorageKey(ENTRY_UI_PREFS_STORAGE_KEY));
    if (!raw) {
      return getDefaultEntryUiPrefs();
    }
    return normalizeEntryUiPrefs(JSON.parse(raw));
  } catch {
    return getDefaultEntryUiPrefs();
  }
}

function saveEntryUiPrefs() {
  if (!currentUser) {
    return;
  }
  const next = normalizeEntryUiPrefs(entryUiPrefs);
  localStorage.setItem(getScopedStorageKey(ENTRY_UI_PREFS_STORAGE_KEY), JSON.stringify(next));
  markLocalDataUpdatedAt();
  queueCloudSync();
}

function deepCloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function queueUndoableAction(message, applyAction, undoAction, options = {}) {
  const {
    durationMs = 6000,
    renderAfter = true,
    renderAfterUndo = true,
    canUndo = true
  } = options;

  if (typeof applyAction === "function") {
    applyAction();
  }
  if (renderAfter) {
    render();
  }
  if (!undoToast) {
    return;
  }
  if (!canUndo || typeof undoAction !== "function") {
    undoToast.show({
      message,
      onUndo: null,
      durationMs: Math.min(durationMs, 3200)
    });
    return;
  }
  undoToast.show({
    message,
    onUndo: () => {
      undoAction();
      if (renderAfterUndo) {
        render();
      }
    },
    durationMs
  });
}

function normalizeGoalHitNotificationKeys(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => {
      if (typeof item === "string") {
        return { key: item, notifiedAt: "" };
      }
      if (!item || typeof item !== "object" || typeof item.key !== "string") {
        return null;
      }
      return {
        key: item.key,
        notifiedAt: typeof item.notifiedAt === "string" ? item.notifiedAt : ""
      };
    })
    .filter((item) => item && item.key);
}

function loadGoalHitNotificationKeys() {
  try {
    if (!currentUser) {
      return [];
    }
    const raw = localStorage.getItem(getScopedStorageKey(GOAL_HIT_NOTIFICATIONS_STORAGE_KEY));
    if (!raw) {
      return [];
    }
    return normalizeGoalHitNotificationKeys(JSON.parse(raw));
  } catch {
    return [];
  }
}

function saveGoalHitNotificationKeys() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(
    getScopedStorageKey(GOAL_HIT_NOTIFICATIONS_STORAGE_KEY),
    JSON.stringify(normalizeGoalHitNotificationKeys(goalHitNotificationKeys))
  );
  markLocalDataUpdatedAt();
  queueCloudSync();
}

function hideGoalHitToast() {
  if (!goalHitToast) {
    return;
  }
  if (goalHitToastTimer) {
    clearTimeout(goalHitToastTimer);
    goalHitToastTimer = null;
  }
  goalHitToast.classList.add("hidden");
  if (goalHitToastMessage) {
    goalHitToastMessage.textContent = "";
  }
}

function showGoalHitToast(message) {
  if (!goalHitToast || !goalHitToastMessage) {
    return;
  }
  if (goalHitToastTimer) {
    clearTimeout(goalHitToastTimer);
  }
  goalHitToastMessage.textContent = String(message || "");
  goalHitToast.classList.remove("hidden");
  goalHitToastTimer = setTimeout(() => {
    hideGoalHitToast();
  }, 7000);
}

function formatPeriodTitle(periodName) {
  if (periodName === "month") {
    return "Month";
  }
  if (periodName === "year") {
    return "Year";
  }
  return "Week";
}

function getGoalHitNotificationCandidates(now = new Date()) {
  if (!currentUser) {
    return [];
  }
  const normalizedNow = normalizeDate(now);
  const index = buildEntryIndex(entries);
  const activeTrackers = trackers.filter((tracker) => {
    if (tracker.archived) {
      return false;
    }
    const type = normalizeGoalType(tracker.goalType);
    return type !== "bucket";
  });
  const periods = [
    { key: "week", range: getWeekRange(normalizedNow), target: (tracker) => tracker.weeklyGoal },
    { key: "month", range: getMonthRange(normalizedNow), target: (tracker) => tracker.monthlyGoal },
    { key: "year", range: getYearRange(normalizedNow), target: (tracker) => tracker.yearlyGoal }
  ];

  const hits = [];
  activeTrackers.forEach((tracker) => {
    periods.forEach((period) => {
      const target = normalizePositiveInt(period.target(tracker), 0);
      if (target <= 0) {
        return;
      }
      const progress = sumTrackerRange(index, tracker.id, period.range);
      if (progress < target) {
        return;
      }
      const rangeStart = getDateKey(period.range.start);
      const rangeEnd = getDateKey(period.range.end);
      hits.push({
        key: `${tracker.id}|${period.key}|${rangeStart}|${rangeEnd}`,
        trackerId: tracker.id,
        trackerName: tracker.name,
        period: period.key,
        rangeStart,
        rangeEnd
      });
    });
  });
  return hits;
}

function notifyGoalHits(hitItems) {
  if (!Array.isArray(hitItems) || hitItems.length < 1) {
    return;
  }
  const grouped = new Map();
  hitItems.forEach((item) => {
    if (!item || !item.trackerId) {
      return;
    }
    const existing = grouped.get(item.trackerId) || {
      trackerName: item.trackerName || "Goal",
      periods: []
    };
    if (!existing.periods.includes(item.period)) {
      existing.periods.push(item.period);
    }
    grouped.set(item.trackerId, existing);
  });

  const lines = Array.from(grouped.values()).map((item) => {
    const periodLabels = item.periods.map((periodName) => formatPeriodTitle(periodName)).join(", ");
    return `${item.trackerName}: ${periodLabels}`;
  });
  const inAppMessage = lines.length > 2
    ? `${lines.slice(0, 2).join(" | ")} +${lines.length - 2} more`
    : lines.join(" | ");

  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      const desktopBody = lines.length > 3
        ? `${lines.slice(0, 3).join(" | ")} +${lines.length - 3} more`
        : lines.join(" | ");
      new Notification("Goal hit", { body: desktopBody });
    } catch {
      // Desktop notification is optional; in-app toast below is the fallback.
    }
  }
  showGoalHitToast(inAppMessage);
}

function primeGoalHitNotifications() {
  if (!currentUser) {
    return;
  }
  if (goalHitNotificationKeys.length > 0) {
    return;
  }
  const nowHits = getGoalHitNotificationCandidates(new Date());
  if (nowHits.length < 1) {
    return;
  }
  goalHitNotificationKeys = nowHits.map((item) => ({
    key: item.key,
    notifiedAt: new Date().toISOString()
  }));
  saveGoalHitNotificationKeys();
}

function refreshGoalHitNotifications(shouldNotify = false) {
  if (!currentUser) {
    return;
  }
  const existing = normalizeGoalHitNotificationKeys(goalHitNotificationKeys);
  const existingMap = new Map(existing.map((item) => [item.key, item]));
  const hits = getGoalHitNotificationCandidates(new Date());
  const hitKeySet = new Set(hits.map((item) => item.key));
  const next = [];
  const newHits = [];

  hits.forEach((item) => {
    const prior = existingMap.get(item.key);
    if (prior) {
      next.push(prior);
      return;
    }
    const added = {
      key: item.key,
      notifiedAt: new Date().toISOString()
    };
    next.push(added);
    newHits.push(item);
  });

  const changed = next.length !== existing.length
    || existing.some((item) => !hitKeySet.has(item.key));
  if (changed) {
    goalHitNotificationKeys = next;
    saveGoalHitNotificationKeys();
  }

  if (shouldNotify && isGoalHitNotificationsEnabled() && newHits.length > 0) {
    notifyGoalHits(newHits);
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
  markLocalDataUpdatedAt();
  queueCloudSync();
}

function saveEntries() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(ENTRIES_STORAGE_KEY), JSON.stringify(entries));
  markLocalDataUpdatedAt();
  queueCloudSync();
}

function saveCheckIns() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(CHECKINS_STORAGE_KEY), JSON.stringify(checkIns));
  markLocalDataUpdatedAt();
  queueCloudSync();
}

function saveCheckInEntries() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(CHECKIN_ENTRIES_STORAGE_KEY), JSON.stringify(checkInEntries));
  markLocalDataUpdatedAt();
  queueCloudSync();
}

function saveGoalJournalEntries() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(GOAL_JOURNAL_STORAGE_KEY), JSON.stringify(goalJournalEntries));
  markLocalDataUpdatedAt();
  queueCloudSync();
}

function saveSchedules() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(SCHEDULE_STORAGE_KEY), JSON.stringify(schedules));
  markLocalDataUpdatedAt();
  queueCloudSync();
}

function saveFriends() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(FRIENDS_STORAGE_KEY), JSON.stringify(friends));
  markLocalDataUpdatedAt();
  queueCloudSync();
}

function savePeriodSnapshots() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(PERIOD_SNAPSHOTS_STORAGE_KEY), JSON.stringify(periodSnapshots));
  markLocalDataUpdatedAt();
  queueCloudSync();
}

function saveRewards() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(REWARDS_STORAGE_KEY), JSON.stringify(rewards));
  markLocalDataUpdatedAt();
  queueCloudSync();
}

function saveRewardPurchases() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(REWARD_PURCHASES_STORAGE_KEY), JSON.stringify(rewardPurchases));
  markLocalDataUpdatedAt();
  queueCloudSync();
}

function savePointTransactions() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(POINT_TRANSACTIONS_STORAGE_KEY), JSON.stringify(pointTransactions));
  markLocalDataUpdatedAt();
  queueCloudSync();
}

function saveSettings() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(SETTINGS_STORAGE_KEY), JSON.stringify(settings));
  markLocalDataUpdatedAt();
  queueCloudSync();
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
  if (!Number.isFinite(numeric) || numeric < 0) {
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

function normalizeGoalType(value) {
  if (value === "yesno") {
    return "yesno";
  }
  if (value === "bucket") {
    return "bucket";
  }
  if (value === "floating") {
    return "floating";
  }
  return "quantity";
}

function normalizeGoalTypeFilterValue(value) {
  if (value === "all") {
    return "all";
  }
  if (value === "yesno") {
    return "yesno";
  }
  if (value === "bucket") {
    return "bucket";
  }
  if (value === "floating") {
    return "floating";
  }
  if (value === "quantity") {
    return "quantity";
  }
  return "all";
}

function normalizeGoalStatusFilterValue(value) {
  if (value === "all") {
    return "all";
  }
  if (value === "archived") {
    return "archived";
  }
  return "active";
}

function getGoalTagKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeGoalTags(value) {
  const parts = Array.isArray(value)
    ? value
    : String(value || "").split(/[,\n;|]/g);
  const normalized = [];
  const seen = new Set();
  parts.forEach((part) => {
    const trimmed = String(part || "").trim().replace(/\s+/g, " ");
    if (!trimmed) {
      return;
    }
    const key = getGoalTagKey(trimmed);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push(trimmed.slice(0, 30));
  });
  return normalized.slice(0, 12);
}

function formatGoalTags(value) {
  return normalizeGoalTags(value).join(", ");
}

function normalizeGoalTagFilterValue(value) {
  if (value === "all") {
    return "all";
  }
  const key = getGoalTagKey(value);
  return key || "all";
}

function normalizeBucketStatusFilterValue(value) {
  if (value === "closed") {
    return "closed";
  }
  if (value === "open") {
    return "open";
  }
  return "all";
}

function bindPeriodGoalFilters(periodName, typeSelect, statusSelect, tagSelect) {
  if (!periodGoalFilterState[periodName]) {
    return;
  }
  if (typeSelect) {
    typeSelect.addEventListener("change", () => {
      periodGoalFilterState[periodName].type = normalizeGoalTypeFilterValue(typeSelect.value);
      renderPeriodTabs();
    });
  }
  if (statusSelect) {
    statusSelect.addEventListener("change", () => {
      periodGoalFilterState[periodName].status = normalizeGoalStatusFilterValue(statusSelect.value);
      renderPeriodTabs();
    });
  }
  if (tagSelect) {
    tagSelect.addEventListener("change", () => {
      periodGoalFilterState[periodName].tag = normalizeGoalTagFilterValue(tagSelect.value);
      renderPeriodTabs();
    });
  }
}

function isBinaryGoalType(value) {
  const type = normalizeGoalType(value);
  return type === "yesno" || type === "bucket";
}

function isFloatingGoalType(value) {
  return normalizeGoalType(value) === "floating";
}

function getLockedUnitForGoalType(value) {
  const type = normalizeGoalType(value);
  if (type === "yesno") {
    return "days";
  }
  if (type === "bucket") {
    return "items";
  }
  return "";
}

function getGoalTargetDefaults(value) {
  const type = normalizeGoalType(value);
  if (type === "yesno") {
    return { weekly: 7, monthly: 30, yearly: 365 };
  }
  if (type === "bucket") {
    return { weekly: 1, monthly: 1, yearly: 1 };
  }
  if (type === "floating") {
    return { weekly: 1, monthly: 4, yearly: 24 };
  }
  return { weekly: 1, monthly: 1, yearly: 1 };
}

function normalizeCheckInCadence(value) {
  if (value === "yearly") {
    return "yearly";
  }
  if (value === "monthly") {
    return "monthly";
  }
  return "weekly";
}

function formatCheckInCadence(value) {
  const cadence = normalizeCheckInCadence(value);
  if (cadence === "monthly") {
    return "Monthly";
  }
  if (cadence === "yearly") {
    return "Yearly";
  }
  return "Weekly";
}

function normalizeGoalUnit(value) {
  const unit = String(value || "").trim();
  return unit || "units";
}

function normalizeEntryMode(value) {
  return value === "week" ? "week" : "solo";
}

function getStandardEntryTrackers() {
  return trackers.filter((tracker) => normalizeGoalType(tracker.goalType) !== "bucket" && !tracker.archived);
}

function formatEditableAmount(value) {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  if (!Number.isFinite(rounded)) {
    return "";
  }
  return String(rounded);
}

function buildWeekEntryValuesMap(standardTrackers, weekDateKeys) {
  const values = new Map();
  const trackerIds = new Set(standardTrackers.map((tracker) => tracker.id));
  const dateKeys = new Set(weekDateKeys);

  entries.forEach((entry) => {
    if (!entry || !trackerIds.has(entry.trackerId) || !dateKeys.has(entry.date)) {
      return;
    }
    const key = `${entry.trackerId}|${entry.date}`;
    const prior = values.get(key) || { amount: 0, hasEntry: false };
    values.set(key, {
      amount: addAmount(prior.amount, Number(entry.amount || 0)),
      hasEntry: true
    });
  });

  return values;
}

function parseWeekEntryInputValue(rawValue, tracker) {
  const type = normalizeGoalType(tracker && tracker.goalType);
  if (isBinaryGoalType(type)) {
    const normalized = String(rawValue || "").toLowerCase();
    if (!normalized) {
      return { valid: true, amount: null };
    }
    if (normalized === "yes") {
      return { valid: true, amount: 1 };
    }
    if (normalized === "no") {
      return { valid: true, amount: 0 };
    }
    return { valid: false, amount: null };
  }

  const raw = String(rawValue || "").trim();
  if (!raw) {
    return { valid: true, amount: null };
  }
  const normalized = normalizePositiveAmount(raw, -1);
  if (normalized < 0) {
    return { valid: false, amount: null };
  }
  return { valid: true, amount: normalized };
}

function applyGoalFormDefaults() {
  if (!goalType || !goalTags) {
    return;
  }
  const selectedType = normalizeGoalType(goalType.value || "");
  let nextDefaultType = normalizeDefaultGoalType(settings.defaultGoalType);
  if (!isBucketListEnabled() && nextDefaultType === "bucket") {
    nextDefaultType = "quantity";
  }
  if (!goalType.value || selectedType === "quantity") {
    goalType.value = nextDefaultType;
  }
  if (!String(goalTags.value || "").trim()) {
    goalTags.value = formatGoalTags(settings.defaultGoalTags || "");
  }
  updateGoalTypeFields();
}

function buildStarterGoalsFromSetup(options = {}) {
  const normalizedTags = normalizeGoalTags(options.defaultTags || settings.defaultGoalTags || "");
  const createGoal = (name, goalType, unit, weeklyGoal, monthlyGoal, yearlyGoal, extraTags = []) => ({
    id: createId(),
    name,
    goalType,
    archived: false,
    priority: 50,
    tags: normalizeGoalTags([...normalizedTags, ...extraTags]),
    unit,
    weeklyGoal,
    monthlyGoal,
    yearlyGoal,
    goalPointsWeekly: 1,
    goalPointsMonthly: 3,
    goalPointsYearly: 10
  });

  const starters = [];
  if (options.fitness) {
    starters.push(createGoal("Distance", "quantity", "miles", 10, 40, 480, ["fitness"]));
  }
  if (options.learning) {
    starters.push(createGoal("Reading", "quantity", "pages", 70, 300, 3600, ["learning"]));
  }
  if (options.routine) {
    starters.push(createGoal("In Bed On Time", "yesno", "days", 5, 22, 260, ["routine"]));
  }
  return starters;
}

function applySetupWizardSelections({ createTemplates = true } = {}) {
  if (!currentUser) {
    return;
  }
  const defaultGoalType = normalizeDefaultGoalType(setupDefaultGoalType ? setupDefaultGoalType.value : settings.defaultGoalType);
  const defaultTags = normalizeGoalTags(setupDefaultTags ? setupDefaultTags.value : settings.defaultGoalTags);
  settings.weekStart = setupWeekStart && setupWeekStart.value === "sunday" ? "sunday" : "monday";
  settings.rewardPointsEnabled = Boolean(setupRewardPoints && setupRewardPoints.value === "on");
  settings.bucketListEnabled = !(setupBucketList && setupBucketList.value === "off");
  settings.defaultGoalType = defaultGoalType;
  settings.defaultGoalTags = defaultTags;
  settings.onboardingComplete = true;

  if (createTemplates && trackers.length < 1) {
    const starterGoals = buildStarterGoalsFromSetup({
      defaultTags,
      fitness: Boolean(setupTemplateFitness && setupTemplateFitness.checked),
      learning: Boolean(setupTemplateLearning && setupTemplateLearning.checked),
      routine: Boolean(setupTemplateRoutine && setupTemplateRoutine.checked)
    });
    if (starterGoals.length > 0) {
      trackers = starterGoals.concat(trackers);
      saveTrackers();
    }
  }

  if (!isBucketListEnabled() && goalType && goalType.value === "bucket") {
    goalType.value = "quantity";
  }
  if (rewardPointsEnabledSelect) {
    rewardPointsEnabledSelect.value = settings.rewardPointsEnabled ? "on" : "off";
  }
  if (bucketListEnabledSelect) {
    bucketListEnabledSelect.value = settings.bucketListEnabled ? "on" : "off";
  }
  if (weekStartSelect) {
    weekStartSelect.value = settings.weekStart;
  }
  applyBucketListFeatureVisibility();
  applyRewardPointsFeatureVisibility();
  saveSettings();
}

function updateGoalTypeFields() {
  if (!goalType || !goalUnit || !goalWeekly || !goalMonthly || !goalYearly) {
    return;
  }
  if (goalRewardWeeklyPoints && (!goalRewardWeeklyPoints.value || Number(goalRewardWeeklyPoints.value) < 0)) {
    goalRewardWeeklyPoints.value = "1";
  }
  if (goalRewardMonthlyPoints && (!goalRewardMonthlyPoints.value || Number(goalRewardMonthlyPoints.value) < 0)) {
    goalRewardMonthlyPoints.value = "3";
  }
  if (goalRewardYearlyPoints && (!goalRewardYearlyPoints.value || Number(goalRewardYearlyPoints.value) < 0)) {
    goalRewardYearlyPoints.value = "10";
  }
  const normalizedType = normalizeGoalType(goalType.value);
  const lockedUnit = getLockedUnitForGoalType(normalizedType);
  goalUnit.disabled = Boolean(lockedUnit);
  if (lockedUnit) {
    const targetDefaults = getGoalTargetDefaults(normalizedType);
    goalUnit.value = lockedUnit;
    if (!goalWeekly.value || Number(goalWeekly.value) < 1) {
      goalWeekly.value = String(targetDefaults.weekly);
    }
    if (!goalMonthly.value || Number(goalMonthly.value) < 1) {
      goalMonthly.value = String(targetDefaults.monthly);
    }
    if (!goalYearly.value || Number(goalYearly.value) < 1) {
      goalYearly.value = String(targetDefaults.yearly);
    }
    goalUnit.placeholder = lockedUnit;
  } else if (isFloatingGoalType(normalizedType)) {
    const targetDefaults = getGoalTargetDefaults(normalizedType);
    if (!String(goalUnit.value || "").trim() || goalUnit.value === "units") {
      goalUnit.value = "items";
    }
    if (!goalWeekly.value || Number(goalWeekly.value) < 1) {
      goalWeekly.value = String(targetDefaults.weekly);
    }
    if (!goalMonthly.value || Number(goalMonthly.value) < 1) {
      goalMonthly.value = String(targetDefaults.monthly);
    }
    if (!goalYearly.value || Number(goalYearly.value) < 1) {
      goalYearly.value = String(targetDefaults.yearly);
    }
    goalUnit.placeholder = "meals, projects, items";
  } else {
    if (!String(goalUnit.value || "").trim()) {
      goalUnit.value = "units";
    }
    goalUnit.placeholder = "miles, pages, calls";
  }
}

function updateEntryFormMode() {
  if (!entryTracker || !entryAmount || !entryAmountLabel || !entryYesNoLabel) {
    return;
  }
  const tracker = trackers.find((item) => item.id === entryTracker.value);
  const isBinaryGoal = tracker ? isBinaryGoalType(tracker.goalType) : false;
  entryAmountLabel.hidden = isBinaryGoal;
  entryYesNoLabel.hidden = !isBinaryGoal;
  entryAmount.disabled = isBinaryGoal;
  if (entryYesNo) {
    entryYesNo.disabled = !isBinaryGoal;
  }
  if (isBinaryGoal) {
    entryAmount.value = "1.00";
  } else if (entryYesNo) {
    entryYesNo.value = "yes";
  }
}

function formatAmountWithUnit(value, unit) {
  return `${formatAmount(value)} ${normalizeGoalUnit(unit)}`;
}

function formatProgressAgainstGoal(progress, target, unit) {
  return `${formatAmount(progress)}/${formatAmount(target)} ${normalizeGoalUnit(unit)}`;
}

function getBucketTrackers(goalStatusFilter = "active") {
  const normalizedStatusFilter = normalizeGoalStatusFilterValue(goalStatusFilter);
  return trackers.filter((tracker) => {
    if (normalizeGoalType(tracker.goalType) !== "bucket") {
      return false;
    }
    if (normalizedStatusFilter === "all") {
      return true;
    }
    return normalizedStatusFilter === "archived" ? Boolean(tracker.archived) : !Boolean(tracker.archived);
  }).sort(compareTrackersByPriority);
}

function getBucketStatusMap(bucketTrackers = getBucketTrackers("all")) {
  const bucketIds = new Set(bucketTrackers.map((tracker) => tracker.id));
  const sortedEntries = [...entries]
    .filter((entry) => bucketIds.has(entry.trackerId) && isDateKey(entry.date))
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });

  const statusMap = new Map();
  bucketTrackers.forEach((tracker) => {
    statusMap.set(tracker.id, {
      isClosed: false,
      latestEntry: null,
      latestCloseEntry: null,
      latestReopenEntry: null
    });
  });

  sortedEntries.forEach((entry) => {
    const status = statusMap.get(entry.trackerId);
    if (!status) {
      return;
    }
    const isCloseEntry = Number(entry.amount || 0) > 0;
    if (!status.latestEntry) {
      status.latestEntry = entry;
      status.isClosed = isCloseEntry;
    }
    if (isCloseEntry && !status.latestCloseEntry) {
      status.latestCloseEntry = entry;
    }
    if (!isCloseEntry && !status.latestReopenEntry) {
      status.latestReopenEntry = entry;
    }
  });

  return statusMap;
}

function getBucketCloseEntryMap() {
  const statusMap = getBucketStatusMap(getBucketTrackers("all"));
  const closeEntryByTracker = new Map();
  statusMap.forEach((status, trackerId) => {
    if (status && status.isClosed && status.latestCloseEntry) {
      closeEntryByTracker.set(trackerId, status.latestCloseEntry);
    }
  });
  return closeEntryByTracker;
}

function closeOutBucketGoal(trackerId, dateValue, notes = "") {
  if (!isBucketListEnabled()) {
    return { success: false, message: "Bucket List is turned off in Settings." };
  }
  const tracker = trackers.find((item) => item.id === trackerId);
  if (!tracker || normalizeGoalType(tracker.goalType) !== "bucket") {
    return { success: false, message: "Select a valid bucket goal." };
  }
  if (tracker.archived) {
    return { success: false, message: "Unarchive this bucket goal before closing it out." };
  }
  if (!isDateKey(dateValue)) {
    return { success: false, message: "Select a valid close-out date." };
  }

  const statusMap = getBucketStatusMap(getBucketTrackers("all"));
  const status = statusMap.get(tracker.id);
  if (status && status.isClosed) {
    const closedEntry = status.latestCloseEntry || status.latestEntry;
    return {
      success: false,
      message: `${tracker.name} is already closed${closedEntry && isDateKey(closedEntry.date) ? ` on ${formatDate(parseDateKey(closedEntry.date))}` : ""}.`
    };
  }

  entries.unshift({
    id: createId(),
    trackerId: tracker.id,
    date: dateValue,
    amount: 1,
    notes: String(notes || "").trim(),
    createdAt: new Date().toISOString()
  });
  saveEntries();
  return { success: true, message: "" };
}

function reopenBucketGoal(trackerId, dateValue, notes = "") {
  if (!isBucketListEnabled()) {
    return { success: false, message: "Bucket List is turned off in Settings." };
  }
  const tracker = trackers.find((item) => item.id === trackerId);
  if (!tracker || normalizeGoalType(tracker.goalType) !== "bucket") {
    return { success: false, message: "Select a valid bucket goal." };
  }
  if (tracker.archived) {
    return { success: false, message: "Unarchive this bucket goal before reopening it." };
  }
  if (!isDateKey(dateValue)) {
    return { success: false, message: "Select a valid reopen date." };
  }

  const statusMap = getBucketStatusMap(getBucketTrackers("all"));
  const status = statusMap.get(tracker.id);
  if (!status || !status.isClosed) {
    return { success: false, message: `${tracker.name} is already open.` };
  }

  entries.unshift({
    id: createId(),
    trackerId: tracker.id,
    date: dateValue,
    amount: 0,
    notes: String(notes || "").trim(),
    createdAt: new Date().toISOString()
  });
  saveEntries();
  return { success: true, message: "" };
}

function getCheckInsForPeriod(periodName) {
  const cadence = periodName === "year" ? "yearly" : periodName === "month" ? "monthly" : "weekly";
  return checkIns.filter((item) => normalizeCheckInCadence(item.cadence) === cadence);
}

function getCheckInStatusForRange(checkIn, range) {
  const periodEntries = checkInEntries
    .filter((item) => {
      if (!item || item.checkInId !== checkIn.id || !isDateKey(item.date)) {
        return false;
      }
      const itemDate = parseDateKey(item.date);
      return itemDate >= range.start && itemDate <= range.end;
    })
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
  return {
    completed: periodEntries.some((item) => item.completed),
    completedEntry: periodEntries.find((item) => item.completed) || null,
    latestEntry: periodEntries[0] || null
  };
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
  const raw = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return false;
  }
  const [yearRaw, monthRaw, dayRaw] = raw.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year
    && utc.getUTCMonth() === month - 1
    && utc.getUTCDate() === day
  );
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

function dateKeyToDayNumber(value) {
  if (!isDateKey(value)) {
    return 0;
  }
  const [yearRaw, monthRaw, dayRaw] = String(value).split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function dayNumberToDateKey(dayNumber) {
  const utc = new Date(Math.floor(Number(dayNumber) || 0) * DAY_MS);
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
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
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

function formatMonthDay(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
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

