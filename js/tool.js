/* ========================================
   情绪打卡 · 前端逻辑
   ----------------------------------------
   数据存在浏览器的 localStorage 里（键名：moodRecords）。
   等第 2 周学完 Node.js，只要把 saveData / loadData
   两个函数换成 fetch 请求后端接口，其余代码都不用动。
   ======================================== */

// ---------- 情绪分值对应的文字和颜色 ----------
const MOODS = {
  1: { label: '很差', color: '#c85a54' },
  2: { label: '有点低', color: '#d99a4e' },
  3: { label: '一般', color: '#9aa39c' },
  4: { label: '还不错', color: '#6fb393' },
  5: { label: '很好', color: '#37775f' },
};

// 画一个表情脸（SVG，跟随文字颜色）
function faceSvg(score, size) {
  const mouths = {
    1: 'M9.5 23.5 Q16 17.5 22.5 23.5',
    2: 'M10.5 23 Q16 19.5 21.5 23',
    3: 'M10.5 21 L21.5 21',
    4: 'M10.5 19.5 Q16 24.5 21.5 19.5',
    5: 'M9.5 18.5 Q16 26 22.5 18.5',
  };
  return '<svg viewBox="0 0 32 32" width="' + size + '" height="' + size + '"' +
    ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="16" cy="16" r="13"/>' +
    '<circle cx="11.5" cy="12.5" r="1.5" fill="currentColor" stroke="none"/>' +
    '<circle cx="20.5" cy="12.5" r="1.5" fill="currentColor" stroke="none"/>' +
    '<path d="' + mouths[score] + '"/></svg>';
}

let selectedScore = null;   // 当前选中的分数

// ========================================
// 一、读写数据（以后换后端，只改这两个函数）
// ========================================

function loadData() {
  try {
    return JSON.parse(localStorage.getItem('moodRecords') || '[]');
  } catch (e) {
    return [];
  }
}

function saveData(records) {
  localStorage.setItem('moodRecords', JSON.stringify(records));
}

// 取今天的日期字符串，格式 2026-10-04
function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// ========================================
// 二、选择心情
// ========================================

const moodPicker = document.getElementById('moodPicker');

moodPicker.addEventListener('click', (e) => {
  const btn = e.target.closest('.mood-option');
  if (!btn) return;

  // 全部取消选中，再给当前这个加上
  moodPicker.querySelectorAll('.mood-option').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedScore = Number(btn.dataset.score);
});

// ========================================
// 三、保存记录
// ========================================

const saveBtn = document.getElementById('saveBtn');
const noteInput = document.getElementById('noteInput');
const saveMsg = document.getElementById('saveMsg');

saveBtn.addEventListener('click', () => {
  if (!selectedScore) {
    showMsg('先选一个今天的心情吧', 'var(--red)');
    return;
  }

  const records = loadData();
  const today = todayStr();

  // 同一天重复打卡就覆盖，避免刷出一堆重复数据
  const existingIndex = records.findIndex((r) => r.date === today);
  const newRecord = {
    date: today,
    score: selectedScore,
    note: noteInput.value.trim(),
  };

  if (existingIndex >= 0) {
    records[existingIndex] = newRecord;
    showMsg('已更新今天的记录', 'var(--green-dark)');
  } else {
    records.push(newRecord);
    showMsg('已保存，明天记得再来', 'var(--green-dark)');
  }

  saveData(records);

  // 重置表单
  selectedScore = null;
  moodPicker.querySelectorAll('.mood-option').forEach((b) => b.classList.remove('selected'));
  noteInput.value = '';

  render();
});

function showMsg(text, color) {
  saveMsg.textContent = text;
  saveMsg.style.color = color;
  saveMsg.style.display = 'block';
  setTimeout(() => { saveMsg.style.display = 'none'; }, 2600);
}

// ========================================
// 四、渲染趋势图
// ========================================

const chartArea = document.getElementById('chartArea');
const listArea = document.getElementById('listArea');
const insightArea = document.getElementById('insightArea');

function render() {
  const records = loadData().sort((a, b) => a.date.localeCompare(b.date));
  renderChart(records);
  renderList(records);
  renderInsight(records);
}

function renderChart(records) {
  // 取最近 14 条
  const recent = records.slice(-14);

  if (recent.length === 0) {
    chartArea.innerHTML = '<div class="empty">还没有记录。从今天开始打卡，这里会出现你的情绪曲线。</div>';
    return;
  }

  // 分数 1-5 映射到柱子高度百分比
  const bars = recent.map((r) => {
    const heightPct = (r.score / 5) * 100;
    const dayLabel = r.date.slice(5).replace('-', '/');  // 10/04
    return `
      <div class="bar-wrap" title="${r.date}：${MOODS[r.score].label}">
        <div class="bar" style="height:${heightPct}%;background:${MOODS[r.score].color}"></div>
        <div class="bar-label">${dayLabel}</div>
      </div>`;
  }).join('');

  const avg = (recent.reduce((s, r) => s + r.score, 0) / recent.length).toFixed(1);

  chartArea.innerHTML = `
    <div class="chart">${bars}</div>
    <p style="font-size:13.5px;color:var(--text-light);margin:0">
      最近 ${recent.length} 次记录的平均分：<strong style="color:var(--green-dark)">${avg}</strong> / 5
    </p>`;
}

