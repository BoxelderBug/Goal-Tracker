import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
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

const TRACKERS_STORAGE_KEY = "goal-tracker-trackers-v3";
const ENTRIES_STORAGE_KEY = "goal-tracker-entries-v1";
const CHECKINS_STORAGE_KEY = "goal-tracker-checkins-v1";
const CHECKIN_ENTRIES_STORAGE_KEY = "goal-tracker-checkin-entries-v1";
const GOAL_JOURNAL_STORAGE_KEY = "goal-tracker-goal-journal-v1";
const SCHEDULE_STORAGE_KEY = "goal-tracker-schedules-v1";
const SETTINGS_STORAGE_KEY = "goal-tracker-settings-v1";
const FRIENDS_STORAGE_KEY = "goal-tracker-friends-v1";
const SQUADS_STORAGE_KEY = "goal-tracker-squads-v1";
const TRASH_STORAGE_KEY = "goal-tracker-trash-v1";
const PERIOD_SNAPSHOTS_STORAGE_KEY = "goal-tracker-period-snapshots-v1";
const REWARDS_STORAGE_KEY = "goal-tracker-rewards-v1";
const REWARD_PURCHASES_STORAGE_KEY = "goal-tracker-reward-purchases-v1";
const POINT_TRANSACTIONS_STORAGE_KEY = "goal-tracker-point-transactions-v1";
const GOAL_HIT_NOTIFICATION_KEYS_STORAGE_KEY = "goal-tracker-goal-hit-notification-keys-v1";
const MILESTONE_NOTIFICATION_KEYS_STORAGE_KEY = "goal-tracker-milestone-notification-keys-v1";
const SMART_REMINDER_NOTIFICATION_KEYS_STORAGE_KEY = "goal-tracker-smart-reminder-notification-keys-v1";
const PERIOD_CLOSE_PROMPT_NOTIFICATION_KEYS_STORAGE_KEY = "goal-tracker-period-close-prompt-notification-keys-v1";
const ONBOARDING_DISMISSED_STORAGE_KEY = "goal-tracker-onboarding-dismissed-v1";
const GOAL_JOURNAL_SUBJECT_DEFAULT = "General Journal";
const LEGACY_TRACKERS_KEY = "goal-tracker-trackers-v2";
const USERS_STORAGE_KEY = "goal-tracker-users-v1";
const SESSION_STORAGE_KEY = "goal-tracker-session-v1";
const DAY_MS = 24 * 60 * 60 * 1000;
const CLOUD_LOCAL_UPDATED_AT_KEY = "goal-tracker-cloud-local-updated-v1";
const CLOUD_PROFILE_COLLECTION = "goalTrackerProfiles";
const CLOUD_DATA_COLLECTION = "goalTrackerData";
const CLOUD_NOTIFICATION_COLLECTION = "goalTrackerNotifications";
const CLOUD_GOAL_SHARE_COLLECTION = "goalTrackerGoalShares";
const GOAL_TEMPLATE_WEEK_COUNT = 52;
const GOAL_TEMPLATE_MONTH_COUNT = 12;
const GOALS_PLUS_SETUP_STANDARD = "standard";
const GOALS_PLUS_SETUP_RUNNING = "goalsplus-running";
const GOALS_PLUS_SETUP_GOLF = "goalsplus-golf";
const GOALS_PLUS_GOLF_STANDARD = "golf";
const GOALS_PLUS_GOLF_DISC = "disc-golf";
const NORWEGIAN_DEFAULT_WORK_SPEED_MPH = 8;
const NORWEGIAN_DEFAULT_RECOVERY_SPEED_MPH = 4;
const TREADMILL_SPEED_MAX_MPH = 20;
const RUNNING_WORKOUT_OPTIONS = [
  { value: "easy", label: "Easy Run" },
  { value: "tempo", label: "Tempo Run" },
  { value: "long", label: "Long Run" },
  { value: "norwegian4x4", label: "Norwegian 4x4" },
  { value: "intervals", label: "Intervals" },
  { value: "hill-repeats", label: "Hill Repeats" },
  { value: "fartlek", label: "Fartlek" },
  { value: "recovery", label: "Recovery Run" },
  { value: "progression", label: "Progression Run" },
  { value: "threshold", label: "Threshold Run" },
  { value: "custom", label: "Custom Workout" }
];
const RUNNING_WORKOUT_LABEL_BY_VALUE = new Map(
  RUNNING_WORKOUT_OPTIONS.map((item) => [item.value, item.label])
);
const GOALS_PLUS_GOLF_TYPE_LABEL_BY_VALUE = new Map([
  [GOALS_PLUS_GOLF_STANDARD, "Golf"],
  [GOALS_PLUS_GOLF_DISC, "Disc Golf"]
]);
const GOALS_PLUS_NAME_OPTIONS = [
  { value: "running", label: "Running", mode: GOALS_PLUS_SETUP_RUNNING, runningWorkout: "easy" },
  { value: GOALS_PLUS_GOLF_STANDARD, label: "Golf", mode: GOALS_PLUS_SETUP_GOLF, golfType: GOALS_PLUS_GOLF_STANDARD },
  { value: GOALS_PLUS_GOLF_DISC, label: "Disc Golf", mode: GOALS_PLUS_SETUP_GOLF, golfType: GOALS_PLUS_GOLF_DISC }
];
const GOALS_PLUS_NAME_OPTION_BY_VALUE = new Map(
  GOALS_PLUS_NAME_OPTIONS.map((item) => [item.value, item])
);

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
const activeUserButton = document.querySelector("#active-user-btn");
const settingsShortcutButton = document.querySelector("#settings-shortcut-btn");
const activeUserPointsButton = document.querySelector("#active-user-points-btn");
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
const mobileQuickActions = document.querySelector("#mobile-quick-actions");

const goalForm = document.querySelector("#goal-form");
const goalName = document.querySelector("#goal-name");
const goalNameTextLabel = document.querySelector("#goal-name-text-label");
const goalNameGoalsPlus = document.querySelector("#goal-name-goals-plus");
const goalType = document.querySelector("#goal-type");
const goalUnit = document.querySelector("#goal-unit");
const goalPriority = document.querySelector("#goal-priority");
const goalTags = document.querySelector("#goal-tags");
const goalWeekly = document.querySelector("#goal-weekly");
const goalMonthly = document.querySelector("#goal-monthly");
const goalYearly = document.querySelector("#goal-yearly");
const goalCustomWeekEnabled = document.querySelector("#goal-custom-week-enabled");
const goalCustomMonthEnabled = document.querySelector("#goal-custom-month-enabled");
const goalCustomWeekWrap = document.querySelector("#goal-custom-week-wrap");
const goalCustomMonthWrap = document.querySelector("#goal-custom-month-wrap");
const goalCustomWeekGrid = document.querySelector("#goal-custom-week-grid");
const goalCustomMonthGrid = document.querySelector("#goal-custom-month-grid");
const goalRewardPointsWrap = document.querySelector("#goal-reward-points-wrap");
const goalRewardWeeklyPoints = document.querySelector("#goal-reward-weekly-points");
const goalRewardMonthlyPoints = document.querySelector("#goal-reward-monthly-points");
const goalRewardYearlyPoints = document.querySelector("#goal-reward-yearly-points");
const goalAdditionalTrackingEnabled = document.querySelector("#goal-additional-tracking-enabled");
const goalAdditionalTrackingFields = document.querySelector("#goal-additional-tracking-fields");
const goalMetricName = document.querySelector("#goal-metric-name");
const goalMetricUnit = document.querySelector("#goal-metric-unit");
const goalMetricAddButton = document.querySelector("#goal-metric-add-btn");
const goalMetricsDraftList = document.querySelector("#goal-metrics-draft-list");
const goalMetricsDraftEmpty = document.querySelector("#goal-metrics-draft-empty");
const goalSetupMode = document.querySelector("#goal-setup-mode");
const goalPlusRunningWorkout = document.querySelector("#goal-plus-running-workout");
const goalPlusRunningWorkoutLabel = document.querySelector("#goal-plus-running-workout-label");
const goalPlusRunningWorkIntervalLabel = document.querySelector("#goal-plus-running-work-interval-label");
const goalPlusRunningRecoveryIntervalLabel = document.querySelector("#goal-plus-running-recovery-interval-label");
const goalPlusRunningWorkInterval = document.querySelector("#goal-plus-running-work-interval");
const goalPlusRunningRecoveryInterval = document.querySelector("#goal-plus-running-recovery-interval");
const goalPlusRunningNote = document.querySelector("#goal-plus-running-note");
const goalMigrateSource = document.querySelector("#goal-migrate-source");
const goalMigrateArchiveSource = document.querySelector("#goal-migrate-archive-source");
const manageList = document.querySelector("#manage-list");
const manageEmpty = document.querySelector("#manage-empty");
const manageTable = document.querySelector("#manage-table");
const manageGoalsForm = document.querySelector("#manage-goals-form");
const homeSummary = document.querySelector("#home-summary");
const homeInsightsSummary = document.querySelector("#home-insights-summary");
const homeInsightsList = document.querySelector("#home-insights-list");
const homeInsightsEmpty = document.querySelector("#home-insights-empty");
const homeActivityChart = document.querySelector("#home-activity-chart");
const homeActivityEmpty = document.querySelector("#home-activity-empty");
const homeMomentumChart = document.querySelector("#home-momentum-chart");
const homeMomentumEmpty = document.querySelector("#home-momentum-empty");
const homeDashboardViewSelect = document.querySelector("#home-dashboard-view-select");
const homeDashboardChart = document.querySelector("#home-dashboard-chart");
const homeDashboardChartEmpty = document.querySelector("#home-dashboard-chart-empty");
const homeMissedPanel = document.querySelector("#home-missed-panel");
const homeMissedOpenWeekButton = document.querySelector("#home-missed-open-week");
const homeMissedPeriodSelect = document.querySelector("#home-missed-period-select");
const homeMissedPeriodCopy = document.querySelector("#home-missed-period-copy");
const homeMissedList = document.querySelector("#home-missed-list");
const homeMissedEmpty = document.querySelector("#home-missed-empty");
const homeUnclosedList = document.querySelector("#home-unclosed-list");
const homeUnclosedEmpty = document.querySelector("#home-unclosed-empty");
const homeRemindersList = document.querySelector("#home-reminders-list");
const homeRemindersEmpty = document.querySelector("#home-reminders-empty");
const homeGoalHeatmap = document.querySelector("#home-goal-heatmap");
const homeGoalHeatmapEmpty = document.querySelector("#home-goal-heatmap-empty");
const missedEntriesList = document.querySelector("#missed-entries-list");
const missedEntriesEmpty = document.querySelector("#missed-entries-empty");

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
const entryNotApplicable = document.querySelector("#entry-not-applicable");
const entryMetricsWrap = document.querySelector("#entry-metrics-wrap");
const entryMetricsGrid = document.querySelector("#entry-metrics-grid");
const entryGoalsPlusRunningWrap = document.querySelector("#entry-goals-plus-running-wrap");
const entryGoalsPlusRunningWorkout = document.querySelector("#entry-goals-plus-running-workout");
const entryGoalsPlusDistance = document.querySelector("#entry-goals-plus-distance");
const entryGoalsPlusDuration = document.querySelector("#entry-goals-plus-duration");
const entryGoalsPlusWorkIntervalLabel = document.querySelector("#entry-goals-plus-work-interval-label");
const entryGoalsPlusRecoveryIntervalLabel = document.querySelector("#entry-goals-plus-recovery-interval-label");
const entryGoalsPlusWorkInterval = document.querySelector("#entry-goals-plus-work-interval");
const entryGoalsPlusRecoveryInterval = document.querySelector("#entry-goals-plus-recovery-interval");
const entryGoalsPlusCustomExerciseLabel = document.querySelector("#entry-goals-plus-custom-exercise-label");
const entryGoalsPlusCustomRepsLabel = document.querySelector("#entry-goals-plus-custom-reps-label");
const entryGoalsPlusCustomWeightLabel = document.querySelector("#entry-goals-plus-custom-weight-label");
const entryGoalsPlusCustomExercise = document.querySelector("#entry-goals-plus-custom-exercise");
const entryGoalsPlusCustomReps = document.querySelector("#entry-goals-plus-custom-reps");
const entryGoalsPlusCustomWeight = document.querySelector("#entry-goals-plus-custom-weight");
const entryGoalsPlusDerived = document.querySelector("#entry-goals-plus-derived");
const entryGoalsPlusGolfWrap = document.querySelector("#entry-goals-plus-golf-wrap");
const entryGoalsPlusGolfScore = document.querySelector("#entry-goals-plus-golf-score");
const entryGoalsPlusGolfNote = document.querySelector("#entry-goals-plus-golf-note");
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
const yearUpdateAllSection = document.querySelector("#year-update-all-section");
const yearUpdateAllForm = document.querySelector("#year-update-all-form");
const yearUpdateAllBody = document.querySelector("#year-update-all-body");
const yearUpdateAllEmpty = document.querySelector("#year-update-all-empty");
const yearUpdateAllStatus = document.querySelector("#year-update-all-status");
const yearUpdateAllRange = document.querySelector("#year-update-all-range");
const yearUpdateAllPrevButton = document.querySelector("#year-update-all-prev");
const yearUpdateAllThisButton = document.querySelector("#year-update-all-this");
const yearUpdateAllNextButton = document.querySelector("#year-update-all-next");
const yearSingleGoalSection = document.querySelector("#year-single-goal-section");
const yearSingleGoalForm = document.querySelector("#year-single-goal-form");
const yearSingleGoalSelect = document.querySelector("#year-single-goal-select");
const yearSingleGoalBody = document.querySelector("#year-single-goal-body");
const yearSingleGoalEmpty = document.querySelector("#year-single-goal-empty");
const yearSingleGoalStatus = document.querySelector("#year-single-goal-status");
const yearSingleGoalRange = document.querySelector("#year-single-goal-range");
const yearSingleGoalPrevButton = document.querySelector("#year-single-goal-prev");
const yearSingleGoalThisButton = document.querySelector("#year-single-goal-this");
const yearSingleGoalNextButton = document.querySelector("#year-single-goal-next");

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
const entryListFocusWrap = document.querySelector("#entry-list-focus-wrap");
const entryListFocusText = document.querySelector("#entry-list-focus-text");
const entryListFocusClearButton = document.querySelector("#entry-list-focus-clear");
const csvUploadForm = document.querySelector("#csv-upload-form");
const csvUploadFile = document.querySelector("#csv-upload-file");
const csvUploadStatus = document.querySelector("#csv-upload-status");
const csvExportButton = document.querySelector("#csv-export-button");
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
const changePasswordForm = document.querySelector("#change-password-form");
const changePasswordCurrent = document.querySelector("#change-password-current");
const changePasswordNew = document.querySelector("#change-password-new");
const changePasswordConfirm = document.querySelector("#change-password-confirm");
const changePasswordShow = document.querySelector("#change-password-show");
const changePasswordMessage = document.querySelector("#change-password-message");
const friendForm = document.querySelector("#friend-form");
const friendNameInput = document.querySelector("#friend-name");
const friendEmailInput = document.querySelector("#friend-email");
const friendList = document.querySelector("#friend-list");
const friendEmpty = document.querySelector("#friend-empty");
const friendsSettingsSection = document.querySelector("#friends-settings-section");
const squadSettingsSection = document.querySelector("#squad-settings-section");
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
const onboardingModal = document.querySelector("#onboarding-modal");
const onboardingClose = document.querySelector("#onboarding-close");

const quarterRangeLabel = document.querySelector("#quarter-range");
const quarterSummary = document.querySelector("#quarter-summary");
const quarterPrevButton = document.querySelector("#quarter-prev");
const quarterThisButton = document.querySelector("#quarter-this");
const quarterNextButton = document.querySelector("#quarter-next");
const quarterCloseoutButton = document.querySelector("#quarter-closeout");
const quarterList = document.querySelector("#quarter-list");
const quarterEmpty = document.querySelector("#quarter-empty");
const quarterGoalTypeFilterSelect = document.querySelector("#quarter-goal-type-filter");
const quarterGoalStatusFilterSelect = document.querySelector("#quarter-goal-status-filter");
const quarterGoalTagFilterSelect = document.querySelector("#quarter-goal-tag-filter");

const trendsWindowSelect = document.querySelector("#trends-window-select");
const trendsMetricSelect = document.querySelector("#trends-metric-select");
const trendsTagFilterSelect = document.querySelector("#trends-tag-filter");
const trendsSummary = document.querySelector("#trends-summary");
const trendsList = document.querySelector("#trends-list");
const trendsEmpty = document.querySelector("#trends-empty");
const goalsPlusSummary = document.querySelector("#goals-plus-summary");
const goalsPlusList = document.querySelector("#goals-plus-list");
const goalsPlusEmpty = document.querySelector("#goals-plus-empty");

const quartersEnabledSelect = document.querySelector("#quarters-enabled-select");
const smartRemindersEnabledSelect = document.querySelector("#smart-reminders-enabled-select");
const missedEntryDaysInput = document.querySelector("#missed-entry-days-input");
const milestoneNotificationsEnabledSelect = document.querySelector("#milestone-notifications-enabled-select");
const milestoneStepSelect = document.querySelector("#milestone-step-select");
const mobileQuickActionsEnabledSelect = document.querySelector("#mobile-quick-actions-enabled-select");
const onboardingEnabledSelect = document.querySelector("#onboarding-enabled-select");
const performanceModeSelect = document.querySelector("#performance-mode-select");

const squadForm = document.querySelector("#squad-form");
const squadNameInput = document.querySelector("#squad-name");
const squadNotesInput = document.querySelector("#squad-notes");
const squadWeeklyGoalInput = document.querySelector("#squad-weekly-goal");
const squadList = document.querySelector("#squad-list");
const squadEmpty = document.querySelector("#squad-empty");
const trashList = document.querySelector("#trash-list");
const trashEmpty = document.querySelector("#trash-empty");

let trackers = [];
let entries = [];
let checkIns = [];
let checkInEntries = [];
let goalJournalEntries = [];
let schedules = [];
let friends = [];
let squads = [];
let deletedItems = [];
let periodSnapshots = [];
let rewards = [];
let rewardPurchases = [];
let pointTransactions = [];
let settings = getDefaultSettings();
let activeTab = "settings-general";
let homeDashboardChartView = "activity";
let homeMissedPeriod = "week";
let homeMissedTileFlipped = false;
let activeSocialSection = "friends";
let entryMode = "solo";
let entryListSortMode = "date_desc";
let entryListTypeFilter = "all";
let entryListStatusFilter = "active";
let entryListBucketFilter = "all";
let entryListFocusRange = null;
let authMode = "signin";
let scheduleWeekAnchor = normalizeDate(new Date());
let weekEntryAnchor = normalizeDate(new Date());
let weekEntryStatusMessage = "";
let yearEntryAnchor = new Date(new Date().getFullYear(), 0, 1);
let yearUpdateAllStatusMessage = "";
let yearSingleGoalStatusMessage = "";
let yearSingleGoalSelectedId = "";
let weekViewAnchor = normalizeDate(new Date());
let monthViewAnchor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let yearViewAnchor = new Date(new Date().getFullYear(), 0, 1);
let quarterViewAnchor = new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1);
const periodGoalFilterState = {
  week: { type: "all", status: "active", tag: "all" },
  month: { type: "all", status: "active", tag: "all" },
  year: { type: "all", status: "active", tag: "all" },
  quarter: { type: "all", status: "active", tag: "all" }
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
let goalHitNotificationKeys = new Set();
let milestoneNotificationKeys = new Set();
let smartReminderNotificationKeys = new Set();
let periodClosePromptNotificationKeys = new Set();
let goalHitNotificationCheckTimer = null;
let goalHitNotificationCheckInFlight = false;
let milestoneNotificationCheckTimer = null;
let smartReminderCheckTimer = null;
let smartReminderCheckInFlight = false;
let periodClosePromptNotificationCheckTimer = null;
let periodClosePromptNotificationCheckInFlight = false;
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let cloudSyncTimer = null;
let cloudSyncInFlight = false;
let suppressCloudSync = false;
let firebaseConfigured = false;
const goalCompareState = {
  week: {},
  month: {},
  year: {},
  quarter: {}
};
const graphPointsState = {
  week: {},
  month: {},
  year: {},
  quarter: {}
};
const projectionLineState = {
  week: {},
  month: {},
  year: {},
  quarter: {}
};
const inlineGraphState = {
  week: {},
  month: {},
  year: {},
  quarter: {}
};
const periodAccordionState = {
  week: { goals: true, checkins: false, shared: false, snapshots: false },
  month: { goals: true, checkins: false, shared: false, snapshots: false },
  year: { goals: true, checkins: false, shared: false, snapshots: false },
  quarter: { goals: true, checkins: false, shared: false, snapshots: false }
};
const flippedScheduleDays = {};
const graphModalState = {
  open: false,
  period: "",
  trackerId: "",
  avgMode: "week",
  historyMetric: "avg",
  historyScope: "period",
  historyGraphType: "bar"
};
const pendingEChartConfigs = new Map();
const activeEChartInstances = new Map();
let nextEChartConfigId = 0;
const goalTargetInputTouched = { weekly: false, monthly: false, yearly: false };
let goalCustomWeekTargetsDraft = [];
let goalCustomMonthTargetsDraft = [];
let goalCustomWeekTargetsEdited = false;
let goalCustomMonthTargetsEdited = false;
let goalMetricsDraft = [];

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
if (goalSetupMode) {
  goalSetupMode.value = GOALS_PLUS_SETUP_STANDARD;
}
if (goalNameGoalsPlus) {
  goalNameGoalsPlus.value = GOALS_PLUS_NAME_OPTIONS[0].value;
}
if (goalPlusRunningWorkout) {
  goalPlusRunningWorkout.value = "easy";
}
if (goalPlusRunningWorkInterval) {
  goalPlusRunningWorkInterval.value = String(NORWEGIAN_DEFAULT_WORK_SPEED_MPH);
}
if (goalPlusRunningRecoveryInterval) {
  goalPlusRunningRecoveryInterval.value = String(NORWEGIAN_DEFAULT_RECOVERY_SPEED_MPH);
}
if (goalMigrateSource) {
  goalMigrateSource.value = "";
}
if (goalMigrateArchiveSource) {
  goalMigrateArchiveSource.checked = true;
}
if (goalAdditionalTrackingEnabled) {
  goalAdditionalTrackingEnabled.checked = false;
}
if (goalWeekly) {
  goalWeekly.value = "0";
}
if (goalMonthly) {
  goalMonthly.value = "0";
}
if (goalYearly) {
  goalYearly.value = "0";
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
if (entryNotApplicable) {
  entryNotApplicable.checked = false;
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
if (quarterGoalTypeFilterSelect) {
  quarterGoalTypeFilterSelect.value = periodGoalFilterState.quarter.type;
}
if (quarterGoalStatusFilterSelect) {
  quarterGoalStatusFilterSelect.value = periodGoalFilterState.quarter.status;
}
if (quarterGoalTagFilterSelect) {
  quarterGoalTagFilterSelect.value = periodGoalFilterState.quarter.tag;
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
if (trendsWindowSelect) {
  trendsWindowSelect.value = "8";
}
if (trendsMetricSelect) {
  trendsMetricSelect.value = "consistency";
}
updateGoalTypeFields();
renderGoalMigrationOptions();
updateEntryGoalsPlusDerivedLabel();
renderGoalMetricsDraft();
syncGoalAdditionalTrackingVisibility();
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

function closeNotificationsPanel() {
  if (!notificationsPanelOpen) {
    return;
  }
  notificationsPanelOpen = false;
  renderNotifications();
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

function navigateToTab(tabName, options = {}) {
  if (!currentUser) {
    return;
  }
  const targetTab = String(tabName || "").trim();
  if (!targetTab) {
    return;
  }
  const socialSection = String(options.socialSection || "").trim().toLowerCase();
  const scrollTarget = String(options.scrollTarget || "").trim();
  closeAllDropdownMenus();
  closeNotificationsPanel();
  setActiveTabSafe(targetTab, { renderImmediate: true });
  if (activeTab === "social" && socialSection) {
    activateSocialSection(socialSection, { scroll: true });
  } else if (scrollTarget) {
    window.requestAnimationFrame(() => {
      const target = document.querySelector(scrollTarget);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
  if (isMobileMenuMode()) {
    setMobileMenuOpen(false);
  }
}

function openWeekEntryFromHomeMissedTile() {
  if (!currentUser) {
    return;
  }
  entryMode = "week";
  weekEntryAnchor = normalizeDate(new Date());
  weekEntryStatusMessage = "";
  navigateToTab("entry");
}

function openSoloEntryForTracker(trackerId) {
  if (!currentUser) {
    return;
  }
  const targetTrackerId = String(trackerId || "");
  if (!targetTrackerId) {
    return;
  }
  entryMode = "solo";
  navigateToTab("entry");
  if (!entryTracker) {
    return;
  }
  const hasTargetOption = Array.from(entryTracker.options).some((option) => option.value === targetTrackerId);
  if (!hasTargetOption) {
    return;
  }
  entryTracker.value = targetTrackerId;
  updateEntryFormMode();
}

function applyHomeMissedTileFlipState() {
  if (!homeMissedPanel) {
    return;
  }
  homeMissedPanel.classList.toggle("is-flipped", homeMissedTileFlipped);
  homeMissedPanel.querySelectorAll("button[data-action='toggle-home-missed-flip']").forEach((button) => {
    button.setAttribute("aria-pressed", homeMissedTileFlipped ? "true" : "false");
  });
}

function setHomeMissedTileFlipped(nextFlipped) {
  homeMissedTileFlipped = Boolean(nextFlipped);
  applyHomeMissedTileFlipState();
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
  applyMobileQuickActionsVisibility();
  resizeAllECharts();
});

window.addEventListener("load", () => {
  scheduleEChartResizePasses();
});

if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === "function") {
  document.fonts.ready.then(() => {
    scheduleEChartResizePasses();
  }).catch(() => {
    // Ignore font loading errors and keep chart rendering.
  });
}

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
    if (onboardingModal && !onboardingModal.classList.contains("hidden")) {
      closeOnboardingModal();
    }
    setMobileMenuOpen(false);
  }
});

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetTab = String(button.dataset.tab || "").trim();
    if (!targetTab) {
      return;
    }
    const socialSection = String(button.dataset.socialSection || "").trim().toLowerCase();
    const scrollTarget = String(button.dataset.scrollTarget || "").trim();
    navigateToTab(targetTab, { socialSection, scrollTarget });
  });
});

document.addEventListener("click", (event) => {
  const jumpButton = event.target.closest("button[data-action='jump-tab']");
  if (!jumpButton || !currentUser) {
    return;
  }
  const tabTarget = String(jumpButton.dataset.tabTarget || "");
  if (!tabTarget) {
    return;
  }
  const socialSection = String(jumpButton.dataset.socialSection || "").trim().toLowerCase();
  const scrollTarget = String(jumpButton.dataset.scrollTarget || "").trim();
  navigateToTab(tabTarget, { socialSection, scrollTarget });
});

if (homeDashboardViewSelect) {
  homeDashboardViewSelect.addEventListener("change", () => {
    homeDashboardChartView = normalizeHomeDashboardChartView(homeDashboardViewSelect.value);
    if (!currentUser) {
      return;
    }
    renderHomeTab();
    scheduleEChartResizePasses();
  });
}

if (homeMissedPeriodSelect) {
  homeMissedPeriodSelect.addEventListener("change", () => {
    homeMissedPeriod = normalizeHomeMissedPeriod(homeMissedPeriodSelect.value);
    if (!currentUser) {
      return;
    }
    renderHomeTab();
  });
}

if (homeMissedOpenWeekButton) {
  homeMissedOpenWeekButton.addEventListener("click", () => {
    openWeekEntryFromHomeMissedTile();
  });
}

if (homeMissedPanel) {
  homeMissedPanel.addEventListener("click", (event) => {
    const flipButton = event.target.closest("button[data-action='toggle-home-missed-flip']");
    if (!flipButton) {
      return;
    }
    setHomeMissedTileFlipped(!homeMissedTileFlipped);
  });
}
applyHomeMissedTileFlipState();

if (homeMissedList) {
  homeMissedList.addEventListener("click", (event) => {
    if (!currentUser) {
      return;
    }
    const goalButton = event.target.closest("button[data-action='open-home-missed-solo-entry']");
    if (!goalButton) {
      return;
    }
    const trackerId = String(goalButton.dataset.trackerId || "");
    if (!trackerId) {
      return;
    }
    openSoloEntryForTracker(trackerId);
  });
}

if (homeUnclosedList) {
  homeUnclosedList.addEventListener("click", (event) => {
    if (!currentUser) {
      return;
    }
    const periodButton = event.target.closest("button[data-action='open-home-unclosed-period-entry-list']");
    if (!periodButton) {
      return;
    }
    const periodName = normalizePeriodMode(periodButton.dataset.period);
    const startKey = String(periodButton.dataset.start || "");
    const endKey = String(periodButton.dataset.end || "");
    if (!isDateKey(startKey) || !isDateKey(endKey)) {
      return;
    }
    openEntryListForRange(periodName, {
      start: parseDateKey(startKey),
      end: parseDateKey(endKey)
    });
  });
}

authModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAuthMode(button.dataset.authMode);
  });
});

if (entryTracker) {
  entryTracker.addEventListener("change", () => {
    updateEntryFormMode();
  });
}

if (entryNotApplicable) {
  entryNotApplicable.addEventListener("change", () => {
    updateEntryFormMode();
  });
}

if (entryGoalsPlusRunningWorkout) {
  entryGoalsPlusRunningWorkout.addEventListener("change", () => {
    syncEntryGoalsPlusWorkoutVisibility(entryGoalsPlusRunningWorkout.value);
    updateEntryGoalsPlusDerivedLabel();
  });
}

[entryGoalsPlusDistance, entryGoalsPlusDuration, entryGoalsPlusWorkInterval, entryGoalsPlusRecoveryInterval]
  .filter(Boolean)
  .forEach((control) => {
    control.addEventListener("input", () => {
      updateEntryGoalsPlusDerivedLabel();
    });
  });

if (entryModeSelect) {
  entryModeSelect.addEventListener("change", () => {
    entryMode = normalizeEntryMode(entryModeSelect.value);
    weekEntryStatusMessage = "";
    yearUpdateAllStatusMessage = "";
    yearSingleGoalStatusMessage = "";
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

if (yearUpdateAllPrevButton) {
  yearUpdateAllPrevButton.addEventListener("click", () => {
    yearEntryAnchor = new Date(yearEntryAnchor.getFullYear() - 1, 0, 1);
    yearUpdateAllStatusMessage = "";
    renderEntryTab();
  });
}

if (yearUpdateAllThisButton) {
  yearUpdateAllThisButton.addEventListener("click", () => {
    yearEntryAnchor = new Date(new Date().getFullYear(), 0, 1);
    yearUpdateAllStatusMessage = "";
    renderEntryTab();
  });
}

if (yearUpdateAllNextButton) {
  yearUpdateAllNextButton.addEventListener("click", () => {
    yearEntryAnchor = new Date(yearEntryAnchor.getFullYear() + 1, 0, 1);
    yearUpdateAllStatusMessage = "";
    renderEntryTab();
  });
}

if (yearSingleGoalPrevButton) {
  yearSingleGoalPrevButton.addEventListener("click", () => {
    yearEntryAnchor = new Date(yearEntryAnchor.getFullYear() - 1, 0, 1);
    yearSingleGoalStatusMessage = "";
    renderEntryTab();
  });
}

if (yearSingleGoalThisButton) {
  yearSingleGoalThisButton.addEventListener("click", () => {
    yearEntryAnchor = new Date(new Date().getFullYear(), 0, 1);
    yearSingleGoalStatusMessage = "";
    renderEntryTab();
  });
}

if (yearSingleGoalNextButton) {
  yearSingleGoalNextButton.addEventListener("click", () => {
    yearEntryAnchor = new Date(yearEntryAnchor.getFullYear() + 1, 0, 1);
    yearSingleGoalStatusMessage = "";
    renderEntryTab();
  });
}

if (yearSingleGoalSelect) {
  yearSingleGoalSelect.addEventListener("change", () => {
    yearSingleGoalSelectedId = String(yearSingleGoalSelect.value || "");
    yearSingleGoalStatusMessage = "";
    renderYearSingleGoalSection(getStandardEntryTrackers());
  });
}

if (yearSingleGoalBody) {
  yearSingleGoalBody.addEventListener("change", (event) => {
    const stateInput = event.target.closest("select[data-field='state']");
    if (!stateInput) {
      return;
    }
    const row = stateInput.closest("tr[data-date]");
    syncYearSingleGoalRowControlState(row);
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

function setActiveTabSafe(tabName, options = {}) {
  const normalizedTab = String(tabName || "").trim();
  const mappedTab = normalizedTab === "settings"
    ? "settings-general"
    : normalizedTab === "manage"
    ? "settings-goals"
    : normalizedTab === "checkins"
    ? "settings-checkins"
    : normalizedTab;
  activeTab = mappedTab || "settings-general";
  if (!isBucketListEnabled() && (activeTab === "bucket-entry" || activeTab === "bucket-list")) {
    activeTab = "entry";
  }
  if (!isPointStoreRewardsEnabled() && activeTab === "point-store") {
    activeTab = "settings-general";
  }
  if (!isRewardPointsEnabled() && activeTab === "settings-point-store") {
    activeTab = "settings-general";
  }
  if (!isQuartersEnabled() && activeTab === "quarter") {
    activeTab = "week";
  }
  if (activeTab === "goal-schedule") {
    scheduleWeekAnchor = normalizeDate(new Date());
    resetScheduleTileFlips();
  }
  if (options && options.renderImmediate) {
    renderTabs();
    if (activeTab === "home") {
      renderHomeTab();
    }
    if (activeTab === "goal-schedule") {
      renderGoalScheduleTab();
    }
    scheduleEChartResizePasses();
  }
}

function getSocialSectionElement(sectionName) {
  const normalizedSection = String(sectionName || "").trim().toLowerCase();
  if (normalizedSection === "squads") {
    return squadSettingsSection;
  }
  if (normalizedSection === "friends") {
    return friendsSettingsSection;
  }
  return null;
}

function activateSocialSection(sectionName, options = {}) {
  const targetSection = getSocialSectionElement(sectionName);
  if (!targetSection) {
    return;
  }
  activeSocialSection = String(sectionName || "").trim().toLowerCase();
  if (!options.scroll) {
    return;
  }
  window.requestAnimationFrame(() => {
    targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function applyChangePasswordVisibility() {
  const visible = Boolean(changePasswordShow && changePasswordShow.checked);
  if (changePasswordCurrent) {
    changePasswordCurrent.type = visible ? "text" : "password";
  }
  if (changePasswordNew) {
    changePasswordNew.type = visible ? "text" : "password";
  }
  if (changePasswordConfirm) {
    changePasswordConfirm.type = visible ? "text" : "password";
  }
}

function showChangePasswordMessage(message, isError = false) {
  if (!changePasswordMessage) {
    return;
  }
  changePasswordMessage.textContent = String(message || "");
  changePasswordMessage.classList.toggle("auth-error", Boolean(isError && message));
}

if (loginShowPassword) {
  loginShowPassword.addEventListener("change", applyPasswordVisibilityToggle);
}

if (registerShowPassword) {
  registerShowPassword.addEventListener("change", applyPasswordVisibilityToggle);
}

if (changePasswordShow) {
  changePasswordShow.addEventListener("change", applyChangePasswordVisibility);
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
  closeNotificationsPanel();
  closeAllDropdownMenus();
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

if (settingsShortcutButton) {
  settingsShortcutButton.addEventListener("click", () => {
    if (!currentUser) {
      return;
    }
    navigateToTab("settings-general", { scrollTarget: "#account-security-section" });
  });
}

if (activeUserPointsButton) {
  activeUserPointsButton.addEventListener("click", () => {
    if (!currentUser || !isPointStoreRewardsEnabled()) {
      return;
    }
    navigateToTab("point-store");
  });
}

if (notificationsToggleButton) {
  notificationsToggleButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }
    closeAllDropdownMenus();
    if (isMobileMenuMode()) {
      setMobileMenuOpen(false);
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
    const closePeriodButton = event.target.closest("button[data-action='close-period-from-notification']");
    if (closePeriodButton) {
      const notificationId = String(closePeriodButton.dataset.notificationId || "");
      const periodName = normalizePeriodMode(closePeriodButton.dataset.period);
      const rangeStart = String(closePeriodButton.dataset.rangeStart || "");
      const rangeEnd = String(closePeriodButton.dataset.rangeEnd || "");
      const result = await closePeriodFromNotification(notificationId, periodName, rangeStart, rangeEnd);
      if (!result.success && result.message) {
        alert(result.message);
      }
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

if (goalSetupMode) {
  goalSetupMode.addEventListener("change", () => {
    updateGoalTypeFields();
  });
}

if (goalPlusRunningWorkout) {
  goalPlusRunningWorkout.addEventListener("change", () => {
    updateGoalTypeFields();
  });
}

if (goalNameGoalsPlus) {
  goalNameGoalsPlus.addEventListener("change", () => {
    updateGoalTypeFields();
  });
}

if (goalMigrateSource) {
  goalMigrateSource.addEventListener("change", () => {
    syncGoalMigrationControls();
  });
}

if (goalWeekly) {
  goalWeekly.addEventListener("input", () => {
    handleGoalTargetInput("weekly");
  });
}

if (goalMonthly) {
  goalMonthly.addEventListener("input", () => {
    handleGoalTargetInput("monthly");
  });
}

if (goalYearly) {
  goalYearly.addEventListener("input", () => {
    handleGoalTargetInput("yearly");
  });
}

if (goalCustomWeekEnabled) {
  goalCustomWeekEnabled.addEventListener("change", () => {
    if (goalCustomWeekEnabled.checked && goalCustomWeekTargetsDraft.length < 1) {
      goalCustomWeekTargetsDraft = getDefaultCustomTargets(
        GOAL_TEMPLATE_WEEK_COUNT,
        normalizeGoalTargetInt(goalWeekly ? goalWeekly.value : 0, 0)
      );
      goalCustomWeekTargetsEdited = false;
    }
    if (!goalCustomWeekEnabled.checked) {
      goalCustomWeekTargetsEdited = false;
    }
    syncGoalCustomTemplateVisibility();
  });
}

if (goalCustomMonthEnabled) {
  goalCustomMonthEnabled.addEventListener("change", () => {
    if (goalCustomMonthEnabled.checked && goalCustomMonthTargetsDraft.length < 1) {
      goalCustomMonthTargetsDraft = getDefaultCustomTargets(
        GOAL_TEMPLATE_MONTH_COUNT,
        normalizeGoalTargetInt(goalMonthly ? goalMonthly.value : 0, 0)
      );
      goalCustomMonthTargetsEdited = false;
    }
    if (!goalCustomMonthEnabled.checked) {
      goalCustomMonthTargetsEdited = false;
    }
    syncGoalCustomTemplateVisibility();
  });
}

if (goalCustomWeekGrid) {
  goalCustomWeekGrid.addEventListener("input", (event) => {
    const input = event.target.closest("input[data-template-period='week']");
    if (!input) {
      return;
    }
    const index = Number(input.dataset.templateIndex);
    if (!Number.isFinite(index) || index < 0 || index >= GOAL_TEMPLATE_WEEK_COUNT) {
      return;
    }
    if (goalCustomWeekTargetsDraft.length !== GOAL_TEMPLATE_WEEK_COUNT) {
      goalCustomWeekTargetsDraft = getDefaultCustomTargets(
        GOAL_TEMPLATE_WEEK_COUNT,
        normalizeGoalTargetInt(goalWeekly ? goalWeekly.value : 0, 0)
      );
    }
    goalCustomWeekTargetsDraft[index] = normalizeGoalTargetInt(input.value, 0);
    goalCustomWeekTargetsEdited = true;
  });
}

if (goalCustomMonthGrid) {
  goalCustomMonthGrid.addEventListener("input", (event) => {
    const input = event.target.closest("input[data-template-period='month']");
    if (!input) {
      return;
    }
    const index = Number(input.dataset.templateIndex);
    if (!Number.isFinite(index) || index < 0 || index >= GOAL_TEMPLATE_MONTH_COUNT) {
      return;
    }
    if (goalCustomMonthTargetsDraft.length !== GOAL_TEMPLATE_MONTH_COUNT) {
      goalCustomMonthTargetsDraft = getDefaultCustomTargets(
        GOAL_TEMPLATE_MONTH_COUNT,
        normalizeGoalTargetInt(goalMonthly ? goalMonthly.value : 0, 0)
      );
    }
    goalCustomMonthTargetsDraft[index] = normalizeGoalTargetInt(input.value, 0);
    goalCustomMonthTargetsEdited = true;
  });
}

if (goalMetricAddButton) {
  goalMetricAddButton.addEventListener("click", () => {
    addGoalMetricToDraft();
  });
}

if (goalAdditionalTrackingEnabled) {
  goalAdditionalTrackingEnabled.addEventListener("change", () => {
    syncGoalAdditionalTrackingVisibility();
  });
}

if (goalMetricName) {
  goalMetricName.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    addGoalMetricToDraft();
  });
}

if (goalMetricUnit) {
  goalMetricUnit.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    addGoalMetricToDraft();
  });
}

if (goalMetricsDraftList) {
  goalMetricsDraftList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("button[data-action='remove-goal-metric']");
    if (!removeButton) {
      return;
    }
    const metricId = String(removeButton.dataset.id || "");
    if (!metricId) {
      return;
    }
    goalMetricsDraft = goalMetricsDraft.filter((metric) => metric.id !== metricId);
    renderGoalMetricsDraft();
  });
}

goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser) {
    return;
  }
  const goalsPlus = buildGoalsPlusConfigFromForm();
  const selectedGoalType = normalizeGoalType(goalType ? goalType.value : "quantity");
  const normalizedGoalType = goalsPlus.mode !== GOALS_PLUS_SETUP_STANDARD ? "quantity" : selectedGoalType;
  if (normalizedGoalType === "bucket" && !isBucketListEnabled()) {
    return;
  }
  const goalsPlusNameOption = getGoalsPlusNameOption(goalNameGoalsPlus ? goalNameGoalsPlus.value : GOALS_PLUS_NAME_OPTIONS[0].value);
  const name = goalsPlus.mode !== GOALS_PLUS_SETUP_STANDARD
    ? goalsPlusNameOption.label
    : goalName.value.trim();
  const lockedUnit = getLockedUnitForGoalType(normalizedGoalType);
  const unit = lockedUnit || normalizeGoalUnit(goalUnit.value);
  const priority = normalizeGoalPriority(goalPriority ? goalPriority.value : 0, 0);
  const tags = normalizeGoalTags(goalTags ? goalTags.value : "");
  const weeklyGoal = normalizeGoalTargetInt(goalWeekly ? goalWeekly.value : 0, 0);
  const monthlyGoal = normalizeGoalTargetInt(goalMonthly ? goalMonthly.value : 0, 0);
  const yearlyGoal = normalizeGoalTargetInt(goalYearly ? goalYearly.value : 0, 0);
  const customWeeklyEnabled = Boolean(goalCustomWeekEnabled && goalCustomWeekEnabled.checked);
  const customMonthlyEnabled = Boolean(goalCustomMonthEnabled && goalCustomMonthEnabled.checked);
  const customWeeklyTargets = customWeeklyEnabled
    ? normalizeCustomTargetList(goalCustomWeekTargetsDraft, GOAL_TEMPLATE_WEEK_COUNT, weeklyGoal)
    : [];
  const customMonthlyTargets = customMonthlyEnabled
    ? normalizeCustomTargetList(goalCustomMonthTargetsDraft, GOAL_TEMPLATE_MONTH_COUNT, monthlyGoal)
    : [];
  const additionalTrackingEnabled = Boolean(goalAdditionalTrackingEnabled && goalAdditionalTrackingEnabled.checked);
  const progressMetrics = additionalTrackingEnabled
    ? normalizeProgressMetricList(goalMetricsDraft, {
      fallbackUnit: unit
    })
    : [];
  const rewardWeeklyPoints = normalizeGoalPoints(goalRewardWeeklyPoints ? goalRewardWeeklyPoints.value : 1, 1);
  const rewardMonthlyPoints = normalizeGoalPoints(goalRewardMonthlyPoints ? goalRewardMonthlyPoints.value : 3, 3);
  const rewardYearlyPoints = normalizeGoalPoints(goalRewardYearlyPoints ? goalRewardYearlyPoints.value : 10, 10);
  const migrateSourceId = String(goalMigrateSource ? goalMigrateSource.value : "");
  const migrateSourceTracker = migrateSourceId
    ? trackers.find((item) => item.id === migrateSourceId)
    : null;
  const archiveSourceAfterMigration = Boolean(goalMigrateArchiveSource && goalMigrateArchiveSource.checked);
  if (!name || !unit || weeklyGoal < 0 || monthlyGoal < 0 || yearlyGoal < 0) {
    return;
  }

  const nextTracker = {
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
    progressMetrics,
    goalsPlus,
    customWeeklyEnabled,
    customWeeklyTargets,
    customMonthlyEnabled,
    customMonthlyTargets,
    goalPointsWeekly: rewardWeeklyPoints,
    goalPointsMonthly: rewardMonthlyPoints,
    goalPointsYearly: rewardYearlyPoints,
    accountabilityPartnerEmail: "",
    accountabilityPartnerName: "",
    accountabilityPartnerId: "",
    accountabilityShareId: "",
    accountabilityStatus: "none"
  };
  trackers.unshift(nextTracker);
  const migrationResult = migrateGoalTrackingToNewGoal(migrateSourceTracker, nextTracker, {
    archiveSource: archiveSourceAfterMigration
  });

  saveTrackers();
  if (migrationResult.movedEntries > 0) {
    saveEntries();
  }
  if (migrationResult.movedSchedules > 0) {
    saveSchedules();
  }
  if (migrationResult.movedJournalLinks > 0) {
    saveGoalJournalEntries();
  }
  goalForm.reset();
  if (goalType) {
    goalType.value = "quantity";
  }
  if (goalSetupMode) {
    goalSetupMode.value = GOALS_PLUS_SETUP_STANDARD;
  }
  if (goalNameGoalsPlus) {
    goalNameGoalsPlus.value = GOALS_PLUS_NAME_OPTIONS[0].value;
  }
  if (goalPlusRunningWorkout) {
    goalPlusRunningWorkout.value = "easy";
  }
  if (goalPlusRunningWorkInterval) {
    goalPlusRunningWorkInterval.value = String(NORWEGIAN_DEFAULT_WORK_SPEED_MPH);
  }
  if (goalPlusRunningRecoveryInterval) {
    goalPlusRunningRecoveryInterval.value = String(NORWEGIAN_DEFAULT_RECOVERY_SPEED_MPH);
  }
  if (goalMigrateSource) {
    goalMigrateSource.value = "";
  }
  if (goalMigrateArchiveSource) {
    goalMigrateArchiveSource.checked = true;
  }
  if (goalAdditionalTrackingEnabled) {
    goalAdditionalTrackingEnabled.checked = false;
  }
  syncGoalMigrationControls();
  goalUnit.value = "units";
  if (goalPriority) {
    goalPriority.value = "0";
  }
  if (goalTags) {
    goalTags.value = "";
  }
  if (goalMetricName) {
    goalMetricName.value = "";
  }
  if (goalMetricUnit) {
    goalMetricUnit.value = "";
  }
  goalMetricsDraft = [];
  renderGoalMetricsDraft();
  syncGoalAdditionalTrackingVisibility();
  resetGoalTargetsToDefaults();
  if (goalRewardWeeklyPoints) {
    goalRewardWeeklyPoints.value = "1";
  }
  if (goalRewardMonthlyPoints) {
    goalRewardMonthlyPoints.value = "3";
  }
  if (goalRewardYearlyPoints) {
    goalRewardYearlyPoints.value = "10";
  }
  resetGoalCustomTemplates();
  updateGoalTypeFields();
  render();
  if (migrateSourceTracker && (migrationResult.movedEntries > 0 || migrationResult.movedSchedules > 0 || migrationResult.movedJournalLinks > 0 || migrationResult.archivedSource)) {
    const archiveNote = migrationResult.archivedSource ? " Source goal archived." : "";
    alert(`Migration complete from "${migrateSourceTracker.name}" to "${nextTracker.name}". Moved ${migrationResult.movedEntries} entr${migrationResult.movedEntries === 1 ? "y" : "ies"}, ${migrationResult.movedSchedules} schedule item${migrationResult.movedSchedules === 1 ? "" : "s"}, and ${migrationResult.movedJournalLinks} journal link${migrationResult.movedJournalLinks === 1 ? "" : "s"}.${archiveNote}`);
  }
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
      const progressMetricsInput = row.querySelector("input[data-field='progressMetrics']");
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
        progressMetrics: normalizeProgressMetricList(
          parseProgressMetricsText(progressMetricsInput ? progressMetricsInput.value : ""),
          {
            fallbackUnit: unitValue,
            existingMetrics: getTrackerProgressMetrics(tracker)
          }
        ),
        weeklyGoal: normalizeGoalTargetInt(weeklyInput.value, tracker.weeklyGoal),
        monthlyGoal: normalizeGoalTargetInt(monthlyInput.value, tracker.monthlyGoal),
        yearlyGoal: normalizeGoalTargetInt(yearlyInput.value, tracker.yearlyGoal),
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

    if (deleteIds.size > 0) {
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

    if (deleteIds.size > 0) {
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
  });
}

function removeGoalWithRelatedData(id) {
  const tracker = trackers.find((item) => item.id === id);
  const relatedEntries = entries.filter((entry) => entry.trackerId === id);
  const relatedSchedules = schedules.filter((item) => item.trackerId === id);
  if (tracker) {
    saveDeletedItem("goal", tracker.name, {
      tracker: { ...tracker },
      entries: relatedEntries.map((entry) => ({ ...entry })),
      schedules: relatedSchedules.map((item) => ({ ...item }))
    });
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
    const relatedEntries = checkInEntries.filter((item) => item.checkInId === id);
    saveDeletedItem("checkin", checkIn.name, {
      checkIn: { ...checkIn },
      checkInEntries: relatedEntries.map((item) => ({ ...item }))
    });
    checkIns = checkIns.filter((item) => item.id !== id);
    checkInEntries = checkInEntries.filter((item) => item.checkInId !== id);
    saveCheckIns();
    saveCheckInEntries();
    render();
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
  const markNotApplicable = Boolean(entryNotApplicable && entryNotApplicable.checked);
  let amount = isBinaryGoal
    ? (String(entryYesNo ? entryYesNo.value : "yes") === "yes" ? 1 : 0)
    : normalizePositiveAmount(entryAmount.value, 1);
  if (markNotApplicable) {
    amount = 0;
  }
  if (amount < 0) {
    return;
  }
  const metricValues = markNotApplicable ? {} : collectEntryMetricValuesFromForm(tracker);
  const goalsPlusEntryData = markNotApplicable ? null : collectGoalsPlusEntryDataFromForm(tracker);
  if (!markNotApplicable && goalsPlusEntryData && goalsPlusEntryData.mode === GOALS_PLUS_SETUP_GOLF && goalsPlusEntryData.score <= 0) {
    alert("Enter a golf score greater than 0 for Goals+ golf entries.");
    return;
  }
  if (!markNotApplicable && goalsPlusEntryData && goalsPlusEntryData.mode === GOALS_PLUS_SETUP_RUNNING && goalsPlusEntryData.distance > 0) {
    amount = goalsPlusEntryData.distance;
  }
  if (!markNotApplicable && goalsPlusEntryData && goalsPlusEntryData.mode === GOALS_PLUS_SETUP_GOLF && goalsPlusEntryData.score > 0) {
    amount = goalsPlusEntryData.score;
  }

  entries.unshift({
    id: createId(),
    trackerId: tracker.id,
    date: dateValue,
    amount,
    notApplicable: markNotApplicable,
    goalsPlus: goalsPlusEntryData,
    metricValues,
    notes: String(entryNotes.value || "").trim(),
    createdAt: new Date().toISOString()
  });
  notifyAccountabilityPartnerEntryUpdate(tracker, amount, dateValue);

  saveEntries();
  if (isBinaryGoal) {
    if (entryYesNo) {
      entryYesNo.value = "yes";
    }
  } else {
    entryAmount.value = "1.00";
  }
  if (entryNotApplicable) {
    entryNotApplicable.checked = false;
  }
  if (entryGoalsPlusDistance) {
    entryGoalsPlusDistance.value = "";
  }
  if (entryGoalsPlusDuration) {
    entryGoalsPlusDuration.value = "";
  }
  if (entryGoalsPlusWorkInterval) {
    entryGoalsPlusWorkInterval.value = "";
  }
  if (entryGoalsPlusRecoveryInterval) {
    entryGoalsPlusRecoveryInterval.value = "";
  }
  if (entryGoalsPlusCustomExercise) {
    entryGoalsPlusCustomExercise.value = "";
  }
  if (entryGoalsPlusCustomReps) {
    entryGoalsPlusCustomReps.value = "";
  }
  if (entryGoalsPlusCustomWeight) {
    entryGoalsPlusCustomWeight.value = "";
  }
  if (entryGoalsPlusGolfScore) {
    entryGoalsPlusGolfScore.value = "";
  }
  updateEntryGoalsPlusDerivedLabel();
  entryNotes.value = "";
  entryDate.value = getDateKey(normalizeDate(new Date()));
  weekEntryStatusMessage = "";
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
    saveEntries();
    render();
  });
}

if (yearUpdateAllForm) {
  yearUpdateAllForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }
    const standardTrackers = getStandardEntryTrackers();
    const trackerById = new Map(standardTrackers.map((tracker) => [tracker.id, tracker]));
    const rows = Array.from(yearUpdateAllBody ? yearUpdateAllBody.querySelectorAll("tr[data-entry-id]") : []);
    if (rows.length < 1) {
      return;
    }
    const invalidRows = [];
    let changedCount = 0;
    rows.forEach((row) => {
      const entryId = String(row.dataset.entryId || "");
      const entry = entries.find((item) => item.id === entryId);
      if (!entry) {
        return;
      }
      const trackerIdInput = row.querySelector("select[data-field='trackerId']");
      const dateInput = row.querySelector("input[data-field='date']");
      const amountInput = row.querySelector("input[data-field='amount']");
      const notesInput = row.querySelector("textarea[data-field='notes']");
      const trackerId = String(trackerIdInput ? trackerIdInput.value : "");
      const tracker = trackerById.get(trackerId) || null;
      const dateValue = String(dateInput ? dateInput.value : "");
      const amountValue = normalizePositiveAmount(amountInput ? amountInput.value : "", -1);
      if (!tracker || !isDateKey(dateValue) || amountValue < 0) {
        invalidRows.push(entryId);
        return;
      }
      entry.trackerId = tracker.id;
      entry.date = dateValue;
      entry.amount = amountValue;
      entry.notApplicable = isEntryNotApplicable(entry) && amountValue <= 0;
      entry.notes = String(notesInput ? notesInput.value : "").trim();
      entry.metricValues = filterEntryMetricValuesByTracker(entry.metricValues, tracker);
      entry.goalsPlus = isGoalsPlusTracker(tracker) ? normalizeGoalsPlusEntryData(entry) : null;
      changedCount += 1;
    });
    if (invalidRows.length > 0) {
      alert(`Fix invalid values in ${invalidRows.length} row${invalidRows.length === 1 ? "" : "s"} before saving.`);
      return;
    }
    saveEntries();
    yearUpdateAllStatusMessage = `Saved ${changedCount} entr${changedCount === 1 ? "y" : "ies"} for ${yearEntryAnchor.getFullYear()}.`;
    renderEntryTab();
  });
}

if (yearSingleGoalForm) {
  yearSingleGoalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }
    const selectedGoalId = String(yearSingleGoalSelect ? yearSingleGoalSelect.value : "");
    const tracker = getStandardEntryTrackers().find((item) => item.id === selectedGoalId) || null;
    if (!tracker) {
      return;
    }
    const yearToDateRange = getYearToDateRangeForAnchor(yearEntryAnchor);
    const validDateKeys = new Set(getDateKeysForRange(yearToDateRange));
    const rows = Array.from(yearSingleGoalBody ? yearSingleGoalBody.querySelectorAll("tr[data-date]") : []);
    if (rows.length < 1 || validDateKeys.size < 1) {
      return;
    }

    const existingEntriesByDate = new Map();
    entries.forEach((entry) => {
      if (!entry || entry.trackerId !== selectedGoalId || !validDateKeys.has(entry.date)) {
        return;
      }
      if (!existingEntriesByDate.has(entry.date)) {
        existingEntriesByDate.set(entry.date, []);
      }
      existingEntriesByDate.get(entry.date).push(entry);
    });
    existingEntriesByDate.forEach((entryList) => {
      entryList.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    });

    const invalidRows = [];
    const updatePlans = [];

    rows.forEach((row) => {
      const dateValue = String(row.dataset.date || "");
      if (!validDateKeys.has(dateValue) || !isDateKey(dateValue)) {
        invalidRows.push(dateValue || "Unknown date");
        return;
      }
      const stateInput = row.querySelector("select[data-field='state']");
      const amountInput = row.querySelector("[data-field='amount']");
      const notesInput = row.querySelector("textarea[data-field='notes']");
      const stateValue = String(stateInput ? stateInput.value : "none");
      const existingEntries = existingEntriesByDate.get(dateValue) || [];
      const primaryEntry = existingEntries[0] || null;
      const duplicateEntries = existingEntries.slice(1);

      if (!["none", "value", "na"].includes(stateValue)) {
        invalidRows.push(formatDate(parseDateKey(dateValue)));
        return;
      }

      if (stateValue === "none") {
        updatePlans.push({
          dateValue,
          stateValue,
          amountValue: 0,
          notesValue: "",
          primaryEntryId: primaryEntry ? primaryEntry.id : "",
          existingEntryIds: existingEntries.map((entry) => entry.id),
          duplicateEntryIds: duplicateEntries.map((entry) => entry.id)
        });
        return;
      }

      let amountValue = 0;
      if (stateValue === "value") {
        if (isBinaryGoalType(tracker.goalType)) {
          const binaryValue = String(amountInput ? amountInput.value : "").toLowerCase();
          if (binaryValue === "yes") {
            amountValue = 1;
          } else if (binaryValue === "no") {
            amountValue = 0;
          } else {
            invalidRows.push(formatDate(parseDateKey(dateValue)));
            return;
          }
        } else {
          amountValue = normalizePositiveAmount(amountInput ? amountInput.value : "", -1);
          if (amountValue < 0) {
            invalidRows.push(formatDate(parseDateKey(dateValue)));
            return;
          }
        }
      }

      const notesValue = String(notesInput ? notesInput.value : "").trim();
      updatePlans.push({
        dateValue,
        stateValue,
        amountValue,
        notesValue,
        primaryEntryId: primaryEntry ? primaryEntry.id : "",
        existingEntryIds: existingEntries.map((entry) => entry.id),
        duplicateEntryIds: duplicateEntries.map((entry) => entry.id)
      });
    });

    if (invalidRows.length > 0) {
      const sampleRows = invalidRows.slice(0, 4).join(", ");
      alert(`Fix invalid values in ${invalidRows.length} row${invalidRows.length === 1 ? "" : "s"} before saving: ${sampleRows}${invalidRows.length > 4 ? "..." : ""}`);
      return;
    }

    const entryById = new Map(entries.map((entry) => [entry.id, entry]));
    const entryIdsToRemove = new Set();
    let valueCount = 0;
    let notApplicableCount = 0;
    let clearedCount = 0;
    let insertedCount = 0;

    updatePlans.forEach((plan) => {
      if (plan.stateValue === "none") {
        if (plan.existingEntryIds.length > 0) {
          plan.existingEntryIds.forEach((entryId) => {
            entryIdsToRemove.add(entryId);
          });
          clearedCount += 1;
        }
        return;
      }

      const markNotApplicable = plan.stateValue === "na";
      const primaryEntry = plan.primaryEntryId ? entryById.get(plan.primaryEntryId) : null;
      if (primaryEntry) {
        primaryEntry.amount = markNotApplicable ? 0 : plan.amountValue;
        primaryEntry.notApplicable = markNotApplicable;
        primaryEntry.notes = plan.notesValue;
        primaryEntry.metricValues = markNotApplicable ? {} : filterEntryMetricValuesByTracker(primaryEntry.metricValues, tracker);
        primaryEntry.goalsPlus = markNotApplicable ? null : (isGoalsPlusTracker(tracker) ? normalizeGoalsPlusEntryData(primaryEntry) : null);
        plan.duplicateEntryIds.forEach((entryId) => {
          entryIdsToRemove.add(entryId);
        });
      } else {
        const nextEntry = {
          id: createId(),
          trackerId: selectedGoalId,
          date: plan.dateValue,
          amount: markNotApplicable ? 0 : plan.amountValue,
          notApplicable: markNotApplicable,
          goalsPlus: null,
          metricValues: {},
          notes: plan.notesValue,
          createdAt: new Date().toISOString()
        };
        entries.unshift(nextEntry);
        entryById.set(nextEntry.id, nextEntry);
        insertedCount += 1;
      }

      if (markNotApplicable) {
        notApplicableCount += 1;
      } else {
        valueCount += 1;
        notifyAccountabilityPartnerEntryUpdate(tracker, plan.amountValue, plan.dateValue);
      }
    });

    if (entryIdsToRemove.size > 0) {
      entries = entries.filter((entry) => !entryIdsToRemove.has(entry.id));
    }

    saveEntries();
    const updatedDayCount = valueCount + notApplicableCount + clearedCount;
    yearSingleGoalStatusMessage = `Saved ${updatedDayCount} day${updatedDayCount === 1 ? "" : "s"} for ${tracker.name} in ${yearEntryAnchor.getFullYear()} (${valueCount} value, ${notApplicableCount} N/A, ${clearedCount} no entry, ${insertedCount} new).`;
    renderEntryTab();
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
  const tracker = trackers.find((item) => item.id === trackerId);
  if (!tracker || !isDateKey(date) || amount < 0) {
    return;
  }

  entry.trackerId = trackerId;
  entry.date = date;
  entry.amount = amount;
  entry.notApplicable = isEntryNotApplicable(entry) && amount <= 0;
  entry.goalsPlus = isGoalsPlusTracker(tracker) ? normalizeGoalsPlusEntryData(entry) : null;
  entry.metricValues = filterEntryMetricValuesByTracker(entry.metricValues, tracker);
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
  const entryToDelete = entries.find((item) => item.id === button.dataset.id);
  if (entryToDelete) {
    const tracker = trackers.find((item) => item.id === entryToDelete.trackerId);
    saveDeletedItem("entry", tracker ? `${tracker.name} entry` : "Entry", {
      entry: { ...entryToDelete }
    });
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
bindPeriodGoalFilters("quarter", quarterGoalTypeFilterSelect, quarterGoalStatusFilterSelect, quarterGoalTagFilterSelect);

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

if (csvExportButton) {
  csvExportButton.addEventListener("click", () => {
    if (!currentUser) {
      return;
    }
    const result = exportEntriesToCsv();
    if (result.error) {
      if (csvUploadStatus) {
        csvUploadStatus.textContent = result.error;
      }
      return;
    }
    const blob = new Blob([result.csvText], { type: "text/csv;charset=utf-8" });
    triggerBlobDownload(blob, result.filename);
    if (csvUploadStatus) {
      csvUploadStatus.textContent = result.message;
    }
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
      goalJournalTitle.value = GOAL_JOURNAL_SUBJECT_DEFAULT;
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
    goalJournalEntries = goalJournalEntries.filter((item) => item.id !== journalId);
    saveGoalJournalEntries();
    renderGoalJournalTab();
  });
}

if (missedEntriesList) {
  missedEntriesList.addEventListener("click", (event) => {
    if (!currentUser) {
      return;
    }
    const periodButton = event.target.closest("button[data-action='open-period-entry-list']");
    if (!periodButton) {
      return;
    }
    const periodName = normalizePeriodMode(periodButton.dataset.period);
    const startKey = String(periodButton.dataset.start || "");
    const endKey = String(periodButton.dataset.end || "");
    if (!isDateKey(startKey) || !isDateKey(endKey)) {
      return;
    }
    openEntryListForRange(periodName, {
      start: parseDateKey(startKey),
      end: parseDateKey(endKey)
    });
  });
}

if (entryListFocusClearButton) {
  entryListFocusClearButton.addEventListener("click", () => {
    if (!currentUser) {
      return;
    }
    clearEntryListFocusRange();
    renderEntryListTab();
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
    rewards = rewards.filter((item) => item.id !== rewardId);
    saveRewards();
    renderRewardsSettings();
    renderPointStoreTab();
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
    clearClosedRewardPurchases();
    renderPointStoreTab();
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
    saveDeletedItem("friend", friend.name, { friend: { ...friend } });
    friends = friends.filter((item) => item.id !== friendId);
    saveFriends();
    renderFriendsSettings();
  });
}

if (squadForm) {
  squadForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentUser || !squadNameInput) {
      return;
    }
    const name = String(squadNameInput.value || "").trim();
    const notes = String(squadNotesInput ? squadNotesInput.value : "").trim();
    const weeklyGoal = normalizeGoalTargetInt(squadWeeklyGoalInput ? squadWeeklyGoalInput.value : 0, 0);
    if (!name) {
      return;
    }
    squads.unshift({
      id: createId(),
      name,
      notes,
      weeklyGoal,
      memberEmails: [],
      goalIds: [],
      createdAt: new Date().toISOString()
    });
    saveSquads();
    squadForm.reset();
    if (squadWeeklyGoalInput) {
      squadWeeklyGoalInput.value = "0";
    }
    renderSocialTab();
  });
}

if (squadList) {
  squadList.addEventListener("click", (event) => {
    if (!currentUser) {
      return;
    }
    const deleteButton = event.target.closest("button[data-action='delete-squad']");
    if (deleteButton) {
      const squadId = String(deleteButton.dataset.id || "");
      const squad = squads.find((item) => item.id === squadId);
      if (!squad) {
        return;
      }
      if (!confirm(`Delete squad "${squad.name}"?`)) {
        return;
      }
      saveDeletedItem("squad", squad.name, { squad: { ...squad } });
      squads = squads.filter((item) => item.id !== squadId);
      saveSquads();
      renderSocialTab();
      return;
    }

    const saveWeeklyGoalButton = event.target.closest("button[data-action='save-squad-weekly-goal']");
    if (saveWeeklyGoalButton) {
      const squadId = String(saveWeeklyGoalButton.dataset.id || "");
      const squad = squads.find((item) => item.id === squadId);
      if (!squad) {
        return;
      }
      const weeklyGoalInput = squadList.querySelector(`input[data-squad-weekly-goal='${escapeCssSelector(squadId)}']`);
      if (!weeklyGoalInput) {
        return;
      }
      squad.weeklyGoal = normalizeGoalTargetInt(weeklyGoalInput.value, normalizeGoalTargetInt(squad.weeklyGoal, 0));
      saveSquads();
      renderSocialTab();
      return;
    }

    const addGoalButton = event.target.closest("button[data-action='add-goal-to-squad']");
    if (!addGoalButton) {
      return;
    }
    const squadId = String(addGoalButton.dataset.id || "");
    const select = squadList.querySelector(`select[data-squad-goal-select='${escapeCssSelector(squadId)}']`);
    const trackerId = select ? String(select.value || "") : "";
    if (!trackerId) {
      return;
    }
    const squad = squads.find((item) => item.id === squadId);
    if (!squad) {
      return;
    }
    const nextGoalIds = Array.isArray(squad.goalIds) ? [...squad.goalIds] : [];
    if (!nextGoalIds.includes(trackerId)) {
      nextGoalIds.push(trackerId);
      squad.goalIds = nextGoalIds;
      saveSquads();
      renderSocialTab();
    }
  });
}

if (trashList) {
  trashList.addEventListener("click", (event) => {
    if (!currentUser) {
      return;
    }
    const restoreButton = event.target.closest("button[data-action='restore-trash-item']");
    if (!restoreButton) {
      return;
    }
    const itemId = String(restoreButton.dataset.id || "");
    if (!itemId) {
      return;
    }
    const restored = restoreDeletedItem(itemId);
    if (!restored) {
      alert("Unable to restore this item.");
      return;
    }
    render();
  });
}

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser) {
    return;
  }
  const onboardingWasEnabled = isOnboardingEnabled();
  settings.weekStart = weekStartSelect.value === "sunday" ? "sunday" : "monday";
  settings.compareToLastDefault = compareDefaultSelect.value !== "off";
  settings.projectionAverageSource = normalizeProjectionAverageSource(
    projectionAverageSelect ? projectionAverageSelect.value : settings.projectionAverageSource
  );
  settings.rewardPointsEnabled = rewardPointsEnabledSelect ? rewardPointsEnabledSelect.value === "on" : false;
  settings.bucketListEnabled = bucketListEnabledSelect ? bucketListEnabledSelect.value !== "off" : true;
  settings.quartersEnabled = quartersEnabledSelect ? quartersEnabledSelect.value === "on" : false;
  settings.smartRemindersEnabled = smartRemindersEnabledSelect ? smartRemindersEnabledSelect.value !== "off" : true;
  settings.missedEntryDays = normalizePositiveInt(missedEntryDaysInput ? missedEntryDaysInput.value : settings.missedEntryDays, 2);
  settings.milestoneNotificationsEnabled = milestoneNotificationsEnabledSelect
    ? milestoneNotificationsEnabledSelect.value !== "off"
    : true;
  settings.milestoneStep = normalizeMilestoneStep(milestoneStepSelect ? milestoneStepSelect.value : settings.milestoneStep);
  settings.mobileQuickActionsEnabled = mobileQuickActionsEnabledSelect
    ? mobileQuickActionsEnabledSelect.value !== "off"
    : true;
  settings.onboardingEnabled = onboardingEnabledSelect ? onboardingEnabledSelect.value !== "off" : true;
  settings.performanceMode = normalizePerformanceMode(performanceModeSelect ? performanceModeSelect.value : settings.performanceMode);
  settings.theme = normalizeThemeKey(themeSelect ? themeSelect.value : settings.theme);
  if (settings.onboardingEnabled && !onboardingWasEnabled) {
    setOnboardingDismissed(false);
    openOnboardingModal();
  }
  saveSettings();
  applyTheme();
  applyBucketListFeatureVisibility();
  applyRewardPointsFeatureVisibility();
  applyQuarterFeatureVisibility();
  applyMobileQuickActionsVisibility();
  scheduleWeekAnchor = normalizeDate(new Date());
  resetScheduleTileFlips();
  render();
});

if (changePasswordForm) {
  changePasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }
    const currentPassword = String(changePasswordCurrent ? changePasswordCurrent.value : "");
    const newPassword = String(changePasswordNew ? changePasswordNew.value : "");
    const confirmPassword = String(changePasswordConfirm ? changePasswordConfirm.value : "");
    if (!currentPassword || !newPassword || !confirmPassword) {
      showChangePasswordMessage("Enter current password, new password, and confirmation.", true);
      return;
    }
    if (newPassword.length < 6) {
      showChangePasswordMessage("New password must be at least 6 characters.", true);
      return;
    }
    if (newPassword !== confirmPassword) {
      showChangePasswordMessage("New password and confirmation do not match.", true);
      return;
    }
    if (newPassword === currentPassword) {
      showChangePasswordMessage("New password must be different from your current password.", true);
      return;
    }
    if (!firebaseConfigured || !firebaseAuth) {
      showChangePasswordMessage("Firebase is not configured yet. Add your config in firebase-config.js.", true);
      return;
    }
    const authUser = firebaseAuth.currentUser;
    const authEmail = normalizeEmail(authUser && authUser.email);
    if (!authUser || !authEmail) {
      showChangePasswordMessage("Unable to verify your signed-in account. Sign in again and retry.", true);
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(authEmail, currentPassword);
      await reauthenticateWithCredential(authUser, credential);
      await updatePassword(authUser, newPassword);
      changePasswordForm.reset();
      applyChangePasswordVisibility();
      showChangePasswordMessage("Password updated.", false);
    } catch (error) {
      const code = getFirebaseErrorCode(error);
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        showChangePasswordMessage("Current password is incorrect.", true);
        return;
      }
      if (code === "auth/requires-recent-login") {
        showChangePasswordMessage("Please sign out, sign back in, and try changing your password again.", true);
        return;
      }
      showChangePasswordMessage(getFirebaseAuthErrorMessage(error, "Unable to change password right now."), true);
    }
  });
}

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

if (quarterPrevButton) {
  quarterPrevButton.addEventListener("click", () => {
    if (!currentUser) {
      return;
    }
    quarterViewAnchor = addMonths(quarterViewAnchor, -3);
    renderPeriodTabs();
  });
}

if (quarterThisButton) {
  quarterThisButton.addEventListener("click", () => {
    if (!currentUser) {
      return;
    }
    quarterViewAnchor = getQuarterRange(new Date()).start;
    renderPeriodTabs();
  });
}

if (quarterNextButton) {
  quarterNextButton.addEventListener("click", () => {
    if (!currentUser) {
      return;
    }
    quarterViewAnchor = addMonths(quarterViewAnchor, 3);
    renderPeriodTabs();
  });
}

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

if (quarterCloseoutButton) {
  quarterCloseoutButton.addEventListener("click", () => {
    closeOutPeriod("quarter");
  });
}

[weekList, monthList, yearList, quarterList].filter(Boolean).forEach((listElement) => {
  listElement.addEventListener("click", handleGraphCardActions);
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
      if (details.open) {
        scheduleEChartResizePasses();
      }
    }, 0);
  });
});

[weekList, monthList, yearList, quarterList].filter(Boolean).forEach((listElement) => {
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

if (onboardingClose) {
  onboardingClose.addEventListener("click", () => {
    closeOnboardingModal();
  });
}

if (onboardingModal) {
  onboardingModal.addEventListener("click", (event) => {
    if (event.target.closest("[data-action='close-onboarding-modal']")) {
      closeOnboardingModal();
    }
  });
}

if (trendsWindowSelect) {
  trendsWindowSelect.addEventListener("change", () => {
    renderTrendsTab();
  });
}

if (trendsMetricSelect) {
  trendsMetricSelect.addEventListener("change", () => {
    renderTrendsTab();
  });
}

if (trendsTagFilterSelect) {
  trendsTagFilterSelect.addEventListener("change", () => {
    renderTrendsTab();
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
    const eChartElement = scope
      ? scope.querySelector(`.js-echart[data-chart-type='cumulative'][data-chart-period='${period}'][data-chart-id='${id}']`)
      : null;
    if (eChartElement && downloadChartFromEChart(eChartElement, format, filename)) {
      hideAllDownloadMenus();
      return;
    }
    const svg = scope ? scope.querySelector(".graph-svg") : null;
    if (svg && (format === "svg" || format === "png" || format === "webp")) {
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
  graphModalState.avgMode = normalizeAverageMode(period);
  graphModalState.historyMetric = "avg";
  graphModalState.historyScope = "period";
  graphModalState.historyGraphType = "bar";
  renderPeriodTabs();
}

function closeGraphModal() {
  if (graphModalBody) {
    disposeEChartsInScope(graphModalBody);
  }
  graphModalState.open = false;
  graphModalState.period = "";
  graphModalState.trackerId = "";
  graphModalState.avgMode = "week";
  graphModalState.historyMetric = "avg";
  graphModalState.historyScope = "period";
  graphModalState.historyGraphType = "bar";
  if (graphModal) {
    graphModal.classList.add("hidden");
    graphModal.setAttribute("aria-hidden", "true");
  }
}

function renderGraphModal() {
  if (!graphModal || !graphModalBody || !graphModalTitle) {
    return;
  }
  disposeEChartsInScope(graphModalBody);
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
        ${projectionControl}
      </div>
      ${createDownloadMenuMarkup(graphModalState.period, tracker.id, "modal")}
    </div>
  `;
  graphModalBody.innerHTML += createCumulativeGraphSvg(series, target, range, overlaySeries, overlayRange, {
    showCurrentPoints: true,
    showOverlayPoints: true,
    showProjectionPoints: true,
    large: true,
    periodName: graphModalState.period,
    trackerId: tracker.id,
    context: "modal",
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
    normalizeAverageMode(graphModalState.avgMode || graphModalState.period),
    normalizeHistoryMetric(graphModalState.historyMetric),
    normalizeHistoryScope(graphModalState.historyScope),
    normalizeHistoryGraphType(graphModalState.historyGraphType)
  );
  graphModalBody.innerHTML += createExpandedTargetStatusMarkup(tracker, index, normalizeDate(new Date()));

  graphModal.classList.remove("hidden");
  graphModal.setAttribute("aria-hidden", "false");
  initializeEChartsInScope(graphModalBody);
  resizeAllECharts();
}

function getPeriodMeta(periodName) {
  if (periodName === "week") {
    const range = getWeekRange(weekViewAnchor);
    return {
      title: "Week",
      range,
      targetFn: (tracker) => getTrackerTargetForPeriod(tracker, "week", range)
    };
  }
  if (periodName === "month") {
    const range = getMonthRange(monthViewAnchor);
    return {
      title: "Month",
      range,
      targetFn: (tracker) => getTrackerTargetForPeriod(tracker, "month", range)
    };
  }
  if (periodName === "year") {
    const range = getYearRange(yearViewAnchor);
    return {
      title: "Year",
      range,
      targetFn: (tracker) => getTrackerTargetForPeriod(tracker, "year", range)
    };
  }
  if (periodName === "quarter") {
    const range = getQuarterRange(quarterViewAnchor);
    return {
      title: "Quarter",
      range,
      targetFn: (tracker) => getTrackerTargetForPeriod(tracker, "quarter", range)
    };
  }
  return null;
}

function createExpandedTargetStatusMarkup(tracker, index, now) {
  const periods = ["week", "month", "quarter", "year"];
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
        <div class="progress"><span class="progress-fill ${status.toneClass}" style="width:${Math.min(status.completion, 100)}%"></span></div>
      </article>
    `;
  }).join("");

  return `
    <section class="target-status-grid-wrap">
      <h4 class="target-status-title">Period Target Status</h4>
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
    target = getTrackerTargetForPeriod(tracker, "week", range);
    title = "Week";
  } else if (periodName === "month") {
    range = getMonthRange(monthViewAnchor);
    target = getTrackerTargetForPeriod(tracker, "month", range);
    title = "Month";
  } else if (periodName === "year") {
    range = getYearRange(yearViewAnchor);
    target = getTrackerTargetForPeriod(tracker, "year", range);
    title = "Year";
  } else if (periodName === "quarter") {
    range = getQuarterRange(quarterViewAnchor);
    target = getTrackerTargetForPeriod(tracker, "quarter", range);
    title = "Quarter";
  } else {
    return null;
  }

  const totalDays = getRangeDays(range);
  const elapsedDays = getElapsedDays(range, now);
  const progress = sumTrackerRange(index, tracker.id, range);
  const completion = percent(progress, target);
  const avgPerDay = safeDivide(progress, elapsedDays);
  const projected = avgPerDay * totalDays;
  const onPace = projected >= target;
  const goalHit = target > 0 && progress >= target;
  const isPastPeriod = range.end < now;
  const hasAllEntriesLogged = hasTrackerEntriesForEveryDay(index, tracker.id, range);
  const useFinalPaceLabel = isPastPeriod && hasAllEntriesLogged;
  return {
    title,
    progress,
    target,
    completion,
    onPace,
    toneClass: getProgressToneClass(goalHit, onPace, useFinalPaceLabel),
    rangeLabel: `${formatDate(range.start)} to ${formatDate(range.end)}`
  };
}

function createDeepDiveInsightsMarkup(tracker, periodName, range, series, index, averageMode, historyMetric, historyScope, historyGraphType) {
  const unit = normalizeGoalUnit(tracker.unit);
  const focusDate = normalizeDate(range && range.start ? range.start : new Date());
  const focusDateKey = getDateKey(focusDate);
  const dailyTotals = getTrackerDailyTotals(index, tracker.id);
  const bestDay = getBestDay(dailyTotals);
  const lastEnteredDay = dailyTotals.length > 0 ? dailyTotals[dailyTotals.length - 1] : null;
  const streakStats = getStreakStats(dailyTotals, focusDateKey);

  const bestWeek = getBestPeriodRecord(index, tracker.id, "week");
  const bestMonth = getBestPeriodRecord(index, tracker.id, "month");
  const bestYear = getBestPeriodRecord(index, tracker.id, "year");

  const selectedWeek = sumTrackerRange(index, tracker.id, getWeekRange(focusDate));
  const selectedMonth = sumTrackerRange(index, tracker.id, getMonthRange(focusDate));
  const selectedYear = sumTrackerRange(index, tracker.id, getYearRange(focusDate));

  const selectedMode = normalizePeriodMode(averageMode || periodName);
  const selectedMetric = normalizeHistoryMetric(historyMetric);
  const selectedScope = normalizeHistoryScope(historyScope);
  const selectedGraphType = normalizeHistoryGraphType(historyGraphType);
  const lookbackCount = getHistoryLookbackCount(selectedMetric);
  const averageRange = getCurrentRangeForMode(selectedMode, focusDate);
  const history = getAverageHistoryForPeriod(tracker, selectedMode, averageRange, index, selectedMetric, selectedScope);
  const historyChartMarkup = createHistoryEChartMarkup(history, {
    graphType: selectedGraphType,
    metricType: selectedMetric
  });

  const bestDayText = bestDay
    ? `${formatAmountWithUnit(bestDay.amount, unit)} on ${formatDate(parseDateKey(bestDay.date))}`
    : "No non-zero day";
  const lastEnteredDayText = lastEnteredDay
    ? `${formatAmountWithUnit(lastEnteredDay.amount, unit)} on ${formatDate(parseDateKey(lastEnteredDay.date))}`
    : "No entries yet";

  const longestStreakText = formatStreakLabel(streakStats.longest);
  const currentStreakText = formatStreakLabel(streakStats.current);
  const selectedWeekLabel = getPeriodRecordLabel("week", getWeekRange(focusDate));
  const selectedMonthLabel = getPeriodRecordLabel("month", getMonthRange(focusDate));
  const selectedYearLabel = getPeriodRecordLabel("year", getYearRange(focusDate));
  const modeLabel = selectedMode === "month" ? "Months" : selectedMode === "year" ? "Years" : "Weeks";
  const metricLabel = selectedMetric === "total" ? "Sum" : "Average/day";
  const scopeLabel = selectedScope === "total" ? "Total" : "Period";
  const disableScopeControl = selectedMetric === "hit";
  const historyTitle = selectedMetric === "hit"
    ? `Goal Hit vs last ${lookbackCount} ${modeLabel.toLowerCase()}`
    : `${metricLabel} (${scopeLabel}) vs last ${lookbackCount} periods`;
  const unitSuffix = selectedMetric === "hit" ? "" : ` (${escapeHtml(unit)})`;
  const viewMarkup = historyChartMarkup;

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
            <p class="best-kpi-current"><strong>Selected Week</strong>: ${escapeHtml(formatCurrentPeriodText(selectedWeek, unit, selectedWeekLabel))}</p>
            <p class="best-kpi-best">Best Week: ${escapeHtml(formatBestPeriodText(bestWeek, unit))}</p>
          </div>
          <div class="best-kpi-item">
            <p class="best-kpi-current"><strong>Selected Month</strong>: ${escapeHtml(formatCurrentPeriodText(selectedMonth, unit, selectedMonthLabel))}</p>
            <p class="best-kpi-best">Best Month: ${escapeHtml(formatBestPeriodText(bestMonth, unit))}</p>
          </div>
          <div class="best-kpi-item">
            <p class="best-kpi-current"><strong>Selected Year</strong>: ${escapeHtml(formatCurrentPeriodText(selectedYear, unit, selectedYearLabel))}</p>
            <p class="best-kpi-best">Best Year: ${escapeHtml(formatBestPeriodText(bestYear, unit))}</p>
          </div>
        </article>
        <article class="deep-dive-card">
          <p class="target-status-line"><strong>${escapeHtml(historyTitle)}</strong>${unitSuffix}</p>
          <div class="avg-controls-row">
            <label class="avg-control-label">
              Period
              <select data-action="set-avg-mode-select" class="avg-control-select">
                <option value="week" ${selectedMode === "week" ? "selected" : ""}>Weeks</option>
                <option value="month" ${selectedMode === "month" ? "selected" : ""}>Months</option>
                <option value="year" ${selectedMode === "year" ? "selected" : ""}>Years</option>
              </select>
            </label>
            <label class="avg-control-label">
              Metric
              <select data-action="set-history-metric-select" class="avg-control-select">
                <option value="avg" ${selectedMetric === "avg" ? "selected" : ""}>Average</option>
                <option value="total" ${selectedMetric === "total" ? "selected" : ""}>Sum</option>
                <option value="hit" ${selectedMetric === "hit" ? "selected" : ""}>Goal Hit</option>
              </select>
            </label>
            <label class="avg-control-label">
              Scope
              <select data-action="set-history-scope-select" class="avg-control-select" ${disableScopeControl ? "disabled" : ""}>
                <option value="period" ${selectedScope === "period" ? "selected" : ""}>Period</option>
                <option value="total" ${selectedScope === "total" ? "selected" : ""}>Total</option>
              </select>
            </label>
            <label class="avg-control-label">
              Graph Type
              <select data-action="set-history-graph-type-select" class="avg-control-select">
                <option value="bar" ${selectedGraphType === "bar" ? "selected" : ""}>Bars</option>
                <option value="line" ${selectedGraphType === "line" ? "selected" : ""}>Line</option>
              </select>
            </label>
          </div>
          ${viewMarkup}
        </article>
      </div>
    </section>
  `;
}

function normalizePeriodMode(value) {
  if (value === "month" || value === "year" || value === "quarter") {
    return value;
  }
  return "week";
}

function normalizeAverageMode(value) {
  const mode = normalizePeriodMode(value);
  if (mode === "quarter") {
    return "month";
  }
  return mode;
}

function normalizeHistoryMetric(value) {
  if (value === "total" || value === "sum") {
    return "total";
  }
  if (value === "hit" || value === "goal-hit" || value === "yesno") {
    return "hit";
  }
  return "avg";
}

function normalizeHistoryScope(value) {
  if (value === "total") {
    return "total";
  }
  return "period";
}

function normalizeHistoryGraphType(value) {
  if (value === "line") {
    return "line";
  }
  return "bar";
}

function getHistoryLookbackCount(metricType) {
  const selectedMetric = normalizeHistoryMetric(metricType);
  if (selectedMetric === "hit") {
    return 5;
  }
  return 4;
}

function getCurrentRangeForMode(mode, date) {
  if (mode === "month") {
    return getMonthRange(date);
  }
  if (mode === "quarter") {
    return getQuarterRange(date);
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

function getAverageHistoryForPeriod(tracker, periodName, currentRange, index, metricType = "avg", scopeType = "period") {
  const selectedMetric = normalizeHistoryMetric(metricType);
  const selectedScope = normalizeHistoryScope(scopeType);
  const lookbackCount = getHistoryLookbackCount(selectedMetric);
  const history = [];
  const firstEntryDate = getTrackerFirstEntryDate(tracker.id);
  for (let offset = 0; offset <= lookbackCount; offset += 1) {
    const compareRange = shiftPeriodRange(periodName, currentRange, offset);
    if (offset > 0) {
      if (selectedMetric !== "hit" && (!firstEntryDate || compareRange.end < firstEntryDate)) {
        break;
      }
    }
    const valueRange = selectedScope === "total" && selectedMetric !== "hit" && firstEntryDate
      ? { start: firstEntryDate, end: compareRange.end }
      : compareRange;
    const total = sumTrackerRange(index, tracker.id, valueRange);
    const days = getRangeDays(valueRange);
    let value = 0;
    if (selectedMetric === "total") {
      value = total;
    } else if (selectedMetric === "hit") {
      const target = getTrackerTargetForPeriod(tracker, periodName, compareRange);
      value = target > 0 && total >= target ? 1 : 0;
    } else {
      value = safeDivide(total, days);
    }
    history.push({
      offset,
      value,
      label: getAverageBarLabel(periodName, offset),
      rangeLabel: `${formatDate(valueRange.start)} to ${formatDate(valueRange.end)}`
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

  const avgModeSelect = event.target.closest("select[data-action='set-avg-mode-select']");
  if (avgModeSelect) {
    graphModalState.avgMode = normalizeAverageMode(avgModeSelect.value);
    renderGraphModal();
    return;
  }

  const historyMetricSelect = event.target.closest("select[data-action='set-history-metric-select']");
  if (historyMetricSelect) {
    graphModalState.historyMetric = normalizeHistoryMetric(historyMetricSelect.value);
    renderGraphModal();
    return;
  }

  const historyScopeSelect = event.target.closest("select[data-action='set-history-scope-select']");
  if (historyScopeSelect) {
    graphModalState.historyScope = normalizeHistoryScope(historyScopeSelect.value);
    renderGraphModal();
    return;
  }

  const historyGraphTypeSelect = event.target.closest("select[data-action='set-history-graph-type-select']");
  if (historyGraphTypeSelect) {
    graphModalState.historyGraphType = normalizeHistoryGraphType(historyGraphTypeSelect.value);
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
  applyPerformanceMode();
  renderAuthState();
  if (!currentUser) {
    return;
  }
  updateGoalTypeFields();
  renderGoalMigrationOptions();
  applyBucketListFeatureVisibility();
  applyRewardPointsFeatureVisibility();
  applyQuarterFeatureVisibility();
  applyMobileQuickActionsVisibility();
  renderTabs();
  renderHomeTab();
  renderMissedEntriesTab();
  renderManageGoals();
  renderCheckinsTab();
  renderEntryTab();
  renderGoalJournalTab();
  renderBucketEntryTab();
  renderCheckinEntryTab();
  renderEntryListTab();
  renderGoalScheduleTab();
  renderPeriodTabs();
  renderTrendsTab();
  renderGoalsPlusTab();
  renderBucketListViewTab();
  renderSocialTab();
  renderRewardsSettings();
  renderPointStoreTab();
  queueGoalHitNotificationCheck();
  queueMilestoneNotificationCheck();
  queueSmartReminderCheck();
  queuePeriodClosePromptCheck();
}

function createHistoryEChartMarkup(history, options = {}) {
  const selectedGraphType = normalizeHistoryGraphType(options.graphType);
  const selectedMetric = normalizeHistoryMetric(options.metricType);
  const chartConfigId = registerEChartConfig({
    option: buildHistoryEChartOption(history, selectedGraphType, selectedMetric)
  });
  return `
    <div class="avg-line-wrap">
      <div class="history-echart js-echart" data-echart-config-id="${chartConfigId}" data-chart-type="history" aria-label="History comparison chart"></div>
    </div>
  `;
}

function isPeriodProgressEChartEnabled(periodName) {
  return periodName === "week" || periodName === "month" || periodName === "year";
}

function getProgressTonePalette(toneClass) {
  if (toneClass === "progress-hit") {
    return { start: "#27b07d", end: "#198b60", marker: "#1f9b6c" };
  }
  if (toneClass === "progress-off-pace") {
    return { start: "#dea34d", end: "#be7f24", marker: "#8b6419" };
  }
  if (toneClass === "progress-missed") {
    return { start: "#d26a72", end: "#b94f59", marker: "#a5404a" };
  }
  return { start: "#2f9fb6", end: "#267f92", marker: "#267f92" };
}

function blendHexWithWhite(hexColor, amount = 0.5) {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(String(hexColor || "").trim());
  if (!match) {
    return "#d6f2ed";
  }
  const base = match[1];
  const ratio = Math.min(Math.max(Number(amount) || 0, 0), 1);
  const red = parseInt(base.slice(0, 2), 16);
  const green = parseInt(base.slice(2, 4), 16);
  const blue = parseInt(base.slice(4, 6), 16);
  const nextRed = Math.round(red + ((255 - red) * ratio));
  const nextGreen = Math.round(green + ((255 - green) * ratio));
  const nextBlue = Math.round(blue + ((255 - blue) * ratio));
  return `rgb(${nextRed}, ${nextGreen}, ${nextBlue})`;
}

function createPeriodProgressBarEChartMarkup(options = {}) {
  const progressValue = Number(options.progressValue);
  const targetValue = Number(options.targetValue);
  const projectedValue = Number(options.projectedValue);
  const providedCurrentPercent = Number(options.currentPercent);
  const providedProjectedPercent = Number(options.projectedPercent);
  const derivedCurrentPercent = targetValue > 0 && Number.isFinite(progressValue)
    ? (progressValue / targetValue) * 100
    : providedCurrentPercent;
  const derivedProjectedPercent = targetValue > 0 && Number.isFinite(projectedValue)
    ? (projectedValue / targetValue) * 100
    : providedProjectedPercent;
  const currentPercent = Math.max(
    Number.isFinite(providedCurrentPercent)
      ? providedCurrentPercent
      : (Number.isFinite(derivedCurrentPercent) ? derivedCurrentPercent : 0),
    0
  );
  const projectedPercent = Math.max(
    Number.isFinite(providedProjectedPercent)
      ? providedProjectedPercent
      : (Number.isFinite(derivedProjectedPercent) ? derivedProjectedPercent : 0),
    0
  );
  const toneClass = String(options.toneClass || "");
  const progressLabel = String(options.progressLabel || "");
  const projectedLabel = String(options.projectedLabel || "");
  const displayCurrentPercent = Math.min(currentPercent, 100);
  const displayProjectedPercent = Math.min(projectedPercent, 100);
  const chartConfigId = registerEChartConfig({
    option: buildPeriodProgressBarEChartOption({
      currentPercent: displayCurrentPercent,
      projectedPercent: displayProjectedPercent,
      toneClass
    })
  });
  const caption = projectedLabel || progressLabel;
  return `
    <div class="period-progress-block">
      <div class="period-progress-wrap" aria-label="${escapeAttr(caption)}" title="${escapeAttr(caption)}">
        <div class="period-progress-echart js-echart" data-echart-config-id="${chartConfigId}" data-chart-type="period-progress"></div>
        <span class="period-progress-label">${escapeHtml(progressLabel)}</span>
      </div>
    </div>
  `;
}

function buildPeriodProgressBarEChartOption(config) {
  const currentPercent = Math.max(Number(config.currentPercent) || 0, 0);
  const projectedPercent = Math.max(Number(config.projectedPercent) || 0, 0);
  const palette = getProgressTonePalette(config.toneClass);
  const currentDisplay = Math.min(currentPercent, 100);
  const projectedDisplay = Math.min(projectedPercent, 100);
  const projectedExtension = Math.max(projectedDisplay - currentDisplay, 0);
  const hasProjectionExtension = projectedExtension > 0.05;
  const currentSegmentRadius = hasProjectionExtension
    ? [999, 0, 0, 999]
    : [999, 999, 999, 999];
  const projectionStartColor = blendHexWithWhite(palette.start, 0.58);
  const projectionEndColor = blendHexWithWhite(palette.end, 0.45);
  const projectionHighlightColor = blendHexWithWhite(palette.start, 0.86);
  return {
    animationDuration: 220,
    backgroundColor: "transparent",
    grid: {
      left: 0,
      right: 0,
      top: 2,
      bottom: 2,
      containLabel: false
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "none"
      },
      appendToBody: true,
      confine: false,
      extraCssText: "z-index:999999;pointer-events:none;",
      formatter: function () {
        return `Current: ${formatAmount(currentPercent)}%<br>Projected: ${formatAmount(projectedPercent)}%`;
      }
    },
    xAxis: {
      type: "value",
      min: 0,
      max: 100,
      show: false
    },
    yAxis: {
      type: "category",
      data: ["progress"],
      show: false
    },
    series: [
      {
        name: "Progress",
        type: "bar",
        stack: "progress",
        data: [currentDisplay],
        clip: true,
        barWidth: 26,
        showBackground: true,
        backgroundStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#effcf9" },
              { offset: 0.48, color: "#d6f2ed" },
              { offset: 1, color: "#c0e8e2" }
            ]
          }
        },
        itemStyle: {
          borderRadius: currentSegmentRadius,
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#f4fffd" },
              { offset: 0.16, color: palette.start },
              { offset: 0.7, color: palette.end },
              { offset: 1, color: palette.end }
            ]
          },
          borderColor: "rgba(255, 255, 255, 0.32)",
          borderWidth: 1,
          shadowColor: "rgba(0, 66, 59, 0.22)",
          shadowBlur: 10,
          shadowOffsetY: 3
        }
      },
      {
        name: "Projection",
        type: "bar",
        stack: "progress",
        data: [projectedExtension],
        clip: true,
        barWidth: 26,
        silent: true,
        itemStyle: {
          borderRadius: [0, 999, 999, 0],
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: projectionHighlightColor },
              { offset: 0.18, color: projectionStartColor },
              { offset: 0.68, color: projectionEndColor },
              { offset: 1, color: projectionEndColor }
            ]
          },
          borderColor: "rgba(255, 255, 255, 0.34)",
          borderWidth: 1,
          shadowColor: "rgba(0, 66, 59, 0.18)",
          shadowBlur: 9,
          shadowOffsetY: 2
        }
      }
    ]
  };
}

function buildHistoryEChartOption(history, graphType, metricType) {
  const categories = history.map((item) => item.label);
  const values = history.map((item) => Number(item.value) || 0);
  const maxValue = Math.max(...values, metricType === "hit" ? 1 : 0);
  const yAxisMax = metricType === "hit" ? 1 : addAmount(maxValue, Math.max(maxValue * 0.12, 0.25));
  const isLine = graphType === "line";

  const series = isLine
    ? {
        type: "line",
        smooth: true,
        showSymbol: true,
        symbolSize: 7,
        lineStyle: { width: 2.8, color: "#3f7f7a" },
        itemStyle: { color: "#2f9189", borderColor: "#ffffff", borderWidth: 1.2 },
        areaStyle: { color: "rgba(103, 185, 175, 0.16)" },
        data: values
      }
    : {
        type: "bar",
        barWidth: "48%",
        data: values,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: function (params) {
            return params.dataIndex === 0 ? "#2f9189" : "#9fb8b4";
          }
        },
        label: {
          show: true,
          position: "top",
          color: "#385f5a",
          fontSize: 10,
          formatter: function (params) {
            if (metricType === "hit") {
              return Number(params.value) > 0 ? "Yes" : "No";
            }
            return formatAmount(params.value);
          }
        }
      };

  return {
    animationDuration: 260,
    color: ["#2f9189"],
    grid: {
      left: 42,
      right: 14,
      top: 14,
      bottom: 26,
      containLabel: true
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line" },
      formatter: function (items) {
        const first = Array.isArray(items) && items.length > 0 ? items[0] : null;
        if (!first) {
          return "";
        }
        const label = categories[first.dataIndex] || "";
        if (metricType === "hit") {
          return `${label}<br>${Number(first.value) > 0 ? "Goal Hit: Yes" : "Goal Hit: No"}`;
        }
        return `${label}<br>${isLine ? "Average" : "Value"}: ${formatAmount(first.value)}`;
      }
    },
    xAxis: {
      type: "category",
      data: categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#c8d9d6" } },
      axisLabel: { color: "#577c76", fontSize: 10, fontWeight: 700 }
    },
    yAxis: {
      type: "value",
      min: 0,
      max: yAxisMax,
      splitNumber: metricType === "hit" ? 1 : 4,
      axisLabel: {
        color: "#577c76",
        fontSize: 10,
        fontWeight: 700,
        formatter: function (value) {
          if (metricType === "hit") {
            return Number(value) >= 1 ? "Yes" : "No";
          }
          return formatAmount(value);
        }
      },
      splitLine: { lineStyle: { color: "#d9e8e5" } },
      axisLine: { show: false }
    },
    series: [series]
  };
}

function createHistoryLineGraphMarkup(history, maxMetricValue, selectedMetric) {
  if (!Array.isArray(history) || history.length < 1) {
    return "";
  }
  const width = 360;
  const height = 160;
  const paddingLeft = 24;
  const paddingRight = 18;
  const paddingTop = 18;
  const paddingBottom = 38;
  const innerWidth = Math.max(width - paddingLeft - paddingRight, 1);
  const innerHeight = Math.max(height - paddingTop - paddingBottom, 1);
  const stepX = history.length > 1 ? innerWidth / (history.length - 1) : 0;

  const points = history.map((item, index) => {
    const normalized = maxMetricValue > 0 ? item.value / maxMetricValue : 0;
    const x = paddingLeft + (stepX * index);
    const y = paddingTop + ((1 - normalized) * innerHeight);
    return {
      x,
      y,
      label: item.label,
      value: item.value,
      valueLabel: selectedMetric === "hit" ? (item.value > 0 ? "Yes" : "No") : formatAmount(item.value),
      rangeLabel: item.rangeLabel,
      isCurrent: item.offset === 0
    };
  });

  const polylinePoints = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const pointMarkup = points.map((point) => `
    <g>
      <circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${point.isCurrent ? "5.5" : "4.5"}" class="avg-line-point${point.isCurrent ? " is-current" : ""}">
        <title>${escapeHtml(point.rangeLabel)}</title>
      </circle>
      <text x="${point.x.toFixed(2)}" y="${Math.max(point.y - 10, 10).toFixed(2)}" text-anchor="middle" class="avg-line-value">${escapeHtml(point.valueLabel)}</text>
      <text x="${point.x.toFixed(2)}" y="${(height - 14).toFixed(2)}" text-anchor="middle" class="avg-line-label">${escapeHtml(point.label)}</text>
    </g>
  `).join("");

  return `
    <svg class="avg-line-graph" viewBox="0 0 ${width} ${height}" role="img" aria-label="History comparison line chart">
      <line x1="${paddingLeft}" y1="${(height - paddingBottom).toFixed(2)}" x2="${(width - paddingRight).toFixed(2)}" y2="${(height - paddingBottom).toFixed(2)}" class="avg-line-axis"></line>
      <polyline points="${polylinePoints}" class="avg-line-path"></polyline>
      ${pointMarkup}
    </svg>
  `;
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
    const buttonTab = String(button.dataset.tab || "").trim();
    const socialSection = String(button.dataset.socialSection || "").trim().toLowerCase();
    let isActive = buttonTab === activeTab;
    if (buttonTab === "social" && socialSection) {
      isActive = activeTab === "social" && socialSection === activeSocialSection;
    }
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
  if (activeUserButton) {
    activeUserButton.hidden = !isAuthenticated;
    activeUserButton.textContent = username;
    activeUserButton.disabled = !isAuthenticated;
  }
  if (settingsShortcutButton) {
    settingsShortcutButton.hidden = !isAuthenticated;
    settingsShortcutButton.disabled = !isAuthenticated;
    const settingsActive = isAuthenticated && activeTab.startsWith("settings-");
    settingsShortcutButton.classList.toggle("active", settingsActive);
    settingsShortcutButton.setAttribute("aria-current", settingsActive ? "page" : "false");
  }
  if (activeUserPointsButton) {
    const showPointsButton = isAuthenticated && isPointStoreRewardsEnabled();
    activeUserPointsButton.hidden = !showPointsButton;
    activeUserPointsButton.textContent = `${formatAmount(getPointBankBalance())} pts`;
    activeUserPointsButton.disabled = !showPointsButton;
    const pointsActive = showPointsButton && activeTab === "point-store";
    activeUserPointsButton.classList.toggle("active", pointsActive);
    activeUserPointsButton.setAttribute("aria-current", pointsActive ? "page" : "false");
  }
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
      const canClosePeriod = (
        item.type === "period-close-ready"
        && !item.actioned
        && isDateKey(item.rangeStart)
        && isDateKey(item.rangeEnd)
      );
      const closePeriodAction = canClosePeriod
        ? `
          <div class="actions">
            <button
              class="btn btn-primary"
              type="button"
              data-action="close-period-from-notification"
              data-notification-id="${item.id}"
              data-period="${escapeAttr(item.period)}"
              data-range-start="${escapeAttr(item.rangeStart)}"
              data-range-end="${escapeAttr(item.rangeEnd)}"
            >
              Close Period
            </button>
          </div>
        `
        : "";
      const actionMarkup = `${inviteActions}${closePeriodAction}`;
      return `
        <li class="quick-item" style="--stagger:${index}">
          <div class="metric-top">
            <strong>${escapeHtml(getNotificationMessage(item))}</strong>
            <span class="pace-chip${item.read ? "" : " pace-on"}">${item.read ? "Read" : "New"}</span>
          </div>
          <p class="muted small">${escapeHtml(formatSnapshotClosedAt(item.createdAt))}</p>
          ${actionMarkup}
        </li>
      `;
    })
    .join("");
}

function getLatestEntryDateMap() {
  const latestMap = new Map();
  entries.forEach((entry) => {
    if (!entry || !entry.trackerId || !isDateKey(entry.date)) {
      return;
    }
    const prior = latestMap.get(entry.trackerId);
    if (!prior || entry.date > prior) {
      latestMap.set(entry.trackerId, entry.date);
    }
  });
  return latestMap;
}

function getMissedEntryItems(now = new Date()) {
  const thresholdDays = Math.max(Math.floor(Number(settings && settings.missedEntryDays) || 2), 1);
  const today = normalizeDate(now);
  const latestDateByTracker = getLatestEntryDateMap();
  return trackers
    .filter((tracker) => tracker && !tracker.archived && normalizeGoalType(tracker.goalType) !== "bucket")
    .map((tracker) => {
      const latestDateKey = latestDateByTracker.get(tracker.id) || "";
      const latestDate = latestDateKey ? parseDateKey(latestDateKey) : null;
      const daysWithout = latestDate
        ? Math.max(Math.floor((today - normalizeDate(latestDate)) / DAY_MS), 0)
        : thresholdDays;
      return {
        tracker,
        latestDateKey,
        daysWithout,
        missed: daysWithout >= thresholdDays
      };
    })
    .filter((item) => item.missed)
    .sort((a, b) => b.daysWithout - a.daysWithout);
}

function formatShortMonthDay(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function normalizeHomeMissedPeriod(value) {
  if (value === "month") {
    return "month";
  }
  if (value === "year") {
    return "year";
  }
  return "week";
}

function getHomeMissedRange(periodName, now = new Date()) {
  const normalizedPeriod = normalizeHomeMissedPeriod(periodName);
  const today = normalizeDate(now);
  const fullRange = normalizedPeriod === "month"
    ? getMonthRange(today)
    : normalizedPeriod === "year"
    ? getYearRange(today)
    : getWeekRange(today);
  const cappedEnd = fullRange.end > today ? today : fullRange.end;
  return {
    periodName: normalizedPeriod,
    start: fullRange.start,
    end: cappedEnd
  };
}

function getHomeMissedCopy(periodName) {
  const normalizedPeriod = normalizeHomeMissedPeriod(periodName);
  const periodLabel = getSnapshotPeriodTitle(normalizedPeriod).toLowerCase();
  return `Goals missing updates this ${periodLabel}.`;
}

function getHomeMissedEmptyCopy(periodName) {
  const normalizedPeriod = normalizeHomeMissedPeriod(periodName);
  const periodLabel = getSnapshotPeriodTitle(normalizedPeriod).toLowerCase();
  return `No missed entries this ${periodLabel}.`;
}

function getHomeMissedEntryItems(periodName, now = new Date()) {
  const range = getHomeMissedRange(periodName, now);
  const startKey = getDateKey(range.start);
  const endKey = getDateKey(range.end);
  const activeTrackers = trackers
    .filter((tracker) => tracker && !tracker.archived && normalizeGoalType(tracker.goalType) !== "bucket");
  if (activeTrackers.length < 1 || !isDateKey(startKey) || !isDateKey(endKey) || endKey < startKey) {
    return [];
  }

  const activeTrackerIds = new Set(activeTrackers.map((tracker) => tracker.id));
  const trackersWithPeriodEntries = new Set();
  entries.forEach((entry) => {
    if (!entry || !activeTrackerIds.has(entry.trackerId) || !isDateKey(entry.date)) {
      return;
    }
    if (entry.date >= startKey && entry.date <= endKey) {
      trackersWithPeriodEntries.add(entry.trackerId);
    }
  });

  const latestDateByTracker = getLatestEntryDateMap();
  const elapsedRangeDays = Math.max(getRangeDays({ start: range.start, end: range.end }), 1);
  const today = normalizeDate(now);
  return activeTrackers
    .filter((tracker) => !trackersWithPeriodEntries.has(tracker.id))
    .map((tracker) => {
      const latestDateKey = latestDateByTracker.get(tracker.id) || "";
      const latestDate = latestDateKey ? parseDateKey(latestDateKey) : null;
      const daysWithout = latestDate
        ? Math.max(Math.floor((today - normalizeDate(latestDate)) / DAY_MS), 0)
        : elapsedRangeDays;
      return {
        tracker,
        latestDateKey,
        daysWithout,
        periodName: range.periodName
      };
    })
    .sort((a, b) => b.daysWithout - a.daysWithout);
}

function normalizeHomeDashboardChartView(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "momentum") {
    return "momentum";
  }
  if (normalized === "heatmap") {
    return "heatmap";
  }
  if (normalized === "weekly-progress") {
    return "weekly-progress";
  }
  if (normalized === "missed-risk") {
    return "missed-risk";
  }
  return "activity";
}

function hasECharts3DLibrary() {
  return Boolean(window.echarts && (window.echarts.graphicGL || window.echarts.ComponentModel3D));
}

function getHomeMomentumRows(weekIndex, nowDate) {
  const currentWeekRange = getWeekRange(nowDate);
  const previousWeekRange = getWeekRange(addDays(nowDate, -7));
  return trackers
    .filter((tracker) => (
      tracker
      && !tracker.archived
      && normalizeGoalType(tracker.goalType) !== "bucket"
      && !isFloatingGoalType(tracker.goalType)
    ))
    .map((tracker) => {
      const currentTarget = getTrackerTargetForPeriod(tracker, "week", currentWeekRange);
      const previousTarget = getTrackerTargetForPeriod(tracker, "week", previousWeekRange);
      if (currentTarget <= 0 && previousTarget <= 0) {
        return null;
      }
      const currentProgress = sumTrackerRange(weekIndex, tracker.id, currentWeekRange);
      const previousProgress = sumTrackerRange(weekIndex, tracker.id, previousWeekRange);
      const currentPct = currentTarget > 0 ? (currentProgress / currentTarget) * 100 : 0;
      const previousPct = previousTarget > 0 ? (previousProgress / previousTarget) * 100 : 0;
      const deltaPct = currentPct - previousPct;
      return {
        tracker,
        currentTarget,
        currentProgress,
        currentPct,
        previousTarget,
        previousProgress,
        previousPct,
        deltaPct,
        priority: normalizeGoalPriority(tracker.priority, 0)
      };
    })
    .filter(Boolean);
}

function getHomeActivityTrendData(nowDate) {
  const activeGoalIds = new Set(
    trackers
      .filter((tracker) => tracker && !tracker.archived && normalizeGoalType(tracker.goalType) !== "bucket")
      .map((tracker) => tracker.id)
  );
  if (activeGoalIds.size < 1) {
    return null;
  }
  const dailyDates = Array.from({ length: 30 }, (_, index) => addDays(nowDate, -(29 - index)));
  const labels = dailyDates.map((date) => formatShortMonthDay(date));
  const dateKeySet = new Set(dailyDates.map((date) => getDateKey(date)));
  const totalsByDate = new Map(dailyDates.map((date) => [getDateKey(date), 0]));
  entries.forEach((entry) => {
    if (!entry || !activeGoalIds.has(entry.trackerId) || !dateKeySet.has(entry.date)) {
      return;
    }
    const prior = totalsByDate.get(entry.date) || 0;
    totalsByDate.set(entry.date, addAmount(prior, Number(entry.amount || 0)));
  });
  const dailyValues = dailyDates.map((date) => totalsByDate.get(getDateKey(date)) || 0);
  if (!dailyValues.some((value) => value > 0)) {
    return null;
  }
  const rollingValues = dailyValues.map((_, index) => {
    const start = Math.max(0, index - 6);
    const windowValues = dailyValues.slice(start, index + 1);
    return safeDivide(windowValues.reduce((sum, value) => sum + value, 0), windowValues.length);
  });
  return { labels, dailyValues, rollingValues };
}

function getHomeHeatmapChartConfig(weekIndex, nowDate) {
  const weekRanges = getHomeHeatmapWeekRanges(nowDate);
  const weekLabels = weekRanges.map((range) => `Wk ${formatDate(range.start)}`);
  const weeklyTrackers = trackers.filter((tracker) => (
    tracker
    && !tracker.archived
    && normalizeGoalType(tracker.goalType) !== "bucket"
    && !isFloatingGoalType(tracker.goalType)
  ));
  const heatmapRows = weeklyTrackers
    .map((tracker) => {
      const weekValues = weekRanges.map((range) => {
        const target = getTrackerTargetForPeriod(tracker, "week", range);
        const progress = sumTrackerRange(weekIndex, tracker.id, range);
        const pctRaw = target > 0 ? (progress / target) * 100 : null;
        return {
          target,
          progress,
          pctRaw
        };
      });
      return {
        tracker,
        weekValues,
        hasMeasurableWeek: weekValues.some((item) => item.target > 0)
      };
    })
    .filter((row) => row.hasMeasurableWeek);

  if (heatmapRows.length < 1) {
    return null;
  }

  const goalLabels = heatmapRows.map((row) => row.tracker.name);
  const rawPercentages = [];
  const chartData = [];
  heatmapRows.forEach((row, yIndex) => {
    row.weekValues.forEach((weekValue, xIndex) => {
      const hasTarget = weekValue.target > 0;
      const pctRaw = hasTarget ? Number(weekValue.pctRaw) : null;
      if (Number.isFinite(pctRaw)) {
        rawPercentages.push(pctRaw);
      }
      chartData.push({
        value: [xIndex, yIndex, Number.isFinite(pctRaw) ? Math.max(Math.min(pctRaw, 200), 0) : -1],
        pctRaw,
        progress: weekValue.progress,
        target: weekValue.target,
        unit: row.tracker.unit || "units",
        goalName: row.tracker.name,
        weekLabel: `${formatDate(weekRanges[xIndex].start)} to ${formatDate(weekRanges[xIndex].end)}`
      });
    });
  });

  const maxRawPercent = rawPercentages.length > 0 ? Math.max(...rawPercentages) : 100;
  const visualMax = Math.max(120, Math.min(Math.ceil(maxRawPercent / 10) * 10, 200));
  const longestLabelLength = goalLabels.reduce((max, label) => Math.max(max, String(label || "").length), 0);
  const leftPadding = Math.min(Math.max((longestLabelLength * 7) + 26, 140), 280);
  const chartHeight = Math.max(320, (goalLabels.length * 34) + 120);
  return {
    chartHeight,
    option: buildHomeHeatmapOption({
      weekLabels,
      goalLabels,
      chartData,
      visualMax,
      leftPadding,
      showCellLabel: goalLabels.length <= 10
    })
  };
}

function buildHomeWeeklyProgressOption(rows) {
  const chartRows = Array.isArray(rows)
    ? [...rows]
      .sort((a, b) => b.currentPct - a.currentPct)
      .slice(0, 12)
      .reverse()
    : [];
  if (chartRows.length < 1) {
    return null;
  }
  const labels = chartRows.map((row) => String(row.tracker && row.tracker.name ? row.tracker.name : "Goal"));
  const values = chartRows.map((row) => Math.max(Math.min(Number(row.currentPct) || 0, 200), 0));
  const axisMax = Math.max(100, Math.min(Math.ceil(Math.max(...values, 100) / 10) * 10, 200));
  return {
    animationDuration: 260,
    backgroundColor: "transparent",
    grid: {
      left: 150,
      right: 20,
      top: 20,
      bottom: 30,
      containLabel: false
    },
    tooltip: {
      trigger: "item",
      formatter: function (params) {
        const row = params && params.data ? params.data.meta : null;
        if (!row) {
          return "";
        }
        return `${escapeHtml(row.tracker.name)}<br>${formatAmount(row.currentProgress)} / ${formatAmount(row.currentTarget)} ${escapeHtml(normalizeGoalUnit(row.tracker.unit))}<br>${formatAmount(row.currentPct)}%`;
      }
    },
    xAxis: {
      type: "value",
      min: 0,
      max: axisMax,
      axisLabel: { formatter: "{value}%", color: "#466d66", fontSize: 10 },
      splitLine: { lineStyle: { color: "#deece9" } }
    },
    yAxis: {
      type: "category",
      data: labels,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        color: "#305a53",
        fontSize: 10,
        fontWeight: 700,
        formatter: function (value) {
          const label = String(value || "");
          return label.length > 22 ? `${label.slice(0, 22)}...` : label;
        }
      }
    },
    series: [
      {
        type: "bar",
        data: chartRows.map((row) => ({
          value: Math.max(Math.min(Number(row.currentPct) || 0, axisMax), 0),
          meta: row
        })),
        barWidth: 16,
        itemStyle: {
          borderRadius: [999, 999, 999, 999],
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: "#2f9fb6" },
              { offset: 1, color: "#1f9b6c" }
            ]
          }
        },
        showBackground: true,
        backgroundStyle: {
          color: "#e2f1ee"
        },
        label: {
          show: true,
          position: "right",
          formatter: function (params) {
            return `${Math.round(Number(params.value) || 0)}%`;
          },
          color: "#1c4f48",
          fontWeight: 700,
          fontSize: 10
        }
      }
    ]
  };
}

function buildHomeMissedRiskOption(missedItems) {
  const chartRows = Array.isArray(missedItems)
    ? missedItems.slice(0, 12).reverse()
    : [];
  if (chartRows.length < 1) {
    return null;
  }
  return {
    animationDuration: 260,
    backgroundColor: "transparent",
    grid: {
      left: 150,
      right: 18,
      top: 20,
      bottom: 34,
      containLabel: false
    },
    tooltip: {
      trigger: "item",
      formatter: function (params) {
        const item = params && params.data ? params.data.meta : null;
        if (!item || !item.tracker) {
          return "";
        }
        const latestLine = item.latestDateKey ? `Last entry: ${formatDate(parseDateKey(item.latestDateKey))}` : "No entries yet";
        return `${escapeHtml(item.tracker.name)}<br>${latestLine}<br>${item.daysWithout} day(s) without entry`;
      }
    },
    xAxis: {
      type: "value",
      min: 0,
      axisLabel: { color: "#4a716a", fontSize: 10 },
      splitLine: { lineStyle: { color: "#deece9" } }
    },
    yAxis: {
      type: "category",
      data: chartRows.map((item) => item.tracker.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        color: "#305a53",
        fontSize: 10,
        fontWeight: 700,
        formatter: function (value) {
          const label = String(value || "");
          return label.length > 22 ? `${label.slice(0, 22)}...` : label;
        }
      }
    },
    series: [
      {
        type: "bar",
        data: chartRows.map((item) => ({
          value: Math.max(Number(item.daysWithout) || 0, 0),
          meta: item
        })),
        barWidth: 16,
        itemStyle: {
          borderRadius: [999, 999, 999, 999],
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: "#d26a72" },
              { offset: 1, color: "#be7f24" }
            ]
          }
        },
        label: {
          show: true,
          position: "right",
          color: "#5f2a2f",
          fontWeight: 700,
          fontSize: 10
        }
      }
    ]
  };
}

function renderHomeDashboardChart(config = {}) {
  if (!homeDashboardChart || !homeDashboardChartEmpty || !homeDashboardViewSelect) {
    return;
  }
  disposeEChartsInScope(homeDashboardChart);
  homeDashboardChart.innerHTML = "";
  homeDashboardChart.style.display = "none";
  const view = normalizeHomeDashboardChartView(homeDashboardChartView || homeDashboardViewSelect.value);
  homeDashboardChartView = view;
  homeDashboardViewSelect.value = view;

  const nowDate = config.nowDate instanceof Date ? config.nowDate : normalizeDate(new Date());
  const weekIndex = config.weekIndex || buildEntryIndex(entries);
  const weekMomentumRows = Array.isArray(config.weekMomentumRows) ? config.weekMomentumRows : [];
  const missedItems = Array.isArray(config.missedItems) ? config.missedItems : [];
  let option = null;
  let chartHeight = 360;
  let emptyMessage = "No data available for this chart view yet.";
  let ariaLabel = "Dashboard chart";

  if (view === "activity") {
    const trendData = getHomeActivityTrendData(nowDate);
    if (trendData) {
      option = buildHomeActivityTrendOption(trendData.labels, trendData.dailyValues, trendData.rollingValues);
      ariaLabel = "Dashboard activity chart";
    } else {
      emptyMessage = "No recent entry activity yet.";
    }
  } else if (view === "momentum") {
    if (weekMomentumRows.length > 0) {
      option = hasECharts3DLibrary()
        ? buildHomeMomentum3DOption(weekMomentumRows)
        : buildHomeMomentum2DFallbackOption(weekMomentumRows);
      ariaLabel = "Dashboard momentum chart";
    } else {
      emptyMessage = "No measurable goals to plot yet.";
    }
  } else if (view === "heatmap") {
    const heatmapConfig = getHomeHeatmapChartConfig(weekIndex, nowDate);
    if (heatmapConfig && heatmapConfig.option) {
      option = heatmapConfig.option;
      chartHeight = Number(heatmapConfig.chartHeight) || 360;
      ariaLabel = "Dashboard five-week heatmap";
    } else {
      emptyMessage = "No measurable weekly goals yet.";
    }
  } else if (view === "weekly-progress") {
    option = buildHomeWeeklyProgressOption(weekMomentumRows);
    ariaLabel = "Dashboard weekly progress chart";
    if (!option) {
      emptyMessage = "No measurable weekly goal progress yet.";
    }
  } else if (view === "missed-risk") {
    option = buildHomeMissedRiskOption(missedItems);
    ariaLabel = "Dashboard missed-entry risk chart";
    if (!option) {
      emptyMessage = "No missed entry risk data right now.";
    }
  }

  if (!option) {
    homeDashboardChartEmpty.textContent = emptyMessage;
    homeDashboardChartEmpty.style.display = "block";
    return;
  }
  const chartConfigId = registerEChartConfig({ option });
  homeDashboardChart.innerHTML = `<div class="home-dashboard-echart js-echart" data-echart-config-id="${chartConfigId}" style="height:${Math.max(chartHeight, 280)}px" aria-label="${escapeAttr(ariaLabel)}"></div>`;
  homeDashboardChartEmpty.style.display = "none";
  homeDashboardChart.style.display = "block";
  initializeEChartsInScope(homeDashboardChart);
}

function buildHomeActivityTrendOption(labels, dailyValues, rollingValues) {
  const maxDaily = dailyValues.length > 0 ? Math.max(...dailyValues) : 0;
  const yMax = Math.max(5, Math.ceil(maxDaily * 1.2));
  return {
    animationDuration: 260,
    backgroundColor: "transparent",
    legend: {
      top: 0,
      textStyle: { color: "#3f6a63", fontSize: 11, fontWeight: 700 },
      itemHeight: 8
    },
    grid: {
      left: 44,
      right: 14,
      top: 28,
      bottom: 34,
      containLabel: true
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line" },
      formatter: function (items) {
        if (!Array.isArray(items) || items.length < 1) {
          return "";
        }
        const idx = Number(items[0].dataIndex) || 0;
        const dayTotal = Number(dailyValues[idx]) || 0;
        const rolling = Number(rollingValues[idx]) || 0;
        return `${escapeHtml(labels[idx] || "")}<br>Daily: ${formatAmount(dayTotal)}<br>7-day avg: ${formatAmount(rolling)}`;
      }
    },
    xAxis: {
      type: "category",
      data: labels,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#bfded9" } },
      axisLabel: {
        color: "#4a716a",
        fontSize: 10,
        interval: function (index) {
          return index % 3 === 0;
        }
      }
    },
    yAxis: {
      type: "value",
      min: 0,
      max: yMax,
      splitNumber: 4,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#deece9" } },
      axisLabel: { color: "#4a716a", fontSize: 10 }
    },
    series: [
      {
        name: "Daily",
        type: "bar",
        data: dailyValues,
        barWidth: "56%",
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: "rgba(47, 159, 182, 0.75)"
        }
      },
      {
        name: "7-day avg",
        type: "line",
        data: rollingValues,
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { width: 2.4, color: "#177a52" },
        itemStyle: { color: "#177a52" }
      }
    ]
  };
}

function buildHomeMomentum3DOption(rows) {
  const zClampMin = -120;
  const zClampMax = 120;
  return {
    animationDuration: 300,
    tooltip: {
      formatter: function (params) {
        const meta = params && params.data ? params.data.meta : null;
        if (!meta) {
          return "";
        }
        return `${escapeHtml(meta.tracker.name)}<br>Weekly completion: ${formatAmount(meta.currentPct)}%<br>Priority: ${formatAmount(meta.priority)}<br>Momentum delta: ${meta.deltaPct >= 0 ? "+" : ""}${formatAmount(meta.deltaPct)}%`;
      }
    },
    grid3D: {
      boxWidth: 120,
      boxDepth: 80,
      boxHeight: 60,
      axisLine: { lineStyle: { color: "#9ac9c2" } },
      axisPointer: { lineStyle: { color: "#2f9fb6" } },
      viewControl: {
        projection: "perspective",
        alpha: 20,
        beta: 38,
        distance: 170
      },
      light: {
        main: { intensity: 1.05, shadow: false },
        ambient: { intensity: 0.35 }
      }
    },
    xAxis3D: {
      type: "value",
      name: "Completion %",
      min: 0,
      max: 200,
      axisLabel: { formatter: "{value}%", color: "#3d6a64", fontSize: 10 }
    },
    yAxis3D: {
      type: "value",
      name: "Priority",
      min: 0,
      axisLabel: { color: "#3d6a64", fontSize: 10 }
    },
    zAxis3D: {
      type: "value",
      name: "Delta %",
      min: zClampMin,
      max: zClampMax,
      axisLabel: {
        color: "#3d6a64",
        fontSize: 10,
        formatter: function (value) {
          const numeric = Number(value) || 0;
          return `${numeric >= 0 ? "+" : ""}${numeric}%`;
        }
      }
    },
    series: [
      {
        type: "scatter3D",
        data: rows.map((row) => {
          const x = Math.max(Math.min(row.currentPct, 200), 0);
          const z = Math.max(Math.min(row.deltaPct, zClampMax), zClampMin);
          const size = Math.max(10, Math.min(22, 10 + (row.priority * 0.08)));
          const color = row.deltaPct >= 0 ? "#1f9b6c" : "#d26a72";
          return {
            name: row.tracker.name,
            value: [x, row.priority, z],
            symbolSize: size,
            itemStyle: { color, opacity: 0.9 },
            meta: row
          };
        })
      }
    ]
  };
}

function buildHomeMomentum2DFallbackOption(rows) {
  return {
    animationDuration: 260,
    backgroundColor: "transparent",
    grid: {
      left: 52,
      right: 14,
      top: 20,
      bottom: 42,
      containLabel: true
    },
    tooltip: {
      formatter: function (params) {
        const meta = params && params.data ? params.data.meta : null;
        if (!meta) {
          return "";
        }
        return `${escapeHtml(meta.tracker.name)}<br>Weekly completion: ${formatAmount(meta.currentPct)}%<br>Momentum delta: ${meta.deltaPct >= 0 ? "+" : ""}${formatAmount(meta.deltaPct)}%<br>Priority: ${formatAmount(meta.priority)}`;
      }
    },
    xAxis: {
      type: "value",
      name: "Completion %",
      min: 0,
      max: 200,
      axisLabel: { formatter: "{value}%", color: "#456f69", fontSize: 10 },
      splitLine: { lineStyle: { color: "#deece9" } }
    },
    yAxis: {
      type: "value",
      name: "Delta %",
      min: -120,
      max: 120,
      axisLabel: {
        color: "#456f69",
        fontSize: 10,
        formatter: function (value) {
          const numeric = Number(value) || 0;
          return `${numeric >= 0 ? "+" : ""}${numeric}%`;
        }
      },
      splitLine: { lineStyle: { color: "#deece9" } }
    },
    series: [
      {
        type: "scatter",
        data: rows.map((row) => ({
          value: [Math.max(Math.min(row.currentPct, 200), 0), Math.max(Math.min(row.deltaPct, 120), -120)],
          symbolSize: Math.max(10, Math.min(22, 10 + (row.priority * 0.08))),
          itemStyle: {
            color: row.deltaPct >= 0 ? "#1f9b6c" : "#d26a72",
            opacity: 0.85
          },
          meta: row
        }))
      }
    ]
  };
}

function renderHomeInsights(weekRows) {
  if (!homeInsightsSummary || !homeInsightsList || !homeInsightsEmpty) {
    return;
  }
  if (!Array.isArray(weekRows) || weekRows.length < 1) {
    homeInsightsSummary.innerHTML = "";
    homeInsightsList.innerHTML = "";
    homeInsightsEmpty.style.display = "block";
    return;
  }
  const sortedByCompletion = [...weekRows].sort((a, b) => b.currentPct - a.currentPct);
  const sortedByDelta = [...weekRows].sort((a, b) => b.deltaPct - a.deltaPct);
  const bestGoal = sortedByCompletion[0];
  const biggestGain = sortedByDelta[0];
  const needsAttention = [...sortedByCompletion].reverse()[0];
  const improvingCount = weekRows.filter((row) => row.deltaPct > 0).length;
  const avgDelta = safeDivide(weekRows.reduce((total, row) => total + row.deltaPct, 0), weekRows.length);
  homeInsightsSummary.innerHTML = `
    <article class="summary-card">
      <p>Top Completion</p>
      <strong>${bestGoal ? `${formatAmount(bestGoal.currentPct)}%` : "N/A"}</strong>
    </article>
    <article class="summary-card">
      <p>Improving Goals</p>
      <strong>${improvingCount}/${weekRows.length}</strong>
    </article>
    <article class="summary-card">
      <p>Avg Momentum</p>
      <strong>${avgDelta >= 0 ? "+" : ""}${formatAmount(avgDelta)}%</strong>
    </article>
  `;
  const highlights = [
    bestGoal
      ? { label: "Best pace", row: bestGoal, detail: `${formatAmount(bestGoal.currentProgress)}/${formatAmount(bestGoal.currentTarget)} ${normalizeGoalUnit(bestGoal.tracker.unit)}` }
      : null,
    biggestGain
      ? { label: "Biggest gain", row: biggestGain, detail: `${biggestGain.deltaPct >= 0 ? "+" : ""}${formatAmount(biggestGain.deltaPct)}% vs last week` }
      : null,
    needsAttention
      ? { label: "Needs attention", row: needsAttention, detail: `${formatAmount(needsAttention.currentPct)}% complete this week` }
      : null
  ].filter(Boolean);
  homeInsightsList.innerHTML = highlights
    .map((item, index) => `
      <li class="quick-item" style="--stagger:${index}">
        <div>
          <strong>${escapeHtml(item.label)} | ${escapeHtml(item.row.tracker.name)}</strong>
          <p class="muted small">${escapeHtml(item.detail)}</p>
        </div>
        <span class="pace-chip ${item.row.deltaPct >= 0 ? "pace-on" : "pace-off"}">${item.row.deltaPct >= 0 ? "+" : ""}${formatAmount(item.row.deltaPct)}%</span>
      </li>
    `)
    .join("");
  homeInsightsEmpty.style.display = highlights.length < 1 ? "block" : "none";
}

function renderHomeActivityTrendChart(nowDate) {
  if (!homeActivityChart || !homeActivityEmpty) {
    return;
  }
  disposeEChartsInScope(homeActivityChart);
  homeActivityChart.innerHTML = "";
  homeActivityChart.style.display = "none";
  const activeGoalIds = new Set(
    trackers
      .filter((tracker) => tracker && !tracker.archived && normalizeGoalType(tracker.goalType) !== "bucket")
      .map((tracker) => tracker.id)
  );
  if (activeGoalIds.size < 1) {
    homeActivityEmpty.style.display = "block";
    return;
  }
  const dailyDates = Array.from({ length: 30 }, (_, index) => addDays(nowDate, -(29 - index)));
  const labels = dailyDates.map((date) => formatShortMonthDay(date));
  const dateKeySet = new Set(dailyDates.map((date) => getDateKey(date)));
  const totalsByDate = new Map(dailyDates.map((date) => [getDateKey(date), 0]));
  entries.forEach((entry) => {
    if (!entry || !activeGoalIds.has(entry.trackerId) || !dateKeySet.has(entry.date)) {
      return;
    }
    const prior = totalsByDate.get(entry.date) || 0;
    totalsByDate.set(entry.date, addAmount(prior, Number(entry.amount || 0)));
  });
  const dailyValues = dailyDates.map((date) => totalsByDate.get(getDateKey(date)) || 0);
  const hasActivity = dailyValues.some((value) => value > 0);
  if (!hasActivity) {
    homeActivityEmpty.style.display = "block";
    return;
  }
  const rollingValues = dailyValues.map((_, index) => {
    const start = Math.max(0, index - 6);
    const windowValues = dailyValues.slice(start, index + 1);
    return safeDivide(windowValues.reduce((sum, value) => sum + value, 0), windowValues.length);
  });
  const chartConfigId = registerEChartConfig({
    option: buildHomeActivityTrendOption(labels, dailyValues, rollingValues)
  });
  homeActivityChart.innerHTML = `<div class="home-dashboard-echart js-echart" data-echart-config-id="${chartConfigId}" aria-label="30-day activity trend chart"></div>`;
  homeActivityEmpty.style.display = "none";
  homeActivityChart.style.display = "block";
  initializeEChartsInScope(homeActivityChart);
}

function renderHomeMomentumChart(weekRows) {
  if (!homeMomentumChart || !homeMomentumEmpty) {
    return;
  }
  disposeEChartsInScope(homeMomentumChart);
  homeMomentumChart.innerHTML = "";
  homeMomentumChart.style.display = "none";
  if (!Array.isArray(weekRows) || weekRows.length < 1) {
    homeMomentumEmpty.style.display = "block";
    return;
  }
  const option = hasECharts3DLibrary()
    ? buildHomeMomentum3DOption(weekRows)
    : buildHomeMomentum2DFallbackOption(weekRows);
  const chartConfigId = registerEChartConfig({ option });
  homeMomentumChart.innerHTML = `<div class="home-dashboard-echart js-echart" data-echart-config-id="${chartConfigId}" aria-label="Goal momentum chart"></div>`;
  homeMomentumEmpty.style.display = "none";
  homeMomentumChart.style.display = "block";
  initializeEChartsInScope(homeMomentumChart);
}

function getHomeHeatmapWeekRanges(nowDate) {
  return Array.from({ length: 5 }, (_, index) => {
    const weeksBack = 4 - index;
    const anchor = addDays(nowDate, -7 * weeksBack);
    return getWeekRange(anchor);
  });
}

function buildHomeHeatmapOption(config) {
  const weekLabels = Array.isArray(config.weekLabels) ? config.weekLabels : [];
  const goalLabels = Array.isArray(config.goalLabels) ? config.goalLabels : [];
  const chartData = Array.isArray(config.chartData) ? config.chartData : [];
  const visualMax = Math.max(Number(config.visualMax) || 120, 100);
  const leftPadding = Math.max(Number(config.leftPadding) || 140, 120);
  const showCellLabel = Boolean(config.showCellLabel);
  return {
    animationDuration: 260,
    backgroundColor: "transparent",
    grid: {
      left: leftPadding,
      right: 16,
      top: 18,
      bottom: 52,
      containLabel: false
    },
    tooltip: {
      position: "top",
      formatter: function (params) {
        const item = params && params.data ? params.data : null;
        if (!item || !Array.isArray(item.value)) {
          return "";
        }
        const goalName = escapeHtml(item.goalName || "");
        const weekLabel = escapeHtml(item.weekLabel || "");
        const target = Number(item.target) || 0;
        const progress = Number(item.progress) || 0;
        if (target <= 0) {
          return `${goalName}<br>${weekLabel}<br>No weekly target`;
        }
        const pctText = Number.isFinite(item.pctRaw) ? `${formatAmount(item.pctRaw)}%` : "N/A";
        return `${goalName}<br>${weekLabel}<br>${formatAmount(progress)} / ${formatAmount(target)} ${escapeHtml(item.unit || "units")}<br>${pctText}`;
      }
    },
    xAxis: {
      type: "category",
      data: weekLabels,
      splitArea: { show: true },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#b9d8d4" } },
      axisLabel: {
        color: "#3f6a63",
        fontSize: 10,
        fontWeight: 700
      }
    },
    yAxis: {
      type: "category",
      data: goalLabels,
      inverse: true,
      splitArea: { show: true },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#b9d8d4" } },
      axisLabel: {
        color: "#305a53",
        fontSize: 10,
        fontWeight: 700,
        formatter: function (value) {
          const label = String(value || "");
          return label.length > 24 ? `${label.slice(0, 24)}...` : label;
        }
      }
    },
    visualMap: {
      min: 0,
      max: visualMax,
      orient: "horizontal",
      left: "center",
      bottom: 6,
      calculable: false,
      text: [`${visualMax}%`, "0%"],
      inRange: {
        color: ["#d26a72", "#dea34d", "#7cc6b6", "#2f9fb6", "#1f9b6c"]
      },
      outOfRange: {
        color: ["#d9e6e3"]
      }
    },
    series: [
      {
        type: "heatmap",
        data: chartData,
        progressive: 0,
        itemStyle: {
          borderColor: "#ffffff",
          borderWidth: 1
        },
        label: {
          show: showCellLabel,
          color: "#0f3f38",
          fontWeight: 700,
          fontSize: 10,
          formatter: function (params) {
            const item = params && params.data ? params.data : null;
            if (!item || !Number.isFinite(item.pctRaw)) {
              return "-";
            }
            return `${Math.round(item.pctRaw)}%`;
          }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(5, 78, 69, 0.25)"
          }
        }
      }
    ]
  };
}

function renderHomeGoalHeatmap(weekIndex, nowDate) {
  if (!homeGoalHeatmap || !homeGoalHeatmapEmpty) {
    return;
  }
  disposeEChartsInScope(homeGoalHeatmap);
  homeGoalHeatmap.innerHTML = "";
  homeGoalHeatmap.style.display = "none";
  const weekRanges = getHomeHeatmapWeekRanges(nowDate);
  const weekLabels = weekRanges.map((range) => `Wk ${formatDate(range.start)}`);
  const weeklyTrackers = trackers.filter((tracker) => (
    tracker
    && !tracker.archived
    && normalizeGoalType(tracker.goalType) !== "bucket"
    && !isFloatingGoalType(tracker.goalType)
  ));
  const heatmapRows = weeklyTrackers
    .map((tracker) => {
      const weekValues = weekRanges.map((range) => {
        const target = getTrackerTargetForPeriod(tracker, "week", range);
        const progress = sumTrackerRange(weekIndex, tracker.id, range);
        const pctRaw = target > 0 ? (progress / target) * 100 : null;
        return {
          target,
          progress,
          pctRaw
        };
      });
      return {
        tracker,
        weekValues,
        hasMeasurableWeek: weekValues.some((item) => item.target > 0)
      };
    })
    .filter((row) => row.hasMeasurableWeek);

  if (heatmapRows.length < 1) {
    homeGoalHeatmapEmpty.style.display = "block";
    return;
  }

  const goalLabels = heatmapRows.map((row) => row.tracker.name);
  const rawPercentages = [];
  const chartData = [];
  heatmapRows.forEach((row, yIndex) => {
    row.weekValues.forEach((weekValue, xIndex) => {
      const hasTarget = weekValue.target > 0;
      const pctRaw = hasTarget ? Number(weekValue.pctRaw) : null;
      if (Number.isFinite(pctRaw)) {
        rawPercentages.push(pctRaw);
      }
      chartData.push({
        value: [xIndex, yIndex, Number.isFinite(pctRaw) ? Math.max(Math.min(pctRaw, 200), 0) : -1],
        pctRaw,
        progress: weekValue.progress,
        target: weekValue.target,
        unit: row.tracker.unit || "units",
        goalName: row.tracker.name,
        weekLabel: `${formatDate(weekRanges[xIndex].start)} to ${formatDate(weekRanges[xIndex].end)}`
      });
    });
  });

  const maxRawPercent = rawPercentages.length > 0 ? Math.max(...rawPercentages) : 100;
  const visualMax = Math.max(120, Math.min(Math.ceil(maxRawPercent / 10) * 10, 200));
  const longestLabelLength = goalLabels.reduce((max, label) => Math.max(max, String(label || "").length), 0);
  const leftPadding = Math.min(Math.max((longestLabelLength * 7) + 26, 140), 280);
  const chartHeight = Math.max(220, (goalLabels.length * 34) + 100);
  const chartConfigId = registerEChartConfig({
    option: buildHomeHeatmapOption({
      weekLabels,
      goalLabels,
      chartData,
      visualMax,
      leftPadding,
      showCellLabel: goalLabels.length <= 10
    })
  });
  homeGoalHeatmap.innerHTML = `
    <div class="home-heatmap-echart js-echart" data-echart-config-id="${chartConfigId}" style="height:${chartHeight}px" aria-label="Last five weeks goal heatmap"></div>
  `;
  homeGoalHeatmapEmpty.style.display = "none";
  homeGoalHeatmap.style.display = "block";
  initializeEChartsInScope(homeGoalHeatmap);
}

function renderHomeTab() {
  if (
    !homeSummary
    || !homeMissedList
    || !homeMissedEmpty
    || !homeUnclosedList
    || !homeUnclosedEmpty
    || !homeRemindersList
    || !homeRemindersEmpty
  ) {
    return;
  }
  if (!currentUser) {
    homeSummary.innerHTML = "";
    if (homeInsightsSummary) {
      homeInsightsSummary.innerHTML = "";
    }
    if (homeInsightsList) {
      homeInsightsList.innerHTML = "";
    }
    if (homeInsightsEmpty) {
      homeInsightsEmpty.style.display = "none";
    }
    if (homeDashboardChart) {
      disposeEChartsInScope(homeDashboardChart);
      homeDashboardChart.innerHTML = "";
      homeDashboardChart.style.display = "none";
    }
    if (homeDashboardChartEmpty) {
      homeDashboardChartEmpty.style.display = "none";
    }
    homeMissedList.innerHTML = "";
    homeMissedEmpty.style.display = "none";
    if (homeMissedPeriodCopy) {
      homeMissedPeriodCopy.textContent = getHomeMissedCopy(homeMissedPeriod);
    }
    homeUnclosedList.innerHTML = "";
    homeUnclosedEmpty.style.display = "none";
    setHomeMissedTileFlipped(false);
    homeRemindersList.innerHTML = "";
    homeRemindersEmpty.style.display = "none";
    if (homeGoalHeatmap) {
      disposeEChartsInScope(homeGoalHeatmap);
      homeGoalHeatmap.innerHTML = "";
      homeGoalHeatmap.style.display = "none";
    }
    if (homeGoalHeatmapEmpty) {
      homeGoalHeatmapEmpty.style.display = "none";
    }
    return;
  }

  const now = normalizeDate(new Date());
  const activeGoals = trackers.filter((item) => !item.archived).length;
  const weekRange = getWeekRange(now);
  const weekTotalDays = getRangeDays(weekRange);
  const weekElapsedDays = getElapsedDays(weekRange, now);
  const weekIndex = buildEntryIndex(entries);
  const activeWeekGoals = trackers.filter((tracker) => !tracker.archived && normalizeGoalType(tracker.goalType) !== "bucket");
  const measurableWeekGoals = activeWeekGoals.filter((tracker) => {
    const target = getTrackerTargetForPeriod(tracker, "week", weekRange);
    return !isFloatingGoalType(tracker.goalType) && target > 0;
  });
  let hitThisWeek = 0;
  const onPaceGoals = [];
  const offPaceGoals = [];
  measurableWeekGoals.forEach((tracker) => {
    const target = getTrackerTargetForPeriod(tracker, "week", weekRange);
    const progress = sumTrackerRange(weekIndex, tracker.id, weekRange);
    if (progress >= target) {
      hitThisWeek += 1;
    }
    const avgPerDay = safeDivide(progress, weekElapsedDays);
    const projected = avgPerDay * weekTotalDays;
    if (projected >= target) {
      onPaceGoals.push(tracker.name);
    } else {
      offPaceGoals.push(tracker.name);
    }
  });
  const measurableWeekGoalCount = measurableWeekGoals.length;
  const hitPct = measurableWeekGoalCount > 0 ? Math.round((hitThisWeek / measurableWeekGoalCount) * 100) : 0;
  const projectedHitPct = measurableWeekGoalCount > 0 ? Math.round((onPaceGoals.length / measurableWeekGoalCount) * 100) : 0;
  const projectedDetailText = buildProjectedWeekHitDetailText(onPaceGoals, offPaceGoals, measurableWeekGoalCount);
  const weekMomentumRows = getHomeMomentumRows(weekIndex, now);
  const missedRiskItems = getMissedEntryItems(now).slice(0, 8);
  const unclosedPeriodItems = getUnclosedPeriodItems(now).slice(0, 8);
  const selectedMissedPeriod = normalizeHomeMissedPeriod(
    homeMissedPeriod || (homeMissedPeriodSelect ? homeMissedPeriodSelect.value : "week")
  );
  homeMissedPeriod = selectedMissedPeriod;
  const homeMissedItems = getHomeMissedEntryItems(selectedMissedPeriod, now).slice(0, 8);
  const missedPeriodLabelLower = getSnapshotPeriodTitle(selectedMissedPeriod).toLowerCase();
  if (homeMissedPeriodSelect) {
    homeMissedPeriodSelect.value = selectedMissedPeriod;
  }
  if (homeMissedPeriodCopy) {
    homeMissedPeriodCopy.textContent = getHomeMissedCopy(selectedMissedPeriod);
  }
  applyHomeMissedTileFlipState();

  homeSummary.innerHTML = `
    <article class="summary-card">
      <p>Active Goals</p>
      <strong>${activeGoals}</strong>
    </article>
    <article class="summary-card">
      <p>Week Hit Rate</p>
      <strong>${hitPct}%</strong>
    </article>
    <article class="summary-card summary-card-detail" tabindex="0">
      <p>Projected Week Hit Rate</p>
      <div class="summary-projected-wrap">
        <strong>${projectedHitPct}%</strong>
      </div>
      <p class="summary-card-detail-text">${escapeHtml(projectedDetailText)}</p>
    </article>
  `;
  renderHomeInsights(weekMomentumRows);
  renderHomeDashboardChart({
    nowDate: now,
    weekIndex,
    weekMomentumRows,
    missedItems: missedRiskItems
  });

  if (homeMissedItems.length < 1) {
    homeMissedList.innerHTML = "";
    homeMissedEmpty.textContent = getHomeMissedEmptyCopy(selectedMissedPeriod);
    homeMissedEmpty.style.display = "block";
  } else {
    homeMissedEmpty.style.display = "none";
    homeMissedList.innerHTML = homeMissedItems
      .map((item, index) => `
        <li class="quick-item home-missed-item" style="--stagger:${index}">
          <button
            class="home-missed-goal-button"
            type="button"
            data-action="open-home-missed-solo-entry"
            data-tracker-id="${escapeAttr(item.tracker.id)}"
          >
            <span>
              <strong>${escapeHtml(item.tracker.name)}</strong>
              <p class="muted small">${item.latestDateKey ? `Last entry ${formatDate(parseDateKey(item.latestDateKey))}` : "No entries yet"} | No updates this ${escapeHtml(missedPeriodLabelLower)}</p>
            </span>
            <span class="pace-chip pace-off">${item.daysWithout}d</span>
          </button>
        </li>
      `)
      .join("");
  }

  if (unclosedPeriodItems.length < 1) {
    homeUnclosedList.innerHTML = "";
    homeUnclosedEmpty.style.display = "block";
  } else {
    homeUnclosedEmpty.style.display = "none";
    homeUnclosedList.innerHTML = unclosedPeriodItems
      .map((item, index) => `
        <li class="quick-item home-unclosed-item" style="--stagger:${index}">
          <div>
            <strong>${escapeHtml(`Unclosed ${item.periodLabel}`)}</strong>
            <p class="muted small">${escapeHtml(item.rangeLabel)}</p>
          </div>
          <button
            class="btn btn-nav-compact"
            type="button"
            data-action="open-home-unclosed-period-entry-list"
            data-period="${escapeAttr(item.periodName)}"
            data-start="${escapeAttr(item.startKey)}"
            data-end="${escapeAttr(item.endKey)}"
          >
            Review Entries
          </button>
        </li>
      `)
      .join("");
  }

  const reminderItems = getSmartReminderCandidates(now).slice(0, 8);
  if (reminderItems.length < 1) {
    homeRemindersList.innerHTML = "";
    homeRemindersEmpty.style.display = "block";
  } else {
    homeRemindersEmpty.style.display = "none";
    homeRemindersList.innerHTML = reminderItems
      .map((item, index) => `
        <li class="quick-item" style="--stagger:${index}">
          <div>
            <strong>${escapeHtml(item.goalName)}</strong>
            <p class="muted small">No recent updates</p>
          </div>
          <span class="pace-chip">${item.reminderDays}d</span>
        </li>
      `)
      .join("");
  }
}

function summarizeGoalNamesForDetail(names, limit = 6) {
  const list = Array.isArray(names) ? names.filter(Boolean) : [];
  if (list.length < 1) {
    return "None";
  }
  if (list.length <= limit) {
    return list.join(", ");
  }
  return `${list.slice(0, limit).join(", ")} +${list.length - limit} more`;
}

function buildProjectedWeekHitDetailText(onPaceGoals, offPaceGoals, measurableGoalCount) {
  if (measurableGoalCount < 1) {
    return "No measurable weekly goals.";
  }
  const onPaceText = summarizeGoalNamesForDetail(onPaceGoals);
  const offPaceText = summarizeGoalNamesForDetail(offPaceGoals);
  return `On pace: ${onPaceText}. Off pace: ${offPaceText}.`;
}

function renderMissedEntriesTab() {
  if (!missedEntriesList || !missedEntriesEmpty) {
    return;
  }
  if (!currentUser) {
    missedEntriesList.innerHTML = "";
    missedEntriesEmpty.style.display = "none";
    return;
  }

  const now = normalizeDate(new Date());
  const missedItems = getMissingEntryDateItems(now);
  const unclosedPeriodItems = getUnclosedPeriodItems(now);
  if (missedItems.length < 1 && unclosedPeriodItems.length < 1) {
    missedEntriesList.innerHTML = "";
    missedEntriesEmpty.textContent = "No missing entries or unclosed periods right now.";
    missedEntriesEmpty.style.display = "block";
    return;
  }

  missedEntriesEmpty.style.display = "none";
  let rowIndex = 0;
  const sections = [];
  if (missedItems.length > 0) {
    sections.push(`
      <li class="quick-item" style="--stagger:${rowIndex}">
        <div>
          <strong>Missing Entry Dates</strong>
          <p class="muted small">Dates where one or more active goals have no entry.</p>
        </div>
        <span class="pace-chip">${missedItems.length}</span>
      </li>
    `);
    rowIndex += 1;
    missedItems.forEach((item) => {
      sections.push(`
        <li class="quick-item" style="--stagger:${rowIndex}">
          <div>
            <strong>${escapeHtml(formatDate(parseDateKey(item.dateKey)))}</strong>
            <p class="muted small">${escapeHtml(getMissingEntryDateSummaryText(item.missingGoalNames))}</p>
          </div>
          <span class="pace-chip pace-off">${item.missingGoalNames.length}</span>
        </li>
      `);
      rowIndex += 1;
    });
  }

  if (unclosedPeriodItems.length > 0) {
    sections.push(`
      <li class="quick-item" style="--stagger:${rowIndex}">
        <div>
          <strong>Unclosed Periods</strong>
          <p class="muted small">Past periods missing a close-out snapshot.</p>
        </div>
        <span class="pace-chip">${unclosedPeriodItems.length}</span>
      </li>
    `);
    rowIndex += 1;
    unclosedPeriodItems.forEach((item) => {
      sections.push(`
        <li class="quick-item" style="--stagger:${rowIndex}">
          <div>
            <strong>${escapeHtml(`Unclosed ${item.periodLabel}`)}</strong>
            <p class="muted small">${escapeHtml(item.rangeLabel)}</p>
          </div>
          <button
            class="btn btn-nav-compact"
            type="button"
            data-action="open-period-entry-list"
            data-period="${item.periodName}"
            data-start="${item.startKey}"
            data-end="${item.endKey}"
          >
            Review Entries
          </button>
        </li>
      `);
      rowIndex += 1;
    });
  }

  missedEntriesList.innerHTML = sections.join("");
}

function getMissingEntryDateItems(now = new Date()) {
  const today = normalizeDate(now);
  const todayKey = getDateKey(today);
  const todayDay = dateKeyToDayNumber(todayKey);
  const activeGoals = trackers
    .filter((tracker) => tracker && !tracker.archived && normalizeGoalType(tracker.goalType) !== "bucket");
  if (activeGoals.length < 1) {
    return [];
  }

  const activeGoalIds = new Set(activeGoals.map((tracker) => tracker.id));
  const goalStartDayMap = new Map(activeGoals.map((tracker) => [tracker.id, todayDay]));
  const entryTrackerMapByDate = new Map();

  entries.forEach((entry) => {
    if (!entry || !activeGoalIds.has(entry.trackerId) || !isDateKey(entry.date) || entry.date > todayKey) {
      return;
    }
    const dayNumber = dateKeyToDayNumber(entry.date);
    const currentStartDay = goalStartDayMap.get(entry.trackerId);
    if (typeof currentStartDay !== "number" || dayNumber < currentStartDay) {
      goalStartDayMap.set(entry.trackerId, dayNumber);
    }
    if (!entryTrackerMapByDate.has(entry.date)) {
      entryTrackerMapByDate.set(entry.date, new Set());
    }
    entryTrackerMapByDate.get(entry.date).add(entry.trackerId);
  });

  const firstDay = activeGoals.reduce((minimum, tracker) => {
    const startDay = goalStartDayMap.get(tracker.id);
    if (typeof startDay !== "number") {
      return minimum;
    }
    return Math.min(minimum, startDay);
  }, todayDay);
  const missingByDate = [];
  for (let dayNumber = firstDay; dayNumber <= todayDay; dayNumber += 1) {
    const dateKey = dayNumberToDateKey(dayNumber);
    const trackerSet = entryTrackerMapByDate.get(dateKey) || new Set();
    const missingGoalNames = activeGoals
      .filter((tracker) => {
        const startDay = goalStartDayMap.get(tracker.id);
        if (typeof startDay === "number" && dayNumber < startDay) {
          return false;
        }
        return !trackerSet.has(tracker.id);
      })
      .map((tracker) => tracker.name);
    if (missingGoalNames.length < 1) {
      continue;
    }
    missingByDate.push({
      dateKey,
      missingGoalNames
    });
  }

  missingByDate.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  return missingByDate;
}

function getMissingEntryDateSummaryText(goalNames) {
  const names = Array.isArray(goalNames) ? goalNames.filter(Boolean) : [];
  if (names.length < 1) {
    return "No goals missing.";
  }
  if (names.length <= 4) {
    return names.join(", ");
  }
  return `${names.slice(0, 4).join(", ")} +${names.length - 4} more`;
}

function getUnclosedPeriodItems(now = new Date()) {
  const today = normalizeDate(now);
  const periodNames = isQuartersEnabled()
    ? ["week", "month", "quarter", "year"]
    : ["week", "month", "year"];
  const earliestDate = getEarliestTrackableEntryDate(today);
  const closedSnapshotKeys = new Set(
    periodSnapshots
      .filter((snapshot) => snapshot && isDateKey(snapshot.rangeStart) && isDateKey(snapshot.rangeEnd))
      .map((snapshot) => `${normalizePeriodMode(snapshot.period)}|${snapshot.rangeStart}|${snapshot.rangeEnd}`)
  );

  const items = [];
  periodNames.forEach((periodName) => {
    let range = getCurrentRangeForMode(periodName, earliestDate);
    while (range.end < today) {
      const startKey = getDateKey(range.start);
      const endKey = getDateKey(range.end);
      const snapshotKey = `${periodName}|${startKey}|${endKey}`;
      if (!closedSnapshotKeys.has(snapshotKey)) {
        items.push({
          periodName,
          periodLabel: getSnapshotPeriodTitle(periodName),
          startKey,
          endKey,
          rangeLabel: `${formatDate(range.start)} to ${formatDate(range.end)}`
        });
      }
      range = getNextPeriodRange(periodName, range);
    }
  });

  items.sort((a, b) => {
    const endCompare = b.endKey.localeCompare(a.endKey);
    if (endCompare !== 0) {
      return endCompare;
    }
    return a.periodName.localeCompare(b.periodName);
  });
  return items.slice(0, 24);
}

function getEarliestTrackableEntryDate(fallbackDate = new Date()) {
  const trackerTypeById = new Map(trackers.map((tracker) => [tracker.id, normalizeGoalType(tracker.goalType)]));
  const datedEntries = entries
    .filter((entry) => {
      if (!entry || !isDateKey(entry.date)) {
        return false;
      }
      const trackerType = trackerTypeById.get(entry.trackerId) || "";
      return trackerType !== "bucket";
    })
    .map((entry) => parseDateKey(entry.date));
  if (datedEntries.length < 1) {
    return normalizeDate(fallbackDate);
  }
  datedEntries.sort((a, b) => a - b);
  return normalizeDate(datedEntries[0]);
}

function getNextPeriodRange(periodName, range) {
  if (periodName === "week") {
    const start = addDays(range.start, 7);
    return { start, end: addDays(start, 6) };
  }
  if (periodName === "month") {
    const start = new Date(range.start.getFullYear(), range.start.getMonth() + 1, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { start, end };
  }
  if (periodName === "quarter") {
    const start = new Date(range.start.getFullYear(), range.start.getMonth() + 3, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
    return { start, end };
  }
  const start = new Date(range.start.getFullYear() + 1, 0, 1);
  const end = new Date(start.getFullYear(), 11, 31);
  return { start, end };
}

function openOnboardingModal() {
  if (!onboardingModal || !isOnboardingEnabled()) {
    return;
  }
  onboardingModal.classList.remove("hidden");
  onboardingModal.setAttribute("aria-hidden", "false");
}

function closeOnboardingModal() {
  if (!onboardingModal) {
    return;
  }
  onboardingModal.classList.add("hidden");
  onboardingModal.setAttribute("aria-hidden", "true");
  setOnboardingDismissed(true);
}

function renderTrendsTab() {
  if (!trendsSummary || !trendsList || !trendsEmpty || !trendsTagFilterSelect) {
    return;
  }
  if (!currentUser) {
    trendsSummary.innerHTML = "";
    trendsList.innerHTML = "";
    trendsEmpty.style.display = "none";
    return;
  }

  const sortedTags = getSortedGoalTagOptions(trackers);
  const selectedTag = normalizeGoalTagFilterValue(trendsTagFilterSelect.value || "all");
  trendsTagFilterSelect.innerHTML = `
    <option value="all">All Tags</option>
    ${sortedTags.map(([key, label]) => `<option value="${escapeAttr(key)}">${escapeHtml(label)}</option>`).join("")}
  `;
  trendsTagFilterSelect.value = selectedTag === "all" || sortedTags.some(([key]) => key === selectedTag) ? selectedTag : "all";

  const windowCount = Math.max(Math.min(Number(trendsWindowSelect ? trendsWindowSelect.value : 8) || 8, 26), 4);
  const metric = String(trendsMetricSelect ? trendsMetricSelect.value : "consistency");
  const now = normalizeDate(new Date());
  const currentWeek = getWeekRange(now).start;
  const index = buildEntryIndex(entries);

  const filteredTrackers = trackers
    .filter((tracker) => !tracker.archived && normalizeGoalType(tracker.goalType) !== "bucket")
    .filter((tracker) => {
      if (trendsTagFilterSelect.value === "all") {
        return true;
      }
      return normalizeGoalTags(tracker.tags).some((tag) => getGoalTagKey(tag) === trendsTagFilterSelect.value);
    });

  if (filteredTrackers.length < 1) {
    trendsSummary.innerHTML = "";
    trendsList.innerHTML = "";
    trendsEmpty.style.display = "block";
    return;
  }

  const cards = filteredTrackers.map((tracker) => {
    let hitWeeks = 0;
    let activeWeeks = 0;
    let volume = 0;
    for (let offset = 0; offset < windowCount; offset += 1) {
      const weekStart = addDays(currentWeek, -7 * offset);
      const range = getWeekRange(weekStart);
      const progress = sumTrackerRange(index, tracker.id, range);
      const target = getTrackerTargetForPeriod(tracker, "week", range);
      volume = addAmount(volume, progress);
      if (progress > 0) {
        activeWeeks += 1;
      }
      if (target > 0 && progress >= target) {
        hitWeeks += 1;
      }
    }
    const consistency = Math.round((activeWeeks / windowCount) * 100);
    const hitRate = Math.round((hitWeeks / windowCount) * 100);
    const score = metric === "volume" ? volume : metric === "hit-rate" ? hitRate : consistency;
    return { tracker, consistency, hitRate, volume, score };
  }).sort((a, b) => b.score - a.score);

  const avgConsistency = Math.round(cards.reduce((sum, item) => sum + item.consistency, 0) / cards.length);
  const avgHitRate = Math.round(cards.reduce((sum, item) => sum + item.hitRate, 0) / cards.length);
  trendsSummary.innerHTML = `
    <article class="summary-card">
      <p>Tracked Goals</p>
      <strong>${cards.length}</strong>
    </article>
    <article class="summary-card">
      <p>Avg Consistency</p>
      <strong>${avgConsistency}%</strong>
    </article>
    <article class="summary-card">
      <p>Avg Hit Rate</p>
      <strong>${avgHitRate}%</strong>
    </article>
  `;

  trendsEmpty.style.display = "none";
  trendsList.innerHTML = cards
    .map((item, index) => `
      <li class="metric-card" style="--stagger:${index}">
        <div class="metric-top">
          <h3>${escapeHtml(item.tracker.name)}</h3>
          <span class="pace-chip">${metric === "volume" ? formatAmount(item.volume) : `${formatAmount(item.score)}%`}</span>
        </div>
        <p class="metric-line">Consistency ${item.consistency}% | Hit rate ${item.hitRate}% | Volume ${formatAmountWithUnit(item.volume, item.tracker.unit)}</p>
      </li>
    `)
    .join("");
}

function renderGoalsPlusTab() {
  if (!goalsPlusSummary || !goalsPlusList || !goalsPlusEmpty) {
    return;
  }
  if (!currentUser) {
    goalsPlusSummary.innerHTML = "";
    goalsPlusList.innerHTML = "";
    goalsPlusEmpty.style.display = "none";
    return;
  }

  const goalsPlusTrackers = trackers
    .filter((tracker) => !tracker.archived && isGoalsPlusTracker(tracker))
    .sort(compareTrackersByPriority);

  if (goalsPlusTrackers.length < 1) {
    goalsPlusSummary.innerHTML = "";
    goalsPlusList.innerHTML = "";
    goalsPlusEmpty.style.display = "block";
    goalsPlusEmpty.textContent = "No Goals+ goals yet.";
    return;
  }

  const cards = goalsPlusTrackers.map((tracker) => {
    const config = getGoalsPlusRunningConfig(tracker);
    const entryItems = getGoalsPlusEntriesForTracker(tracker);
    const running = isGoalsPlusRunningTracker(tracker);
    const stats = running
      ? getGoalsPlusRunningStatsForEntries(entryItems)
      : getGoalsPlusGolfStatsForEntries(entryItems);
    return {
      tracker,
      config,
      stats,
      running
    };
  });

  const runningCards = cards.filter((item) => item.running);
  const golfCards = cards.filter((item) => !item.running);
  const totalEntries = cards.reduce((sum, item) => sum + item.stats.count, 0);
  const totalDistance = runningCards.reduce((sum, item) => addAmount(sum, item.stats.totalDistance), 0);
  const totalGolfScores = golfCards.reduce((sum, item) => sum + item.stats.scoredCount, 0);
  const weightedGolfAverage = golfCards.reduce((sum, item) => addAmount(sum, item.stats.avgScore * item.stats.scoredCount), 0);
  const avgGolfScore = totalGolfScores > 0 ? Math.round((weightedGolfAverage / totalGolfScores) * 10) / 10 : 0;

  goalsPlusSummary.innerHTML = `
    <article class="summary-card">
      <p>Goals+ Goals</p>
      <strong>${cards.length}</strong>
    </article>
    <article class="summary-card">
      <p>Logged Entries</p>
      <strong>${totalEntries}</strong>
    </article>
    <article class="summary-card">
      <p>Running Distance</p>
      <strong>${runningCards.length > 0 ? `${formatAmount(totalDistance)} mi` : "n/a"}</strong>
    </article>
    <article class="summary-card">
      <p>Golf Avg Score</p>
      <strong>${totalGolfScores > 0 ? formatAmount(avgGolfScore) : "n/a"}</strong>
    </article>
  `;

  goalsPlusEmpty.style.display = "none";
  goalsPlusList.innerHTML = cards
    .map((item, index) => {
      const tracker = item.tracker;
      const config = item.config;
      const stats = item.stats;
      const running = item.running;
      const defaultsLine = running
        ? (config.runningWorkout === "norwegian4x4"
          ? `Default workout: ${formatRunningWorkout(config.runningWorkout)} (${formatAmount(config.workSpeed)} mph/${formatAmount(config.recoverySpeed)} mph)`
          : `Default workout: ${formatRunningWorkout(config.runningWorkout)}`)
        : `Default mode: ${formatGoalsPlusGolfType(config.golfType)}`;
      const workoutMix = running ? formatRunningWorkoutMix(stats.topWorkouts.slice(0, 4)) : "";
      const detailText = running
        ? (stats.count > 0
          ? `Entries ${stats.count} | Workout mix ${workoutMix} | ${
            stats.measurableCount > 0
              ? `Measured ${stats.measurableCount} | Total ${formatAmount(stats.totalDistance)} mi | Time ${formatAmount(stats.totalDurationMinutes)} min | Avg pace ${formatPaceFromMinutes(stats.avgPace)} | Best pace ${formatPaceFromMinutes(stats.bestPace)} | Avg VO2 ${formatAmount(stats.avgVo2)}`
              : "No distance/time measurements yet."
          }`
          : "No workout entries yet.")
        : (stats.count > 0
          ? `Entries ${stats.count} | ${
            stats.scoredCount > 0
              ? `Scored rounds ${stats.scoredCount} | Avg score ${formatAmount(stats.avgScore)} | Best score ${formatAmount(stats.bestScore)}`
              : "No score data yet."
          }`
          : "No golf entries yet.");
      return `
        <li class="metric-card" style="--stagger:${index}">
          <div class="metric-top">
            <h3>${escapeHtml(tracker.name)}</h3>
            <div class="metric-controls">
              <span class="pace-chip-wrap">
                <button
                  type="button"
                  class="pace-chip pace-chip-detail"
                  data-action="toggle-pace-detail"
                  data-detail="${escapeAttr(`Goals+ | ${detailText}`)}"
                  aria-expanded="false"
                >Goals+</button>
                <span class="pace-detail-popover">${escapeHtml(detailText)}</span>
              </span>
            </div>
          </div>
          <p class="metric-line">${escapeHtml(defaultsLine)}</p>
          <p class="metric-line">${escapeHtml(
            running
              ? (
                stats.count > 0
                  ? `Workout mix ${workoutMix} | ${
                    stats.measurableCount > 0
                      ? `Avg pace ${formatPaceFromMinutes(stats.avgPace)} | Avg VO2 ${formatAmount(stats.avgVo2)}`
                      : "Add distance and time to unlock pace and VO2."
                  }`
                  : "Add running entries to start exercise tracking."
              )
              : (
                stats.count > 0
                  ? (stats.scoredCount > 0
                    ? `Rounds scored ${formatAmount(stats.scoredCount)} | Avg score ${formatAmount(stats.avgScore)} | Best score ${formatAmount(stats.bestScore)}`
                    : "Add score values to start golf tracking.")
                  : "Add golf entries to start score tracking."
              )
          )}</p>
        </li>
      `;
    })
    .join("");
}

function renderSocialTab() {
  renderFriendsSettings();
  renderSquadList();
  renderTrashSection();
}

function renderSquadList() {
  if (!squadList || !squadEmpty) {
    return;
  }
  if (!currentUser) {
    squadList.innerHTML = "";
    squadEmpty.style.display = "none";
    return;
  }
  if (squads.length < 1) {
    squadList.innerHTML = "";
    squadEmpty.style.display = "block";
    return;
  }
  const activeTrackers = trackers.filter((item) => !item.archived && normalizeGoalType(item.goalType) !== "bucket");
  const currentWeekRange = getWeekRange(normalizeDate(new Date()));
  const trackerOptions = activeTrackers
    .map((tracker) => `<option value="${tracker.id}">${escapeHtml(tracker.name)}</option>`)
    .join("");
  squadEmpty.style.display = "none";
  squadList.innerHTML = squads
    .map((squad, index) => {
      const goalIds = Array.isArray(squad.goalIds) ? squad.goalIds : [];
      const squadGoalTrackers = goalIds
        .map((goalId) => trackers.find((tracker) => tracker.id === goalId))
        .filter(Boolean);
      const goalCount = squadGoalTrackers.length;
      const squadWeeklyGoal = normalizeGoalTargetInt(squad.weeklyGoal, 0);
      const squadGoalIdSet = new Set(squadGoalTrackers.map((tracker) => tracker.id));
      const weeklyProgress = entries.reduce((total, entry) => {
        if (!entry || !squadGoalIdSet.has(entry.trackerId) || !isDateKey(entry.date)) {
          return total;
        }
        const entryDate = parseDateKey(entry.date);
        if (entryDate < currentWeekRange.start || entryDate > currentWeekRange.end) {
          return total;
        }
        return addAmount(total, Number(entry.amount || 0));
      }, 0);
      const weeklyPercent = squadWeeklyGoal > 0 ? Math.min(percent(weeklyProgress, squadWeeklyGoal), 100) : 0;
      const weeklyProgressFillClass = weeklyPercent >= 100 ? "progress-hit" : "progress-on-pace";
      const weeklyGoalLabel = squadWeeklyGoal > 0
        ? `${formatAmount(weeklyProgress)}/${formatAmount(squadWeeklyGoal)}`
        : `${formatAmount(weeklyProgress)}`;
      const latestEntryByGoal = squadGoalTrackers.map((tracker) => {
        const latest = entries
          .filter((entry) => entry.trackerId === tracker.id && isDateKey(entry.date))
          .sort((a, b) => b.date.localeCompare(a.date))[0];
        if (!latest) {
          return `${tracker.name}: no entries yet`;
        }
        return `${tracker.name}: ${formatAmount(latest.amount)} ${normalizeGoalUnit(tracker.unit)} on ${formatDate(parseDateKey(latest.date))}`;
      }).slice(0, 4);
      const latestMarkup = latestEntryByGoal.length > 0
        ? `<ul class="simple-list">${latestEntryByGoal.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
        : "<p class=\"muted small\">No goals added yet.</p>";
      return `
        <li class="entry-card" style="--stagger:${index}">
          <div class="metric-top">
            <strong>${escapeHtml(squad.name)}</strong>
            <button class="btn btn-danger" type="button" data-action="delete-squad" data-id="${squad.id}">Delete</button>
          </div>
          <p class="metric-line">${escapeHtml(squad.notes || "No squad notes")} | ${goalCount} goal${goalCount === 1 ? "" : "s"} | Weekly Goal ${formatAmount(squadWeeklyGoal)}</p>
          <div class="progress progress-with-label">
            <span class="progress-fill ${weeklyProgressFillClass}" style="width:${weeklyPercent}%"></span>
            <span class="progress-label progress-label-track">Week Progress ${escapeHtml(weeklyGoalLabel)}</span>
          </div>
          <div class="actions">
            <label class="inline-control">
              Squad Weekly Goal
              <input data-squad-weekly-goal="${escapeAttr(squad.id)}" type="number" min="0" max="1000000" value="${squadWeeklyGoal}" />
            </label>
            <button class="btn" type="button" data-action="save-squad-weekly-goal" data-id="${squad.id}">Save Weekly Goal</button>
          </div>
          ${latestMarkup}
          <div class="actions">
            <label class="inline-control">
              Add Goal
              <select data-squad-goal-select="${escapeAttr(squad.id)}">
                <option value="">Choose goal</option>
                ${trackerOptions}
              </select>
            </label>
            <button class="btn" type="button" data-action="add-goal-to-squad" data-id="${squad.id}">Add</button>
          </div>
        </li>
      `;
    })
    .join("");
}

function renderTrashSection() {
  if (!trashList || !trashEmpty) {
    return;
  }
  if (!currentUser) {
    trashList.innerHTML = "";
    trashEmpty.style.display = "none";
    return;
  }
  if (deletedItems.length < 1) {
    trashList.innerHTML = "";
    trashEmpty.style.display = "block";
    return;
  }
  trashEmpty.style.display = "none";
  trashList.innerHTML = deletedItems
    .sort((a, b) => String(b.deletedAt || "").localeCompare(String(a.deletedAt || "")))
    .slice(0, 24)
    .map((item, index) => `
      <li class="quick-item" style="--stagger:${index}">
        <div>
          <strong>${escapeHtml(item.label || "Item")}</strong>
          <p class="muted small">Deleted ${escapeHtml(formatSnapshotClosedAt(item.deletedAt))}</p>
        </div>
        <button class="btn" type="button" data-action="restore-trash-item" data-id="${item.id}">Restore</button>
      </li>
    `)
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
          <input
            data-field="progressMetrics"
            type="text"
            maxlength="360"
            value="${escapeAttr(formatProgressMetricsForInput(getTrackerProgressMetrics(tracker)))}"
            placeholder="Max Reps (reps), Weight (lbs)"
          />
        </td>
        <td>
          <input data-field="weeklyGoal" type="number" min="0" max="1000000" value="${tracker.weeklyGoal}" required />
        </td>
        <td>
          <input data-field="monthlyGoal" type="number" min="0" max="1000000" value="${tracker.monthlyGoal}" required />
        </td>
        <td>
          <input data-field="yearlyGoal" type="number" min="0" max="1000000" value="${tracker.yearlyGoal}" required />
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
  if (yearUpdateAllSection) {
    yearUpdateAllSection.hidden = entryMode !== "update-all-year";
  }
  if (yearSingleGoalSection) {
    yearSingleGoalSection.hidden = entryMode !== "update-single-goal-year";
  }

  const standardTrackers = getStandardEntryTrackers();
  renderSoloEntrySection(standardTrackers);
  renderWeekEntrySection(standardTrackers);
  renderYearUpdateAllSection(standardTrackers);
  renderYearSingleGoalSection(standardTrackers);
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
      const goalsPlusSuffix = isGoalsPlusTracker(tracker) ? " | Goals+" : "";
      const suffix = trackerType === "floating"
        ? `${escapeHtml(tracker.unit || "items")} | Floating${goalsPlusSuffix}`
        : isBinaryGoalType(trackerType)
        ? `Yes/No${goalsPlusSuffix}`
        : `${escapeHtml(tracker.unit || "units")}${goalsPlusSuffix}`;
      return `<option value="${tracker.id}">${escapeHtml(tracker.name)} (${suffix})</option>`;
    })
    .join("");
  if (standardTrackers.some((tracker) => tracker.id === selected)) {
    entryTracker.value = selected;
  }

  const todayKey = getDateKey(normalizeDate(new Date()));
  const trackerById = new Map(trackers.map((tracker) => [tracker.id, tracker]));
  const allowedTrackerIds = new Set(standardTrackers.map((tracker) => tracker.id));
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
      const amountLabel = isEntryNotApplicable(entry)
        ? "N/A"
        : isBinaryGoalType(tracker && tracker.goalType)
        ? (entry.amount > 0 ? "Yes" : "No")
        : `Amount ${formatAmount(entry.amount)}`;
      const metricDetails = formatEntryMetricDetails(entry, tracker);
      const goalsPlusDetails = formatEntryGoalsPlusDetails(entry, tracker);
      const detailLines = [metricDetails, goalsPlusDetails].filter(Boolean);
      const metricMarkup = detailLines
        .map((line) => `<p class="muted small">${escapeHtml(line)}</p>`)
        .join("");
      const notes = entry.notes ? `<p class="muted small">${escapeHtml(entry.notes)}</p>` : "";
      return `
        <li class="quick-item today-entry-item" style="--stagger:${index}">
          <div>
            <strong>${escapeHtml(tracker ? tracker.name : "Unknown Goal")}</strong>
            <p class="muted small">${timeLabel} | ${amountLabel}</p>
            ${metricMarkup}
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
      const setupSuffix = isGoalsPlusTracker(tracker) ? " | Goals+" : "";
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
            <span class="muted small">${escapeHtml(normalizeGoalUnit(tracker.unit))} | ${goalTypeLabel}${setupSuffix}</span>
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
  if (
    goalJournalTitle
    && !["General Journal", "Week Planning", "Week Review"].includes(String(goalJournalTitle.value || ""))
  ) {
    goalJournalTitle.value = GOAL_JOURNAL_SUBJECT_DEFAULT;
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
    recentBucketEntriesEmpty.textContent = "Create a Bucket List goal in Settings > Goal Settings first.";
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
    recentCheckinEntriesEmpty.textContent = "Create check-ins in Settings > Check-in Settings to start logging.";
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

function clearEntryListFocusRange() {
  entryListFocusRange = null;
}

function openEntryListForRange(periodName, range) {
  if (!range || !range.start || !range.end) {
    return;
  }
  const normalizedPeriod = normalizePeriodMode(periodName);
  const start = normalizeDate(range.start);
  const end = normalizeDate(range.end);
  const startKey = getDateKey(start);
  const endKey = getDateKey(end);
  if (!isDateKey(startKey) || !isDateKey(endKey) || end < start) {
    return;
  }
  entryListFocusRange = {
    periodName: normalizedPeriod,
    startKey,
    endKey
  };
  entryListSortMode = "date_desc";
  entryListTypeFilter = "all";
  entryListStatusFilter = "all";
  entryListBucketFilter = "all";
  setActiveTabSafe("entry-list", { renderImmediate: true });
  renderEntryListTab();
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

  const hasFocusRange = Boolean(
    entryListFocusRange
    && isDateKey(entryListFocusRange.startKey)
    && isDateKey(entryListFocusRange.endKey)
  );
  if (entryListFocusWrap && entryListFocusText) {
    if (hasFocusRange) {
      const periodLabel = getSnapshotPeriodTitle(normalizePeriodMode(entryListFocusRange.periodName));
      entryListFocusText.textContent = `Focused period: ${periodLabel} | ${formatDate(parseDateKey(entryListFocusRange.startKey))} to ${formatDate(parseDateKey(entryListFocusRange.endKey))}`;
      entryListFocusWrap.hidden = false;
    } else {
      entryListFocusWrap.hidden = true;
      entryListFocusText.textContent = "";
    }
  }

  const snapshotCards = hasFocusRange ? { count: 0, markup: "" } : buildSnapshotEntryCardsMarkup(0);
  const snapshotMarkup = snapshotCards.markup;
  const snapshotCount = snapshotCards.count;

  if (entries.length < 1 || trackers.length < 1) {
    if (snapshotCount < 1) {
      entryListAll.innerHTML = "";
      entryListEmpty.style.display = "block";
      entryListEmpty.textContent = hasFocusRange ? "No entries in the selected period." : "No entries yet.";
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
    if (hasFocusRange && (entry.date < entryListFocusRange.startKey || entry.date > entryListFocusRange.endKey)) {
      return false;
    }
    return true;
  });

  if (filteredEntries.length < 1) {
    if (snapshotCount < 1) {
      entryListAll.innerHTML = "";
      entryListEmpty.style.display = "block";
      entryListEmpty.textContent = hasFocusRange ? "No entries in the selected period." : "No entries match your filters.";
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
    .map((entry, index) => {
      const tracker = trackerById.get(entry.trackerId) || null;
      const notApplicableDetails = isEntryNotApplicable(entry) ? "Entry marked N/A" : "";
      const metricDetails = formatEntryMetricDetails(entry, tracker);
      const goalsPlusDetails = formatEntryGoalsPlusDetails(entry, tracker);
      const metricMarkup = [notApplicableDetails, metricDetails, goalsPlusDetails]
        .filter(Boolean)
        .map((line) => `<p class="muted small entry-metric-line">${escapeHtml(line)}</p>`)
        .join("");
      return `
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
          ${metricMarkup}
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
    `;
    })
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
    scheduleEmpty.textContent = "Create active goals in Settings > Goal Settings before scheduling.";
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
      const isFlipped = Object.prototype.hasOwnProperty.call(flippedScheduleDays, dateKey)
        ? Boolean(flippedScheduleDays[dateKey])
        : true;
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
            return `
              <article class="schedule-event" style="--stagger:${itemIndex}">
                <div class="schedule-item-top">
                  <strong class="schedule-goal-title" title="${escapeAttr(goalName)}">${escapeHtml(goalName)}</strong>
                  <button class="schedule-delete-btn" type="button" data-action="delete-schedule" data-id="${item.id}" aria-label="Delete schedule item" title="Delete">Delete</button>
                </div>
                <p class="muted small schedule-event-time">${timeLabel}</p>
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
  const quarter = getQuarterRange(quarterViewAnchor);

  weekRangeLabel.textContent = `${formatDate(week.start)} to ${formatDate(week.end)}`;
  monthRangeLabel.textContent = `${formatDate(month.start)} to ${formatDate(month.end)}`;
  yearRangeLabel.textContent = `${year.start.getFullYear()}`;
  if (quarterRangeLabel) {
    quarterRangeLabel.textContent = `${formatDate(quarter.start)} to ${formatDate(quarter.end)}`;
  }

  periodGoalFilterState.week.type = normalizeGoalTypeFilterValue(periodGoalFilterState.week.type);
  periodGoalFilterState.week.status = normalizeGoalStatusFilterValue(periodGoalFilterState.week.status);
  periodGoalFilterState.week.tag = normalizeGoalTagFilterValue(periodGoalFilterState.week.tag);
  periodGoalFilterState.month.type = normalizeGoalTypeFilterValue(periodGoalFilterState.month.type);
  periodGoalFilterState.month.status = normalizeGoalStatusFilterValue(periodGoalFilterState.month.status);
  periodGoalFilterState.month.tag = normalizeGoalTagFilterValue(periodGoalFilterState.month.tag);
  periodGoalFilterState.year.type = normalizeGoalTypeFilterValue(periodGoalFilterState.year.type);
  periodGoalFilterState.year.status = normalizeGoalStatusFilterValue(periodGoalFilterState.year.status);
  periodGoalFilterState.year.tag = normalizeGoalTagFilterValue(periodGoalFilterState.year.tag);
  periodGoalFilterState.quarter.type = normalizeGoalTypeFilterValue(periodGoalFilterState.quarter.type);
  periodGoalFilterState.quarter.status = normalizeGoalStatusFilterValue(periodGoalFilterState.quarter.status);
  periodGoalFilterState.quarter.tag = normalizeGoalTagFilterValue(periodGoalFilterState.quarter.tag);

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
  if (quarterGoalTypeFilterSelect) {
    quarterGoalTypeFilterSelect.value = periodGoalFilterState.quarter.type;
  }
  if (quarterGoalStatusFilterSelect) {
    quarterGoalStatusFilterSelect.value = periodGoalFilterState.quarter.status;
  }
  if (quarterGoalTagFilterSelect) {
    syncPeriodTagFilterOptions("quarter", quarterGoalTagFilterSelect);
    quarterGoalTagFilterSelect.value = periodGoalFilterState.quarter.tag;
  }

  const index = buildEntryIndex(entries);
  renderPeriod("week", week, now, weekSummary, weekList, weekEmpty, (tracker) => getTrackerTargetForPeriod(tracker, "week", week), index);
  renderPeriod("month", month, now, monthSummary, monthList, monthEmpty, (tracker) => getTrackerTargetForPeriod(tracker, "month", month), index);
  renderPeriod("year", year, now, yearSummary, yearList, yearEmpty, (tracker) => getTrackerTargetForPeriod(tracker, "year", year), index);
  if (isQuartersEnabled() && quarterSummary && quarterList && quarterEmpty) {
    renderPeriod("quarter", quarter, now, quarterSummary, quarterList, quarterEmpty, (tracker) => getTrackerTargetForPeriod(tracker, "quarter", quarter), index);
  } else if (quarterSummary && quarterList && quarterEmpty) {
    quarterSummary.innerHTML = "";
    quarterList.innerHTML = "";
    quarterEmpty.style.display = "none";
  }
  renderSharedGoalsSection("week", week, weekList);
  renderSharedGoalsSection("month", month, monthList);
  renderSharedGoalsSection("year", year, yearList);
  if (isQuartersEnabled() && quarterList) {
    renderSharedGoalsSection("quarter", quarter, quarterList);
  }
  renderPeriodSnapshots("week", week, weekList, weekEmpty);
  renderPeriodSnapshots("month", month, monthList, monthEmpty);
  renderPeriodSnapshots("year", year, yearList, yearEmpty);
  if (isQuartersEnabled() && quarterList && quarterEmpty) {
    renderPeriodSnapshots("quarter", quarter, quarterList, quarterEmpty);
  }
  renderGraphModal();
  renderAuthState();
  scheduleEChartResizePasses();
}

function getProgressToneClass(goalHit, isOnPace, useFinalPaceLabel) {
  if (goalHit) {
    return "progress-hit";
  }
  if (useFinalPaceLabel) {
    return isOnPace ? "progress-hit" : "progress-missed";
  }
  return isOnPace ? "progress-on-pace" : "progress-off-pace";
}

function renderPeriod(periodName, range, now, summaryEl, listEl, emptyEl, targetFn, index) {
  disposeEChartsInScope(listEl);
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
  const elapsedDays = getElapsedDays(range, now);

  let goalsProgressTotal = 0;
  let goalsTargetTotal = 0;
  let paceProgressTotal = 0;
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
      paceProgressTotal = addAmount(paceProgressTotal, periodProgress);
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
  const avgPerDay = safeDivide(paceProgressTotal, elapsedDays);
  const projectedGoals = avgPerDay * totalDays;
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
      const updatedThroughKey = getLastLoggedDateKey(index, tracker.id, range);
      const updatedThroughLabel = updatedThroughKey
        ? `Updated through ${formatDate(parseDateKey(updatedThroughKey))}`
        : "Updated through -";
      const pct = percent(progress, target);
      const avg = safeDivide(progress, elapsedDays);
      const needed = safeDivide(target, totalDays);
      const projectedTracker = avg * totalDays;
      const isOnPace = projectedTracker >= target;
      const isPastPeriod = range.end < now;
      const hasAllEntriesLogged = hasTrackerEntriesForEveryDay(index, tracker.id, range);
      const useFinalPaceLabel = isPastPeriod && hasAllEntriesLogged;
      const progressToneClass = getProgressToneClass(goalHit, isOnPace, useFinalPaceLabel);
      const paceLabel = goalHit
        ? "Hit"
        : useFinalPaceLabel
          ? (isOnPace ? "Hit" : "Missed")
          : (isOnPace ? "On pace" : "Off pace");
      const compareEnabled = isFloating ? false : getGoalCompareEnabled(periodName, tracker.id);
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
          showCurrentPoints: true,
          showOverlayPoints: true,
          showProjectionPoints: true,
          large: false,
          periodName,
          trackerId: tracker.id,
          context: "inline",
          unit: tracker.unit,
          domainDays: getRangeDays(range),
          projection,
          goalHit
        });
      }

      const paceDetailText = `Avg ${formatAmount(avg)} | Needed ${formatAmount(needed)} | Proj ${formatAmount(projectedTracker)}`;
      const paceStatusChip = isFloating
        ? `
            <span class="pace-chip-wrap">
              <button
                type="button"
                class="pace-chip pace-chip-detail"
                data-action="toggle-pace-detail"
                data-detail="${escapeAttr(paceDetailText)}"
                aria-label="${escapeAttr(paceDetailText)}"
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
                aria-label="${escapeAttr(paceDetailText)}"
                aria-expanded="false"
              >${paceLabel}</button>
              <span class="pace-detail-popover">${escapeHtml(paceDetailText)}</span>
            </span>
        `;

      const goalsPlusRunningStats = getGoalsPlusRunningStatsForEntries(getGoalsPlusEntriesForTracker(tracker, range));
      const goalsPlusGolfStats = getGoalsPlusGolfStatsForEntries(getGoalsPlusEntriesForTracker(tracker, range));
      const goalsPlusWorkoutMix = formatRunningWorkoutMix(goalsPlusRunningStats.topWorkouts.slice(0, 3));
      const goalsPlusChipMarkup = isGoalsPlusRunningTracker(tracker)
        ? `
            <span class="pace-chip-wrap">
              <button
                type="button"
                class="pace-chip pace-chip-detail"
                data-action="toggle-pace-detail"
                data-detail="${escapeAttr(
                  goalsPlusRunningStats.count > 0
                    ? `Goals+ Running | Entries ${goalsPlusRunningStats.count} | Workouts ${goalsPlusWorkoutMix} | ${
                      goalsPlusRunningStats.measurableCount > 0
                        ? `Avg pace ${formatPaceFromMinutes(goalsPlusRunningStats.avgPace)} | Best pace ${formatPaceFromMinutes(goalsPlusRunningStats.bestPace)} | Avg VO2 ${formatAmount(goalsPlusRunningStats.avgVo2)}`
                        : "No distance/time measurements yet."
                    }`
                    : "Goals+ Running | No workout entries in this period yet."
                )}"
                aria-expanded="false"
              >Goals+</button>
              <span class="pace-detail-popover">${
                goalsPlusRunningStats.count > 0
                  ? `Entries ${escapeHtml(String(goalsPlusRunningStats.count))} | Workouts ${escapeHtml(goalsPlusWorkoutMix)} | ${
                    goalsPlusRunningStats.measurableCount > 0
                      ? `Avg pace ${escapeHtml(formatPaceFromMinutes(goalsPlusRunningStats.avgPace))} | Best pace ${escapeHtml(formatPaceFromMinutes(goalsPlusRunningStats.bestPace))} | Avg VO2 ${escapeHtml(formatAmount(goalsPlusRunningStats.avgVo2))}`
                      : "No distance/time measurements yet."
                  }`
                  : "No workout entries in this period yet."
              }</span>
            </span>
          `
        : isGoalsPlusGolfTracker(tracker)
        ? `
            <span class="pace-chip-wrap">
              <button
                type="button"
                class="pace-chip pace-chip-detail"
                data-action="toggle-pace-detail"
                data-detail="${escapeAttr(
                  goalsPlusGolfStats.count > 0
                    ? `Goals+ ${formatGoalsPlusGolfType(getGoalsPlusRunningConfig(tracker).golfType)} | Entries ${goalsPlusGolfStats.count} | ${
                      goalsPlusGolfStats.scoredCount > 0
                        ? `Avg score ${formatAmount(goalsPlusGolfStats.avgScore)} | Best score ${formatAmount(goalsPlusGolfStats.bestScore)}`
                        : "No score data yet."
                    }`
                    : "Goals+ Golf | No entries in this period yet."
                )}"
                aria-expanded="false"
              >Goals+</button>
              <span class="pace-detail-popover">${
                goalsPlusGolfStats.count > 0
                  ? (goalsPlusGolfStats.scoredCount > 0
                    ? `Entries ${escapeHtml(String(goalsPlusGolfStats.count))} | Avg score ${escapeHtml(formatAmount(goalsPlusGolfStats.avgScore))} | Best score ${escapeHtml(formatAmount(goalsPlusGolfStats.bestScore))}`
                    : `Entries ${escapeHtml(String(goalsPlusGolfStats.count))} | No score data yet.`)
                  : "No golf entries in this period yet."
              }</span>
            </span>
          `
        : "";

      const progressLabel = `${formatProgressAgainstGoal(progress, target, tracker.unit)} (${pct}%)`;
      const projectedPct = percent(projectedTracker, target);
      const projectedLabel = `Projected ${formatAmountWithUnit(projectedTracker, tracker.unit)} (${projectedPct}%)`;
      const progressBarMarkup = isPeriodProgressEChartEnabled(periodName)
        ? createPeriodProgressBarEChartMarkup({
          progressValue: progress,
          targetValue: target,
          projectedValue: projectedTracker,
          currentPercent: pct,
          projectedPercent: projectedPct,
          toneClass: progressToneClass,
          progressLabel,
          projectedLabel
        })
        : `
          <div class="progress progress-with-label">
            <span class="progress-fill ${progressToneClass}" style="width:${Math.min(pct, 100)}%"></span>
            <span class="progress-label progress-label-track">${escapeHtml(progressLabel)}</span>
            <span class="progress-label progress-label-fill" style="width:${Math.min(pct, 100)}%">${escapeHtml(progressLabel)}</span>
          </div>
        `;

      return `
        <li class="metric-card" style="--stagger:${indexPosition}">
          <div class="metric-top">
            <h3>${escapeHtml(tracker.name)}</h3>
            <div class="metric-head-meta">
              <p class="metric-updated-through">${escapeHtml(updatedThroughLabel)}</p>
              ${goalsPlusChipMarkup ? `<div class="metric-controls">${goalsPlusChipMarkup}</div>` : ""}
            </div>
          </div>
          ${progressBarMarkup}
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
          <div class="graph-wrap ${graphVisible ? "graph-wrap-expanded" : "hidden"}">
            ${graphMarkup}
            <div class="graph-inline-controls graph-inline-controls-bottom">
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
  initializeEChartsInScope(listEl);
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
  const now = normalizeDate(new Date());
  const totalDays = getRangeDays(range);
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
      const target = getTrackerTargetForPeriod(tracker, periodName, range);
      const progress = sumTrackerRange(index, tracker.id, range);
      const pct = percent(progress, target);
      const goalHit = target > 0 && progress >= target;
      const elapsedDays = getElapsedDays(range, now);
      const avgPerDay = safeDivide(progress, elapsedDays);
      const projected = avgPerDay * totalDays;
      const isOnPace = projected >= target;
      const isPastPeriod = range.end < now;
      const hasAllEntriesLogged = hasTrackerEntriesForEveryDay(index, tracker.id, range);
      const useFinalPaceLabel = isPastPeriod && hasAllEntriesLogged;
      const progressToneClass = getProgressToneClass(goalHit, isOnPace, useFinalPaceLabel);
      const ownerLabel = share.ownerUsername || "Friend";
      const progressLabel = `${formatProgressAgainstGoal(progress, target, tracker.unit)} (${pct}%)`;
      const projectedPct = percent(projected, target);
      const projectedLabel = `Projected ${formatAmountWithUnit(projected, tracker.unit)} (${projectedPct}%)`;
      const progressBarMarkup = isPeriodProgressEChartEnabled(periodName)
        ? createPeriodProgressBarEChartMarkup({
          progressValue: progress,
          targetValue: target,
          projectedValue: projected,
          currentPercent: pct,
          projectedPercent: projectedPct,
          toneClass: progressToneClass,
          progressLabel,
          projectedLabel
        })
        : `
          <div class="progress progress-with-label">
            <span class="progress-fill ${progressToneClass}" style="width:${Math.min(pct, 100)}%"></span>
            <span class="progress-label progress-label-track">${escapeHtml(progressLabel)}</span>
            <span class="progress-label progress-label-fill" style="width:${Math.min(pct, 100)}%">${escapeHtml(progressLabel)}</span>
          </div>
        `;

      return `
        <li class="metric-card" style="--stagger:${indexPosition}">
          <div class="metric-top">
            <h3>${escapeHtml(tracker.name)}</h3>
            <span class="pace-chip">${escapeHtml(ownerLabel)}</span>
          </div>
          ${progressBarMarkup}
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

function getPeriodSnapshotRefKey(periodName, rangeStartKey, rangeEndKey) {
  return `${normalizePeriodMode(periodName)}|${String(rangeStartKey || "")}|${String(rangeEndKey || "")}`;
}

function closeOutPeriodRange(periodName, range, options = {}) {
  if (!currentUser || !range || !range.start || !range.end) {
    return { success: false, message: "Unable to close this period right now." };
  }
  const normalizedPeriod = normalizePeriodMode(periodName);
  const normalizedRange = {
    start: normalizeDate(range.start),
    end: normalizeDate(range.end)
  };
  if (normalizedRange.end < normalizedRange.start) {
    return { success: false, message: "Unable to close this period right now." };
  }

  const now = normalizeDate(new Date());
  const index = buildEntryIndex(entries);
  const snapshot = buildPeriodCloseoutSnapshot(normalizedPeriod, normalizedRange, now, index);
  if (!snapshot) {
    return { success: false, message: `No goals or check-ins to snapshot for this ${normalizedPeriod}.` };
  }

  const existingIndex = periodSnapshots.findIndex((item) => (
    item
    && item.period === snapshot.period
    && item.rangeStart === snapshot.rangeStart
    && item.rangeEnd === snapshot.rangeEnd
  ));
  const allowIfAlreadyClosed = options.allowIfAlreadyClosed === true;
  if (existingIndex >= 0) {
    if (allowIfAlreadyClosed) {
      return { success: true, snapshot: periodSnapshots[existingIndex], alreadyClosed: true };
    }
    const shouldConfirmReplace = options.confirmReplace !== false;
    if (shouldConfirmReplace) {
      const shouldReplace = confirm(
        `A ${normalizedPeriod} snapshot for ${formatDate(normalizedRange.start)} to ${formatDate(normalizedRange.end)} already exists. Replace it?`
      );
      if (!shouldReplace) {
        return { success: false, cancelled: true, message: "" };
      }
    }
    periodSnapshots.splice(existingIndex, 1);
  }

  periodSnapshots.unshift(snapshot);
  periodSnapshots.sort((a, b) => String(b.closedAt || "").localeCompare(String(a.closedAt || "")));
  savePeriodSnapshots();
  periodClosePromptNotificationKeys.delete(getPeriodSnapshotRefKey(snapshot.period, snapshot.rangeStart, snapshot.rangeEnd));
  saveNotificationKeySet(PERIOD_CLOSE_PROMPT_NOTIFICATION_KEYS_STORAGE_KEY, periodClosePromptNotificationKeys);
  if (isRewardPointsEnabled()) {
    upsertCloseoutPointAward(snapshot);
    savePointTransactions();
  }
  if (options.render !== false) {
    renderPeriodTabs();
  }
  return { success: true, snapshot, replaced: existingIndex >= 0 };
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
  const result = closeOutPeriodRange(normalizedPeriod, range, {
    confirmReplace: true,
    render: true
  });
  if (!result.success && !result.cancelled && result.message) {
    alert(result.message);
  }
}

function buildPeriodCloseoutSnapshot(periodName, range, now, index) {
  const trackersForPeriod = getTrackersForPeriod(periodName);
  const dueCheckIns = getCheckInsForPeriod(periodName);
  if (trackersForPeriod.length < 1 && dueCheckIns.length < 1) {
    return null;
  }

  const totalDays = getRangeDays(range);
  const elapsedDays = getElapsedDays(range, now);
  let goalsProgressTotal = 0;
  let goalsTargetTotal = 0;
  let paceProgressTotal = 0;
  let paceTargetTotal = 0;
  let completedGoalsCount = 0;
  let goalPointsEarned = 0;
  const rewardPointsEnabled = isRewardPointsEnabled();

  const goalSnapshots = trackersForPeriod.map((tracker) => {
    const target = getTrackerTargetForPeriod(tracker, periodName, range);
    const progress = sumTrackerRange(index, tracker.id, range);
    const isFloating = isFloatingGoalType(tracker.goalType);
    const avgPerDay = safeDivide(progress, elapsedDays);
    const neededPerDay = safeDivide(target, totalDays);
    const projected = avgPerDay * totalDays;
    const onPaceLabel = isFloating ? "N/A" : projected >= target ? "On pace" : "Off pace";

    goalsProgressTotal = addAmount(goalsProgressTotal, progress);
    goalsTargetTotal = addAmount(goalsTargetTotal, target);
    if (target > 0 && progress >= target) {
      completedGoalsCount += 1;
      if (rewardPointsEnabled) {
        goalPointsEarned = addAmount(goalPointsEarned, getTrackerGoalPointsForPeriod(tracker, periodName));
      }
    }
    if (!isFloating) {
      paceProgressTotal = addAmount(paceProgressTotal, progress);
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
  const completion = percent(totalProgress, totalTarget);
  const avgPerDay = safeDivide(paceProgressTotal, elapsedDays);
  const projectedGoals = avgPerDay * totalDays;
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
  if (periodName === "quarter") {
    return getQuarterRange(quarterViewAnchor);
  }
  if (periodName === "year") {
    return getYearRange(yearViewAnchor);
  }
  return getWeekRange(weekViewAnchor);
}

function getWeekTemplateIndexForDate(date) {
  const normalizedDate = normalizeDate(date || new Date());
  const yearStart = new Date(normalizedDate.getFullYear(), 0, 1);
  const yearWeekStart = getWeekRange(yearStart).start;
  const targetWeekStart = getWeekRange(normalizedDate).start;
  const diffDays = Math.round((normalizeDate(targetWeekStart) - normalizeDate(yearWeekStart)) / DAY_MS);
  const weekIndex = Math.floor(diffDays / 7);
  return Math.max(Math.min(weekIndex, GOAL_TEMPLATE_WEEK_COUNT - 1), 0);
}

function getTrackerCustomWeekTargetForRange(tracker, range) {
  const weeklyTargets = normalizeCustomTargetList(
    tracker && tracker.customWeeklyTargets,
    GOAL_TEMPLATE_WEEK_COUNT,
    normalizeGoalTargetInt(tracker && tracker.weeklyGoal, 0)
  );
  const rangeDate = range && range.start ? range.start : new Date();
  return weeklyTargets[getWeekTemplateIndexForDate(rangeDate)] || 0;
}

function getTrackerCustomMonthTargetForRange(tracker, range) {
  const monthlyTargets = normalizeCustomTargetList(
    tracker && tracker.customMonthlyTargets,
    GOAL_TEMPLATE_MONTH_COUNT,
    normalizeGoalTargetInt(tracker && tracker.monthlyGoal, 0)
  );
  const rangeDate = range && range.start ? range.start : new Date();
  const monthIndex = Math.max(Math.min(new Date(rangeDate).getMonth(), GOAL_TEMPLATE_MONTH_COUNT - 1), 0);
  return monthlyTargets[monthIndex] || 0;
}

function getTrackerTargetForPeriod(tracker, periodName, range = null) {
  const weeklyGoal = normalizeGoalTargetInt(tracker && tracker.weeklyGoal, 0);
  const monthlyGoal = normalizeGoalTargetInt(tracker && tracker.monthlyGoal, 0);
  const yearlyGoal = normalizeGoalTargetInt(tracker && tracker.yearlyGoal, 0);
  const customWeeklyEnabled = Boolean(tracker && tracker.customWeeklyEnabled);
  const customMonthlyEnabled = Boolean(tracker && tracker.customMonthlyEnabled);
  if (periodName === "month") {
    if (customMonthlyEnabled) {
      return getTrackerCustomMonthTargetForRange(tracker, range);
    }
    return monthlyGoal;
  }
  if (periodName === "quarter") {
    const quarterRange = range || getQuarterRange(new Date());
    if (customMonthlyEnabled) {
      const monthlyTargets = normalizeCustomTargetList(tracker && tracker.customMonthlyTargets, GOAL_TEMPLATE_MONTH_COUNT, monthlyGoal);
      const startMonth = quarterRange.start.getMonth();
      const endMonth = quarterRange.end.getMonth();
      let total = 0;
      for (let month = startMonth; month <= endMonth; month += 1) {
        total = addAmount(total, monthlyTargets[month] || 0);
      }
      return total;
    }
    if (monthlyGoal > 0) {
      return monthlyGoal * 3;
    }
    if (yearlyGoal > 0) {
      return Math.ceil(yearlyGoal / 4);
    }
    return 0;
  }
  if (periodName === "year") {
    if (customMonthlyEnabled) {
      const monthlyTargets = normalizeCustomTargetList(tracker && tracker.customMonthlyTargets, GOAL_TEMPLATE_MONTH_COUNT, monthlyGoal);
      return monthlyTargets.reduce((total, value) => addAmount(total, value), 0);
    }
    if (customWeeklyEnabled) {
      const weeklyTargets = normalizeCustomTargetList(tracker && tracker.customWeeklyTargets, GOAL_TEMPLATE_WEEK_COUNT, weeklyGoal);
      return weeklyTargets.reduce((total, value) => addAmount(total, value), 0);
    }
    return yearlyGoal;
  }
  if (customWeeklyEnabled) {
    return getTrackerCustomWeekTargetForRange(tracker, range);
  }
  return weeklyGoal;
}

function getTrackerGoalPointsForPeriod(tracker, periodName) {
  const normalizedPeriod = periodName === "month"
    ? "month"
    : periodName === "quarter"
    ? "quarter"
    : periodName === "year"
    ? "year"
    : "week";
  const fallbackByPeriod = normalizedPeriod === "month"
    ? 3
    : normalizedPeriod === "quarter"
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
  if (normalizedPeriod === "quarter") {
    return normalizeGoalPoints(tracker && tracker.goalPointsMonthly, legacyPoints);
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
        <p class="muted small">Pace: ${escapeHtml(normalizeSnapshotOnPaceLabel(summary.onPaceLabel))}</p>
        <p class="metric-line">Completion ${escapeHtml(String(Math.max(Math.round(Number(summary.completion) || 0), 0)))}% | Progress ${escapeHtml(formatAmount(summary.totalProgress || 0))}/${escapeHtml(formatAmount(summary.totalTarget || 0))}</p>
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
  if (periodName === "quarter") {
    return "Quarter";
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
  } else if (snapshot.period === "quarter") {
    quarterViewAnchor = getQuarterRange(rangeStartDate).start;
    activeTab = "quarter";
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
    periodClosePromptNotificationKeys.delete(getPeriodSnapshotRefKey(removed.period, removed.rangeStart, removed.rangeEnd));
    saveNotificationKeySet(PERIOD_CLOSE_PROMPT_NOTIFICATION_KEYS_STORAGE_KEY, periodClosePromptNotificationKeys);
    removeCloseoutPointAward(removed);
  }
}

function removeCloseoutPointAward(snapshot) {
  if (!snapshot || !snapshot.period || !snapshot.rangeStart || !snapshot.rangeEnd) {
    return;
  }
  const refKey = getPeriodSnapshotRefKey(snapshot.period, snapshot.rangeStart, snapshot.rangeEnd);
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
  const refKey = getPeriodSnapshotRefKey(snapshot.period, snapshot.rangeStart, snapshot.rangeEnd);
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

function hasEChartsLibrary() {
  return Boolean(window.echarts && typeof window.echarts.init === "function");
}

function registerEChartConfig(config) {
  nextEChartConfigId += 1;
  const id = `echart-config-${nextEChartConfigId}`;
  pendingEChartConfigs.set(id, config);
  return id;
}

function cleanupDisconnectedECharts() {
  activeEChartInstances.forEach((entry, key) => {
    if (!entry || !entry.element || !document.body.contains(entry.element)) {
      if (entry && entry.instance) {
        if (typeof entry.instance.isDisposed !== "function" || !entry.instance.isDisposed()) {
          entry.instance.dispose();
        }
      }
      activeEChartInstances.delete(key);
    }
  });
}

function disposeEChartsInScope(scope) {
  if (!scope || !hasEChartsLibrary()) {
    return;
  }
  scope.querySelectorAll(".js-echart").forEach((chartElement) => {
    const instance = window.echarts.getInstanceByDom(chartElement);
    if (instance) {
      instance.dispose();
    }
    activeEChartInstances.forEach((entry, key) => {
      if (entry && entry.element === chartElement) {
        activeEChartInstances.delete(key);
      }
    });
  });
}

function initializeEChartsInScope(scope) {
  if (!scope || !hasEChartsLibrary()) {
    return;
  }
  cleanupDisconnectedECharts();
  scope.querySelectorAll(".js-echart[data-echart-config-id]").forEach((chartElement) => {
    const configId = chartElement.dataset.echartConfigId || "";
    const chartConfig = pendingEChartConfigs.get(configId);
    if (!chartConfig || !chartConfig.option) {
      return;
    }
    const existing = window.echarts.getInstanceByDom(chartElement);
    if (existing) {
      existing.dispose();
    }
    const instance = window.echarts.init(chartElement, null, { renderer: "svg" });
    instance.setOption(chartConfig.option, true);
    activeEChartInstances.set(configId, { element: chartElement, instance });
    pendingEChartConfigs.delete(configId);
  });
}

function scheduleEChartResizePasses() {
  if (!hasEChartsLibrary()) {
    return;
  }
  window.requestAnimationFrame(() => {
    resizeAllECharts();
    window.requestAnimationFrame(() => {
      resizeAllECharts();
    });
  });
  setTimeout(() => {
    resizeAllECharts();
  }, 140);
}

function resizeAllECharts() {
  cleanupDisconnectedECharts();
  activeEChartInstances.forEach((entry) => {
    if (
      !entry
      || !entry.instance
      || (typeof entry.instance.isDisposed === "function" && entry.instance.isDisposed())
    ) {
      return;
    }
    entry.instance.resize();
  });
}

function downloadChartFromEChart(chartElement, format, filenameBase) {
  if (!chartElement || !hasEChartsLibrary()) {
    return false;
  }
  const chartInstance = window.echarts.getInstanceByDom(chartElement);
  if (!chartInstance) {
    return false;
  }
  const normalizedFormat = String(format || "").toLowerCase();
  if (normalizedFormat === "svg" && typeof chartInstance.renderToSVGString === "function") {
    const svgMarkup = chartInstance.renderToSVGString();
    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    triggerBlobDownload(blob, `${filenameBase}.svg`);
    return true;
  }

  const pngUrl = chartInstance.getDataURL({
    type: "png",
    pixelRatio: 2,
    backgroundColor: "#ffffff"
  });
  if (!pngUrl) {
    return false;
  }

  if (normalizedFormat === "webp") {
    convertDataUrlToWebpAndDownload(pngUrl, filenameBase);
    return true;
  }

  if (normalizedFormat === "svg") {
    triggerDataUrlDownload(pngUrl, `${filenameBase}.png`);
    return true;
  }

  triggerDataUrlDownload(pngUrl, `${filenameBase}.png`);
  return true;
}

function triggerDataUrlDownload(dataUrl, filename) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function convertDataUrlToWebpAndDownload(dataUrl, filenameBase) {
  const image = new Image();
  image.onload = () => {
    const width = Math.max(image.width || 1, 1);
    const height = Math.max(image.height || 1, 1);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      triggerDataUrlDownload(dataUrl, `${filenameBase}.png`);
      return;
    }
    context.drawImage(image, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        triggerDataUrlDownload(dataUrl, `${filenameBase}.png`);
        return;
      }
      triggerBlobDownload(blob, `${filenameBase}.webp`);
    }, "image/webp", 0.95);
  };
  image.onerror = () => {
    triggerDataUrlDownload(dataUrl, `${filenameBase}.png`);
  };
  image.src = dataUrl;
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
  const trackerId = String(options.trackerId || "");
  const context = String(options.context || "inline");
  const unit = normalizeGoalUnit(options.unit);
  const domainDays = Math.max(Number(options.domainDays) || 0, series.length || 1, 1);
  const projection = options.projection && Array.isArray(options.projection.points) ? options.projection : null;
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

  const chartConfigId = registerEChartConfig({
    option: buildCumulativeGraphEChartOption({
      series,
      target,
      range,
      overlaySeries,
      periodName,
      unit,
      domainDays,
      projectionPoints,
      showCurrentPoints,
      showOverlayPoints,
      showProjectionPoints,
      goalHit
    })
  });

  const overlayLegend = overlaySeries
    ? `<span class="legend-item"><span class="legend-swatch legend-overlay"></span>Previous Period</span>`
    : "";
  const projectionLegend = projectionPoints.length > 1
    ? `<span class="legend-item"><span class="legend-swatch legend-projection${goalHit ? " legend-projection-hit" : ""}"></span>Projection</span>`
    : "";
  const rangeLabel = `${formatDate(range.start)} to ${formatDate(range.end)}`;
  const chartSizeClass = large ? "graph-echart graph-echart-large" : "graph-echart";

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
      <div
        class="${chartSizeClass} js-echart"
        data-echart-config-id="${chartConfigId}"
        data-chart-type="cumulative"
        data-chart-period="${escapeAttr(periodName)}"
        data-chart-id="${escapeAttr(trackerId)}"
        data-chart-context="${escapeAttr(context)}"
        role="img"
        aria-label="Cumulative progress line chart"
      ></div>
    </div>
  `;
}

function buildCumulativeGraphEChartOption(config) {
  const series = Array.isArray(config.series) ? config.series : [];
  const overlaySeries = Array.isArray(config.overlaySeries) ? config.overlaySeries : null;
  const projectionPoints = Array.isArray(config.projectionPoints) ? config.projectionPoints : [];
  const target = Number(config.target) || 0;
  const range = config.range;
  const periodName = normalizePeriodMode(config.periodName);
  const unit = normalizeGoalUnit(config.unit);
  const domainDays = Math.max(Number(config.domainDays) || 1, 1);
  const goalHit = Boolean(config.goalHit);
  const showCurrentPoints = Boolean(config.showCurrentPoints);
  const showOverlayPoints = Boolean(config.showOverlayPoints);
  const showProjectionPoints = Boolean(config.showProjectionPoints);
  const weekTicks = periodName === "week" && domainDays <= 8;

  const dateKeys = Array.from({ length: domainDays }, (_, dayIndex) => getDateKey(addDays(range.start, dayIndex)));
  const currentCumulative = [];
  let currentRunning = 0;
  for (let dayIndex = 0; dayIndex < domainDays; dayIndex += 1) {
    const point = series[dayIndex];
    if (point) {
      currentRunning = addAmount(currentRunning, point.amount);
    }
    currentCumulative.push(currentRunning);
  }

  const previousCumulative = overlaySeries ? [] : null;
  if (overlaySeries && previousCumulative) {
    let previousRunning = 0;
    for (let dayIndex = 0; dayIndex < domainDays; dayIndex += 1) {
      const point = overlaySeries[dayIndex];
      if (point) {
        previousRunning = addAmount(previousRunning, point.amount);
      }
      previousCumulative.push(previousRunning);
    }
  }

  const projectionValues = new Array(domainDays).fill(null);
  projectionPoints.forEach((point) => {
    if (point.dayIndex >= 0 && point.dayIndex < domainDays) {
      projectionValues[point.dayIndex] = Number(point.cumulative) || 0;
    }
  });
  const projectionStartIndex = projectionPoints.length > 0
    ? Math.max(Math.min(Number(projectionPoints[0].dayIndex) || 0, domainDays - 1), 0)
    : -1;
  const currentDisplayValues = projectionStartIndex >= 0
    ? currentCumulative.map((value, index) => (index <= projectionStartIndex ? value : null))
    : currentCumulative;

  const projectionMax = projectionPoints.reduce((max, point) => Math.max(max, Number(point.cumulative) || 0), 0);
  const maxDataValue = Math.max(
    target,
    currentCumulative[currentCumulative.length - 1] || 0,
    previousCumulative ? (previousCumulative[previousCumulative.length - 1] || 0) : 0,
    projectionMax,
    1
  );
  const yAxisMaxRaw = addAmount(maxDataValue, Math.max(maxDataValue * 0.08, 0.5));
  const yAxisMax = Math.max(Math.ceil(yAxisMaxRaw / 5) * 5, 5);

  const formatAxisLabel = function (dateKey) {
    const parsed = parseDateKey(dateKey);
    if (weekTicks) {
      return `${formatWeekday(parsed)}\n${parsed.getMonth() + 1}/${parsed.getDate()}`;
    }
    return formatMonthDay(parsed);
  };

  const chartSeries = [
    {
      name: "Current Cumulative",
      type: "line",
      smooth: false,
      symbol: "circle",
      symbolSize: 6,
      showSymbol: showCurrentPoints,
      lineStyle: {
        width: 3,
        color: goalHit ? "#1f9b6c" : "#009f94"
      },
      itemStyle: {
        color: goalHit ? "#1f9b6c" : "#009f94",
        borderColor: "#ffffff",
        borderWidth: 1.2
      },
      data: currentDisplayValues
    },
    {
      name: "Target",
      type: "line",
      symbol: "none",
      lineStyle: {
        width: 1.8,
        color: "#111111"
      },
      data: dateKeys.map(() => target)
    }
  ];

  if (previousCumulative) {
    chartSeries.push({
      name: "Previous Period",
      type: "line",
      smooth: false,
      symbol: "circle",
      symbolSize: 5,
      showSymbol: showOverlayPoints,
      lineStyle: {
        width: 2.2,
        color: "#7ea7a3",
        type: "dashed"
      },
      itemStyle: {
        color: "#7ea7a3",
        borderColor: "#ffffff",
        borderWidth: 1
      },
      data: previousCumulative
    });
  }

  if (projectionPoints.length > 1) {
    chartSeries.push({
      name: "Projection",
      type: "line",
      smooth: false,
      symbol: "circle",
      symbolSize: 5,
      showSymbol: showProjectionPoints,
      connectNulls: false,
      lineStyle: {
        width: 2,
        type: "dashed",
        color: goalHit ? "#1f9b6c" : "#009f94"
      },
      itemStyle: {
        color: goalHit ? "#1f9b6c" : "#009f94",
        borderColor: "#ffffff",
        borderWidth: 1
      },
      data: projectionValues
    });
  }

  return {
    animationDuration: 280,
    backgroundColor: "#ddf9f5",
    color: ["#009f94"],
    grid: {
      left: 56,
      right: 20,
      top: 16,
      bottom: weekTicks ? 58 : 40,
      show: true,
      backgroundColor: "#ddf9f5"
    },
    tooltip: {
      trigger: "item",
      formatter: function (item) {
        if (!item) {
          return "";
        }
        const dateKey = String(item.name || item.axisValue || "");
        const label = isDateKey(dateKey) ? formatDate(parseDateKey(dateKey)) : dateKey;
        return `${label}<br>${item.seriesName}: ${formatAmount(item.value)} ${unit}`;
      }
    },
    xAxis: {
      type: "category",
      data: dateKeys,
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#9ed9d2" } },
      axisLabel: {
        color: "#3b6a64",
        fontWeight: 600,
        formatter: formatAxisLabel
      }
    },
    yAxis: {
      type: "value",
      min: 0,
      max: yAxisMax,
      splitNumber: 4,
      splitLine: { lineStyle: { color: "#d5ece8" } },
      axisLine: { show: false },
      axisLabel: {
        color: "#3b6a64",
        fontWeight: 600,
        formatter: function (value) {
          return formatAmount(value);
        }
      }
    },
    series: chartSeries
  };
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
      checkins: false,
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
  return (periodName === "week" || periodName === "month" || periodName === "quarter" || periodName === "year")
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
  if (periodName === "quarter") {
    const start = addMonths(range.start, -3);
    const prior = getQuarterRange(start);
    return { start: prior.start, end: prior.end };
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

function getQuarterRange(date) {
  const normalizedDate = normalizeDate(date || new Date());
  const quarterStartMonth = Math.floor(normalizedDate.getMonth() / 3) * 3;
  const start = new Date(normalizedDate.getFullYear(), quarterStartMonth, 1);
  const end = new Date(normalizedDate.getFullYear(), quarterStartMonth + 3, 0);
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
  if (type === "goal-hit") {
    const goalName = String(item.goalName || "Goal");
    const progress = formatAmount(normalizePositiveAmount(item.progress, 0));
    const target = formatAmount(normalizePositiveAmount(item.target, 0));
    const unit = normalizeGoalUnit(item.goalUnit || "units");
    const periodLabel = item.period === "quarter"
      ? "quarterly"
      : item.period === "month"
      ? "monthly"
      : item.period === "year"
      ? "yearly"
      : "weekly";
    return `Goal hit: "${goalName}" ${periodLabel} target (${progress}/${target} ${unit}).`;
  }
  if (type === "goal-milestone") {
    const goalName = String(item.goalName || "Goal");
    const milestonePercent = Math.max(Math.min(Math.floor(Number(item.milestonePercent) || 0), 100), 0);
    const periodLabel = item.period === "quarter"
      ? "quarterly"
      : item.period === "month"
      ? "monthly"
      : item.period === "year"
      ? "yearly"
      : "weekly";
    return `Milestone: "${goalName}" reached ${milestonePercent}% of ${periodLabel} target.`;
  }
  if (type === "period-close-ready") {
    const periodLabel = getSnapshotPeriodTitle(normalizePeriodMode(item.period));
    if (isDateKey(item.rangeStart) && isDateKey(item.rangeEnd)) {
      return `All entries saved for ${periodLabel} ${formatDate(parseDateKey(item.rangeStart))} to ${formatDate(parseDateKey(item.rangeEnd))}. Close this period?`;
    }
    return `All entries saved for ${periodLabel}. Close this period?`;
  }
  if (type === "smart-reminder") {
    const goalName = String(item.goalName || "Goal");
    const reminderDays = Math.max(Math.floor(Number(item.reminderDays) || 0), 0);
    const dayLabel = reminderDays === 1 ? "day" : "days";
    return `Reminder: "${goalName}" has no recent entry for ${reminderDays} ${dayLabel}.`;
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

function normalizeGoalHitNotificationKeys(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0)
    .slice(-600);
}

function loadGoalHitNotificationKeys() {
  if (!currentUser) {
    return new Set();
  }
  try {
    const raw = localStorage.getItem(getScopedStorageKey(GOAL_HIT_NOTIFICATION_KEYS_STORAGE_KEY));
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    return new Set(normalizeGoalHitNotificationKeys(parsed));
  } catch {
    return new Set();
  }
}

function saveGoalHitNotificationKeys() {
  if (!currentUser) {
    return;
  }
  const values = normalizeGoalHitNotificationKeys(Array.from(goalHitNotificationKeys));
  localStorage.setItem(getScopedStorageKey(GOAL_HIT_NOTIFICATION_KEYS_STORAGE_KEY), JSON.stringify(values));
}

function loadNotificationKeySet(storageKey) {
  if (!currentUser) {
    return new Set();
  }
  try {
    const raw = localStorage.getItem(getScopedStorageKey(storageKey));
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(
      parsed
        .map((item) => String(item || "").trim())
        .filter((item) => item.length > 0)
        .slice(-900)
    );
  } catch {
    return new Set();
  }
}

function saveNotificationKeySet(storageKey, keySet) {
  if (!currentUser) {
    return;
  }
  const values = Array.from(keySet || [])
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0)
    .slice(-900);
  localStorage.setItem(getScopedStorageKey(storageKey), JSON.stringify(values));
}

function isOnboardingDismissed() {
  if (!currentUser) {
    return true;
  }
  return localStorage.getItem(getScopedStorageKey(ONBOARDING_DISMISSED_STORAGE_KEY)) === "1";
}

function setOnboardingDismissed(value) {
  if (!currentUser) {
    return;
  }
  if (value) {
    localStorage.setItem(getScopedStorageKey(ONBOARDING_DISMISSED_STORAGE_KEY), "1");
    return;
  }
  localStorage.removeItem(getScopedStorageKey(ONBOARDING_DISMISSED_STORAGE_KEY));
}

function getGoalHitNotificationCandidates(now = new Date()) {
  if (!currentUser) {
    return [];
  }
  const normalizedNow = normalizeDate(now);
  const index = buildEntryIndex(entries);
  const periods = [
    { key: "week", range: getWeekRange(normalizedNow) },
    { key: "month", range: getMonthRange(normalizedNow) },
    { key: "year", range: getYearRange(normalizedNow) }
  ];
  if (isQuartersEnabled()) {
    periods.push({ key: "quarter", range: getQuarterRange(normalizedNow) });
  }
  const items = [];
  trackers.forEach((tracker) => {
    if (!tracker || tracker.archived) {
      return;
    }
    if (normalizeGoalType(tracker.goalType) === "bucket") {
      return;
    }
    periods.forEach((period) => {
      const target = normalizeGoalTargetInt(getTrackerTargetForPeriod(tracker, period.key, period.range), 0);
      if (target < 1) {
        return;
      }
      const progress = sumTrackerRange(index, tracker.id, period.range);
      if (progress < target) {
        return;
      }
      const rangeStart = getDateKey(period.range.start);
      const rangeEnd = getDateKey(period.range.end);
      const hitKey = `${tracker.id}|${period.key}|${rangeStart}|${rangeEnd}`;
      items.push({
        hitKey,
        period: period.key,
        rangeStart,
        rangeEnd,
        goalName: tracker.name,
        goalUnit: tracker.unit,
        progress,
        target
      });
    });
  });
  return items;
}

function primeGoalHitNotificationKeys() {
  if (!currentUser || goalHitNotificationKeys.size > 0 || entries.length < 1) {
    return;
  }
  const candidates = getGoalHitNotificationCandidates(new Date());
  if (candidates.length < 1) {
    return;
  }
  candidates.forEach((item) => {
    goalHitNotificationKeys.add(item.hitKey);
  });
  saveGoalHitNotificationKeys();
}

async function sendGoalHitNotifications() {
  if (!firebaseConfigured || !firebaseDb || !currentUser) {
    return;
  }
  if (goalHitNotificationCheckInFlight) {
    return;
  }
  goalHitNotificationCheckInFlight = true;
  try {
    const candidates = getGoalHitNotificationCandidates(new Date());
    let changed = false;
    for (const item of candidates) {
      if (goalHitNotificationKeys.has(item.hitKey)) {
        continue;
      }
      const createdId = await createNotificationDoc({
        type: "goal-hit",
        recipientId: currentUser.id,
        actorId: currentUser.id,
        actorUsername: getUserDisplayName(currentUser),
        actorEmail: normalizeEmail(currentUser.email),
        goalName: item.goalName,
        goalUnit: item.goalUnit,
        period: item.period,
        rangeStart: item.rangeStart,
        rangeEnd: item.rangeEnd,
        progress: item.progress,
        target: item.target,
        hitKey: item.hitKey,
        read: false
      });
      if (!createdId) {
        continue;
      }
      goalHitNotificationKeys.add(item.hitKey);
      changed = true;
    }
    if (changed) {
      saveGoalHitNotificationKeys();
    }
  } finally {
    goalHitNotificationCheckInFlight = false;
  }
}

function queueGoalHitNotificationCheck() {
  if (!currentUser) {
    return;
  }
  if (goalHitNotificationCheckTimer) {
    clearTimeout(goalHitNotificationCheckTimer);
  }
  goalHitNotificationCheckTimer = setTimeout(() => {
    goalHitNotificationCheckTimer = null;
    void sendGoalHitNotifications();
  }, 350);
}

function getMilestoneNotificationCandidates(now = new Date()) {
  if (!currentUser || !isMilestoneNotificationsEnabled()) {
    return [];
  }
  const step = normalizeMilestoneStep(settings && settings.milestoneStep);
  if (step < 1) {
    return [];
  }
  const normalizedNow = normalizeDate(now);
  const index = buildEntryIndex(entries);
  const periods = [
    { key: "week", range: getWeekRange(normalizedNow) },
    { key: "month", range: getMonthRange(normalizedNow) },
    { key: "year", range: getYearRange(normalizedNow) }
  ];
  if (isQuartersEnabled()) {
    periods.push({ key: "quarter", range: getQuarterRange(normalizedNow) });
  }
  const items = [];
  trackers.forEach((tracker) => {
    if (!tracker || tracker.archived || normalizeGoalType(tracker.goalType) === "bucket") {
      return;
    }
    periods.forEach((period) => {
      const target = normalizeGoalTargetInt(getTrackerTargetForPeriod(tracker, period.key, period.range), 0);
      if (target < 1) {
        return;
      }
      const progress = sumTrackerRange(index, tracker.id, period.range);
      const pct = percent(progress, target);
      const reached = Math.floor(Math.min(pct, 99) / step) * step;
      if (reached < step) {
        return;
      }
      const rangeStart = getDateKey(period.range.start);
      const rangeEnd = getDateKey(period.range.end);
      const milestoneKey = `${tracker.id}|${period.key}|${rangeStart}|${rangeEnd}|${reached}`;
      items.push({
        milestoneKey,
        goalName: tracker.name,
        goalUnit: tracker.unit,
        period: period.key,
        rangeStart,
        rangeEnd,
        progress,
        target,
        milestonePercent: reached
      });
    });
  });
  return items;
}

async function sendMilestoneNotifications() {
  if (!firebaseConfigured || !firebaseDb || !currentUser || !isMilestoneNotificationsEnabled()) {
    return;
  }
  const candidates = getMilestoneNotificationCandidates(new Date());
  if (candidates.length < 1) {
    return;
  }
  let changed = false;
  for (const item of candidates) {
    if (milestoneNotificationKeys.has(item.milestoneKey)) {
      continue;
    }
    const createdId = await createNotificationDoc({
      type: "goal-milestone",
      recipientId: currentUser.id,
      actorId: currentUser.id,
      actorUsername: getUserDisplayName(currentUser),
      actorEmail: normalizeEmail(currentUser.email),
      goalName: item.goalName,
      goalUnit: item.goalUnit,
      period: item.period,
      rangeStart: item.rangeStart,
      rangeEnd: item.rangeEnd,
      progress: item.progress,
      target: item.target,
      milestonePercent: item.milestonePercent,
      hitKey: item.milestoneKey,
      read: false
    });
    if (!createdId) {
      continue;
    }
    milestoneNotificationKeys.add(item.milestoneKey);
    changed = true;
  }
  if (changed) {
    saveNotificationKeySet(MILESTONE_NOTIFICATION_KEYS_STORAGE_KEY, milestoneNotificationKeys);
  }
}

function queueMilestoneNotificationCheck() {
  if (!currentUser) {
    return;
  }
  if (milestoneNotificationCheckTimer) {
    clearTimeout(milestoneNotificationCheckTimer);
  }
  milestoneNotificationCheckTimer = setTimeout(() => {
    milestoneNotificationCheckTimer = null;
    void sendMilestoneNotifications();
  }, 260);
}

function getSmartReminderCandidates(now = new Date()) {
  if (!currentUser || !isSmartRemindersEnabled()) {
    return [];
  }
  const thresholdDays = Math.max(Math.floor(Number(settings && settings.missedEntryDays) || 2), 1);
  const today = normalizeDate(now);
  const todayKey = getDateKey(today);
  const latestDateByTracker = getLatestEntryDateMap();
  const items = [];
  trackers.forEach((tracker) => {
    if (!tracker || tracker.archived || normalizeGoalType(tracker.goalType) === "bucket") {
      return;
    }
    const latestDateKey = latestDateByTracker.get(tracker.id) || "";
    const latestDate = latestDateKey ? parseDateKey(latestDateKey) : null;
    const daysWithout = latestDate
      ? Math.max(Math.floor((today - normalizeDate(latestDate)) / DAY_MS), 0)
      : thresholdDays;
    if (daysWithout < thresholdDays) {
      return;
    }
    const reminderKey = `${tracker.id}|${todayKey}|${daysWithout}`;
    items.push({
      reminderKey,
      goalName: tracker.name,
      goalUnit: tracker.unit,
      reminderDays: daysWithout
    });
  });
  return items;
}

async function sendSmartReminderNotifications() {
  if (!firebaseConfigured || !firebaseDb || !currentUser || !isSmartRemindersEnabled()) {
    return;
  }
  if (smartReminderCheckInFlight) {
    return;
  }
  smartReminderCheckInFlight = true;
  try {
    const candidates = getSmartReminderCandidates(new Date());
    let changed = false;
    for (const item of candidates) {
      if (smartReminderNotificationKeys.has(item.reminderKey)) {
        continue;
      }
      const createdId = await createNotificationDoc({
        type: "smart-reminder",
        recipientId: currentUser.id,
        actorId: currentUser.id,
        actorUsername: getUserDisplayName(currentUser),
        actorEmail: normalizeEmail(currentUser.email),
        goalName: item.goalName,
        goalUnit: item.goalUnit,
        reminderDays: item.reminderDays,
        hitKey: item.reminderKey,
        read: false
      });
      if (!createdId) {
        continue;
      }
      smartReminderNotificationKeys.add(item.reminderKey);
      changed = true;
    }
    if (changed) {
      saveNotificationKeySet(SMART_REMINDER_NOTIFICATION_KEYS_STORAGE_KEY, smartReminderNotificationKeys);
    }
  } finally {
    smartReminderCheckInFlight = false;
  }
}

function queueSmartReminderCheck() {
  if (!currentUser) {
    return;
  }
  if (smartReminderCheckTimer) {
    clearTimeout(smartReminderCheckTimer);
  }
  smartReminderCheckTimer = setTimeout(() => {
    smartReminderCheckTimer = null;
    void sendSmartReminderNotifications();
  }, 550);
}

function isPeriodReadyForClosePrompt(periodName, range, index) {
  const trackersForPeriod = getTrackersForPeriod(periodName);
  const dueCheckIns = getCheckInsForPeriod(periodName);
  if (trackersForPeriod.length < 1 && dueCheckIns.length < 1) {
    return false;
  }
  const goalsComplete = trackersForPeriod.every((tracker) => hasTrackerEntriesForEveryDay(index, tracker.id, range));
  const checkInsComplete = dueCheckIns.every((checkIn) => getCheckInStatusForRange(checkIn, range).completed);
  return goalsComplete && checkInsComplete;
}

function getPeriodClosePromptCandidates(now = new Date()) {
  if (!currentUser) {
    return [];
  }
  const normalizedNow = normalizeDate(now);
  const index = buildEntryIndex(entries);
  const closedSnapshotKeys = new Set(
    periodSnapshots
      .filter((snapshot) => snapshot && isDateKey(snapshot.rangeStart) && isDateKey(snapshot.rangeEnd))
      .map((snapshot) => getPeriodSnapshotRefKey(snapshot.period, snapshot.rangeStart, snapshot.rangeEnd))
  );
  const candidatesByKey = new Map();
  const addCandidate = (periodName, range) => {
    if (!range || !(range.start instanceof Date) || Number.isNaN(range.start.getTime()) || !(range.end instanceof Date) || Number.isNaN(range.end.getTime())) {
      return;
    }
    if (range.end < range.start) {
      return;
    }
    const normalizedPeriod = normalizePeriodMode(periodName);
    const rangeStart = getDateKey(normalizeDate(range.start));
    const rangeEnd = getDateKey(normalizeDate(range.end));
    if (!isDateKey(rangeStart) || !isDateKey(rangeEnd)) {
      return;
    }
    const promptKey = getPeriodSnapshotRefKey(normalizedPeriod, rangeStart, rangeEnd);
    if (closedSnapshotKeys.has(promptKey)) {
      return;
    }
    if (!isPeriodReadyForClosePrompt(normalizedPeriod, { start: parseDateKey(rangeStart), end: parseDateKey(rangeEnd) }, index)) {
      return;
    }
    candidatesByKey.set(promptKey, {
      promptKey,
      period: normalizedPeriod,
      rangeStart,
      rangeEnd
    });
  };

  addCandidate("week", getWeekRange(normalizedNow));
  addCandidate("month", getMonthRange(normalizedNow));
  addCandidate("year", getYearRange(normalizedNow));
  if (isQuartersEnabled()) {
    addCandidate("quarter", getQuarterRange(normalizedNow));
  }

  const unclosedPeriods = getUnclosedPeriodItems(normalizedNow);
  unclosedPeriods.forEach((item) => {
    if (!item || !isDateKey(item.startKey) || !isDateKey(item.endKey)) {
      return;
    }
    addCandidate(item.periodName, {
      start: parseDateKey(item.startKey),
      end: parseDateKey(item.endKey)
    });
  });

  return Array.from(candidatesByKey.values())
    .sort((a, b) => {
      const endCompare = String(b.rangeEnd || "").localeCompare(String(a.rangeEnd || ""));
      if (endCompare !== 0) {
        return endCompare;
      }
      return String(a.period || "").localeCompare(String(b.period || ""));
    })
    .slice(0, 24);
}

function primePeriodClosePromptNotificationKeys() {
  if (!currentUser || periodClosePromptNotificationKeys.size > 0) {
    return;
  }
  const candidates = getPeriodClosePromptCandidates(new Date());
  if (candidates.length < 1) {
    return;
  }
  candidates.forEach((item) => {
    periodClosePromptNotificationKeys.add(item.promptKey);
  });
  saveNotificationKeySet(PERIOD_CLOSE_PROMPT_NOTIFICATION_KEYS_STORAGE_KEY, periodClosePromptNotificationKeys);
}

async function sendPeriodClosePromptNotifications() {
  if (!firebaseConfigured || !firebaseDb || !currentUser) {
    return;
  }
  if (periodClosePromptNotificationCheckInFlight) {
    return;
  }
  periodClosePromptNotificationCheckInFlight = true;
  try {
    const candidates = getPeriodClosePromptCandidates(new Date());
    let changed = false;
    for (const item of candidates) {
      if (periodClosePromptNotificationKeys.has(item.promptKey)) {
        continue;
      }
      const createdId = await createNotificationDoc({
        type: "period-close-ready",
        recipientId: currentUser.id,
        actorId: currentUser.id,
        actorUsername: getUserDisplayName(currentUser),
        actorEmail: normalizeEmail(currentUser.email),
        period: item.period,
        rangeStart: item.rangeStart,
        rangeEnd: item.rangeEnd,
        hitKey: item.promptKey,
        read: false,
        actioned: false
      });
      if (!createdId) {
        continue;
      }
      periodClosePromptNotificationKeys.add(item.promptKey);
      changed = true;
    }
    if (changed) {
      saveNotificationKeySet(PERIOD_CLOSE_PROMPT_NOTIFICATION_KEYS_STORAGE_KEY, periodClosePromptNotificationKeys);
    }
  } finally {
    periodClosePromptNotificationCheckInFlight = false;
  }
}

function queuePeriodClosePromptCheck() {
  if (!currentUser) {
    return;
  }
  if (periodClosePromptNotificationCheckTimer) {
    clearTimeout(periodClosePromptNotificationCheckTimer);
  }
  periodClosePromptNotificationCheckTimer = setTimeout(() => {
    periodClosePromptNotificationCheckTimer = null;
    void sendPeriodClosePromptNotifications();
  }, 420);
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
    period: normalizePeriodMode(item.period),
    rangeStart: isDateKey(item.rangeStart) ? item.rangeStart : "",
    rangeEnd: isDateKey(item.rangeEnd) ? item.rangeEnd : "",
    progress: normalizePositiveAmount(item.progress, 0),
    target: normalizePositiveAmount(item.target, 0),
    hitKey: typeof item.hitKey === "string" ? item.hitKey : "",
    entryAmount: normalizePositiveAmount(item.entryAmount, 0),
    entryDate: isDateKey(item.entryDate) ? item.entryDate : "",
    friendLabel: typeof item.friendLabel === "string" ? item.friendLabel : "",
    milestonePercent: Math.max(Math.min(Math.floor(Number(item.milestonePercent) || 0), 100), 0),
    reminderDays: Math.max(Math.floor(Number(item.reminderDays) || 0), 0),
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

async function closePeriodFromNotification(notificationId, periodName, rangeStartKey, rangeEndKey) {
  if (!currentUser) {
    return { success: false, message: "Sign in before closing periods." };
  }
  if (!isDateKey(rangeStartKey) || !isDateKey(rangeEndKey)) {
    return { success: false, message: "This notification is missing period details." };
  }
  const result = closeOutPeriodRange(periodName, {
    start: parseDateKey(rangeStartKey),
    end: parseDateKey(rangeEndKey)
  }, {
    confirmReplace: false,
    allowIfAlreadyClosed: true,
    render: true
  });
  if (!result.success) {
    return result;
  }

  if (notificationId) {
    const notification = notifications.find((item) => item && item.id === notificationId);
    if (notification) {
      notification.read = true;
      notification.actioned = true;
    }
    renderNotifications();
    if (firebaseConfigured && firebaseDb) {
      try {
        await updateDoc(doc(firebaseDb, CLOUD_NOTIFICATION_COLLECTION, notificationId), {
          read: true,
          actioned: true,
          actionedAt: new Date().toISOString(),
          readAt: new Date().toISOString()
        });
      } catch {
        // Listener refresh will eventually reconcile notification state.
      }
    }
  }
  queuePeriodClosePromptCheck();
  return { success: true, message: result.alreadyClosed ? "Period already closed." : "Period closed." };
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
          weeklyGoal: normalizeGoalTargetInt(item.weeklyGoal, 0),
          monthlyGoal: normalizeGoalTargetInt(item.monthlyGoal, 0),
          yearlyGoal: normalizeGoalTargetInt(item.yearlyGoal, 0),
          customWeeklyEnabled: Boolean(item.customWeeklyEnabled),
          customWeeklyTargets: normalizeCustomTargetList(item.customWeeklyTargets, GOAL_TEMPLATE_WEEK_COUNT, normalizeGoalTargetInt(item.weeklyGoal, 0)),
          customMonthlyEnabled: Boolean(item.customMonthlyEnabled),
          customMonthlyTargets: normalizeCustomTargetList(item.customMonthlyTargets, GOAL_TEMPLATE_MONTH_COUNT, normalizeGoalTargetInt(item.monthlyGoal, 0))
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
    squads,
    deletedItems,
    periodSnapshots,
    rewards,
    rewardPurchases,
    pointTransactions,
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
  const hasSquads = Array.isArray(squads) && squads.length > 0;
  const hasTrash = Array.isArray(deletedItems) && deletedItems.length > 0;
  const hasSnapshots = Array.isArray(periodSnapshots) && periodSnapshots.length > 0;
  const hasRewards = Array.isArray(rewards) && rewards.length > 0;
  const hasRewardPurchases = Array.isArray(rewardPurchases) && rewardPurchases.length > 0;
  const hasTransactions = Array.isArray(pointTransactions) && pointTransactions.length > 0;
  return !(hasGoals || hasEntries || hasCheckIns || hasJournal || hasSchedules || hasFriends || hasSquads || hasTrash || hasSnapshots || hasRewards || hasRewardPurchases || hasTransactions);
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
    [SQUADS_STORAGE_KEY, Array.isArray(payload.squads) ? payload.squads : []],
    [TRASH_STORAGE_KEY, Array.isArray(payload.deletedItems) ? payload.deletedItems : []],
    [PERIOD_SNAPSHOTS_STORAGE_KEY, Array.isArray(payload.periodSnapshots) ? payload.periodSnapshots : []],
    [REWARDS_STORAGE_KEY, Array.isArray(payload.rewards) ? payload.rewards : []],
    [REWARD_PURCHASES_STORAGE_KEY, Array.isArray(payload.rewardPurchases) ? payload.rewardPurchases : []],
    [POINT_TRANSACTIONS_STORAGE_KEY, Array.isArray(payload.pointTransactions) ? payload.pointTransactions : []],
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
  if (goalHitNotificationCheckTimer) {
    clearTimeout(goalHitNotificationCheckTimer);
    goalHitNotificationCheckTimer = null;
  }
  if (milestoneNotificationCheckTimer) {
    clearTimeout(milestoneNotificationCheckTimer);
    milestoneNotificationCheckTimer = null;
  }
  if (smartReminderCheckTimer) {
    clearTimeout(smartReminderCheckTimer);
    smartReminderCheckTimer = null;
  }
  if (periodClosePromptNotificationCheckTimer) {
    clearTimeout(periodClosePromptNotificationCheckTimer);
    periodClosePromptNotificationCheckTimer = null;
  }
  cloudSyncInFlight = false;
  goalHitNotificationCheckInFlight = false;
  smartReminderCheckInFlight = false;
  periodClosePromptNotificationCheckInFlight = false;
  suppressCloudSync = false;
  currentUser = null;
  trackers = [];
  entries = [];
  checkIns = [];
  checkInEntries = [];
  goalJournalEntries = [];
  schedules = [];
  friends = [];
  squads = [];
  deletedItems = [];
  periodSnapshots = [];
  rewards = [];
  rewardPurchases = [];
  pointTransactions = [];
  notifications = [];
  notificationsPanelOpen = false;
  sharedGoalShares = [];
  sharedGoalOwnerData = new Map();
  goalHitNotificationKeys = new Set();
  milestoneNotificationKeys = new Set();
  smartReminderNotificationKeys = new Set();
  periodClosePromptNotificationKeys = new Set();
  settings = getDefaultSettings();
  activeTab = "settings-general";
  homeMissedPeriod = "week";
  homeMissedTileFlipped = false;
  entryMode = "solo";
  entryListSortMode = "date_desc";
  entryListTypeFilter = "all";
  entryListStatusFilter = "active";
  entryListBucketFilter = "all";
  clearEntryListFocusRange();
  periodGoalFilterState.week.type = "all";
  periodGoalFilterState.week.status = "active";
  periodGoalFilterState.week.tag = "all";
  periodGoalFilterState.month.type = "all";
  periodGoalFilterState.month.status = "active";
  periodGoalFilterState.month.tag = "all";
  periodGoalFilterState.year.type = "all";
  periodGoalFilterState.year.status = "active";
  periodGoalFilterState.year.tag = "all";
  periodGoalFilterState.quarter.type = "all";
  periodGoalFilterState.quarter.status = "active";
  periodGoalFilterState.quarter.tag = "all";
  bucketListGoalStatusFilter = "active";
  bucketListItemStatusFilter = "all";
  scheduleWeekAnchor = normalizeDate(new Date());
  weekEntryAnchor = normalizeDate(new Date());
  weekEntryStatusMessage = "";
  yearEntryAnchor = new Date(new Date().getFullYear(), 0, 1);
  yearUpdateAllStatusMessage = "";
  yearSingleGoalStatusMessage = "";
  yearSingleGoalSelectedId = "";
  resetViewAnchors();
  resetGoalCompareState();
  resetScheduleTileFlips();
  resetGraphPointsState();
  resetProjectionLineState();
  resetPeriodAccordionState();
  resetInlineGraphState();
  closeGraphModal();
  if (onboardingModal) {
    onboardingModal.classList.add("hidden");
    onboardingModal.setAttribute("aria-hidden", "true");
  }
  setAuthMode("signin");
  if (loginForm) {
    loginForm.reset();
  }
  if (registerForm) {
    registerForm.reset();
  }
  if (changePasswordForm) {
    changePasswordForm.reset();
  }
  setMobileMenuOpen(false);
  applyPasswordVisibilityToggle();
  applyChangePasswordVisibility();
  showChangePasswordMessage("");
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
  if (weekGoalTagFilterSelect) {
    weekGoalTagFilterSelect.value = periodGoalFilterState.week.tag;
  }
  if (monthGoalTagFilterSelect) {
    monthGoalTagFilterSelect.value = periodGoalFilterState.month.tag;
  }
  if (yearGoalTagFilterSelect) {
    yearGoalTagFilterSelect.value = periodGoalFilterState.year.tag;
  }
  if (quarterGoalTypeFilterSelect) {
    quarterGoalTypeFilterSelect.value = periodGoalFilterState.quarter.type;
  }
  if (quarterGoalStatusFilterSelect) {
    quarterGoalStatusFilterSelect.value = periodGoalFilterState.quarter.status;
  }
  if (quarterGoalTagFilterSelect) {
    quarterGoalTagFilterSelect.value = periodGoalFilterState.quarter.tag;
  }
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
  activeTab = "home";
  homeMissedPeriod = "week";
  homeMissedTileFlipped = false;
  entryMode = "solo";
  notificationsPanelOpen = false;
  sharedGoalShares = [];
  sharedGoalOwnerData = new Map();
  scheduleWeekAnchor = normalizeDate(new Date());
  weekEntryAnchor = normalizeDate(new Date());
  weekEntryStatusMessage = "";
  yearEntryAnchor = new Date(new Date().getFullYear(), 0, 1);
  yearUpdateAllStatusMessage = "";
  yearSingleGoalStatusMessage = "";
  yearSingleGoalSelectedId = "";
  entryListSortMode = "date_desc";
  entryListTypeFilter = "all";
  entryListStatusFilter = "active";
  entryListBucketFilter = "all";
  clearEntryListFocusRange();
  periodGoalFilterState.week.type = "all";
  periodGoalFilterState.week.status = "active";
  periodGoalFilterState.week.tag = "all";
  periodGoalFilterState.month.type = "all";
  periodGoalFilterState.month.status = "active";
  periodGoalFilterState.month.tag = "all";
  periodGoalFilterState.year.type = "all";
  periodGoalFilterState.year.status = "active";
  periodGoalFilterState.year.tag = "all";
  periodGoalFilterState.quarter.type = "all";
  periodGoalFilterState.quarter.status = "active";
  periodGoalFilterState.quarter.tag = "all";
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
  if (pointStoreEnabledSelect) {
    pointStoreEnabledSelect.value = isPointStoreRewardsEnabled() ? "on" : "off";
  }
  if (pointAdjustDirectionSelect) {
    pointAdjustDirectionSelect.value = "add";
  }
  if (pointAdjustAmount) {
    pointAdjustAmount.value = "10.00";
  }
  if (pointAdjustNote) {
    pointAdjustNote.value = "";
  }
  if (bucketListEnabledSelect) {
    bucketListEnabledSelect.value = isBucketListEnabled() ? "on" : "off";
  }
  if (quartersEnabledSelect) {
    quartersEnabledSelect.value = isQuartersEnabled() ? "on" : "off";
  }
  if (smartRemindersEnabledSelect) {
    smartRemindersEnabledSelect.value = isSmartRemindersEnabled() ? "on" : "off";
  }
  if (missedEntryDaysInput) {
    missedEntryDaysInput.value = String(Math.max(Math.floor(Number(settings.missedEntryDays) || 2), 1));
  }
  if (milestoneNotificationsEnabledSelect) {
    milestoneNotificationsEnabledSelect.value = isMilestoneNotificationsEnabled() ? "on" : "off";
  }
  if (milestoneStepSelect) {
    milestoneStepSelect.value = String(normalizeMilestoneStep(settings.milestoneStep));
  }
  if (mobileQuickActionsEnabledSelect) {
    mobileQuickActionsEnabledSelect.value = isMobileQuickActionsEnabled() ? "on" : "off";
  }
  if (onboardingEnabledSelect) {
    onboardingEnabledSelect.value = isOnboardingEnabled() ? "on" : "off";
  }
  if (performanceModeSelect) {
    performanceModeSelect.value = normalizePerformanceMode(settings.performanceMode);
  }
  if (themeSelect) {
    themeSelect.value = normalizeThemeKey(settings.theme);
  }
  applyTheme();
  setAuthMode("signin");
  if (goalType) {
    goalType.value = "quantity";
  }
  if (goalSetupMode) {
    goalSetupMode.value = GOALS_PLUS_SETUP_STANDARD;
  }
  if (goalNameGoalsPlus) {
    goalNameGoalsPlus.value = GOALS_PLUS_NAME_OPTIONS[0].value;
  }
  if (goalPlusRunningWorkout) {
    goalPlusRunningWorkout.value = "easy";
  }
  if (goalPlusRunningWorkInterval) {
    goalPlusRunningWorkInterval.value = String(NORWEGIAN_DEFAULT_WORK_SPEED_MPH);
  }
  if (goalPlusRunningRecoveryInterval) {
    goalPlusRunningRecoveryInterval.value = String(NORWEGIAN_DEFAULT_RECOVERY_SPEED_MPH);
  }
  if (goalMigrateSource) {
    goalMigrateSource.value = "";
  }
  if (goalMigrateArchiveSource) {
    goalMigrateArchiveSource.checked = true;
  }
  syncGoalMigrationControls();
  if (goalUnit) {
    goalUnit.value = "units";
  }
  resetGoalTargetsToDefaults();
  resetGoalCustomTemplates();
  if (goalPriority) {
    goalPriority.value = "0";
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
    entryDate.value = getDateKey(normalizeDate(new Date()));
  }
  if (entryNotApplicable) {
    entryNotApplicable.checked = false;
  }
  if (entryGoalsPlusDistance) {
    entryGoalsPlusDistance.value = "";
  }
  if (entryGoalsPlusDuration) {
    entryGoalsPlusDuration.value = "";
  }
  if (entryGoalsPlusWorkInterval) {
    entryGoalsPlusWorkInterval.value = "";
  }
  if (entryGoalsPlusRecoveryInterval) {
    entryGoalsPlusRecoveryInterval.value = "";
  }
  if (entryGoalsPlusCustomExercise) {
    entryGoalsPlusCustomExercise.value = "";
  }
  if (entryGoalsPlusCustomReps) {
    entryGoalsPlusCustomReps.value = "";
  }
  if (entryGoalsPlusCustomWeight) {
    entryGoalsPlusCustomWeight.value = "";
  }
  if (entryGoalsPlusGolfScore) {
    entryGoalsPlusGolfScore.value = "";
  }
  updateEntryGoalsPlusDerivedLabel();
  if (goalJournalDate) {
    goalJournalDate.value = getDateKey(normalizeDate(new Date()));
  }
  if (goalJournalGoal) {
    goalJournalGoal.value = "";
  }
  if (goalJournalTitle) {
    goalJournalTitle.value = GOAL_JOURNAL_SUBJECT_DEFAULT;
  }
  if (goalJournalContent) {
    goalJournalContent.value = "";
  }
  if (changePasswordForm) {
    changePasswordForm.reset();
  }
  applyChangePasswordVisibility();
  showChangePasswordMessage("");
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
  if (quarterGoalTypeFilterSelect) {
    quarterGoalTypeFilterSelect.value = periodGoalFilterState.quarter.type;
  }
  if (quarterGoalStatusFilterSelect) {
    quarterGoalStatusFilterSelect.value = periodGoalFilterState.quarter.status;
  }
  if (quarterGoalTagFilterSelect) {
    quarterGoalTagFilterSelect.value = periodGoalFilterState.quarter.tag;
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
  primeGoalHitNotificationKeys();
  primePeriodClosePromptNotificationKeys();
  if (isOnboardingEnabled() && !isOnboardingDismissed()) {
    openOnboardingModal();
  }
  updateGoalTypeFields();
  updateEntryFormMode();
}

function resetViewAnchors() {
  const now = new Date();
  weekViewAnchor = normalizeDate(now);
  monthViewAnchor = new Date(now.getFullYear(), now.getMonth(), 1);
  quarterViewAnchor = getQuarterRange(now).start;
  yearViewAnchor = new Date(now.getFullYear(), 0, 1);
  weekEntryAnchor = normalizeDate(now);
  yearEntryAnchor = new Date(now.getFullYear(), 0, 1);
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
    return { error: "No goal headers matched existing goals in Settings > Goal Settings.", changed: false, message: "" };
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

function exportEntriesToCsv() {
  if (!currentUser) {
    return { error: "Sign in before exporting CSV.", csvText: "", filename: "", message: "" };
  }

  const goalColumns = trackers
    .filter((tracker) => tracker && String(tracker.id || "") && String(tracker.name || "").trim())
    .slice()
    .sort(compareTrackersByPriority);
  if (goalColumns.length < 1) {
    return { error: "Create at least one goal before exporting CSV.", csvText: "", filename: "", message: "" };
  }

  const goalIds = new Set(goalColumns.map((tracker) => tracker.id));
  const rowsByDate = new Map();
  entries.forEach((entry) => {
    if (!entry || !goalIds.has(entry.trackerId) || !isDateKey(entry.date)) {
      return;
    }
    const amount = Math.round((Number(entry.amount) || 0) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 0) {
      return;
    }
    if (!rowsByDate.has(entry.date)) {
      rowsByDate.set(entry.date, new Map());
    }
    const totalsByGoal = rowsByDate.get(entry.date);
    const prior = totalsByGoal.get(entry.trackerId) || 0;
    totalsByGoal.set(entry.trackerId, addAmount(prior, amount));
  });

  if (rowsByDate.size < 1) {
    return { error: "No entries found to export.", csvText: "", filename: "", message: "" };
  }

  const csvRows = [["Date", ...goalColumns.map((tracker) => tracker.name)]];
  const orderedDateKeys = Array.from(rowsByDate.keys()).sort((a, b) => dateKeyToDayNumber(a) - dateKeyToDayNumber(b));
  orderedDateKeys.forEach((dateKey) => {
    const totalsByGoal = rowsByDate.get(dateKey);
    const row = [dateKey];
    goalColumns.forEach((tracker) => {
      if (!totalsByGoal.has(tracker.id)) {
        row.push("");
        return;
      }
      row.push(formatEditableAmount(totalsByGoal.get(tracker.id)));
    });
    csvRows.push(row);
  });

  const csvText = csvRows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
  return {
    error: "",
    csvText,
    filename: `goal-tracker-entries-${getDateKey(normalizeDate(new Date()))}.csv`,
    message: `CSV export complete. Downloaded ${orderedDateKeys.length} date row(s) across ${goalColumns.length} goal column(s).`
  };
}

function escapeCsvCell(value) {
  const text = String(value == null ? "" : value);
  if (text.includes("\"") || text.includes(",") || text.includes("\n") || text.includes("\r")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
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
    projectionAverageSource: "period",
    rewardPointsEnabled: false,
    pointStoreRewardsEnabled: true,
    bucketListEnabled: true,
    quartersEnabled: false,
    smartRemindersEnabled: true,
    missedEntryDays: 2,
    milestoneNotificationsEnabled: true,
    milestoneStep: 20,
    mobileQuickActionsEnabled: true,
    onboardingEnabled: true,
    performanceMode: "standard",
    theme: "teal"
  };
}

function normalizeProjectionAverageSource(value) {
  return value === "year" ? "year" : "period";
}

function normalizeMilestoneStep(value) {
  const numeric = Number(value);
  if (numeric === 10 || numeric === 20 || numeric === 25) {
    return numeric;
  }
  return 20;
}

function normalizePerformanceMode(value) {
  return value === "light" ? "light" : "standard";
}

function normalizeGoalPoints(value, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return Math.max(Math.floor(Number(fallback) || 1), 0);
  }
  return Math.max(Math.floor(numeric), 0);
}

function normalizeGoalPriority(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return Math.max(Math.floor(Number(fallback) || 0), 0);
  }
  return Math.max(Math.min(Math.floor(numeric), 1000), 0);
}

function compareTrackersByPriority(a, b) {
  const priorityA = normalizeGoalPriority(a && a.priority, 0);
  const priorityB = normalizeGoalPriority(b && b.priority, 0);
  if (priorityA !== priorityB) {
    return priorityB - priorityA;
  }
  const nameA = String(a && a.name || "");
  const nameB = String(b && b.name || "");
  return nameA.localeCompare(nameB);
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

function applyPerformanceMode() {
  const mode = normalizePerformanceMode(settings && settings.performanceMode);
  document.body.setAttribute("data-performance", mode);
}

function isBucketListEnabled() {
  return !(settings && settings.bucketListEnabled === false);
}

function isRewardPointsEnabled() {
  return Boolean(settings && settings.rewardPointsEnabled === true);
}

function isPointStoreRewardsEnabled() {
  return isRewardPointsEnabled() && !(settings && settings.pointStoreRewardsEnabled === false);
}

function isQuartersEnabled() {
  return Boolean(settings && settings.quartersEnabled === true);
}

function isSmartRemindersEnabled() {
  return !(settings && settings.smartRemindersEnabled === false);
}

function isMilestoneNotificationsEnabled() {
  return !(settings && settings.milestoneNotificationsEnabled === false);
}

function isMobileQuickActionsEnabled() {
  return !(settings && settings.mobileQuickActionsEnabled === false);
}

function isOnboardingEnabled() {
  return !(settings && settings.onboardingEnabled === false);
}

function applyQuarterFeatureVisibility() {
  const enabled = isQuartersEnabled();
  document.querySelectorAll("[data-tab='quarter']").forEach((button) => {
    button.hidden = !enabled;
  });
  document.querySelectorAll("[data-tab-panel='quarter']").forEach((panel) => {
    if (!enabled) {
      panel.hidden = true;
      panel.classList.remove("active");
    }
  });
  if (!enabled && activeTab === "quarter") {
    activeTab = "week";
  }
}

function applyMobileQuickActionsVisibility() {
  if (!mobileQuickActions) {
    return;
  }
  const show = Boolean(currentUser && isMobileMenuMode() && isMobileQuickActionsEnabled());
  mobileQuickActions.hidden = !show;
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
  document.querySelectorAll("[data-tab='point-store']").forEach((button) => {
    button.hidden = !pointStoreEnabled;
  });
  document.querySelectorAll("[data-tab-panel='point-store']").forEach((panel) => {
    if (!pointStoreEnabled) {
      panel.hidden = true;
      panel.classList.remove("active");
    }
  });
  document.querySelectorAll("[data-tab='settings-point-store']").forEach((button) => {
    button.hidden = !enabled;
  });
  document.querySelectorAll("[data-tab-panel='settings-point-store']").forEach((panel) => {
    if (!enabled) {
      panel.hidden = true;
      panel.classList.remove("active");
    }
  });
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
    activeTab = "settings-general";
  }
  if (!enabled && activeTab === "settings-point-store") {
    activeTab = "settings-general";
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
    SQUADS_STORAGE_KEY,
    TRASH_STORAGE_KEY,
    PERIOD_SNAPSHOTS_STORAGE_KEY,
    REWARDS_STORAGE_KEY,
    REWARD_PURCHASES_STORAGE_KEY,
    POINT_TRANSACTIONS_STORAGE_KEY,
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
    squads = [];
    deletedItems = [];
    periodSnapshots = [];
    rewards = [];
    rewardPurchases = [];
    pointTransactions = [];
    goalHitNotificationKeys = new Set();
    milestoneNotificationKeys = new Set();
    smartReminderNotificationKeys = new Set();
    periodClosePromptNotificationKeys = new Set();
    settings = getDefaultSettings();
    goalMetricsDraft = [];
    renderGoalMetricsDraft();
    if (goalAdditionalTrackingEnabled) {
      goalAdditionalTrackingEnabled.checked = false;
    }
    syncGoalAdditionalTrackingVisibility();
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
  squads = loadSquads();
  deletedItems = loadDeletedItems();
  periodSnapshots = loadPeriodSnapshots();
  rewards = loadRewards();
  rewardPurchases = loadRewardPurchases();
  pointTransactions = loadPointTransactions();
  goalHitNotificationKeys = loadGoalHitNotificationKeys();
  milestoneNotificationKeys = loadNotificationKeySet(MILESTONE_NOTIFICATION_KEYS_STORAGE_KEY);
  smartReminderNotificationKeys = loadNotificationKeySet(SMART_REMINDER_NOTIFICATION_KEYS_STORAGE_KEY);
  periodClosePromptNotificationKeys = loadNotificationKeySet(PERIOD_CLOSE_PROMPT_NOTIFICATION_KEYS_STORAGE_KEY);
  goalMetricsDraft = [];
  renderGoalMetricsDraft();
  if (goalAdditionalTrackingEnabled) {
    goalAdditionalTrackingEnabled.checked = false;
  }
  syncGoalAdditionalTrackingVisibility();

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
      const defaultYearlyGoal = 0;
      const yearlyGoal = normalizeGoalTargetInt(item.yearlyGoal, defaultYearlyGoal);
      const defaultMonthlyGoal = 0;
      const monthlyGoal = normalizeGoalTargetInt(item.monthlyGoal, defaultMonthlyGoal);
      const defaultWeeklyGoal = 0;
      const weeklyGoal = normalizeGoalTargetInt(item.weeklyGoal, defaultWeeklyGoal);
      let loadedUnit = getLockedUnitForGoalType(trackerGoalType)
        || (trackerGoalType === "floating" && !String(item.unit || "").trim()
          ? "items"
          : normalizeGoalUnit(item.unit));
      const progressMetrics = normalizeProgressMetricList(item.progressMetrics, {
        fallbackUnit: loadedUnit
      });
      const customWeeklyEnabled = Boolean(item.customWeeklyEnabled);
      const customWeeklyTargets = normalizeCustomTargetList(item.customWeeklyTargets, GOAL_TEMPLATE_WEEK_COUNT, weeklyGoal);
      const customMonthlyEnabled = Boolean(item.customMonthlyEnabled);
      const customMonthlyTargets = normalizeCustomTargetList(item.customMonthlyTargets, GOAL_TEMPLATE_MONTH_COUNT, monthlyGoal);
      const goalsPlus = normalizeGoalsPlusConfig(item.goalsPlus);
      if (goalsPlus.mode === GOALS_PLUS_SETUP_RUNNING && (!String(loadedUnit || "").trim() || loadedUnit === "units")) {
        loadedUnit = "miles";
      }
      if (goalsPlus.mode === GOALS_PLUS_SETUP_GOLF && (!String(loadedUnit || "").trim() || loadedUnit === "units")) {
        loadedUnit = "strokes";
      }
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
        progressMetrics,
        weeklyGoal,
        monthlyGoal,
        yearlyGoal,
        goalsPlus,
        customWeeklyEnabled,
        customWeeklyTargets,
        customMonthlyEnabled,
        customMonthlyTargets,
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
        notApplicable: Boolean(item.notApplicable === true || item.notApplicable === "true" || item.notApplicable === 1),
        goalsPlus: normalizeGoalsPlusEntryData(item),
        metricValues: normalizeEntryMetricValues(item.metricValues),
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

function loadSquads() {
  try {
    if (!currentUser) {
      return [];
    }
    const raw = localStorage.getItem(getScopedStorageKey(SQUADS_STORAGE_KEY));
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
        name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Untitled squad",
        notes: typeof item.notes === "string" ? item.notes.trim() : "",
        weeklyGoal: normalizeGoalTargetInt(item.weeklyGoal, 0),
        memberEmails: Array.isArray(item.memberEmails)
          ? item.memberEmails.map((value) => normalizeEmail(value)).filter(Boolean)
          : [],
        goalIds: Array.isArray(item.goalIds)
          ? item.goalIds.map((value) => String(value || "")).filter(Boolean)
          : [],
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
      }));
  } catch {
    return [];
  }
}

function loadDeletedItems() {
  try {
    if (!currentUser) {
      return [];
    }
    const raw = localStorage.getItem(getScopedStorageKey(TRASH_STORAGE_KEY));
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
        itemType: typeof item.itemType === "string" ? item.itemType : "item",
        payload: item.payload && typeof item.payload === "object" ? item.payload : null,
        label: typeof item.label === "string" ? item.label : "Item",
        deletedAt: typeof item.deletedAt === "string" ? item.deletedAt : new Date().toISOString()
      }))
      .filter((item) => item.payload)
      .slice(0, 120);
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
    const defaults = getDefaultSettings();
    return {
      weekStart: parsed && parsed.weekStart === "sunday" ? "sunday" : "monday",
      compareToLastDefault: parsed && parsed.compareToLastDefault === false ? false : true,
      projectionAverageSource: normalizeProjectionAverageSource(parsed && parsed.projectionAverageSource),
      rewardPointsEnabled: Boolean(parsed && (parsed.rewardPointsEnabled === true || parsed.rewardPointsEnabled === "on")),
      pointStoreRewardsEnabled: !(parsed && (parsed.pointStoreRewardsEnabled === false || parsed.pointStoreRewardsEnabled === "off")),
      bucketListEnabled: !(parsed && parsed.bucketListEnabled === false),
      quartersEnabled: Boolean(parsed && (parsed.quartersEnabled === true || parsed.quartersEnabled === "on")),
      smartRemindersEnabled: !(parsed && (parsed.smartRemindersEnabled === false || parsed.smartRemindersEnabled === "off")),
      missedEntryDays: normalizePositiveInt(parsed && parsed.missedEntryDays, defaults.missedEntryDays),
      milestoneNotificationsEnabled: !(parsed && (parsed.milestoneNotificationsEnabled === false || parsed.milestoneNotificationsEnabled === "off")),
      milestoneStep: normalizeMilestoneStep(parsed && parsed.milestoneStep),
      mobileQuickActionsEnabled: !(parsed && (parsed.mobileQuickActionsEnabled === false || parsed.mobileQuickActionsEnabled === "off")),
      onboardingEnabled: !(parsed && (parsed.onboardingEnabled === false || parsed.onboardingEnabled === "off")),
      performanceMode: normalizePerformanceMode(parsed && parsed.performanceMode),
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

function saveSquads() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(SQUADS_STORAGE_KEY), JSON.stringify(squads));
  markLocalDataUpdatedAt();
  queueCloudSync();
}

function saveDeletedItems() {
  if (!currentUser) {
    return;
  }
  localStorage.setItem(getScopedStorageKey(TRASH_STORAGE_KEY), JSON.stringify(deletedItems.slice(0, 120)));
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

function escapeCssSelector(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function saveDeletedItem(itemType, label, payload) {
  if (!currentUser || !payload || typeof payload !== "object") {
    return;
  }
  deletedItems.unshift({
    id: createId(),
    itemType: String(itemType || "item"),
    label: String(label || "Item"),
    payload,
    deletedAt: new Date().toISOString()
  });
  if (deletedItems.length > 120) {
    deletedItems = deletedItems.slice(0, 120);
  }
  saveDeletedItems();
}

function restoreDeletedItem(itemId) {
  const index = deletedItems.findIndex((item) => item && item.id === itemId);
  if (index < 0) {
    return false;
  }
  const item = deletedItems[index];
  const payload = item && item.payload && typeof item.payload === "object" ? item.payload : null;
  if (!payload) {
    return false;
  }
  if (item.itemType === "goal" && payload.tracker) {
    const tracker = payload.tracker;
    if (!trackers.some((entry) => entry.id === tracker.id)) {
      trackers.unshift(tracker);
    }
    if (Array.isArray(payload.entries)) {
      payload.entries.forEach((entry) => {
        if (!entries.some((existing) => existing.id === entry.id)) {
          entries.unshift(entry);
        }
      });
    }
    if (Array.isArray(payload.schedules)) {
      payload.schedules.forEach((schedule) => {
        if (!schedules.some((existing) => existing.id === schedule.id)) {
          schedules.unshift(schedule);
        }
      });
    }
    saveTrackers();
    saveEntries();
    saveSchedules();
  } else if (item.itemType === "checkin" && payload.checkIn) {
    if (!checkIns.some((entry) => entry.id === payload.checkIn.id)) {
      checkIns.unshift(payload.checkIn);
    }
    if (Array.isArray(payload.checkInEntries)) {
      payload.checkInEntries.forEach((entry) => {
        if (!checkInEntries.some((existing) => existing.id === entry.id)) {
          checkInEntries.unshift(entry);
        }
      });
    }
    saveCheckIns();
    saveCheckInEntries();
  } else if (item.itemType === "entry" && payload.entry) {
    if (!entries.some((entry) => entry.id === payload.entry.id)) {
      entries.unshift(payload.entry);
      saveEntries();
    }
  } else if (item.itemType === "friend" && payload.friend) {
    if (!friends.some((friend) => friend.id === payload.friend.id)) {
      friends.unshift(payload.friend);
      saveFriends();
    }
  } else if (item.itemType === "squad" && payload.squad) {
    if (!squads.some((squad) => squad.id === payload.squad.id)) {
      squads.unshift(payload.squad);
      saveSquads();
    }
  } else {
    return false;
  }
  deletedItems.splice(index, 1);
  saveDeletedItems();
  return true;
}

function normalizePositiveInt(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return fallback;
  }
  return Math.max(Math.floor(numeric), 1);
}

function normalizeGoalTargetInt(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.max(Math.floor(numeric), 0);
}

function normalizePositiveAmount(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return Math.round(numeric * 100) / 100;
}

function isEntryNotApplicable(entry) {
  if (!entry || typeof entry !== "object") {
    return false;
  }
  return Boolean(entry.notApplicable === true || entry.notApplicable === "true" || entry.notApplicable === 1);
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

function normalizeGoalsPlusSetupMode(value) {
  if (value === GOALS_PLUS_SETUP_RUNNING) {
    return GOALS_PLUS_SETUP_RUNNING;
  }
  if (value === GOALS_PLUS_SETUP_GOLF) {
    return GOALS_PLUS_SETUP_GOLF;
  }
  return GOALS_PLUS_SETUP_STANDARD;
}

function normalizeGoalsPlusGolfType(value) {
  return value === GOALS_PLUS_GOLF_DISC ? GOALS_PLUS_GOLF_DISC : GOALS_PLUS_GOLF_STANDARD;
}

function formatGoalsPlusGolfType(value) {
  const normalized = normalizeGoalsPlusGolfType(value);
  return GOALS_PLUS_GOLF_TYPE_LABEL_BY_VALUE.get(normalized) || "Golf";
}

function normalizeGolfScore(value, fallback = 0) {
  const normalizedFallback = Math.max(Math.floor(normalizePositiveAmount(fallback, 0)), 0);
  const normalized = Math.floor(normalizePositiveAmount(value, -1));
  if (!Number.isFinite(normalized) || normalized < 0) {
    return normalizedFallback;
  }
  return normalized;
}

function normalizeRunningWorkout(value) {
  const normalized = String(value || "").trim();
  if (RUNNING_WORKOUT_LABEL_BY_VALUE.has(normalized)) {
    return normalized;
  }
  return "easy";
}

function formatRunningWorkout(value) {
  const workout = normalizeRunningWorkout(value);
  return RUNNING_WORKOUT_LABEL_BY_VALUE.get(workout) || "Easy Run";
}

function formatRunningWorkoutMix(topWorkouts, fallback = "No workout entries yet") {
  const list = Array.isArray(topWorkouts) ? topWorkouts : [];
  if (list.length < 1) {
    return fallback;
  }
  return list.map((item) => `${formatRunningWorkout(item.workout)} ${item.count}`).join(" | ");
}

function normalizeGoalsPlusNameOption(value) {
  const normalized = String(value || "").trim();
  if (GOALS_PLUS_NAME_OPTION_BY_VALUE.has(normalized)) {
    return normalized;
  }
  return GOALS_PLUS_NAME_OPTIONS[0].value;
}

function getGoalsPlusNameOption(value) {
  return GOALS_PLUS_NAME_OPTION_BY_VALUE.get(normalizeGoalsPlusNameOption(value)) || GOALS_PLUS_NAME_OPTIONS[0];
}

function normalizeRunningSpeedMph(value, fallback = 0) {
  const normalizedFallback = Math.min(
    Math.max(normalizePositiveAmount(fallback, 0), 0),
    TREADMILL_SPEED_MAX_MPH
  );
  const normalized = normalizePositiveAmount(value, -1);
  if (normalized <= 0 || normalized > TREADMILL_SPEED_MAX_MPH) {
    return normalizedFallback;
  }
  return normalized;
}

function normalizeCustomExerciseName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function normalizeCustomWorkoutReps(value, fallback = 0) {
  const normalized = Math.floor(normalizePositiveAmount(value, fallback));
  if (!Number.isFinite(normalized) || normalized < 0) {
    return Math.max(Math.floor(normalizePositiveAmount(fallback, 0)), 0);
  }
  return normalized;
}

function normalizeGoalsPlusConfig(value) {
  const raw = value && typeof value === "object" ? value : {};
  const mode = normalizeGoalsPlusSetupMode(raw.mode);
  if (mode === GOALS_PLUS_SETUP_RUNNING) {
    const runningWorkout = normalizeRunningWorkout(raw.runningWorkout);
    const isNorwegian = runningWorkout === "norwegian4x4";
    const rawWorkSpeed = raw.workSpeed ?? raw.workIntervalSec;
    const rawRecoverySpeed = raw.recoverySpeed ?? raw.recoveryIntervalSec;
    return {
      mode,
      runningWorkout,
      workSpeed: isNorwegian ? normalizeRunningSpeedMph(rawWorkSpeed, NORWEGIAN_DEFAULT_WORK_SPEED_MPH) : 0,
      recoverySpeed: isNorwegian ? normalizeRunningSpeedMph(rawRecoverySpeed, NORWEGIAN_DEFAULT_RECOVERY_SPEED_MPH) : 0,
      golfType: GOALS_PLUS_GOLF_STANDARD
    };
  }
  if (mode === GOALS_PLUS_SETUP_GOLF) {
    return {
      mode,
      runningWorkout: "easy",
      workSpeed: 0,
      recoverySpeed: 0,
      golfType: normalizeGoalsPlusGolfType(raw.golfType)
    };
  }
  return {
    mode: GOALS_PLUS_SETUP_STANDARD,
    runningWorkout: "easy",
    workSpeed: 0,
    recoverySpeed: 0,
    golfType: GOALS_PLUS_GOLF_STANDARD
  };
}

function getGoalsPlusRunningConfig(tracker) {
  if (!tracker || typeof tracker !== "object") {
    return normalizeGoalsPlusConfig({});
  }
  const normalized = normalizeGoalsPlusConfig(tracker.goalsPlus);
  tracker.goalsPlus = normalized;
  return normalized;
}

function getGoalsPlusSetupModeFromTracker(tracker) {
  return getGoalsPlusRunningConfig(tracker).mode;
}

function isGoalsPlusRunningTracker(tracker) {
  return getGoalsPlusSetupModeFromTracker(tracker) === GOALS_PLUS_SETUP_RUNNING;
}

function isGoalsPlusGolfTracker(tracker) {
  return getGoalsPlusSetupModeFromTracker(tracker) === GOALS_PLUS_SETUP_GOLF;
}

function isGoalsPlusTracker(tracker) {
  const mode = getGoalsPlusSetupModeFromTracker(tracker);
  return mode === GOALS_PLUS_SETUP_RUNNING || mode === GOALS_PLUS_SETUP_GOLF;
}

function getPaceMinutesPerMile(distanceMiles, durationMinutes) {
  const distance = normalizePositiveAmount(distanceMiles, 0);
  const duration = normalizePositiveAmount(durationMinutes, 0);
  if (distance <= 0 || duration <= 0) {
    return 0;
  }
  return duration / distance;
}

function formatPaceFromMinutes(value) {
  const pace = Number(value);
  if (!Number.isFinite(pace) || pace <= 0) {
    return "n/a";
  }
  const wholeMinutes = Math.floor(pace);
  const seconds = Math.round((pace - wholeMinutes) * 60);
  const carryMinute = seconds >= 60 ? 1 : 0;
  const finalSeconds = seconds >= 60 ? 0 : seconds;
  return `${wholeMinutes + carryMinute}:${String(finalSeconds).padStart(2, "0")} /mi`;
}

function getEstimatedRunningVo2(distanceMiles, durationMinutes) {
  const distance = normalizePositiveAmount(distanceMiles, 0);
  const duration = normalizePositiveAmount(durationMinutes, 0);
  if (distance <= 0 || duration <= 0) {
    return 0;
  }
  const metersPerMinute = (distance * 1609.34) / duration;
  const vo2 = 3.5 + (0.2 * metersPerMinute);
  return Math.round(vo2 * 10) / 10;
}

function normalizeGoalsPlusEntryData(entry) {
  const raw = entry && entry.goalsPlus && typeof entry.goalsPlus === "object" ? entry.goalsPlus : null;
  if (!raw) {
    return null;
  }
  const mode = normalizeGoalsPlusSetupMode(raw.mode);
  if (mode === GOALS_PLUS_SETUP_GOLF) {
    return {
      mode: GOALS_PLUS_SETUP_GOLF,
      golfType: normalizeGoalsPlusGolfType(raw.golfType),
      score: normalizeGolfScore(raw.score, 0)
    };
  }
  if (mode !== GOALS_PLUS_SETUP_RUNNING) {
    return null;
  }
  const runningWorkout = normalizeRunningWorkout(raw.runningWorkout);
  const distance = normalizePositiveAmount(raw.distance, 0);
  const durationMinutes = normalizePositiveAmount(raw.durationMinutes, 0);
  const paceMinutesPerMile = getPaceMinutesPerMile(distance, durationMinutes);
  const estimatedVo2 = getEstimatedRunningVo2(distance, durationMinutes);
  const isNorwegian = runningWorkout === "norwegian4x4";
  const isCustomWorkout = runningWorkout === "custom";
  const rawWorkSpeed = raw.workSpeed ?? raw.workIntervalSec;
  const rawRecoverySpeed = raw.recoverySpeed ?? raw.recoveryIntervalSec;
  return {
    mode: GOALS_PLUS_SETUP_RUNNING,
    runningWorkout,
    distance,
    durationMinutes,
    paceMinutesPerMile,
    estimatedVo2,
    workSpeed: isNorwegian ? normalizeRunningSpeedMph(rawWorkSpeed, 0) : 0,
    recoverySpeed: isNorwegian ? normalizeRunningSpeedMph(rawRecoverySpeed, 0) : 0,
    customExerciseName: isCustomWorkout ? normalizeCustomExerciseName(raw.customExerciseName) : "",
    customReps: isCustomWorkout ? normalizeCustomWorkoutReps(raw.customReps, 0) : 0,
    customWeight: isCustomWorkout ? normalizePositiveAmount(raw.customWeight, 0) : 0,
    golfType: GOALS_PLUS_GOLF_STANDARD
  };
}

function getGoalsPlusEntriesForTracker(tracker, range = null) {
  if (!isGoalsPlusTracker(tracker)) {
    return [];
  }
  const trackerMode = getGoalsPlusSetupModeFromTracker(tracker);
  const hasRange = Boolean(range && range.start && range.end);
  return entries
    .filter((entry) => {
      if (!entry || entry.trackerId !== tracker.id) {
        return false;
      }
      if (hasRange) {
        if (!isDateKey(entry.date)) {
          return false;
        }
        const entryDate = parseDateKey(entry.date);
        if (entryDate < range.start || entryDate > range.end) {
          return false;
        }
      }
      const normalizedGoalsPlus = normalizeGoalsPlusEntryData(entry);
      return Boolean(normalizedGoalsPlus && normalizedGoalsPlus.mode === trackerMode);
    })
    .map((entry) => normalizeGoalsPlusEntryData(entry))
    .filter(Boolean);
}

function getGoalsPlusRunningEntriesForTracker(tracker, range = null) {
  return getGoalsPlusEntriesForTracker(tracker, range)
    .filter((entry) => entry.distance > 0 && entry.durationMinutes > 0);
}

function getGoalsPlusRunningStatsForEntries(entryItems) {
  const list = Array.isArray(entryItems) ? entryItems : [];
  const workoutCounts = {};
  const totals = list.reduce((acc, item) => {
    const workout = normalizeRunningWorkout(item.runningWorkout);
    workoutCounts[workout] = (workoutCounts[workout] || 0) + 1;
    const distance = normalizePositiveAmount(item.distance, 0);
    const duration = normalizePositiveAmount(item.durationMinutes, 0);
    if (distance > 0 && duration > 0) {
      acc.distance = addAmount(acc.distance, distance);
      acc.durationMinutes = addAmount(acc.durationMinutes, duration);
      acc.vo2Total = addAmount(acc.vo2Total, normalizePositiveAmount(item.estimatedVo2, 0));
      acc.measurableCount += 1;
      const pace = getPaceMinutesPerMile(distance, duration);
      if (pace > 0) {
        acc.paces.push(pace);
      }
    }
    return acc;
  }, {
    distance: 0,
    durationMinutes: 0,
    vo2Total: 0,
    measurableCount: 0,
    paces: []
  });
  const count = list.length;
  const avgPace = getPaceMinutesPerMile(totals.distance, totals.durationMinutes);
  const bestPace = totals.paces.length > 0 ? Math.min(...totals.paces) : 0;
  const avgVo2 = totals.measurableCount > 0 ? Math.round((totals.vo2Total / totals.measurableCount) * 10) / 10 : 0;
  const topWorkouts = Object.entries(workoutCounts)
    .map(([workout, value]) => ({
      workout: normalizeRunningWorkout(workout),
      count: Math.max(Math.floor(Number(value) || 0), 0)
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => {
      if (a.count !== b.count) {
        return b.count - a.count;
      }
      return formatRunningWorkout(a.workout).localeCompare(formatRunningWorkout(b.workout), undefined, { sensitivity: "base" });
    });
  return {
    count,
    measurableCount: totals.measurableCount,
    totalDistance: totals.distance,
    totalDurationMinutes: totals.durationMinutes,
    avgPace,
    bestPace,
    avgVo2,
    workoutCounts,
    topWorkouts
  };
}

function getGoalsPlusGolfStatsForEntries(entryItems) {
  const list = Array.isArray(entryItems) ? entryItems : [];
  const scores = list
    .map((item) => normalizeGolfScore(item && item.score, 0))
    .filter((score) => score > 0);
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const scoredCount = scores.length;
  const avgScore = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;
  const bestScore = scoredCount > 0 ? Math.min(...scores) : 0;
  return {
    count: list.length,
    scoredCount,
    avgScore,
    bestScore
  };
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

function parseProgressMetricsText(value) {
  const raw = String(value || "");
  if (!raw.trim()) {
    return [];
  }
  return raw
    .split(/[,\n;|]/g)
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
      if (match) {
        return {
          name: match[1],
          unit: match[2]
        };
      }
      return {
        name: part,
        unit: ""
      };
    });
}

function normalizeProgressMetricName(value) {
  const raw = String(value || "").trim().replace(/\s+/g, " ");
  return raw.slice(0, 60);
}

function normalizeProgressMetricUnit(value, fallback = "units") {
  const raw = String(value || "").trim().replace(/\s+/g, " ");
  if (raw) {
    return raw.slice(0, 20);
  }
  return normalizeGoalUnit(fallback).slice(0, 20);
}

function getProgressMetricKey(name, unit) {
  return `${String(name || "").trim().toLowerCase()}|${String(unit || "").trim().toLowerCase()}`;
}

function normalizeProgressMetricList(value, options = {}) {
  const source = Array.isArray(value) ? value : [];
  const fallbackUnit = normalizeProgressMetricUnit(options.fallbackUnit || "units", "units");
  const existingMetrics = Array.isArray(options.existingMetrics) ? options.existingMetrics : [];
  const existingByKey = new Map();
  existingMetrics.forEach((metric) => {
    if (!metric || typeof metric !== "object") {
      return;
    }
    const name = normalizeProgressMetricName(metric.name);
    if (!name) {
      return;
    }
    const unit = normalizeProgressMetricUnit(metric.unit, fallbackUnit);
    const id = String(metric.id || "").trim();
    if (!id) {
      return;
    }
    existingByKey.set(getProgressMetricKey(name, unit), id);
  });

  const normalized = [];
  const seen = new Set();
  source.forEach((item) => {
    let metricId = "";
    let rawName = "";
    let rawUnit = "";
    if (typeof item === "string") {
      const parsed = parseProgressMetricsText(item)[0] || null;
      rawName = parsed ? parsed.name : "";
      rawUnit = parsed ? parsed.unit : "";
    } else if (item && typeof item === "object") {
      metricId = String(item.id || "").trim();
      rawName = item.name;
      rawUnit = item.unit;
    } else {
      return;
    }

    const name = normalizeProgressMetricName(rawName);
    if (!name) {
      return;
    }
    const unit = normalizeProgressMetricUnit(rawUnit, fallbackUnit);
    const key = getProgressMetricKey(name, unit);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    const existingId = existingByKey.get(key);
    const id = String(metricId || existingId || createId()).trim();
    if (!id) {
      return;
    }
    normalized.push({
      id,
      name,
      unit
    });
  });
  return normalized.slice(0, 12);
}

function getTrackerProgressMetrics(tracker) {
  if (!tracker || typeof tracker !== "object") {
    return [];
  }
  const normalized = normalizeProgressMetricList(tracker.progressMetrics, {
    fallbackUnit: tracker.unit
  });
  tracker.progressMetrics = normalized;
  return normalized;
}

function formatProgressMetricsForInput(metrics) {
  return normalizeProgressMetricList(metrics).map((metric) => `${metric.name} (${metric.unit})`).join(", ");
}

function renderGoalMetricsDraft() {
  if (!goalMetricsDraftList || !goalMetricsDraftEmpty) {
    return;
  }
  if (!Array.isArray(goalMetricsDraft) || goalMetricsDraft.length < 1) {
    goalMetricsDraft = [];
    goalMetricsDraftList.innerHTML = "";
    goalMetricsDraftEmpty.style.display = "block";
    return;
  }
  goalMetricsDraftEmpty.style.display = "none";
  goalMetricsDraftList.innerHTML = goalMetricsDraft
    .map((metric, index) => `
      <li class="quick-item progress-metric-item" style="--stagger:${index}">
        <div>
          <strong>${escapeHtml(metric.name)}</strong>
          <p class="muted small">${escapeHtml(metric.unit)}</p>
        </div>
        <button class="btn btn-danger" type="button" data-action="remove-goal-metric" data-id="${escapeAttr(metric.id)}">Remove</button>
      </li>
    `)
    .join("");
}

function syncGoalAdditionalTrackingVisibility() {
  if (!goalAdditionalTrackingFields) {
    return;
  }
  const enabled = Boolean(goalAdditionalTrackingEnabled && goalAdditionalTrackingEnabled.checked);
  goalAdditionalTrackingFields.hidden = !enabled;
  if (goalMetricName) {
    goalMetricName.disabled = !enabled;
  }
  if (goalMetricUnit) {
    goalMetricUnit.disabled = !enabled;
  }
  if (goalMetricAddButton) {
    goalMetricAddButton.disabled = !enabled;
  }
}

function getYearEntryRowsForTrackerIds(trackerIds, range) {
  const trackerIdSet = new Set(Array.isArray(trackerIds) ? trackerIds : []);
  return entries
    .filter((entry) => {
      if (!entry || !trackerIdSet.has(entry.trackerId) || !isDateKey(entry.date)) {
        return false;
      }
      const entryDate = parseDateKey(entry.date);
      return entryDate >= range.start && entryDate <= range.end;
    })
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
}

function getYearToDateRangeForAnchor(anchorDate) {
  const yearRange = getYearRange(anchorDate);
  const today = normalizeDate(new Date());
  if (yearRange.start > today) {
    return {
      start: yearRange.start,
      end: addDays(yearRange.start, -1),
      hasDates: false
    };
  }
  const end = today < yearRange.end ? today : yearRange.end;
  return {
    start: yearRange.start,
    end,
    hasDates: end >= yearRange.start
  };
}

function getDateKeysForRange(range) {
  if (!range || !range.start || !range.end || range.end < range.start) {
    return [];
  }
  const dateKeys = [];
  for (let current = new Date(range.start); current <= range.end; current = addDays(current, 1)) {
    dateKeys.push(getDateKey(current));
  }
  return dateKeys;
}

function syncYearSingleGoalRowControlState(row) {
  if (!row) {
    return;
  }
  const stateInput = row.querySelector("select[data-field='state']");
  const amountInput = row.querySelector("[data-field='amount']");
  const notesInput = row.querySelector("textarea[data-field='notes']");
  const stateValue = String(stateInput ? stateInput.value : "none");

  if (amountInput) {
    amountInput.disabled = stateValue !== "value";
  }
  if (notesInput) {
    notesInput.disabled = stateValue === "none";
  }
  row.dataset.state = stateValue;
}

function buildEntryGoalOptionsMarkup(trackersList, selectedId) {
  const selected = String(selectedId || "");
  return trackersList
    .map((tracker) => `<option value="${tracker.id}" ${tracker.id === selected ? "selected" : ""}>${escapeHtml(tracker.name)}${tracker.archived ? " (Archived)" : ""}</option>`)
    .join("");
}

function renderYearUpdateAllSection(standardTrackers) {
  if (!yearUpdateAllForm || !yearUpdateAllBody || !yearUpdateAllEmpty || !yearUpdateAllRange || !yearUpdateAllStatus) {
    return;
  }
  const range = getYearRange(yearEntryAnchor);
  yearUpdateAllRange.textContent = String(range.start.getFullYear());
  yearUpdateAllStatus.textContent = yearUpdateAllStatusMessage;

  if (standardTrackers.length < 1) {
    yearUpdateAllForm.style.display = "none";
    yearUpdateAllBody.innerHTML = "";
    yearUpdateAllEmpty.style.display = "block";
    yearUpdateAllEmpty.textContent = "Create active quantity/yes-no/floating goals before using yearly updates.";
    return;
  }

  const rows = getYearEntryRowsForTrackerIds(standardTrackers.map((tracker) => tracker.id), range);
  if (rows.length < 1) {
    yearUpdateAllForm.style.display = "none";
    yearUpdateAllBody.innerHTML = "";
    yearUpdateAllEmpty.style.display = "block";
    yearUpdateAllEmpty.textContent = "No entries for this year.";
    return;
  }

  yearUpdateAllEmpty.style.display = "none";
  yearUpdateAllForm.style.display = "block";
  const trackerById = new Map(standardTrackers.map((tracker) => [tracker.id, tracker]));
  yearUpdateAllBody.innerHTML = rows
    .map((entry, index) => {
      const tracker = trackerById.get(entry.trackerId) || null;
      return `
        <tr class="goal-row" style="--stagger:${index}" data-entry-id="${entry.id}">
          <td>
            <input data-field="date" type="date" value="${escapeAttr(entry.date)}" required />
          </td>
          <td>
            <select data-field="trackerId">
              ${buildEntryGoalOptionsMarkup(standardTrackers, entry.trackerId)}
            </select>
          </td>
          <td>
            <input data-field="amount" type="number" min="0" step="0.01" value="${escapeAttr(formatEditableAmount(entry.amount))}" required />
          </td>
          <td>
            <textarea data-field="notes" rows="2" maxlength="280">${escapeHtml(entry.notes || "")}</textarea>
            ${tracker ? `<p class="muted small">${escapeHtml(normalizeGoalUnit(tracker.unit))}</p>` : ""}
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderYearSingleGoalSection(standardTrackers) {
  if (!yearSingleGoalForm || !yearSingleGoalSelect || !yearSingleGoalBody || !yearSingleGoalEmpty || !yearSingleGoalRange || !yearSingleGoalStatus) {
    return;
  }
  const range = getYearRange(yearEntryAnchor);
  const yearToDateRange = getYearToDateRangeForAnchor(yearEntryAnchor);
  yearSingleGoalRange.textContent = yearToDateRange.hasDates
    ? `${range.start.getFullYear()} (YTD through ${formatDate(yearToDateRange.end)})`
    : `${range.start.getFullYear()} (YTD not started yet)`;
  yearSingleGoalStatus.textContent = yearSingleGoalStatusMessage;

  if (standardTrackers.length < 1) {
    yearSingleGoalForm.style.display = "none";
    yearSingleGoalSelect.innerHTML = "<option value=''>No goals</option>";
    yearSingleGoalBody.innerHTML = "";
    yearSingleGoalEmpty.style.display = "block";
    yearSingleGoalEmpty.textContent = "Create active quantity/yes-no/floating goals before using yearly single-goal updates.";
    yearSingleGoalSelectedId = "";
    return;
  }

  yearSingleGoalSelect.innerHTML = buildEntryGoalOptionsMarkup(standardTrackers, yearSingleGoalSelectedId);
  if (!yearSingleGoalSelectedId || !standardTrackers.some((tracker) => tracker.id === yearSingleGoalSelectedId)) {
    yearSingleGoalSelectedId = standardTrackers[0].id;
    yearSingleGoalSelect.value = yearSingleGoalSelectedId;
  }
  if (!yearSingleGoalSelect.value && yearSingleGoalSelectedId) {
    yearSingleGoalSelect.value = yearSingleGoalSelectedId;
  }

  const selectedGoalId = String(yearSingleGoalSelect.value || "");
  yearSingleGoalSelectedId = selectedGoalId;
  if (!selectedGoalId) {
    yearSingleGoalForm.style.display = "none";
    yearSingleGoalBody.innerHTML = "";
    yearSingleGoalEmpty.style.display = "block";
    yearSingleGoalEmpty.textContent = "Select a goal to view year entries.";
    return;
  }

  const tracker = standardTrackers.find((item) => item.id === selectedGoalId) || null;
  if (!tracker) {
    yearSingleGoalForm.style.display = "none";
    yearSingleGoalBody.innerHTML = "";
    yearSingleGoalEmpty.style.display = "block";
    yearSingleGoalEmpty.textContent = "Select a goal to view year entries.";
    return;
  }

  const dateKeys = getDateKeysForRange(yearToDateRange).reverse();
  if (dateKeys.length < 1) {
    yearSingleGoalForm.style.display = "block";
    yearSingleGoalBody.innerHTML = "";
    yearSingleGoalEmpty.style.display = "block";
    yearSingleGoalEmpty.textContent = `No year-to-date days available for ${range.start.getFullYear()} yet.`;
    return;
  }

  const ytdEndKey = getDateKey(yearToDateRange.end);
  const existingRows = getYearEntryRowsForTrackerIds([selectedGoalId], range)
    .filter((entry) => entry.date <= ytdEndKey);
  const latestEntryByDate = new Map();
  existingRows.forEach((entry) => {
    if (!latestEntryByDate.has(entry.date)) {
      latestEntryByDate.set(entry.date, entry);
    }
  });
  const binaryGoal = isBinaryGoalType(tracker.goalType);

  yearSingleGoalEmpty.style.display = "none";
  yearSingleGoalForm.style.display = "block";
  yearSingleGoalBody.innerHTML = dateKeys
    .map((dateKey, index) => {
      const entry = latestEntryByDate.get(dateKey) || null;
      const rowState = entry
        ? (isEntryNotApplicable(entry) ? "na" : "value")
        : "none";
      const amountValue = entry && !isEntryNotApplicable(entry)
        ? formatEditableAmount(entry.amount)
        : "";
      const binaryValue = entry && entry.amount > 0 ? "yes" : "no";
      const statusHelp = rowState === "none"
        ? "No entry logged for this day yet."
        : rowState === "na"
        ? "Marked as not tracked."
        : "Entry logged for this day.";
      const amountControl = binaryGoal
        ? `
          <select data-field="amount" class="week-entry-value week-entry-value-select" ${rowState === "value" ? "" : "disabled"}>
            <option value="yes" ${binaryValue === "yes" ? "selected" : ""}>Yes</option>
            <option value="no" ${binaryValue === "no" ? "selected" : ""}>No</option>
          </select>
        `
        : `
          <input data-field="amount" type="number" min="0" step="0.01" value="${escapeAttr(amountValue)}" ${rowState === "value" ? "" : "disabled"} />
        `;
      return `
      <tr class="goal-row" style="--stagger:${index}" data-date="${dateKey}" data-state="${rowState}">
        <td>
          <input data-field="date" type="date" value="${escapeAttr(dateKey)}" readonly />
        </td>
        <td>
          <select data-field="state" class="week-entry-value-select">
            <option value="none" ${rowState === "none" ? "selected" : ""}>No entry</option>
            <option value="value" ${rowState === "value" ? "selected" : ""}>Value</option>
            <option value="na" ${rowState === "na" ? "selected" : ""}>N/A</option>
          </select>
        </td>
        <td>
          ${amountControl}
        </td>
        <td>
          <textarea data-field="notes" rows="2" maxlength="280" ${rowState === "none" ? "disabled" : ""}>${escapeHtml(entry ? entry.notes || "" : "")}</textarea>
          <p class="muted small">${escapeHtml(statusHelp)}</p>
        </td>
      </tr>
    `;
    })
    .join("");
  Array.from(yearSingleGoalBody.querySelectorAll("tr[data-date]")).forEach((row) => {
    syncYearSingleGoalRowControlState(row);
  });
}

function addGoalMetricToDraft() {
  if (!goalMetricName) {
    return;
  }
  if (!goalAdditionalTrackingEnabled || !goalAdditionalTrackingEnabled.checked) {
    return;
  }
  const metricName = normalizeProgressMetricName(goalMetricName.value);
  if (!metricName) {
    return;
  }
  const nextMetric = {
    name: metricName,
    unit: goalMetricUnit ? goalMetricUnit.value : ""
  };
  const fallbackUnit = goalUnit ? goalUnit.value : "units";
  const nextMetrics = normalizeProgressMetricList(
    [...goalMetricsDraft, nextMetric],
    {
      fallbackUnit,
      existingMetrics: goalMetricsDraft
    }
  );
  if (nextMetrics.length === goalMetricsDraft.length) {
    return;
  }
  goalMetricsDraft = nextMetrics;
  goalMetricName.value = "";
  if (goalMetricUnit) {
    goalMetricUnit.value = "";
  }
  goalMetricName.focus();
  renderGoalMetricsDraft();
}

function normalizeEntryMetricValues(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const normalized = {};
  Object.entries(value).forEach(([metricIdRaw, metricValue]) => {
    const metricId = String(metricIdRaw || "").trim();
    if (!metricId) {
      return;
    }
    const amount = normalizePositiveAmount(metricValue, -1);
    if (amount < 0) {
      return;
    }
    normalized[metricId] = amount;
  });
  return normalized;
}

function filterEntryMetricValuesByTracker(value, tracker) {
  const normalized = normalizeEntryMetricValues(value);
  const metrics = getTrackerProgressMetrics(tracker);
  if (metrics.length < 1) {
    return {};
  }
  const metricIds = new Set(metrics.map((metric) => metric.id));
  const filtered = {};
  Object.entries(normalized).forEach(([metricId, amount]) => {
    if (!metricIds.has(metricId)) {
      return;
    }
    filtered[metricId] = amount;
  });
  return filtered;
}

function collectEntryMetricValuesFromForm(tracker) {
  if (!entryMetricsGrid) {
    return {};
  }
  const metrics = getTrackerProgressMetrics(tracker);
  if (metrics.length < 1) {
    return {};
  }
  const metricIds = new Set(metrics.map((metric) => metric.id));
  const metricValues = {};
  const controls = Array.from(entryMetricsGrid.querySelectorAll("input[data-metric-id]"));
  controls.forEach((control) => {
    const metricId = String(control.dataset.metricId || "").trim();
    if (!metricIds.has(metricId)) {
      return;
    }
    const raw = String(control.value || "").trim();
    if (!raw) {
      return;
    }
    const amount = normalizePositiveAmount(raw, -1);
    if (amount < 0) {
      return;
    }
    metricValues[metricId] = amount;
  });
  return metricValues;
}

function renderEntryMetricInputs(tracker) {
  if (!entryMetricsWrap || !entryMetricsGrid) {
    return;
  }
  const metrics = getTrackerProgressMetrics(tracker);
  if (metrics.length < 1) {
    entryMetricsWrap.hidden = true;
    entryMetricsGrid.innerHTML = "";
    return;
  }
  entryMetricsWrap.hidden = false;
  entryMetricsGrid.innerHTML = metrics
    .map((metric) => `
      <label>
        ${escapeHtml(metric.name)} (${escapeHtml(metric.unit)})
        <input
          type="number"
          min="0"
          step="0.01"
          data-metric-id="${escapeAttr(metric.id)}"
          placeholder="0"
        />
      </label>
    `)
    .join("");
}

function formatEntryMetricDetails(entry, tracker) {
  if (!entry || !tracker) {
    return "";
  }
  const metrics = getTrackerProgressMetrics(tracker);
  if (metrics.length < 1) {
    return "";
  }
  const metricValues = filterEntryMetricValuesByTracker(entry.metricValues, tracker);
  const detailParts = metrics
    .filter((metric) => metricValues[metric.id] !== undefined)
    .map((metric) => `${metric.name}: ${formatAmount(metricValues[metric.id])} ${metric.unit}`);
  if (detailParts.length < 1) {
    return "";
  }
  return `Metrics | ${detailParts.join(" | ")}`;
}

function formatEntryGoalsPlusDetails(entry, tracker) {
  if (!entry || !tracker || !isGoalsPlusTracker(tracker)) {
    return "";
  }
  const goalsPlusEntry = normalizeGoalsPlusEntryData(entry);
  if (!goalsPlusEntry) {
    return "";
  }
  if (goalsPlusEntry.mode === GOALS_PLUS_SETUP_GOLF) {
    const scoreText = goalsPlusEntry.score > 0 ? ` | Score ${formatAmount(goalsPlusEntry.score)}` : "";
    return `Goals+ | ${formatGoalsPlusGolfType(goalsPlusEntry.golfType)}${scoreText}`;
  }
  const running = goalsPlusEntry;
  const intervalText = running.runningWorkout === "norwegian4x4" && running.workSpeed > 0 && running.recoverySpeed > 0
    ? ` | Speeds ${formatAmount(running.workSpeed)} mph/${formatAmount(running.recoverySpeed)} mph`
    : "";
  const hasRunMetrics = running.distance > 0 && running.durationMinutes > 0;
  const runMetricText = hasRunMetrics
    ? ` | ${formatAmount(running.distance)} mi in ${formatAmount(running.durationMinutes)} min | Pace ${formatPaceFromMinutes(running.paceMinutesPerMile)} | VO2 ${formatAmount(running.estimatedVo2)}`
    : "";
  const customExerciseParts = [];
  if (running.runningWorkout === "custom") {
    if (running.customExerciseName) {
      customExerciseParts.push(`Exercise ${running.customExerciseName}`);
    }
    if (running.customReps > 0) {
      customExerciseParts.push(`Reps ${formatAmount(running.customReps)}`);
    }
    if (running.customWeight > 0) {
      customExerciseParts.push(`Weight ${formatAmount(running.customWeight)}`);
    }
  }
  const customExerciseText = customExerciseParts.length > 0 ? ` | ${customExerciseParts.join(" | ")}` : "";
  return `Goals+ | ${formatRunningWorkout(running.runningWorkout)}${runMetricText}${intervalText}${customExerciseText}`;
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
  normalizeGoalType(value);
  return { weekly: 0, monthly: 0, yearly: 0 };
}

function getGoalTargetFieldElement(key) {
  if (key === "month" || key === "monthly") {
    return goalMonthly;
  }
  if (key === "year" || key === "yearly") {
    return goalYearly;
  }
  return goalWeekly;
}

function readGoalTargetInputValue(key) {
  const input = getGoalTargetFieldElement(key);
  return normalizeGoalTargetInt(input ? input.value : 0, 0);
}

function setGoalTargetInputValue(key, value) {
  const input = getGoalTargetFieldElement(key);
  if (!input) {
    return;
  }
  input.value = String(normalizeGoalTargetInt(value, 0));
}

function resetGoalTargetsToDefaults() {
  const defaults = getGoalTargetDefaults(goalType ? goalType.value : "quantity");
  setGoalTargetInputValue("weekly", defaults.weekly);
  setGoalTargetInputValue("monthly", defaults.monthly);
  setGoalTargetInputValue("yearly", defaults.yearly);
  goalTargetInputTouched.weekly = false;
  goalTargetInputTouched.monthly = false;
  goalTargetInputTouched.yearly = false;
}

function deriveGoalTargetsFromSource(sourceKey, sourceValue) {
  const safeValue = normalizeGoalTargetInt(sourceValue, 0);
  const weeklyFromYearly = Math.ceil(safeValue / 52);
  const monthlyFromYearly = Math.ceil(safeValue / 12);
  if (sourceKey === "yearly") {
    return {
      weekly: weeklyFromYearly,
      monthly: monthlyFromYearly,
      yearly: safeValue
    };
  }
  if (sourceKey === "monthly") {
    const yearly = safeValue * 12;
    return {
      weekly: Math.ceil(yearly / 52),
      monthly: safeValue,
      yearly
    };
  }
  const yearly = safeValue * 52;
  return {
    weekly: safeValue,
    monthly: Math.ceil(yearly / 12),
    yearly
  };
}

function normalizeTargetInputKey(sourceKey) {
  if (sourceKey === "month" || sourceKey === "monthly") {
    return "monthly";
  }
  if (sourceKey === "year" || sourceKey === "yearly") {
    return "yearly";
  }
  return "weekly";
}

function handleGoalTargetInput(sourceKey) {
  const normalizedKey = normalizeTargetInputKey(sourceKey);
  goalTargetInputTouched[normalizedKey] = true;
  const sourceValue = readGoalTargetInputValue(normalizedKey);
  const nextTargets = deriveGoalTargetsFromSource(normalizedKey, sourceValue);
  const keys = ["weekly", "monthly", "yearly"];
  keys.forEach((key) => {
    if (key === normalizedKey) {
      return;
    }
    if (goalTargetInputTouched[key]) {
      return;
    }
    setGoalTargetInputValue(key, nextTargets[key]);
  });
  if (goalCustomWeekEnabled && goalCustomWeekEnabled.checked && !goalCustomWeekTargetsEdited) {
    goalCustomWeekTargetsDraft = getDefaultCustomTargets(
      GOAL_TEMPLATE_WEEK_COUNT,
      readGoalTargetInputValue("weekly")
    );
  }
  if (goalCustomMonthEnabled && goalCustomMonthEnabled.checked && !goalCustomMonthTargetsEdited) {
    goalCustomMonthTargetsDraft = getDefaultCustomTargets(
      GOAL_TEMPLATE_MONTH_COUNT,
      readGoalTargetInputValue("monthly")
    );
  }
  syncGoalCustomTemplateVisibility();
}

function getDefaultCustomTargets(count, fallbackValue = 0) {
  const safeCount = Math.max(Math.floor(Number(count) || 0), 0);
  const safeFallback = normalizeGoalTargetInt(fallbackValue, 0);
  return Array.from({ length: safeCount }, () => safeFallback);
}

function normalizeCustomTargetList(value, count, fallbackValue = 0) {
  const safeCount = Math.max(Math.floor(Number(count) || 0), 0);
  const safeFallback = normalizeGoalTargetInt(fallbackValue, 0);
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: safeCount }, (_, index) => normalizeGoalTargetInt(source[index], safeFallback));
}

function resetGoalCustomTemplates() {
  if (goalCustomWeekEnabled) {
    goalCustomWeekEnabled.checked = false;
  }
  if (goalCustomMonthEnabled) {
    goalCustomMonthEnabled.checked = false;
  }
  goalCustomWeekTargetsDraft = [];
  goalCustomMonthTargetsDraft = [];
  goalCustomWeekTargetsEdited = false;
  goalCustomMonthTargetsEdited = false;
  syncGoalCustomTemplateVisibility();
}

function renderGoalCustomTemplateGrid(periodName) {
  const isWeek = periodName === "week";
  const gridEl = isWeek ? goalCustomWeekGrid : goalCustomMonthGrid;
  if (!gridEl) {
    return;
  }
  const count = isWeek ? GOAL_TEMPLATE_WEEK_COUNT : GOAL_TEMPLATE_MONTH_COUNT;
  const labelPrefix = isWeek ? "W" : "M";
  const fallbackValue = isWeek
    ? readGoalTargetInputValue("weekly")
    : readGoalTargetInputValue("monthly");
  const nextValues = isWeek
    ? normalizeCustomTargetList(goalCustomWeekTargetsDraft, count, fallbackValue)
    : normalizeCustomTargetList(goalCustomMonthTargetsDraft, count, fallbackValue);
  const inputsMarkup = nextValues
    .map((value, index) => `
      <label class="goal-template-cell">
        <span>${labelPrefix}${index + 1}</span>
        <input
          type="number"
          min="0"
          max="1000000"
          value="${normalizeGoalTargetInt(value, 0)}"
          data-template-period="${isWeek ? "week" : "month"}"
          data-template-index="${index}"
        />
      </label>
    `)
    .join("");
  gridEl.innerHTML = inputsMarkup;
  if (isWeek) {
    goalCustomWeekTargetsDraft = nextValues;
  } else {
    goalCustomMonthTargetsDraft = nextValues;
  }
}

function syncGoalCustomTemplateVisibility() {
  const weekEnabled = Boolean(goalCustomWeekEnabled && goalCustomWeekEnabled.checked);
  const monthEnabled = Boolean(goalCustomMonthEnabled && goalCustomMonthEnabled.checked);
  if (goalCustomWeekWrap) {
    goalCustomWeekWrap.hidden = !weekEnabled;
  }
  if (goalCustomMonthWrap) {
    goalCustomMonthWrap.hidden = !monthEnabled;
  }
  if (weekEnabled) {
    renderGoalCustomTemplateGrid("week");
  }
  if (monthEnabled) {
    renderGoalCustomTemplateGrid("month");
  }
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
  if (value === "week") {
    return "week";
  }
  if (value === "update-all-year") {
    return "update-all-year";
  }
  if (value === "update-single-goal-year") {
    return "update-single-goal-year";
  }
  return "solo";
}

function getStandardEntryTrackers() {
  return trackers.filter((tracker) => normalizeGoalType(tracker.goalType) !== "bucket" && !tracker.archived);
}

function hasActiveGoalsPlusRunningTracker() {
  return trackers.some((tracker) => !tracker.archived && isGoalsPlusRunningTracker(tracker));
}

function hasActiveGoalsPlusTracker() {
  return trackers.some((tracker) => !tracker.archived && isGoalsPlusTracker(tracker));
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

function getGoalMigrationCandidates() {
  return trackers
    .filter((tracker) => normalizeGoalType(tracker.goalType) !== "bucket")
    .sort(compareTrackersByPriority);
}

function syncGoalMigrationControls() {
  if (!goalMigrateSource || !goalMigrateArchiveSource) {
    return;
  }
  const hasSource = Boolean(String(goalMigrateSource.value || "").trim());
  goalMigrateArchiveSource.disabled = !hasSource;
}

function renderGoalMigrationOptions() {
  if (!goalMigrateSource) {
    return;
  }
  const selectedId = String(goalMigrateSource.value || "");
  const options = getGoalMigrationCandidates();
  goalMigrateSource.innerHTML = `
    <option value="">Don't migrate</option>
    ${options.map((tracker) => `<option value="${tracker.id}">${escapeHtml(tracker.name)}${tracker.archived ? " (Archived)" : ""}</option>`).join("")}
  `;
  if (selectedId && options.some((tracker) => tracker.id === selectedId)) {
    goalMigrateSource.value = selectedId;
  } else {
    goalMigrateSource.value = "";
  }
  goalMigrateSource.disabled = options.length < 1;
  if (goalMigrateSource.disabled && goalMigrateArchiveSource) {
    goalMigrateArchiveSource.checked = true;
  }
  syncGoalMigrationControls();
}

function migrateGoalTrackingToNewGoal(sourceTracker, targetTracker, options = {}) {
  const source = sourceTracker && typeof sourceTracker === "object" ? sourceTracker : null;
  const target = targetTracker && typeof targetTracker === "object" ? targetTracker : null;
  if (!source || !target || source.id === target.id) {
    return { movedEntries: 0, movedSchedules: 0, movedJournalLinks: 0, archivedSource: false };
  }
  let movedEntries = 0;
  entries.forEach((entry) => {
    if (!entry || entry.trackerId !== source.id) {
      return;
    }
    entry.trackerId = target.id;
    movedEntries += 1;
  });

  let movedSchedules = 0;
  schedules.forEach((item) => {
    if (!item || item.trackerId !== source.id) {
      return;
    }
    item.trackerId = target.id;
    movedSchedules += 1;
  });

  let movedJournalLinks = 0;
  goalJournalEntries.forEach((item) => {
    if (!item || item.trackerId !== source.id) {
      return;
    }
    item.trackerId = target.id;
    item.goalName = target.name;
    movedJournalLinks += 1;
  });

  const archiveSource = Boolean(options.archiveSource);
  if (archiveSource) {
    source.archived = true;
  }

  return {
    movedEntries,
    movedSchedules,
    movedJournalLinks,
    archivedSource: archiveSource
  };
}

function updateGoalTypeFields() {
  if (!goalType || !goalUnit || !goalWeekly || !goalMonthly || !goalYearly) {
    return;
  }
  const setupMode = normalizeGoalsPlusSetupMode(goalSetupMode ? goalSetupMode.value : GOALS_PLUS_SETUP_STANDARD);
  if (goalSetupMode) {
    goalSetupMode.value = setupMode;
  }
  const useGoalsPlus = setupMode !== GOALS_PLUS_SETUP_STANDARD;
  const goalsPlusNameOption = getGoalsPlusNameOption(goalNameGoalsPlus ? goalNameGoalsPlus.value : GOALS_PLUS_NAME_OPTIONS[0].value);
  const selectedGoalsPlusMode = useGoalsPlus
    ? normalizeGoalsPlusSetupMode(goalsPlusNameOption.mode)
    : GOALS_PLUS_SETUP_STANDARD;
  const useGoalsPlusRunning = selectedGoalsPlusMode === GOALS_PLUS_SETUP_RUNNING;
  const useGoalsPlusGolf = selectedGoalsPlusMode === GOALS_PLUS_SETUP_GOLF;
  if (goalNameGoalsPlus) {
    goalNameGoalsPlus.value = goalsPlusNameOption.value;
  }
  if (goalNameTextLabel) {
    goalNameTextLabel.hidden = false;
  }
  if (goalName) {
    goalName.hidden = useGoalsPlus;
    goalName.disabled = useGoalsPlus;
    goalName.required = !useGoalsPlus;
  }
  if (goalNameGoalsPlus) {
    goalNameGoalsPlus.hidden = !useGoalsPlus;
    goalNameGoalsPlus.disabled = !useGoalsPlus;
    goalNameGoalsPlus.required = useGoalsPlus;
  }
  const runningWorkout = normalizeRunningWorkout(
    useGoalsPlusRunning
      ? goalsPlusNameOption.runningWorkout
      : (goalPlusRunningWorkout ? goalPlusRunningWorkout.value : "easy")
  );
  if (goalPlusRunningWorkout) {
    goalPlusRunningWorkout.value = runningWorkout;
    goalPlusRunningWorkout.disabled = true;
  }
  const showNorwegianIntervals = useGoalsPlusRunning && runningWorkout === "norwegian4x4";
  if (goalPlusRunningWorkoutLabel) {
    goalPlusRunningWorkoutLabel.hidden = true;
  }
  if (goalPlusRunningWorkIntervalLabel) {
    goalPlusRunningWorkIntervalLabel.hidden = !showNorwegianIntervals;
  }
  if (goalPlusRunningRecoveryIntervalLabel) {
    goalPlusRunningRecoveryIntervalLabel.hidden = !showNorwegianIntervals;
  }
  if (goalPlusRunningNote) {
    goalPlusRunningNote.hidden = !useGoalsPlusRunning;
  }
  if (showNorwegianIntervals) {
    if (goalPlusRunningWorkInterval && normalizeRunningSpeedMph(goalPlusRunningWorkInterval.value, 0) <= 0) {
      goalPlusRunningWorkInterval.value = String(NORWEGIAN_DEFAULT_WORK_SPEED_MPH);
    }
    if (goalPlusRunningRecoveryInterval && normalizeRunningSpeedMph(goalPlusRunningRecoveryInterval.value, 0) <= 0) {
      goalPlusRunningRecoveryInterval.value = String(NORWEGIAN_DEFAULT_RECOVERY_SPEED_MPH);
    }
  } else {
    if (goalPlusRunningWorkInterval) {
      goalPlusRunningWorkInterval.value = String(NORWEGIAN_DEFAULT_WORK_SPEED_MPH);
    }
    if (goalPlusRunningRecoveryInterval) {
      goalPlusRunningRecoveryInterval.value = String(NORWEGIAN_DEFAULT_RECOVERY_SPEED_MPH);
    }
  }
  if (useGoalsPlus && goalType.value !== "quantity") {
    goalType.value = "quantity";
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
    if (!goalWeekly.value || Number(goalWeekly.value) < 0) {
      goalWeekly.value = String(targetDefaults.weekly);
    }
    if (!goalMonthly.value || Number(goalMonthly.value) < 0) {
      goalMonthly.value = String(targetDefaults.monthly);
    }
    if (!goalYearly.value || Number(goalYearly.value) < 0) {
      goalYearly.value = String(targetDefaults.yearly);
    }
    goalUnit.placeholder = lockedUnit;
  } else if (isFloatingGoalType(normalizedType)) {
    const targetDefaults = getGoalTargetDefaults(normalizedType);
    if (!String(goalUnit.value || "").trim() || goalUnit.value === "units") {
      goalUnit.value = "items";
    }
    if (!goalWeekly.value || Number(goalWeekly.value) < 0) {
      goalWeekly.value = String(targetDefaults.weekly);
    }
    if (!goalMonthly.value || Number(goalMonthly.value) < 0) {
      goalMonthly.value = String(targetDefaults.monthly);
    }
    if (!goalYearly.value || Number(goalYearly.value) < 0) {
      goalYearly.value = String(targetDefaults.yearly);
    }
    goalUnit.placeholder = "meals, projects, items";
  } else if (useGoalsPlusRunning) {
    if (!String(goalUnit.value || "").trim() || goalUnit.value === "units") {
      goalUnit.value = "miles";
    }
    goalUnit.placeholder = "miles";
  } else if (useGoalsPlusGolf) {
    if (!String(goalUnit.value || "").trim() || goalUnit.value === "units") {
      goalUnit.value = "strokes";
    }
    goalUnit.placeholder = "strokes";
  } else {
    if (!String(goalUnit.value || "").trim()) {
      goalUnit.value = "units";
    }
    goalUnit.placeholder = "miles, pages, calls";
  }
  syncGoalCustomTemplateVisibility();
}

function buildGoalsPlusConfigFromForm() {
  const setupMode = normalizeGoalsPlusSetupMode(goalSetupMode ? goalSetupMode.value : GOALS_PLUS_SETUP_STANDARD);
  if (setupMode === GOALS_PLUS_SETUP_STANDARD) {
    return normalizeGoalsPlusConfig({ mode: GOALS_PLUS_SETUP_STANDARD });
  }
  const selectedOption = getGoalsPlusNameOption(goalNameGoalsPlus ? goalNameGoalsPlus.value : GOALS_PLUS_NAME_OPTIONS[0].value);
  const selectedMode = normalizeGoalsPlusSetupMode(selectedOption.mode);
  if (selectedMode === GOALS_PLUS_SETUP_GOLF) {
    return normalizeGoalsPlusConfig({
      mode: GOALS_PLUS_SETUP_GOLF,
      golfType: normalizeGoalsPlusGolfType(selectedOption.golfType)
    });
  }
  const runningWorkout = normalizeRunningWorkout(selectedOption.runningWorkout);
  const isNorwegian = runningWorkout === "norwegian4x4";
  return normalizeGoalsPlusConfig({
    mode: GOALS_PLUS_SETUP_RUNNING,
    runningWorkout,
    workSpeed: isNorwegian
      ? normalizeRunningSpeedMph(
        goalPlusRunningWorkInterval ? goalPlusRunningWorkInterval.value : 0,
        NORWEGIAN_DEFAULT_WORK_SPEED_MPH
      )
      : 0,
    recoverySpeed: isNorwegian
      ? normalizeRunningSpeedMph(
        goalPlusRunningRecoveryInterval ? goalPlusRunningRecoveryInterval.value : 0,
        NORWEGIAN_DEFAULT_RECOVERY_SPEED_MPH
      )
      : 0
  });
}

function updateEntryGoalsPlusDerivedLabel() {
  if (!entryGoalsPlusDerived) {
    return;
  }
  const workout = normalizeRunningWorkout(entryGoalsPlusRunningWorkout ? entryGoalsPlusRunningWorkout.value : "easy");
  const distance = normalizePositiveAmount(entryGoalsPlusDistance ? entryGoalsPlusDistance.value : 0, 0);
  const duration = normalizePositiveAmount(entryGoalsPlusDuration ? entryGoalsPlusDuration.value : 0, 0);
  if (distance <= 0 || duration <= 0) {
    entryGoalsPlusDerived.textContent = workout === "custom"
      ? "Custom workout: log exercise, reps, and weight. Add distance and time if you also want pace and estimated VO2."
      : "Enter distance and time to calculate pace and estimated VO2.";
    return;
  }
  const pace = getPaceMinutesPerMile(distance, duration);
  const vo2 = getEstimatedRunningVo2(distance, duration);
  entryGoalsPlusDerived.textContent = `Estimated pace ${formatPaceFromMinutes(pace)} | Estimated VO2 ${formatAmount(vo2)}`;
}

function updateEntryGoalsPlusGolfLabel(tracker) {
  if (!entryGoalsPlusGolfNote) {
    return;
  }
  if (!isGoalsPlusGolfTracker(tracker)) {
    entryGoalsPlusGolfNote.textContent = "Goals+ Golf Entry";
    return;
  }
  const config = getGoalsPlusRunningConfig(tracker);
  entryGoalsPlusGolfNote.textContent = `Goals+ ${formatGoalsPlusGolfType(config.golfType)} Entry`;
}

function syncEntryGoalsPlusWorkoutVisibility(workoutValue) {
  if (
    !entryGoalsPlusWorkIntervalLabel
    || !entryGoalsPlusRecoveryIntervalLabel
    || !entryGoalsPlusCustomExerciseLabel
    || !entryGoalsPlusCustomRepsLabel
    || !entryGoalsPlusCustomWeightLabel
  ) {
    return;
  }
  const workout = normalizeRunningWorkout(workoutValue);
  const showIntervals = workout === "norwegian4x4";
  const showCustomFields = workout === "custom";
  entryGoalsPlusWorkIntervalLabel.hidden = !showIntervals;
  entryGoalsPlusRecoveryIntervalLabel.hidden = !showIntervals;
  entryGoalsPlusCustomExerciseLabel.hidden = !showCustomFields;
  entryGoalsPlusCustomRepsLabel.hidden = !showCustomFields;
  entryGoalsPlusCustomWeightLabel.hidden = !showCustomFields;
  if (!showIntervals) {
    if (entryGoalsPlusWorkInterval) {
      entryGoalsPlusWorkInterval.value = "";
    }
    if (entryGoalsPlusRecoveryInterval) {
      entryGoalsPlusRecoveryInterval.value = "";
    }
  }
  if (!showCustomFields) {
    if (entryGoalsPlusCustomExercise) {
      entryGoalsPlusCustomExercise.value = "";
    }
    if (entryGoalsPlusCustomReps) {
      entryGoalsPlusCustomReps.value = "";
    }
    if (entryGoalsPlusCustomWeight) {
      entryGoalsPlusCustomWeight.value = "";
    }
  }
}

function renderEntryGoalsPlusRunningInputs(tracker) {
  const running = isGoalsPlusRunningTracker(tracker);
  const golf = isGoalsPlusGolfTracker(tracker);
  if (entryGoalsPlusRunningWrap) {
    entryGoalsPlusRunningWrap.hidden = !running;
  }
  if (entryGoalsPlusGolfWrap) {
    entryGoalsPlusGolfWrap.hidden = !golf;
  }
  if (entryGoalsPlusGolfScore) {
    entryGoalsPlusGolfScore.disabled = !golf;
  }
  updateEntryGoalsPlusGolfLabel(tracker);
  if (!entryGoalsPlusRunningWrap || !entryGoalsPlusRunningWorkout || !entryGoalsPlusWorkIntervalLabel || !entryGoalsPlusRecoveryIntervalLabel || !entryGoalsPlusCustomExerciseLabel || !entryGoalsPlusCustomRepsLabel || !entryGoalsPlusCustomWeightLabel) {
    if (!golf && entryGoalsPlusGolfScore) {
      entryGoalsPlusGolfScore.value = "";
    }
    return;
  }
  entryGoalsPlusRunningWrap.hidden = !running;
  if (!running) {
    if (entryGoalsPlusDistance) {
      entryGoalsPlusDistance.value = "";
    }
    if (entryGoalsPlusDuration) {
      entryGoalsPlusDuration.value = "";
    }
    if (entryGoalsPlusWorkInterval) {
      entryGoalsPlusWorkInterval.value = "";
    }
    if (entryGoalsPlusRecoveryInterval) {
      entryGoalsPlusRecoveryInterval.value = "";
    }
    if (entryGoalsPlusCustomExercise) {
      entryGoalsPlusCustomExercise.value = "";
    }
    if (entryGoalsPlusCustomReps) {
      entryGoalsPlusCustomReps.value = "";
    }
    if (entryGoalsPlusCustomWeight) {
      entryGoalsPlusCustomWeight.value = "";
    }
    if (!golf && entryGoalsPlusGolfScore) {
      entryGoalsPlusGolfScore.value = "";
    }
    updateEntryGoalsPlusDerivedLabel();
    return;
  }
  const config = getGoalsPlusRunningConfig(tracker);
  const workout = normalizeRunningWorkout(config.runningWorkout);
  entryGoalsPlusRunningWorkout.value = workout;
  const showIntervals = workout === "norwegian4x4";
  syncEntryGoalsPlusWorkoutVisibility(workout);
  if (entryGoalsPlusWorkInterval) {
    entryGoalsPlusWorkInterval.value = showIntervals
      ? String(normalizeRunningSpeedMph(config.workSpeed, NORWEGIAN_DEFAULT_WORK_SPEED_MPH))
      : "";
  }
  if (entryGoalsPlusRecoveryInterval) {
    entryGoalsPlusRecoveryInterval.value = showIntervals
      ? String(normalizeRunningSpeedMph(config.recoverySpeed, NORWEGIAN_DEFAULT_RECOVERY_SPEED_MPH))
      : "";
  }
  updateEntryGoalsPlusDerivedLabel();
}

function collectGoalsPlusEntryDataFromForm(tracker) {
  if (isGoalsPlusGolfTracker(tracker)) {
    const config = getGoalsPlusRunningConfig(tracker);
    return {
      mode: GOALS_PLUS_SETUP_GOLF,
      golfType: normalizeGoalsPlusGolfType(config.golfType),
      score: normalizeGolfScore(entryGoalsPlusGolfScore ? entryGoalsPlusGolfScore.value : 0, 0)
    };
  }
  if (!isGoalsPlusRunningTracker(tracker)) {
    return null;
  }
  const config = getGoalsPlusRunningConfig(tracker);
  const runningWorkout = normalizeRunningWorkout(entryGoalsPlusRunningWorkout ? entryGoalsPlusRunningWorkout.value : config.runningWorkout);
  const distance = normalizePositiveAmount(entryGoalsPlusDistance ? entryGoalsPlusDistance.value : 0, 0);
  const durationMinutes = normalizePositiveAmount(entryGoalsPlusDuration ? entryGoalsPlusDuration.value : 0, 0);
  const paceMinutesPerMile = getPaceMinutesPerMile(distance, durationMinutes);
  const estimatedVo2 = getEstimatedRunningVo2(distance, durationMinutes);
  const isNorwegian = runningWorkout === "norwegian4x4";
  const isCustomWorkout = runningWorkout === "custom";
  return {
    mode: GOALS_PLUS_SETUP_RUNNING,
    runningWorkout,
    distance,
    durationMinutes,
    paceMinutesPerMile,
    estimatedVo2,
    workSpeed: isNorwegian
      ? normalizeRunningSpeedMph(
        entryGoalsPlusWorkInterval ? entryGoalsPlusWorkInterval.value : config.workSpeed,
        config.workSpeed || NORWEGIAN_DEFAULT_WORK_SPEED_MPH
      )
      : 0,
    recoverySpeed: isNorwegian
      ? normalizeRunningSpeedMph(
        entryGoalsPlusRecoveryInterval ? entryGoalsPlusRecoveryInterval.value : config.recoverySpeed,
        config.recoverySpeed || NORWEGIAN_DEFAULT_RECOVERY_SPEED_MPH
      )
      : 0,
    customExerciseName: isCustomWorkout
      ? normalizeCustomExerciseName(entryGoalsPlusCustomExercise ? entryGoalsPlusCustomExercise.value : "")
      : "",
    customReps: isCustomWorkout
      ? normalizeCustomWorkoutReps(entryGoalsPlusCustomReps ? entryGoalsPlusCustomReps.value : 0, 0)
      : 0,
    customWeight: isCustomWorkout
      ? normalizePositiveAmount(entryGoalsPlusCustomWeight ? entryGoalsPlusCustomWeight.value : 0, 0)
      : 0
  };
}

function updateEntryFormMode() {
  if (!entryTracker || !entryAmount || !entryAmountLabel || !entryYesNoLabel) {
    return;
  }
  const tracker = trackers.find((item) => item.id === entryTracker.value);
  const isBinaryGoal = tracker ? isBinaryGoalType(tracker.goalType) : false;
  const markNotApplicable = Boolean(entryNotApplicable && entryNotApplicable.checked);
  entryAmountLabel.hidden = isBinaryGoal;
  entryYesNoLabel.hidden = !isBinaryGoal;
  entryAmount.disabled = isBinaryGoal || markNotApplicable;
  if (entryYesNo) {
    entryYesNo.disabled = !isBinaryGoal || markNotApplicable;
  }
  if (isBinaryGoal) {
    entryAmount.value = "1.00";
  } else if (entryYesNo) {
    entryYesNo.value = "yes";
  }
  if (markNotApplicable) {
    entryAmount.value = "0.00";
    renderEntryMetricInputs(null);
    renderEntryGoalsPlusRunningInputs(null);
    return;
  }
  renderEntryMetricInputs(tracker || null);
  const goalsPlusTracker = hasActiveGoalsPlusTracker() ? tracker : null;
  renderEntryGoalsPlusRunningInputs(goalsPlusTracker || null);
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
  if (periodName === "quarter") {
    return checkIns.filter((item) => normalizeCheckInCadence(item.cadence) === "monthly");
  }
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

