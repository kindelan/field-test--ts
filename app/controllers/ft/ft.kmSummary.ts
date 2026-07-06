import { context, formatWeekYear, getColor, normalizeBikeCode } from "./ft.context.js";
import { renderBikePopup, renderErrorsPopup, renderAddErrorPopup } from "./ft.errorLog.js";
import { supabase } from "../../dao/supabaseclient.js";

// ✅ 1. POPUPS HELPERS FOR KM SUMMARY
function getFeelClass(feel: string): string {
  if (!feel) return '';
  const f = feel.toLowerCase();
  if (f === 'smooth') return 'green';
  if (f === 'intermediate') return 'amber';
  if (f === 'harsh') return 'red';
  return 'amber';
}

function getRatingClass(rating: string): string {
  if (!rating) return '';
  const r = rating.toLowerCase();
  if (r.includes('appropriate')) return 'green';
  if (r.includes('enough') || r.includes('much')) return 'red';
  return 'amber';
}

export function renderFieldTestPopup(popup: Window, name: string, data: any[]) {
  const motors = [...new Set(data.map(d => d.motor_code))];
  const totalsByMotor = motors.map(motor => {
    const total = data
      .filter(d => d.motor_code === motor)
      .reduce((acc, r) => acc + r.km, 0);
    return { motor, km: total };
  });

  const labels = totalsByMotor.map(m => m.motor);
  const dataset = [{
    label: "KM acumulados",
    data: totalsByMotor.map(m => m.km),
    backgroundColor: totalsByMotor.map((_, i) => getColor(i))
  }];

  popup.document.open();
  popup.document.write(`
<html>
<head>
  <meta charset="UTF-8" />
  <title>${name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-card: #151c2c;
      --border-color: #222e45;
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
    }
    body {
      margin: 0;
      padding: 30px;
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-main);
      color: var(--text-primary);
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 25px;
    }
    h2 {
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(to right, #6366f1, #a855f7, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 20px;
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    canvas {
      width: 100% !important;
      height: 400px !important;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>${name}</h2>
    <div class="card">
      <canvas id="chart"></canvas>
    </div>
  </div>
  <script>
    new Chart(document.getElementById("chart"), {
      type: "bar",
      data: {
        labels: ${JSON.stringify(labels)},
        datasets: ${JSON.stringify(dataset)}
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#f3f4f6', font: { family: 'Inter' } } }
        },
        scales: {
          x: { grid: { color: '#222e45' }, ticks: { color: '#9ca3af', font: { family: 'Inter' } } },
          y: { grid: { color: '#222e45' }, ticks: { color: '#9ca3af', font: { family: 'Inter' } } }
        }
      }
    });
  </script>
</body>
</html>
  `);
  popup.document.close();
}

