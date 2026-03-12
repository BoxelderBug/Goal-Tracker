(function () {
  const goals = [
    { name: "Run", unit: "miles", target: 18, weekly: [11, 14, 16, 17, 12, 15, 16, 18] },
    { name: "Read", unit: "pages", target: 140, weekly: [96, 104, 120, 122, 110, 138, 142, 132] },
    { name: "Stretch", unit: "sessions", target: 6, weekly: [3, 4, 5, 6, 4, 5, 6, 6] }
  ];
  const weeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];
  const periodLabel = "This Week";
  const chartEls = {
    progress: document.getElementById("progress-chart"),
    radar: document.getElementById("goal-radar"),
    heatmap: document.getElementById("heatmap-chart"),
    progressBars: document.getElementById("progress-bars-chart"),
    chart3d: document.getElementById("chart-3d")
  };
  const summaryEl = document.getElementById("summary-cards");
  const tableEl = document.getElementById("snapshot-table");
  const charts = [];

  function getCurrentValue(goal) {
    return goal.weekly[goal.weekly.length - 1];
  }

  function getPercent(goal) {
    if (!goal.target) {
      return 0;
    }
    return Math.round((getCurrentValue(goal) / goal.target) * 100);
  }

  function getStatus(percent) {
    if (percent >= 100) {
      return "Hit";
    }
    if (percent >= 75) {
      return "On Pace";
    }
    if (percent >= 45) {
      return "Behind";
    }
    return "At Risk";
  }

  function renderSummary() {
    const totalCurrent = goals.reduce((sum, goal) => sum + getCurrentValue(goal), 0);
    const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
    const overallPct = totalTarget ? Math.round((totalCurrent / totalTarget) * 100) : 0;
    const hitCount = goals.filter((goal) => getPercent(goal) >= 100).length;
    const avgPct = goals.length
      ? Math.round(goals.reduce((sum, goal) => sum + getPercent(goal), 0) / goals.length)
      : 0;

    const cards = [
      { label: "Period", value: periodLabel },
      { label: "Total Progress", value: `${totalCurrent}/${totalTarget}` },
      { label: "Overall Completion", value: `${overallPct}%` },
      { label: "Goals Hit", value: `${hitCount}/${goals.length} (${avgPct}% avg)` }
    ];

    summaryEl.innerHTML = cards.map((card) => (
      `<article class="metric"><small>${card.label}</small><strong>${card.value}</strong></article>`
    )).join("");
  }

  function renderTable() {
    tableEl.innerHTML = goals.map((goal) => {
      const current = getCurrentValue(goal);
      const percent = getPercent(goal);
      return (
        `<tr>
          <td><strong>${goal.name}</strong><br><small>${goal.unit}</small></td>
          <td>${current}</td>
          <td>${goal.target}</td>
          <td>${getStatus(percent)} (${percent}%)</td>
        </tr>`
      );
    }).join("");
  }

  function initProgressChart() {
    const chart = echarts.init(chartEls.progress);
    const series = goals.flatMap((goal) => ([
      {
        name: `${goal.name} Actual`,
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        data: goal.weekly,
        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.08 }
      },
      {
        name: `${goal.name} Target`,
        type: "line",
        data: weeks.map(function () { return goal.target; }),
        lineStyle: { width: 1.6, type: "dashed", opacity: 0.8 },
        symbol: "none"
      }
    ]));

    chart.setOption({
      color: ["#0f766e", "#5bc6bb", "#f08a45", "#f7b27f", "#3868ba", "#87a9e3"],
      tooltip: { trigger: "axis" },
      legend: {
        top: 6,
        textStyle: { color: "#355f5a", fontWeight: 600 },
        itemGap: 14
      },
      grid: { left: 44, right: 20, top: 64, bottom: 36 },
      xAxis: {
        type: "category",
        data: weeks,
        axisLine: { lineStyle: { color: "#8ec8c0" } },
        axisLabel: { color: "#406864", fontWeight: 600 }
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#d9ece8" } },
        axisLabel: { color: "#406864", fontWeight: 600 }
      },
      series: series
    });

    charts.push(chart);
  }

  function initRadarChart() {
    const chart = echarts.init(chartEls.radar);
    const maxPct = 140;
    const indicators = goals.map((goal) => ({
      name: goal.name,
      max: maxPct
    }));
    const values = goals.map((goal) => Math.min(getPercent(goal), maxPct));

    chart.setOption({
      tooltip: {},
      radar: {
        indicator: indicators,
        center: ["50%", "55%"],
        radius: "68%",
        splitNumber: 5,
        axisName: { color: "#355f5a", fontWeight: 700 },
        splitArea: {
          areaStyle: { color: ["#f5fffd", "#effaf8", "#e8f6f3", "#e0f3ef", "#daf0eb"] }
        },
        splitLine: { lineStyle: { color: "#cae8e3" } },
        axisLine: { lineStyle: { color: "#c0e1db" } }
      },
      series: [
        {
          type: "radar",
          data: [
            {
              value: values,
              name: "Current Week %",
              areaStyle: { color: "rgba(15, 118, 110, 0.25)" },
              lineStyle: { color: "#0f766e", width: 3 },
              symbolSize: 8,
              itemStyle: { color: "#0f766e" }
            }
          ]
        }
      ]
    });

    charts.push(chart);
  }

  function initHeatmapChart() {
    const chart = echarts.init(chartEls.heatmap);
    const heatmapData = [];
    goals.forEach((goal, goalIndex) => {
      goal.weekly.forEach((value, weekIndex) => {
        const percent = goal.target ? Math.round((value / goal.target) * 100) : 0;
        heatmapData.push([weekIndex, goalIndex, percent]);
      });
    });

    chart.setOption({
      tooltip: {
        position: "top",
        formatter: function (params) {
          const goalName = goals[params.value[1]].name;
          const weekName = weeks[params.value[0]];
          return `${goalName} ${weekName}: ${params.value[2]}%`;
        }
      },
      grid: { left: 72, right: 22, top: 24, bottom: 46 },
      xAxis: {
        type: "category",
        data: weeks,
        splitArea: { show: true },
        axisLabel: { color: "#406864", fontWeight: 600 },
        axisLine: { lineStyle: { color: "#8ec8c0" } }
      },
      yAxis: {
        type: "category",
        data: goals.map((goal) => goal.name),
        splitArea: { show: true },
        axisLabel: { color: "#406864", fontWeight: 600 },
        axisLine: { lineStyle: { color: "#8ec8c0" } }
      },
      visualMap: {
        min: 0,
        max: 120,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 2,
        inRange: {
          color: ["#ffd9bf", "#f8f0bf", "#c5eedf", "#72cbb8", "#0f766e"]
        },
        textStyle: { color: "#406864", fontWeight: 700 }
      },
      series: [
        {
          type: "heatmap",
          data: heatmapData,
          label: {
            show: true,
            formatter: function (params) { return `${params.value[2]}%`; },
            color: "#173c37",
            fontWeight: 700,
            fontSize: 11
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 12,
              shadowColor: "rgba(0, 0, 0, 0.22)"
            }
          }
        }
      ]
    });

    charts.push(chart);
  }

  function initProgressBarsChart() {
    const chart = echarts.init(chartEls.progressBars);
    const categories = goals.map(function (goal) { return goal.name; });
    const percentages = goals.map(function (goal) { return getPercent(goal); });

    chart.setOption({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: function (params) {
          const item = params && params[0] ? params[0] : null;
          if (!item) {
            return "";
          }
          return `${item.name}: ${item.value}%`;
        }
      },
      grid: { left: 92, right: 28, top: 16, bottom: 20 },
      xAxis: {
        type: "value",
        max: 120,
        splitLine: { lineStyle: { color: "#d9ece8" } },
        axisLabel: {
          color: "#406864",
          fontWeight: 700,
          formatter: function (value) { return `${value}%`; }
        }
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: { color: "#406864", fontWeight: 700 },
        axisLine: { lineStyle: { color: "#8ec8c0" } }
      },
      series: [
        {
          type: "bar",
          data: percentages,
          barWidth: 20,
          showBackground: true,
          backgroundStyle: { color: "#eef8f5" },
          itemStyle: {
            borderRadius: [0, 10, 10, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: "#0f766e" },
              { offset: 1, color: "#45b6a8" }
            ])
          },
          label: {
            show: true,
            position: "right",
            color: "#244d47",
            fontWeight: 700,
            formatter: function (params) {
              return `${params.value}%`;
            }
          }
        }
      ]
    });

    charts.push(chart);
  }

  function init3dChart() {
    if (!window.echarts || !chartEls.chart3d) {
      return;
    }
    const chart = echarts.init(chartEls.chart3d);
    const data = [];
    for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
      for (let intensity = 1; intensity <= 5; intensity += 1) {
        const base = 42 + (weekIndex * 5.5) + (intensity * 8);
        const wave = Math.sin((weekIndex + 1) * 0.85 + intensity * 0.7) * 9;
        const value = Math.round(base + wave);
        data.push([weekIndex, intensity - 1, value]);
      }
    }

    chart.setOption({
      tooltip: {
        formatter: function (params) {
          const value = params.value || [0, 0, 0];
          return `Week ${weeks[value[0]]}<br>Effort ${value[1] + 1}<br>Score ${value[2]}`;
        }
      },
      visualMap: {
        min: 30,
        max: 110,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 2,
        textStyle: { color: "#406864", fontWeight: 700 },
        inRange: {
          color: ["#ffd9bf", "#f8f0bf", "#d7efe7", "#73cdbb", "#0f766e"]
        }
      },
      xAxis3D: {
        type: "category",
        data: weeks,
        name: "Week",
        nameTextStyle: { color: "#3b6761" },
        axisLabel: { color: "#355f5a" }
      },
      yAxis3D: {
        type: "category",
        data: ["E1", "E2", "E3", "E4", "E5"],
        name: "Effort",
        nameTextStyle: { color: "#3b6761" },
        axisLabel: { color: "#355f5a" }
      },
      zAxis3D: {
        type: "value",
        name: "Score",
        nameTextStyle: { color: "#3b6761" },
        axisLabel: { color: "#355f5a" }
      },
      grid3D: {
        boxWidth: 120,
        boxDepth: 72,
        environment: "auto",
        viewControl: {
          alpha: 26,
          beta: 32,
          distance: 180
        },
        light: {
          main: { intensity: 1.1, shadow: true },
          ambient: { intensity: 0.35 }
        }
      },
      series: [
        {
          type: "bar3D",
          data: data,
          shading: "lambert",
          bevelSize: 0.3,
          label: { show: false }
        }
      ]
    });

    charts.push(chart);
  }

  function init() {
    if (!window.echarts || !summaryEl || !tableEl) {
      return;
    }
    renderSummary();
    renderTable();
    initProgressChart();
    initRadarChart();
    initHeatmapChart();
    initProgressBarsChart();
    init3dChart();
    window.addEventListener("resize", function () {
      charts.forEach(function (chart) {
        chart.resize();
      });
    });
  }

  init();
})();
