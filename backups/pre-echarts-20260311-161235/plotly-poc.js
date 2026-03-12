(function () {
  const goals = [
    { name: "Run", unit: "miles", target: 18, weekly: [11, 14, 16, 17, 12, 15, 16, 18] },
    { name: "Read", unit: "pages", target: 140, weekly: [96, 104, 120, 122, 110, 138, 142, 132] },
    { name: "Stretch", unit: "sessions", target: 6, weekly: [3, 4, 5, 6, 4, 5, 6, 6] }
  ];
  const weeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];
  const periodLabel = "This Week";
  const summaryEl = document.getElementById("summary-cards");
  const tableEl = document.getElementById("snapshot-table");
  const chartEls = {
    progress: document.getElementById("progress-chart"),
    polar: document.getElementById("goal-polar"),
    heatmap: document.getElementById("heatmap-chart"),
    progressBars: document.getElementById("progress-bars-chart"),
    chart3d: document.getElementById("chart-3d")
  };

  const plotLayoutBase = {
    margin: { l: 48, r: 20, t: 24, b: 40 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.72)",
    font: { family: "Manrope, sans-serif", color: "#2f4a67" }
  };

  const config = {
    displayModeBar: false,
    responsive: true
  };

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

  function renderProgressChart() {
    const palette = [
      { actual: "#2f6ba9", target: "#89abd5" },
      { actual: "#e0843f", target: "#f4bb8e" },
      { actual: "#2f8f81", target: "#89c8bd" }
    ];

    const traces = [];
    goals.forEach((goal, index) => {
      const colors = palette[index % palette.length];
      traces.push({
        type: "scatter",
        mode: "lines+markers",
        name: `${goal.name} Actual`,
        x: weeks,
        y: goal.weekly,
        line: { color: colors.actual, width: 3, shape: "spline" },
        marker: { size: 7, color: colors.actual },
        hovertemplate: `${goal.name} %{x}: %{y}<extra></extra>`
      });
      traces.push({
        type: "scatter",
        mode: "lines",
        name: `${goal.name} Target`,
        x: weeks,
        y: weeks.map(function () { return goal.target; }),
        line: { color: colors.target, width: 2, dash: "dash" },
        hovertemplate: `${goal.name} target: %{y}<extra></extra>`
      });
    });

    const layout = Object.assign({}, plotLayoutBase, {
      legend: {
        orientation: "h",
        yanchor: "bottom",
        y: 1.06,
        xanchor: "left",
        x: 0
      },
      xaxis: { gridcolor: "#dce8f4", zeroline: false },
      yaxis: { gridcolor: "#dce8f4", zeroline: false }
    });

    Plotly.newPlot(chartEls.progress, traces, layout, config);
  }

  function renderPolarChart() {
    const values = goals.map((goal) => Math.min(getPercent(goal), 140));
    const labels = goals.map((goal) => goal.name);
    const trace = {
      type: "scatterpolar",
      r: values.concat(values[0]),
      theta: labels.concat(labels[0]),
      fill: "toself",
      fillcolor: "rgba(47, 107, 169, 0.24)",
      line: { color: "#2f6ba9", width: 3 },
      marker: { size: 8, color: "#2f6ba9" },
      name: "Current Week %"
    };

    const layout = {
      margin: { l: 26, r: 26, t: 16, b: 16 },
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Manrope, sans-serif", color: "#2f4a67" },
      polar: {
        bgcolor: "rgba(248, 252, 255, 0.8)",
        radialaxis: {
          visible: true,
          range: [0, 140],
          gridcolor: "#dce8f4",
          tickfont: { color: "#527194" }
        },
        angularaxis: {
          tickfont: { size: 12, color: "#314c6b", family: "Sora, Manrope, sans-serif" }
        }
      },
      showlegend: false
    };

    Plotly.newPlot(chartEls.polar, [trace], layout, config);
  }

  function renderHeatmap() {
    const z = goals.map((goal) => (
      goal.weekly.map((value) => (
        goal.target ? Math.round((value / goal.target) * 100) : 0
      ))
    ));

    const trace = {
      type: "heatmap",
      x: weeks,
      y: goals.map((goal) => goal.name),
      z: z,
      colorscale: [
        [0, "#ffd9bf"],
        [0.35, "#f8f0bf"],
        [0.6, "#d6efe7"],
        [0.8, "#8bc6e5"],
        [1, "#2f6ba9"]
      ],
      zmin: 0,
      zmax: 120,
      hovertemplate: "%{y} %{x}: %{z}%<extra></extra>"
    };

    const annotations = [];
    goals.forEach(function (goal, goalIndex) {
      weeks.forEach(function (week, weekIndex) {
        annotations.push({
          x: week,
          y: goal.name,
          text: `${z[goalIndex][weekIndex]}%`,
          showarrow: false,
          font: { color: "#1f3e60", size: 11, family: "Manrope, sans-serif" }
        });
      });
    });

    const layout = Object.assign({}, plotLayoutBase, {
      margin: { l: 80, r: 20, t: 20, b: 46 },
      xaxis: { gridcolor: "#dce8f4", ticks: "" },
      yaxis: { gridcolor: "#dce8f4", ticks: "" },
      annotations: annotations
    });

    Plotly.newPlot(chartEls.heatmap, [trace], layout, config);
  }

  function renderProgressBars() {
    const labels = goals.map(function (goal) { return goal.name; });
    const values = goals.map(function (goal) { return getPercent(goal); });

    const trace = {
      type: "bar",
      orientation: "h",
      y: labels,
      x: values,
      marker: {
        color: ["#2f6ba9", "#e0843f", "#2f8f81"],
        line: { color: "#ffffff", width: 1.4 }
      },
      text: values.map(function (value) { return `${value}%`; }),
      textposition: "outside",
      hovertemplate: "%{y}: %{x}%<extra></extra>"
    };

    const layout = Object.assign({}, plotLayoutBase, {
      margin: { l: 86, r: 28, t: 14, b: 28 },
      xaxis: {
        range: [0, 120],
        gridcolor: "#dce8f4",
        ticksuffix: "%",
        zeroline: false
      },
      yaxis: {
        categoryorder: "array",
        categoryarray: labels
      },
      showlegend: false
    });

    Plotly.newPlot(chartEls.progressBars, [trace], layout, config);
  }

  function render3dChart() {
    const points = [];
    for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
      for (let intensity = 1; intensity <= 5; intensity += 1) {
        const base = 42 + (weekIndex * 5.5) + (intensity * 8);
        const wave = Math.sin((weekIndex + 1) * 0.85 + intensity * 0.7) * 9;
        const value = Math.round(base + wave);
        points.push({ weekIndex: weekIndex + 1, effort: intensity, score: value });
      }
    }

    const trace = {
      type: "scatter3d",
      mode: "markers",
      x: points.map(function (point) { return point.weekIndex; }),
      y: points.map(function (point) { return point.effort; }),
      z: points.map(function (point) { return point.score; }),
      marker: {
        size: 6,
        color: points.map(function (point) { return point.score; }),
        colorscale: [
          [0, "#ffd9bf"],
          [0.3, "#f8f0bf"],
          [0.6, "#d6efe7"],
          [0.8, "#8bc6e5"],
          [1, "#2f6ba9"]
        ],
        cmin: 30,
        cmax: 110,
        opacity: 0.95,
        colorbar: {
          title: "Score",
          x: 1.02,
          thickness: 10
        }
      },
      hovertemplate: "Week %{x}<br>Effort %{y}<br>Score %{z}<extra></extra>"
    };

    const layout = {
      margin: { l: 0, r: 0, t: 0, b: 0 },
      paper_bgcolor: "rgba(0,0,0,0)",
      scene: {
        xaxis: {
          title: "Week",
          tickvals: weeks.map(function (_item, index) { return index + 1; }),
          ticktext: weeks,
          gridcolor: "#dce8f4",
          zerolinecolor: "#dce8f4",
          color: "#3a587a"
        },
        yaxis: {
          title: "Effort",
          tickvals: [1, 2, 3, 4, 5],
          ticktext: ["E1", "E2", "E3", "E4", "E5"],
          gridcolor: "#dce8f4",
          zerolinecolor: "#dce8f4",
          color: "#3a587a"
        },
        zaxis: {
          title: "Score",
          gridcolor: "#dce8f4",
          zerolinecolor: "#dce8f4",
          color: "#3a587a"
        },
        bgcolor: "rgba(248, 252, 255, 0.76)",
        camera: {
          eye: { x: 1.45, y: 1.2, z: 0.85 }
        }
      }
    };

    Plotly.newPlot(chartEls.chart3d, [trace], layout, config);
  }

  function init() {
    if (!window.Plotly || !summaryEl || !tableEl) {
      return;
    }
    renderSummary();
    renderTable();
    renderProgressChart();
    renderPolarChart();
    renderHeatmap();
    renderProgressBars();
    render3dChart();
  }

  init();
})();
