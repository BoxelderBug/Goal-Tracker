import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import htm from "https://esm.sh/htm@3.1.1";
import {
  AppShell,
  Badge,
  Button,
  Card,
  Container,
  Grid,
  Group,
  MantineProvider,
  NumberInput,
  Paper,
  Progress,
  RingProgress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  createTheme
} from "https://esm.sh/@mantine/core@7.17.8?deps=react@18.3.1,react-dom@18.3.1";
import {
  IconCalendarTime,
  IconFlame,
  IconSparkles,
  IconTargetArrow
} from "https://esm.sh/@tabler/icons-react@3.35.0?deps=react@18.3.1";

const html = htm.bind(React.createElement);

const appShellHeader = AppShell.Header;
const appShellMain = AppShell.Main;

const theme = createTheme({
  fontFamily: "Manrope, sans-serif",
  headings: {
    fontFamily: "Sora, Manrope, sans-serif"
  },
  primaryColor: "teal",
  defaultRadius: "md"
});

const PERIOD_TARGET_KEY = {
  week: "weeklyTarget",
  month: "monthlyTarget",
  quarter: "quarterlyTarget"
};

const STARTING_GOALS = [
  {
    id: "goal-1",
    name: "Run",
    unit: "miles",
    weeklyTarget: 18,
    monthlyTarget: 72,
    quarterlyTarget: 216,
    current: 9,
    priority: "High"
  },
  {
    id: "goal-2",
    name: "Read",
    unit: "pages",
    weeklyTarget: 140,
    monthlyTarget: 560,
    quarterlyTarget: 1680,
    current: 110,
    priority: "Medium"
  },
  {
    id: "goal-3",
    name: "Stretch",
    unit: "sessions",
    weeklyTarget: 6,
    monthlyTarget: 24,
    quarterlyTarget: 72,
    current: 4,
    priority: "Low"
  }
];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getStatusLabel(percent) {
  if (percent >= 100) {
    return "Hit";
  }
  if (percent >= 75) {
    return "On pace";
  }
  if (percent >= 40) {
    return "Behind";
  }
  return "At risk";
}

function getStatusColor(percent) {
  if (percent >= 100) {
    return "green";
  }
  if (percent >= 75) {
    return "teal";
  }
  if (percent >= 40) {
    return "yellow";
  }
  return "red";
}