export function simpleMotorPopup(popup: Window, data: any[]) {
  const motors = [...new Set(data.map(d => d.motor_code))];
  const totals = motors.map(m => {
    const rows = data.filter(d => d.motor_code === m);
    return {
      motor: m,
      km: rows.reduce((acc, r) => acc + r.km, 0)
    };
  });

  popup.document.open();
  popup.document.write(`
<html>
<head>
  <meta charset="UTF-8" />
  <title>KM por Motor</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-card: #151c2c;
      --border-color: #222e45;
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --accent-cyan: #06b6d4;
    }
    body {
      margin: 0;
      padding: 30px;
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-main);
      color: var(--text-primary);
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 25px;
    }
    h2 {
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(to right, #6366f1, #06b6d4, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    .chart {
      height: 350px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    th {
      background: rgba(255, 255, 255, 0.02);
      padding: 12px 14px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
      text-transform: uppercase;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
      font-size: 14px;
    }
    tr:last-child td {
      border-bottom: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>KM por Motor</h2>
    <div class="card">
      <div class="chart">
        <canvas id="chart"></canvas>
      </div>
    </div>
    
    <div class="card">
      <h3>Resumen por Motores</h3>
      <table>
        <thead>
          <tr>
            <th>Motor</th>
            <th>KM Acumulados</th>
          </tr>
        </thead>
        <tbody>
          ${totals.map(m => `
            <tr>
              <td>${m.motor}</td>
              <td>${m.km.toFixed(1)} km</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    function getColor(i) {
      const colors = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
      return colors[i % colors.length];
    }

    new Chart(document.getElementById("chart"), {
      type: "bar",
      data: {
        labels: ${JSON.stringify(totals.map(x => x.motor))},
        datasets: [{
          label: "KM",
          data: ${JSON.stringify(totals.map(x => x.km))},
          backgroundColor: ${JSON.stringify(totals.map((_, i) => getColor(i)))}
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { color: '#222e45' }, ticks: { color: '#9ca3af', font: { family: 'Inter' } } },
          y: { grid: { color: '#222e45' }, ticks: { color: '#9ca3af', font: { family: 'Inter' } } }
        }
      }
    });
  </script>
</body>
</html>
  `);
  popup.document.close();
}

export function simpleBikePopup(popup: Window, rows: { bikecode: string; km: number }[]) {
  const sorted = [...rows].sort((a, b) => b.km - a.km);

  popup.document.open();
  popup.document.write(`
<html>
<head>
  <meta charset="UTF-8" />
  <title>KM por Bici</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-card: #151c2c;
      --border-color: #222e45;
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --accent-cyan: #06b6d4;
    }
    body {
      margin: 0;
      padding: 30px;
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-main);
      color: var(--text-primary);
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 25px;
    }
    h2 {
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(to right, #6366f1, #06b6d4, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    .chart {
      height: 350px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    th {
      background: rgba(255, 255, 255, 0.02);
      padding: 12px 14px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
      text-transform: uppercase;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
      font-size: 14px;
    }
    tr:last-child td {
      border-bottom: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>KM por Bici</h2>
    <div class="card">
      <div class="chart">
        <canvas id="chart"></canvas>
      </div>
    </div>
    
    <div class="card">
      <h3>Resumen por Bicicletas</h3>
      <table>
        <thead>
          <tr>
            <th>Bici</th>
            <th>KM Acumulados</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(b => `
            <tr>
              <td>${b.bikecode}</td>
              <td>${b.km.toFixed(1)} km</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    function getColor(i) {
      const colors = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
      return colors[i % colors.length];
    }

    new Chart(document.getElementById("chart"), {
      type: "bar",
      data: {
        labels: ${JSON.stringify(sorted.map(x => x.bikecode))},
        datasets: [{
          label: "KM",
          data: ${JSON.stringify(sorted.map(x => x.km))},
          backgroundColor: ${JSON.stringify(sorted.map((_, i) => getColor(i)))}
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { autoSkip: false, color: '#9ca3af', font: { family: 'Inter' } }, grid: { color: '#222e45' } },
          y: { grid: { color: '#222e45' }, ticks: { color: '#9ca3af', font: { family: 'Inter' } } }
        }
      }
    });
  </script>
</body>
</html>
  `);
  popup.document.close();
}

function renderDynamicSection(section: string, title: string, questions: any[], f: any): string {
  const sectionQuestions = questions.filter(q => q.section === section);
  if (sectionQuestions.length === 0) return '';

  const activeQuestions = sectionQuestions.filter(q => {
    if (!q.parent_question_key) return true;
    const parentVal = f.answers?.[q.parent_question_key] ?? f[q.parent_question_key];
    return parentVal === q.parent_trigger_value;
  });

  if (activeQuestions.length === 0) return '';

  const radioItems = activeQuestions.filter(q => q.input_type === 'radio');
  const textItems = activeQuestions.filter(q => q.input_type !== 'radio');

  let html = `<div class="feedback-section"><h4>${title}</h4>`;

  if (radioItems.length > 0) {
    html += `<div class="ratings-grid" style="margin-bottom: 15px;">`;
    radioItems.forEach(q => {
      const val = f.answers?.[q.question_key] ?? f[q.question_key];
      const displayVal = val !== null && val !== undefined ? String(val) : '—';
      
      let badgeColor = '';
      if (q.question_key === 'motor_startup' || q.question_key === 'motor_stop' || q.question_key === 'assistance') {
        badgeColor = getFeelClass(displayVal);
      } else if (q.question_key.includes('assistance')) {
        badgeColor = getRatingClass(displayVal);
      } else {
        const lower = displayVal.toLowerCase();
        if (lower === 'yes' || lower === 'sí' || lower === 'smooth' || lower === 'suitable' || lower === 'si') badgeColor = 'green';
        else if (lower === 'no' || lower === 'harsh') badgeColor = 'red';
        else badgeColor = 'amber';
      }
      
      html += `
        <div class="rating-item">
          <span class="rating-label">${q.label}:</span>
          <span class="badge ${badgeColor}">${displayVal}</span>
        </div>
      `;
    });
    html += `</div>`;
  }

  if (textItems.length > 0) {
    html += `<div class="text-feedback-grid">`;
    textItems.forEach(q => {
      const val = f.answers?.[q.question_key] ?? f[q.question_key];
      const displayVal = val !== null && val !== undefined ? String(val) : '—';
      html += `
        <div class="info-block">
          <strong>${q.label}:</strong>
          <p>${displayVal !== '—' ? `"${displayVal}"` : displayVal}</p>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

export function renderFeedbackPopup(popup: Window, bikecode: string, feedbacks: any[], questions: any[] = []) {
  const feedbackCards = feedbacks.length === 0 
    ? `
      <div class="placeholder-view">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <p>No se han registrado valoraciones para la bicicleta <strong>${bikecode}</strong> en este Field Test.</p>
      </div>
    `
    : feedbacks.map((f: any) => {
        const rawDate = f.test_ride_log 
          ? (f.test_ride_log.ride_date || f.test_ride_log.completion_date || f.test_ride_log.ride_date_txt || f.test_ride_log.completion_date_txt) 
          : null;
        const dateStr = rawDate ? new Date(rawDate).toLocaleDateString() : '—';
        const isoDate = rawDate ? new Date(rawDate).toISOString().split('T')[0] : '';
        const distStr = f.test_ride_log ? `${f.test_ride_log.distance_km} km` : '—';
        const elevStr = f.test_ride_log && f.test_ride_log.elevation_m != null ? `${f.test_ride_log.elevation_m} m` : '—';
        const motorStr = f.test_ride_log && f.test_ride_log.motor_type ? f.test_ride_log.motor_type : '—';
        const riderEmail = f.rider_email ? `<span class="rider-email">&lt;${f.rider_email}&gt;</span>` : '';

        // Red bell alert if motor error exists
        const motorErrorVal = f.answers?.motor_error ?? f.motor_error;
        const errorAlertBell = motorErrorVal === 'Yes'
          ? `
            <span class="bell-alert" title="Motor Error Reported!">
              <svg class="bell-icon animate-bell" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </span>
          `
          : '';

        // Dynamic sections
        const telemetryHtml = renderDynamicSection('telemetry', 'Telemetry & Battery', questions, f);
        const motorFeelHtml = renderDynamicSection('motor_feel', 'Motor Feel', questions, f);
        const terrainHtml = renderDynamicSection('terrain', 'Terrain & Dynamic Mode', questions, f);

        // Error Status alert block inside the body
        const errorDescVal = f.answers?.error_description ?? f.error_description;
        const errorContent = motorErrorVal === 'Yes'
          ? `
            <div class="error-alert">
              <strong>⚠️ Motor Error Logged:</strong> ${errorDescVal || 'No description provided.'}
            </div>
          `
          : '';

        return `
          <details class="review-card review-card-accordion" data-date="${isoDate}" data-has-error="${motorErrorVal === 'Yes' ? 'true' : 'false'}">
            <summary class="review-card-summary">
              <div class="header-main-left">
                <span class="rider-name">👤 ${f.rider_name}</span>
                ${riderEmail}
                ${errorAlertBell}
              </div>
              <div class="header-meta-right">
                <span class="meta-pill">📅 ${dateStr}</span>
                <span class="meta-pill">🚴 ${distStr}</span>
                <span class="meta-pill">🏔️ ${elevStr}</span>
                <span class="meta-pill text-cyan">⚙️ Motor: ${motorStr}</span>
                <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </summary>
            
            <div class="review-card-body">
              ${errorContent}
              
              ${telemetryHtml}
              ${motorFeelHtml}
              ${terrainHtml}
            </div>
          </details>
        `;
      }).join('');

  popup.document.open();
  popup.document.write(`
<html>
<head>
  <meta charset="UTF-8" />
  <title>Rider Feedback - ${bikecode}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-card: #151c2c;
      --bg-input: #1e293b;
      --border-color: #222e45;
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      
      --accent-cyan: #06b6d4;
      --accent-green: #10b981;
      --accent-red: #ef4444;
      --accent-amber: #f59e0b;
      
      --primary-gradient: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      --border-radius: 12px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-main);
      color: var(--text-primary);
      padding: 40px 20px;
      line-height: 1.5;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    header {
      margin-bottom: 25px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
    }

    h1 {
      font-size: 26px;
      font-weight: 700;
      background: linear-gradient(to right, #6366f1, #a855f7, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .count-badge {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818cf8;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
    }

    /* FILTERS PANEL */
    .filters-panel {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 16px 24px;
      margin-bottom: 25px;
      display: flex;
      gap: 24px;
      align-items: center;
      flex-wrap: wrap;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .filter-group label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .filters-panel input, .filters-panel select {
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }

    .filters-panel input:focus, .filters-panel select:focus {
      border-color: var(--accent-cyan);
    }

    /* ACCORDION REVIEWS */
    details.review-card-accordion {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      margin-bottom: 16px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
      overflow: hidden;
      transition: border-color 0.2s ease;
    }

    details.review-card-accordion[open] {
      border-color: var(--accent-cyan);
    }

    summary.review-card-summary {
      background: rgba(255, 255, 255, 0.01);
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      outline: none;
      list-style: none;
    }

    summary.review-card-summary::-webkit-details-marker {
      display: none;
    }

    summary.review-card-summary:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .header-main-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-meta-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    summary.review-card-summary .chevron-icon {
      color: var(--text-secondary);
      transition: transform 0.2s;
      flex-shrink: 0;
    }

    details.review-card-accordion[open] summary.review-card-summary .chevron-icon {
      transform: rotate(180deg);
      color: var(--accent-cyan);
    }

    /* RED BELL ALERT */
    @keyframes shake {
      0%, 100% { transform: rotate(0); }
      15% { transform: rotate(8deg); }
      30% { transform: rotate(-8deg); }
      45% { transform: rotate(4deg); }
      60% { transform: rotate(-4deg); }
      75% { transform: rotate(2deg); }
      90% { transform: rotate(-2deg); }
    }

    .animate-bell {
      animation: shake 1.5s infinite;
      transform-origin: top center;
    }

    .bell-alert {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 50%;
      width: 26px;
      height: 26px;
      color: var(--accent-red);
    }

    .rider-name {
      font-size: 16px;
      font-weight: 600;
      color: white;
    }

    .rider-email {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .meta-pill {
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .meta-pill.text-cyan {
      color: var(--accent-cyan);
      border-color: rgba(6, 182, 212, 0.3);
    }

    .review-card-body {
      padding: 24px;
      border-top: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .error-alert {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
    }

    .ratings-grid {
      display: flex;
      gap: 30px;
      border-bottom: 1px dashed var(--border-color);
      padding-bottom: 15px;
      flex-wrap: wrap;
    }

    .rating-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .rating-label {
      font-size: 13px;
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 8px;
      text-transform: capitalize;
    }

    .badge.green {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge.amber {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .badge.red {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .text-feedback-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    @media (max-width: 600px) {
      .text-feedback-grid {
        grid-template-columns: 1fr;
      }
    }

    .info-block {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .info-block strong {
      font-size: 12px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .info-block p {
      font-size: 14px;
      color: white;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      padding: 10px 14px;
      border-radius: 8px;
    }

    .feedback-section {
      border-top: 1px solid var(--border-color);
      padding-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .feedback-section h4 {
      font-size: 14px;
      font-weight: 600;
      color: #a5b4fc;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .opinion-text {
      font-style: italic;
      font-size: 14px;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      padding: 10px 14px;
      border-radius: 8px;
    }

    .empty-section h4 {
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 13px;
    }

    .terrain-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }

    @media (max-width: 600px) {
      .terrain-grid {
        grid-template-columns: 1fr;
      }
    }

    .terrain-card {
      background: rgba(255,255,255,0.01);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 15px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .terrain-card h5 {
      font-size: 13px;
      font-weight: 600;
      color: white;
    }

    .terrain-card .badge {
      align-self: start;
    }

    .terrain-card p {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .comments-box {
      border-top: 2px solid var(--border-color);
      padding-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .comments-box h4 {
      font-size: 14px;
      font-weight: 600;
      color: #f472b6;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .main-comment {
      font-size: 15px;
      font-weight: 500;
      color: white;
      background: rgba(99, 102, 241, 0.05);
      border: 1px solid rgba(99, 102, 241, 0.2);
      padding: 14px;
      border-radius: 10px;
      line-height: 1.5;
    }

    .improvements-block {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 5px;
    }

    .improvements-block strong {
      font-size: 12px;
      color: var(--accent-amber);
    }

    .improvements-block p {
      font-size: 13px;
      color: var(--text-secondary);
      background: rgba(245, 158, 11, 0.03);
      border: 1px solid rgba(245, 158, 11, 0.15);
      padding: 10px;
      border-radius: 8px;
    }

    .placeholder-view {
      border: 2px dashed var(--border-color);
      border-radius: 16px;
      padding: 80px 20px;
      text-align: center;
      color: var(--text-secondary);
      font-size: 15px;
    }

    .placeholder-view svg {
      margin-bottom: 12px;
      color: var(--border-color);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>Rider Feedback Dossier</h1>
        <p style="color: var(--text-secondary); font-size:14px; margin-top: 4px;">Historial de valoraciones de rodadas</p>
      </div>
      <span class="count-badge">Bici: ${bikecode} (${feedbacks.length} reviews)</span>
    </header>

    <!-- FILTERS PANEL -->
    <div class="filters-panel">
      <div class="filter-group">
        <label>Fecha Desde</label>
        <input type="date" id="filter-start-date" />
      </div>
      <div class="filter-group">
        <label>Fecha Hasta</label>
        <input type="date" id="filter-end-date" />
      </div>
      <div class="filter-group">
        <label>Alertas / Errores</label>
        <select id="filter-error-status">
          <option value="all">Todos los feedbacks</option>
          <option value="error">Solo con error (⚠️ Campana)</option>
          <option value="no-error">Sin error (✅ Limpios)</option>
        </select>
      </div>
      <div style="margin-left: auto; align-self: flex-end;">
        <span id="filtered-count" class="count-badge">Mostrando ${feedbacks.length} de ${feedbacks.length} reviews</span>
      </div>
    </div>

    <main>
      ${feedbackCards}
    </main>
  </div>

  <script>
    const startInput = document.getElementById("filter-start-date");
    const endInput = document.getElementById("filter-end-date");
    const errorSelect = document.getElementById("filter-error-status");
    const countEl = document.getElementById("filtered-count");
    const items = document.querySelectorAll(".review-card-accordion");

    function applyFilters() {
      const startVal = startInput.value ? new Date(startInput.value) : null;
      const endVal = endInput.value ? new Date(endInput.value) : null;
      const errorVal = errorSelect.value;

      let visibleCount = 0;

      items.forEach(item => {
        const itemDateStr = item.getAttribute("data-date");
        const hasError = item.getAttribute("data-has-error") === "true";

        let dateMatch = true;
        if (itemDateStr) {
          const itemDate = new Date(itemDateStr);
          if (startVal && itemDate < startVal) dateMatch = false;
          if (endVal && itemDate > endVal) dateMatch = false;
        } else {
          if (startVal || endVal) dateMatch = false;
        }

        let errorMatch = true;
        if (errorVal === "error" && !hasError) errorMatch = false;
        if (errorVal === "no-error" && hasError) errorMatch = false;

        if (dateMatch && errorMatch) {
          item.style.display = "";
          visibleCount++;
        } else {
          item.style.display = "none";
        }
      });

      countEl.textContent = "Mostrando " + visibleCount + " de " + items.length + " reviews";
    }

    startInput.addEventListener("change", applyFilters);
    endInput.addEventListener("change", applyFilters);
    errorSelect.addEventListener("change", applyFilters);
  </script>
</body>
</html>
  `);
  popup.document.close();
}

// ✅ 2. MAIN LOAD KM SUMMARY FUNCTION
export async function loadKmSummary() {
  if (!context.selectedFTId) return;

  const tbody = document.getElementById("ft-km-tbody")!;
  tbody.innerHTML = "";

  const kmTotal = await context.service.getFieldTestKmTotal(context.selectedFTId);

  const totalEl = document.getElementById("ft-total-km")!;
  totalEl.innerHTML = `
    <strong>Km Field Test:</strong> ${kmTotal.toFixed(1)} km
    <button id="ft-motor-btn">Ver gráfico motores</button>
    <button id="ft-bike-btn">Ver gráfico bicis</button>
  `;

  const bindBasicButtons = () => {
    document.getElementById("ft-motor-btn")!.onclick = async () => {
      const popup = window.open("", "_blank");
      if (!popup) return;

      popup.document.write("<p>Cargando…</p>");

      const data = await context.service.getFieldTestWeeklyKmByMotor(context.selectedFTId!);
      simpleMotorPopup(popup, data);
    };

    document.getElementById("ft-bike-btn")!.onclick = async () => {
      const popup = window.open("", "_blank");
      if (!popup) return;

      popup.document.write("<p>Cargando…</p>");

      const res = await context.service.getAssignedBikesKmSummary(context.selectedFTId!);
      simpleBikePopup(popup, res.rows);
    };
  };

  bindBasicButtons();

  // Load error filter select options
  const filterContainer = document.getElementById("error-filter-container");
  const errorFilter = document.getElementById("error-filter") as HTMLSelectElement | null;
  const createTagForm = document.getElementById("create-tag-form") as HTMLFormElement | null;
  const errorSystemStatus = document.getElementById("error-system-status") as HTMLDivElement | null;

  let errorSystemEnabled = true;
  let tags: any[] = [];
  try {
    tags = await context.service.getErrorTags();
  } catch (err) {
    console.warn("Could not load error tags, disabling error system features:", err);
    errorSystemEnabled = false;
  }

  if (errorSystemEnabled) {
    const showErrorsBtn = `<button id="ft-errors-btn" class="primary-action" style="background: var(--accent-red); border-color: var(--accent-red); margin-left: 6px;">Ver gráfico errores</button>`;
    const showAddErrorBtn = context.userSession?.capabilities.canEditData
      ? `<button id="ft-add-error-btn" class="primary-action" style="background: var(--accent-red); border-color: var(--accent-red); margin-left: 6px;">Reportar Incidencia</button>`
      : ``;

    totalEl.innerHTML = `
      <strong>Km Field Test:</strong> ${kmTotal.toFixed(1)} km
      <button id="ft-motor-btn">Ver gráfico motores</button>
      <button id="ft-bike-btn">Ver gráfico bicis</button>
      ${showErrorsBtn}
      ${showAddErrorBtn}
    `;

    bindBasicButtons();

    document.getElementById("ft-errors-btn")!.onclick = async () => {
      const popup = window.open("", "_blank");
      if (!popup) return;

      popup.document.write("<p>Cargando…</p>");

      try {
        const errors = await context.service.getFieldTestErrors(context.selectedFTId!);
        renderErrorsPopup(popup, context.selectedFTName || "Field Test", errors);
      } catch (err) {
        console.error("Error loading field test errors popup:", err);
        popup.document.write(`<p style="color:red; font-family:sans-serif;">Error al cargar errores: ${err}</p>`);
      }
    };

    const addErrorBtn = document.getElementById("ft-add-error-btn");
    if (addErrorBtn) {
      addErrorBtn.onclick = async () => {
        const popup = window.open("", "_blank");
        if (!popup) return;

        popup.document.write("<p>Cargando…</p>");

        try {
          const tags = await context.service.getErrorTags();
          const assigned = await context.service.getBikesAssigned(context.selectedFTId!);
          
          // Extract bikes with details
          const bikes = assigned
            .filter(a => a && a.bikes)
            .map(a => ({
              id: (a.bikes as any).id,
              code: (a.bikes as any).bikecode,
              motor: (a.bikes as any).motorcode,
              battery: (a.bikes as any).batterycode
            }));

          renderAddErrorPopup(popup, context.selectedFTName || "Field Test", tags, bikes);
        } catch (err) {
          console.error("Error opening add error popup:", err);
          popup.document.write(`<p style="color:red; font-family:sans-serif;">Error al abrir formulario: ${err}</p>`);
        }
      };
    };

    if (filterContainer && errorFilter) {
      filterContainer.style.display = "flex";
      if (createTagForm) {
        if (context.userSession?.capabilities.canEditData) {
          createTagForm.style.display = "";
        } else {
          createTagForm.style.display = "none";
          const detailsAccordion = createTagForm.closest("details");
          if (detailsAccordion) detailsAccordion.style.display = "none";
        }
      }
      if (errorSystemStatus) errorSystemStatus.innerHTML = "";

      const currentVal = errorFilter.value;
      errorFilter.innerHTML = '<option value="all">Todos los errores</option>';
      tags.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = `${t.name} (${t.component})`;
        errorFilter.appendChild(opt);
      });
      // Keep selection if possible
      if ([...errorFilter.options].some(o => o.value === currentVal)) {
        errorFilter.value = currentVal;
      }
    }
  } else {
    if (filterContainer) filterContainer.style.display = "none";
    if (createTagForm) createTagForm.style.display = "none";
    if (errorSystemStatus) {
      errorSystemStatus.innerHTML = `
        <div class="error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div>
            <strong>Sistema de errores inactivo</strong><br/>
            Las tablas <code>error_tags</code> and <code>bike_errors</code> no existen en Supabase. Ejecuta las consultas SQL correspondientes para habilitar esta función.
          </div>
        </div>
      `;
    }
  }

  const res = await context.service.getAssignedBikesKmSummary(context.selectedFTId);
  const assigned = await context.service.getBikesAssigned(context.selectedFTId);
  const all = await context.service.getAllBikes();

  const activeIds = new Set(
    assigned
      .filter(a => a && a.bikes)
      .map(a => (a.bikes as any).id)
  );

  // Group res.rows by normalized code to prevent duplicate rows
  const groupedKm = new Map<string, { bikecode: string; km: number; elevation: number }>();
  res.rows.forEach(r => {
    const norm = normalizeBikeCode(r.bikecode) || r.bikecode;
    const key = norm.toLowerCase();
    const existing = groupedKm.get(key);
    if (existing) {
      existing.km += r.km;
      existing.elevation += r.elevation || 0;
    } else {
      groupedKm.set(key, { bikecode: norm, km: r.km, elevation: r.elevation || 0 });
    }
  });

  const consolidatedRows = Array.from(groupedKm.values());

  consolidatedRows.forEach(r => {
    const bike = all.find(b => {
      const normB = normalizeBikeCode(b.bikecode || "")?.toLowerCase();
      const normR = normalizeBikeCode(r.bikecode || "")?.toLowerCase();
      return normB === normR;
    });
    const isActive = bike && activeIds.has(bike.id);

    const tr = document.createElement("tr");
    if (bike) {
      tr.dataset.bikeId = bike.id;
    }
    tr.dataset.bikeCode = (bike?.bikecode ?? r.bikecode).toLowerCase();
    tr.dataset.isActive = isActive ? "true" : "false";

    tr.innerHTML = `
      <td>${bike?.bikecode ?? r.bikecode}</td>
      <td>${bike?.motorcode ?? "—"}</td>
      <td>${r.km.toFixed(1)} km</td>
      <td>${r.elevation.toLocaleString()} m</td>
      <td>${isActive ? '<span class="status-active">Active</span>' : '<span class="status-inactive">No active</span>'}</td>
      <td style="text-align: right; white-space: nowrap;">
        <button class="btn-weekly" style="padding: 4px 8px; font-size: 12px; background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary);">Métricas</button>
        <button class="primary-action btn-feedback" style="padding: 4px 8px; font-size: 12px; margin-left: 6px;">Ver Feedback</button>
      </td>
    `;

    // Metrics click handler
    tr.querySelector<HTMLButtonElement>(".btn-weekly")!.onclick = () => {
      const popup = window.open("", "_blank");
      if (!popup) return;

      popup.document.write("<p>Cargando…</p>");

      (async () => {
        const data = await context.service.getFieldTestWeeklyKmByMotor(context.selectedFTId!);
        const filtered = data.filter(d => {
          const normD = normalizeBikeCode(d.bike_code || "")?.toLowerCase();
          const normR = normalizeBikeCode(r.bikecode || "")?.toLowerCase();
          return normD === normR;
        });
        renderBikePopup(popup, bike?.bikecode ?? r.bikecode, filtered, context.selectedFTId!);
      })();
    };

    // Feedback click handler
    tr.querySelector<HTMLButtonElement>(".btn-feedback")!.onclick = () => {
      const popup = window.open("", "_blank");
      if (!popup) return;

      popup.document.write("<p>Cargando…</p>");

      (async () => {
        try {
          const feedbacks = await context.service.getBikeFeedback(context.selectedFTId!, bike?.bikecode ?? r.bikecode);
          const { data: questions, error: qErr } = await supabase
            .from("review_questions")
            .select("*")
            .or(`field_test_ids.is.null,field_test_ids.cs.{${context.selectedFTId!}}`)
            .order("sort_order", { ascending: true });

          if (qErr) throw qErr;

          renderFeedbackPopup(popup, bike?.bikecode ?? r.bikecode, feedbacks, questions || []);
        } catch (err) {
          console.error("Error loading feedback dossier:", err);
          popup.document.write(`<p style="color:red; font-family:sans-serif;">Error al cargar feedback: ${err}</p>`);
        }
      })();
    };

    tbody.appendChild(tr);
  });

  const bikeFilter = document.getElementById("bike-filter") as HTMLInputElement | null;
  const statusFilter = document.getElementById("status-filter") as HTMLSelectElement | null;

  const applySummaryFilters = () => {
    const bikeQuery = bikeFilter ? bikeFilter.value.trim().toLowerCase() : "";
    const statusQuery = statusFilter ? statusFilter.value : "all"; // "all", "active", "inactive"

    const rows = tbody.querySelectorAll("tr");
    rows.forEach(row => {
      const rHtml = row as HTMLElement;
      const rowBikeCode = rHtml.dataset.bikeCode || "";
      const rowIsActive = rHtml.dataset.isActive === "true";

      let matchBike = true;
      if (bikeQuery) {
        matchBike = rowBikeCode.includes(bikeQuery);
      }

      let matchStatus = true;
      if (statusQuery === "active") {
        matchStatus = rowIsActive;
      } else if (statusQuery === "inactive") {
        matchStatus = !rowIsActive;
      }

      if (matchBike && matchStatus) {
        rHtml.style.display = "";
      } else {
        rHtml.style.display = "none";
      }
    });
  };

  if (bikeFilter) {
    bikeFilter.oninput = applySummaryFilters;
  }
  if (statusFilter) {
    statusFilter.onchange = applySummaryFilters;
  }
}

// Register loadKmSummary in context for circular imports avoidance
context.loadKmSummary = loadKmSummary;