// ========================================
// 五、渲染历史列表
// ========================================

function renderList(records) {
  if (records.length === 0) {
    listArea.innerHTML = '<div class="empty">还没有记录。</div>';
    return;
  }

  // 最新的排前面
  const html = records.slice().reverse().map((r) => `
    <div class="record">
      <div class="face" style="color:${MOODS[r.score].color}">${faceSvg(r.score, 26)}</div>
      <div style="flex:1">
        <div class="date">${r.date} · ${MOODS[r.score].label}</div>
        ${r.note ? `<div class="note">${escapeHtml(r.note)}</div>` : ''}
      </div>
    </div>`).join('');

  listArea.innerHTML = html;
}

// 防止用户输入的内容里带 HTML 标签破坏页面
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ========================================
// 六、生成规律提示
// ========================================

function renderInsight(records) {
  // 记录少于 3 条不给结论
  if (records.length < 3) {
    insightArea.innerHTML = '';
    return;
  }

  const insights = [];
  const recent = records.slice(-14);
  const avg = recent.reduce((s, r) => s + r.score, 0) / recent.length;

  // 提示 1：连续低分
  let lowStreak = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].score <= 2) lowStreak++;
    else break;
  }

  // 提示 2：平均值偏低
  if (avg < 2.5) {
    insights.push(
      '最近两周你的平均分偏低。这可能只是这段时间事情多、压力大，' +
      '但如果已经持续两周以上，建议去学校心理咨询中心聊一次 —— ' +
      '不用等到「很严重」，早一点去会轻松很多。'
    );
  } else if (avg < 3.5) {
    insights.push(
      '最近两周整体在中等水平。如果某些天特别低，注意看看那天发生了什么，' +
      '是不是有可以调整的地方。'
    );
  } else {
    insights.push('最近两周整体状态还不错。继续保持现在的生活节奏。');
  }

  // 提示 3：星期几规律（有 5 条以上才有意义）
  if (records.length >= 5) {
    const dayScores = {};
    records.forEach((r) => {
      const day = new Date(r.date).getDay();   // 0=周日
      if (!dayScores[day]) dayScores[day] = [];
      dayScores[day].push(r.score);
    });

    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    let worstDay = null;
    let worstAvg = 6;

    Object.keys(dayScores).forEach((day) => {
      if (dayScores[day].length < 2) return;    // 至少记录过 2 次才算
      const dAvg = dayScores[day].reduce((a, b) => a + b, 0) / dayScores[day].length;
      if (dAvg < worstAvg) {
        worstAvg = dAvg;
        worstDay = day;
      }
    });

    if (worstDay !== null && worstAvg < 3) {
      insights.push(
        `你在${dayNames[worstDay]}的平均情绪最低（${worstAvg.toFixed(1)} 分）。` +
        `可以想想这天是不是课特别多、或者有什么固定让你不舒服的安排。`
      );
    }
  }

  // 提示 4：状态好转
  if (records.length >= 4) {
    const half = Math.floor(records.length / 2);
    const firstHalf = records.slice(0, half);
    const secondHalf = records.slice(-half);
    const firstAvg = firstHalf.reduce((s, r) => s + r.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, r) => s + r.score, 0) / secondHalf.length;

    if (secondAvg - firstAvg >= 1) {
      insights.push('和刚开始记录时相比，你最近的状态在变好。这值得记下来。');
    }
  }

  insightArea.innerHTML = `
    <h2>你可能想知道的</h2>
    <div class="card">
      ${insights.map((t) => `<p style="margin-bottom:12px">${t}</p>`).join('')}
    </div>
    <p style="font-size:12.5px;color:var(--text-light);margin-top:-4px">
      以上只是根据你自己记录的数据做出的简单统计，不是心理评估，也不构成任何诊断。
    </p>`;
}

// ========================================
// 七、清除全部记录
// ========================================

document.getElementById('clearBtn').addEventListener('click', () => {
  if (!confirm('确定要清除全部记录吗？清除后无法恢复。')) return;
  localStorage.removeItem('moodRecords');
  render();
});

// ========================================
// 八、页面打开时先渲染一次
// ========================================

// 把打卡按钮里的字符表情替换成 SVG 脸
moodPicker.querySelectorAll('.mood-option').forEach((btn) => {
  const face = btn.querySelector('.face');
  if (face) face.innerHTML = faceSvg(Number(btn.dataset.score), 30);
});

render();