function app() {
  const [period, setPeriod] = React.useState("week");
  const [goals, setGoals] = React.useState(STARTING_GOALS);
  const [draft, setDraft] = React.useState({
    name: "",
    unit: "miles",
    weeklyTarget: 12,
    priority: "High"
  });

  const periodKey = PERIOD_TARGET_KEY[period] || PERIOD_TARGET_KEY.week;
  const totals = goals.reduce(
    (acc, goal) => {
      const target = toNumber(goal[periodKey], 0);
      const current = toNumber(goal.current, 0);
      acc.target += target;
      acc.current += current;
      if (target > 0 && current >= target) {
        acc.hit += 1;
      }
      return acc;
    },
    { target: 0, current: 0, hit: 0 }
  );

  const completion = totals.target > 0 ? Math.round((totals.current / totals.target) * 100) : 0;
  const topPriority = goals.filter((goal) => goal.priority === "High").length;

  function updateDraft(key, value) {
    setDraft((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  function addGoal(event) {
    event.preventDefault();
    const goalName = String(draft.name || "").trim();
    if (!goalName) {
      return;
    }

    const weeklyTarget = Math.max(toNumber(draft.weeklyTarget, 0), 0);
    const nextGoal = {
      id: `goal-${Date.now()}`,
      name: goalName,
      unit: String(draft.unit || "units"),
      weeklyTarget,
      monthlyTarget: weeklyTarget * 4,
      quarterlyTarget: weeklyTarget * 12,
      current: 0,
      priority: draft.priority || "Medium"
    };

    setGoals((prev) => [nextGoal, ...prev]);
    setDraft({
      name: "",
      unit: draft.unit || "miles",
      weeklyTarget: 12,
      priority: draft.priority || "High"
    });
  }

  const rows = goals.map((goal) => {
    const target = Math.max(toNumber(goal[periodKey], 0), 0);
    const current = Math.max(toNumber(goal.current, 0), 0);
    const percent = target > 0 ? Math.round((current / target) * 100) : 0;
    const capped = Math.min(percent, 100);

    return html`
      <${Table.Tr} key=${goal.id}>
        <${Table.Td}>
          <${Group} gap="xs">
            <${IconTargetArrow} size=${15} />
            <${Text} fw=${700}>${goal.name}<//>
          <//>
          <${Text} size="xs" c="dimmed">${goal.unit}<//>
        <//>
        <${Table.Td}>
          <${Text} fw=${600}>${current}/${target}<//>
        <//>
        <${Table.Td}>
          <${Progress}
            value=${capped}
            color=${getStatusColor(percent)}
            size="lg"
            radius="xl"
          />
        <//>
        <${Table.Td}>
          <${Badge} color=${getStatusColor(percent)} variant="light">${getStatusLabel(percent)}<//>
        <//>
      <//>
    `;
  });

  return html`
    <${MantineProvider} theme=${theme} defaultColorScheme="light">
      <${AppShell} header=${{ height: 74 }} padding="md">
        <${appShellHeader}
          style=${{
            border: "0",
            background: "linear-gradient(120deg, #0f6f69 0%, #218f86 52%, #f19a53 100%)"
          }}
        >
          <${Group} h="100%" px="md" justify="space-between">
            <${Group} gap="sm">
              <${IconSparkles} color="white" size=${20} />
              <${Title} order=${3} c="white">Goal Tracker Mantine PoC<//>
            <//>
            <${Button}
              component="a"
              href="/"
              variant="white"
              color="dark"
            >
              Open current app
            <//>
          <//>
        <//>

        <${appShellMain}>
          <${Container} size="xl" py="md">
            <${Paper}
              p="md"
              radius="lg"
              mb="md"
              style=${{
                border: "1px solid #b7e8e2",
                background: "linear-gradient(160deg, #ffffff 0%, #eefcf9 70%)"
              }}
            >
              <${Group} justify="space-between" align="flex-start">
                <${Stack} gap=${3}>
                  <${Badge} size="lg" variant="light" color="teal">Prototype<//>
                  <${Title} order=${2}>One-screen React + Mantine sample<//>
                  <${Text} c="dimmed">
                    This is a side-by-side candidate for the Dashboard/Manage Goals experience.
                  <//>
                <//>
                <${SegmentedControl}
                  value=${period}
                  onChange=${setPeriod}
                  data=${[
                    { label: "Week", value: "week" },
                    { label: "Month", value: "month" },
                    { label: "Quarter", value: "quarter" }
                  ]}
                />
              <//>
            <//>

            <${SimpleGrid} cols=${3} spacing="md" mb="md" breakpoints=${[{ maxWidth: "md", cols: 1 }]}>
              <${Card} withBorder radius="lg" padding="md">
                <${Group} justify="space-between" mb="xs">
                  <${Text} fw=${700}>Progress<//>
                  <${IconFlame} size=${18} color="#d97706" />
                <//>
                <${Group} align="center" gap="md">
                  <${RingProgress}
                    size=${96}
                    thickness=${10}
                    sections=${[{ value: Math.min(completion, 100), color: "teal" }]}
                    label=${html`<${Text} ta="center" fw=${700} size="sm">${completion}%<//>`}
                  />
                  <${Stack} gap=${2}>
                    <${Text} size="sm" c="dimmed">Current ${period}<//>
                    <${Text} fw=${700}>${totals.current} / ${totals.target}<//>
                  <//>
                <//>
              <//>

              <${Card} withBorder radius="lg" padding="md">
                <${Group} justify="space-between" mb="xs">
                  <${Text} fw=${700}>High-priority goals<//>
                  <${Badge} color="orange" variant="light">${topPriority}<//>
                <//>
                <${Text} c="dimmed" size="sm">
                  Focus list for this week. Move these first if time gets tight.
                <//>
              <//>

              <${Card} withBorder radius="lg" padding="md">
                <${Group} justify="space-between" mb="xs">
                  <${Text} fw=${700}>Upcoming reminders<//>
                  <${IconCalendarTime} size=${18} color="#0f766e" />
                <//>
                <${Stack} gap="xs">
                  <${Text} size="sm">Thu 7:00 AM - Long Run<//>
                  <${Text} size="sm">Fri 8:30 PM - Weekly Review<//>
                  <${Text} size="sm">Sun 5:00 PM - Plan Next Week<//>
                <//>
              <//>
            <//>

            <${Grid} gutter="md">
              <${Grid.Col} span=${{ base: 12, md: 4 }}>
                <${Card} withBorder radius="lg" padding="md">
                  <${Title} order=${4} mb="sm">Quick Add Goal<//>
                  <${Text} size="sm" c="dimmed" mb="md">
                    This form is local-only in the PoC and demonstrates Mantine form controls.
                  <//>
                  <form onSubmit=${addGoal}>
                    <${Stack} gap="sm">
                      <${TextInput}
                        label="Goal name"
                        placeholder="Miles walked"
                        value=${draft.name}
                        onChange=${(event) => updateDraft("name", event.currentTarget.value)}
                        required
                      />
                      <${TextInput}
                        label="Unit"
                        placeholder="miles"
                        value=${draft.unit}
                        onChange=${(event) => updateDraft("unit", event.currentTarget.value)}
                      />
                      <${NumberInput}
                        label="Weekly target"
                        min=${0}
                        value=${draft.weeklyTarget}
                        onChange=${(value) => updateDraft("weeklyTarget", toNumber(value, 0))}
                      />
                      <${Select}
                        label="Priority"
                        data=${["High", "Medium", "Low"]}
                        value=${draft.priority}
                        onChange=${(value) => updateDraft("priority", value || "Medium")}
                      />
                      <${Button} type="submit">Add Goal<//>
                    <//>
                  </form>
                <//>
              <//>

              <${Grid.Col} span=${{ base: 12, md: 8 }}>
                <${Card} withBorder radius="lg" padding="md">
                  <${Group} justify="space-between" mb="sm">
                    <${Title} order=${4}>Goals Snapshot<//>
                    <${Badge} color="teal" variant="dot">${period}<//>
                  <//>
                  <${Table} highlightOnHover verticalSpacing="sm">
                    <${Table.Thead}>
                      <${Table.Tr}>
                        <${Table.Th}>Goal<//>
                        <${Table.Th}>Current / Target<//>
                        <${Table.Th}>Progress<//>
                        <${Table.Th}>Status<//>
                      <//>
                    <//>
                    <${Table.Tbody}>${rows}<//>
                  <//>
                <//>
              <//>
            <//>
          <//>
        <//>
      <//>
    <//>
  `;
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(html`<${app} />`);
}
