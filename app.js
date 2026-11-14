const STORAGE_KEY = "concept-quest-v1";

const stages = [
  { name: "관계 맺기", short: "만나기", icon: "01", label: "주변에서 발견하기" },
  { name: "집중하기", short: "집중", icon: "02", label: "궁금한 질문 만들기" },
  { name: "조사하기", short: "조사", icon: "03", label: "근거와 정보 살피기" },
  { name: "조직·정리하기", short: "정리", icon: "04", label: "개념 사이 연결하기" },
  { name: "일반화하기", short: "일반화", icon: "05", label: "배움의 원리 표현하기" },
  { name: "전이하기", short: "전이", icon: "06", label: "새로운 상황에 적용하기" },
  { name: "성찰하기", short: "성찰", icon: "07", label: "배움 돌아보기" },
];

const sampleLesson = {
  id: "water-cycle",
  subject: "과학",
  grade: "초등 5학년",
  unit: "날씨와 우리 생활",
  concept: "물의 순환",
  keyIdeas: [
    "태양의 열을 받은 물은 수증기가 되어 공기 중으로 이동해요.",
    "공기 중의 수증기가 차가워지면 작은 물방울로 변해 구름을 만들어요.",
    "구름 속 물방울이 커지고 무거워지면 비나 눈으로 땅에 내려와요.",
    "물은 땅과 공기 사이를 계속 이동하며 생명과 날씨에 영향을 주어요.",
  ],
  completed: [],
  answers: {},
  createdAt: Date.now(),
  sample: true,
};

function initialState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.lessons)) return { ...saved, view: "home" };
  } catch (error) {
    console.warn("학습 기록을 불러오지 못했습니다.", error);
  }
  return {
    view: "home",
    xp: 0,
    lessons: [{ ...sampleLesson }],
    activeLessonId: sampleLesson.id,
    activeStage: 0,
  };
}

let state = initialState();
let toastTimer;
const content = document.querySelector("#app-content");

function save() {
  const { view, ...persisted } = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch (error) {
    console.error("학습 기록을 저장하지 못했습니다.", error);
    showToast("기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function currentLesson() {
  return state.lessons.find((lesson) => lesson.id === state.activeLessonId) || state.lessons[0];
}

function completedCount(lesson) {
  return lesson ? lesson.completed.length : 0;
}

function render() {
  document.querySelector("#xp-total").textContent = state.xp || 0;
  const viewLabels = { home: "탐험 지도", create: "새 탐험 만들기", learn: "개념 탐험", growth: "나의 성장" };
  document.querySelector("#page-label").textContent = viewLabels[state.view] || "탐험 지도";
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === state.view));
  if (state.view === "create") renderCreate();
  else if (state.view === "learn") renderLearn();
  else if (state.view === "growth") renderGrowth();
  else renderHome();
}

function stageTrack(lesson, compact = false) {
  const count = completedCount(lesson);
  const progress = count ? Math.min((count - 1) / 6 * 86, 86) : 0;
  return `<div class="stage-track" style="--progress:${progress}%">
    <span class="stage-track-progress"></span>
    ${stages.map((stage, index) => {
      const done = lesson.completed.includes(index);
      const current = !done && index === Math.min(count, 6);
      return `<div class="stage-node ${done ? "done" : ""} ${current ? "current" : ""}">
        <span class="stage-dot">${done ? "✓" : compact ? stage.icon.slice(1) : stage.icon.slice(1)}</span>
        <span>${stage.short}</span>
      </div>`;
    }).join("")}
  </div>`;
}

function renderHome() {
  const lesson = currentLesson();
  const totalDone = state.lessons.reduce((sum, item) => sum + completedCount(item), 0);
  const progress = lesson ? completedCount(lesson) : 0;
  content.innerHTML = `
    <div class="welcome-row">
      <div><div class="eyebrow">오늘도 새로운 발견을</div><h1>안녕, 탐험가님 <span aria-hidden="true">✦</span></h1><p>작은 질문 하나가 깊은 배움의 시작이 될 수 있어요.</p></div>
      <div class="date-chip">${new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</div>
    </div>
    <section class="hero">
      <div class="hero-copy">
        <div class="hero-kicker">✦ &nbsp; 오늘의 개념 탐험</div>
        <h2>${lesson ? `${escapeHtml(lesson.concept)}, 어떤 비밀이 숨어 있을까요?` : "새로운 개념을 탐험해 볼까요?"}</h2>
        <p>주변의 현상에서 출발해 질문을 만들고, 배운 개념을 새로운 상황에 연결해 보세요.</p>
        <button class="button button-light" data-action="${lesson ? "continue" : "create"}">${lesson ? "탐험 이어가기" : "첫 탐험 시작하기"} <span aria-hidden="true">→</span></button>
      </div>
      <div class="hero-art" aria-hidden="true"><div class="art-orbit"></div><div class="art-planet"></div><div class="art-leaf"></div><span class="art-star star-one">✦</span><span class="art-star star-two">✦</span><span class="art-card">IDEA IN MOTION</span></div>
    </section>
    <div class="stats-grid">
      <div class="stat-card"><span class="stat-icon green">✧</span><span><strong>${state.lessons.length}</strong><small>만든 탐험</small></span></div>
      <div class="stat-card"><span class="stat-icon yellow">✦</span><span><strong>${totalDone}</strong><small>완료한 단계</small></span></div>
      <div class="stat-card"><span class="stat-icon blue">↗</span><span><strong>${state.xp || 0}</strong><small>모은 경험치 XP</small></span></div>
    </div>
    <div class="section-heading"><h3>나의 탐험</h3><button class="text-button" data-view="create">+ 새 탐험 만들기</button></div>
    ${state.lessons.length ? `${state.lessons.map((item) => `<article class="lesson-card">
      <div class="lesson-illustration">${item.sample ? "💧" : "✦"}</div>
      <div class="lesson-info"><div class="lesson-meta">${escapeHtml(item.subject)} · ${escapeHtml(item.grade || "나만의 탐험")} · ${escapeHtml(item.unit || "개념 학습")}</div><h4>${escapeHtml(item.concept)}</h4><p>질문에서 출발해 개념을 연결하고, 새로운 상황에 적용해요.</p></div>
      <div class="lesson-action"><div class="mini-progress"><b>${completedCount(item)}</b> / 7 단계</div><button class="button button-soft" data-open-lesson="${escapeHtml(item.id)}">계속하기</button></div>
    </article>`).join("")}
    <section class="journey"><div class="journey-top"><h3>${escapeHtml(lesson.concept)} 탐험 여정</h3><span>${progress === 7 ? "모든 단계를 완료했어요!" : `다음 단계 · ${stages[Math.min(progress, 6)].name}`}</span></div>${stageTrack(lesson, true)}</section>`
      : `<div class="empty-state"><div class="empty-icon">✦</div><h3>첫 번째 탐험을 시작해 보세요</h3><p>배우고 싶은 교과서 개념과 핵심 내용을 입력하면 나만의 탐구 여정이 만들어져요.</p><button class="button button-primary" data-view="create">탐험 만들기</button></div>`}`;
}

function renderCreate() {
  content.innerHTML = `
    <div class="eyebrow">새로운 배움의 시작</div>
    <h1 class="page-title">어떤 개념을 탐험할까요?</h1>
    <p class="page-description">교과서에서 배우는 개념과 핵심 내용을 적어 주세요. 입력한 내용은 이 기기에만 저장되며, 질문·연결·적용 활동으로 이어집니다.</p>
    <div class="form-layout">
      <form class="form-card" id="create-form">
        <h3>탐험 정보</h3><p>알고 있는 내용을 적을수록 나에게 맞는 탐험이 돼요.</p>
        <div class="field-grid">
          <div class="field"><label for="subject">교과</label><input id="subject" name="subject" placeholder="예: 과학, 사회, 국어" required maxlength="30" /></div>
          <div class="field"><label for="grade">학년</label><input id="grade" name="grade" placeholder="예: 초등 5학년" maxlength="30" /></div>
        </div>
        <div class="field"><label for="unit">단원 이름</label><input id="unit" name="unit" placeholder="예: 날씨와 우리 생활" maxlength="60" /></div>
        <div class="field"><label for="concept">배울 개념 <span>필수</span></label><input id="concept" name="concept" placeholder="예: 물의 순환" required maxlength="60" /></div>
        <div class="field"><label for="keyIdeas">교과서 핵심 내용 <span>선택 · 줄바꿈으로 나누면 카드로 보여요</span></label><textarea id="keyIdeas" name="keyIdeas" placeholder="예: 태양의 열은 물을 수증기로 바꾼다.&#10;수증기가 차가워지면 작은 물방울이 되어 구름을 만든다.&#10;각 문장을 줄바꿈으로 구분해 주세요."></textarea><div class="field-hint">교과서 내용을 짧게 요약해 직접 입력해 주세요. 입력한 문장은 내 학습 활동에만 사용됩니다.</div></div>
        <div class="form-actions"><button type="button" class="button button-outline" data-view="home">취소</button><button type="submit" class="button button-primary">탐험 여정 만들기&nbsp; →</button></div>
      </form>
      <aside class="guide-card"><div class="guide-icon">✧</div><h3>일곱 단계로<br />깊이 있게 탐험해요</h3><p>단계는 순서대로 진행하지만, 필요하면 이전 단계로 돌아가 생각을 고칠 수 있어요.</p>
        <ol>${stages.map((stage, i) => `<li><span>${i + 1}</span>${stage.name}</li>`).join("")}</ol>
      </aside>
    </div>`;
}

function promptForStage(lesson, index) {
  const concept = escapeHtml(lesson.concept);
  const prompts = [
    { title: "주변에서 개념을 만나 봐요", instruction: "이 개념과 연결되는 경험이나 주변의 현상을 떠올려 보세요. 정답은 없어요. 먼저 눈에 띄는 것을 기록해요.", box: "이 개념을 떠올리면 어떤 장면이나 경험이 가장 먼저 생각나나요?" },
    { title: "나만의 탐구 질문을 만들어요", instruction: "무엇을 더 알고 싶은지 질문으로 표현해 보세요. '왜 그럴까?', '어떻게 달라질까?'처럼 질문을 구체적으로 다듬어도 좋아요.", box: `이번 탐험에서 답을 찾아보고 싶은 질문은 무엇인가요?` },
    { title: "핵심 내용을 천천히 살펴봐요", instruction: "교과서의 핵심 내용을 읽고, 각 문장에서 중요한 낱말과 원인·결과를 찾아보세요. 모르는 것은 표시해 두어도 괜찮아요.", box: `각 문장을 읽으며 ${concept}의 중요한 특징이나 관계를 찾아보세요.` },
    { title: "개념 사이의 연결을 정리해요", instruction: "핵심 낱말을 화살표나 문장으로 이어 보세요. 무엇이 먼저이고, 무엇이 영향을 주는지 설명해 봐요.", box: `핵심 낱말들을 연결해 보세요. “A가 달라지면 B가 달라진다. 왜냐하면…”` },
    { title: "여러 사례에서 공통 원리를 찾아요", instruction: "살펴본 사례들을 비교해 공통점을 발견하고, 한 문장으로 설명해 보세요. 이 문장은 새로운 상황에도 적용될 수 있어요.", box: `“${concept}은/는 …할 때 …한다. 왜냐하면 …”의 틀로 개념의 원리를 설명해 보세요.` },
    { title: "새로운 상황에 배움을 옮겨 봐요", instruction: "배운 개념을 아직 다루지 않은 상황에 적용해 보세요. 어떤 점이 비슷하고, 어떤 점이 다른지 근거와 함께 설명해요.", box: `${concept}을(를) 우리 생활 속 다른 상황에 적용한다면 무엇을 설명하거나 해결할 수 있을까요?` },
    { title: "탐험을 돌아보고 다음 질문을 찾아요", instruction: "처음의 생각과 지금의 생각을 비교해 보세요. 배움은 완성보다 변화의 과정에 가까워요.", box: `처음과 비교해 새롭게 이해하게 된 점은 무엇인가요? 다음에는 무엇을 더 탐구하고 싶나요?` },
  ];
  return prompts[index];
}

function renderLearn() {
  const lesson = currentLesson();
  if (!lesson) { state.view = "home"; render(); return; }
  const index = Math.min(state.activeStage, 6);
  const prompt = promptForStage(lesson, index);
  const done = lesson.completed.includes(index);
  const answer = lesson.answers[index] || "";
  const ideas = lesson.keyIdeas.length ? lesson.keyIdeas : [`${lesson.concept}에 관해 교과서에서 중요한 문장을 찾아보세요.`, `핵심 용어의 뜻을 확인하고, 서로 어떤 관계인지 살펴보세요.`];
  const ideaMarkup = index === 2 ? `<div class="idea-list">${ideas.map((idea, i) => `<div class="idea-item"><b>${i + 1}</b><span>${escapeHtml(idea)}</span></div>`).join("")}</div><div class="self-check"><b>스스로 확인하기</b><br />이 내용을 보지 않고도 친구에게 설명할 수 있나요? 중요한 낱말을 빠뜨리지 않았는지 확인해 보세요.</div>` : "";
  const answerLabel = index === 1 ? "나의 탐구 질문" : index === 2 ? "핵심 내용을 내 말로 설명하기" : index === 3 ? "개념 연결 기록" : index === 4 ? "나의 일반화 문장" : index === 5 ? "새로운 상황에 적용한 생각" : index === 6 ? "탐험 성찰" : "나의 관찰과 생각";
  const placeholder = index === 1 ? "예: 비가 온 뒤 물은 어디로 갈까? 어떤 조건에서 달라질까?" : index === 3 ? "예: 핵심 낱말을 → 로 이어 적고, 그 관계를 설명해 보세요." : index === 4 ? `예: ${lesson.concept}은/는 ... 한다. 왜냐하면 ...` : "여기에 나의 생각을 적어 보세요. 기록한 뒤에도 언제든 고칠 수 있어요.";
  content.innerHTML = `
    <div class="learn-head">
      <div><div class="eyebrow">${escapeHtml(lesson.subject)} · ${escapeHtml(lesson.grade || "나만의 탐험")} · ${escapeHtml(lesson.unit || "개념 학습")}</div><h1>${escapeHtml(lesson.concept)}</h1><p>생각을 기록하고 연결하며 내 언어로 이해해요.</p></div>
      <button class="exit-button" data-view="home">← 탐험 지도</button>
    </div>
    <div class="learning-progress" aria-label="탐험 진행률"><span style="width:${Math.max(completedCount(lesson) / 7 * 100, index / 7 * 100)}%"></span></div>
    <div class="learn-grid">
      <section class="activity-card">
        ${state.activeStage < 7 ? `<div class="step-topline"><span class="step-number">STEP 0${index + 1}</span><span>${stages[index].label}</span>${done ? '<span class="step-number">기록 완료</span>' : ""}</div>
        <h2>${prompt.title}</h2><p class="activity-prompt">${prompt.instruction}</p>
        <div class="prompt-box"><div class="prompt-label">생각 열기</div>${prompt.box}</div>
        ${ideaMarkup}
        <div class="field"><label for="stage-answer">${answerLabel}</label><textarea id="stage-answer" class="answer-area" placeholder="${escapeHtml(placeholder)}">${escapeHtml(answer)}</textarea></div>
        <div class="activity-actions"><button class="button button-outline" data-action="previous" ${index === 0 ? "disabled" : ""}>← 이전 단계</button>
          <div class="right-actions"><button class="button button-outline" data-action="save-answer">기록 저장</button><button class="button button-primary" data-action="complete-stage">${done ? index === 6 ? "탐험 마무리" : "다음 단계 →" : "기록하고 계속하기 →"}</button></div>
        </div>` : `<div class="complete-panel"><div class="complete-medal">🏅</div><h2>탐험을 완주했어요!</h2><p>${escapeHtml(lesson.concept)}을(를) 내 질문으로 살펴보고, 개념을 연결해 새로운 상황에 적용해 보았어요. 이 기록은 나만의 학습 노트에 저장돼요.</p><button class="button button-primary" data-view="home">탐험 지도 보기</button> <button class="button button-outline" data-view="growth">성장 기록 보기</button></div>`}
      </section>
      <aside>
        <section class="concept-card"><h3>이번 탐험</h3><span class="concept-badge">${escapeHtml(lesson.concept)}</span><p>${escapeHtml(lesson.keyIdeas.length ? lesson.keyIdeas.slice(0, 2).join("\n") : "교과서에서 핵심 문장을 찾아 나만의 지식 카드로 기록해 보세요.")}</p><hr class="concept-divider" /><div class="side-micro"><span>✦</span><div>생각을 바로 평가하기보다 근거를 찾아보고, 필요하면 이전 기록도 다시 살펴봐요.</div></div></section>
        <div class="note-card">💡 <b>탐험 팁</b><br />완벽한 문장보다 나의 생각을 먼저 적어 보세요. 틀린 생각도 새로운 질문의 출발점이 될 수 있어요.</div>
      </aside>
    </div>`;
}

function renderGrowth() {
  const totalDone = state.lessons.reduce((sum, lesson) => sum + completedCount(lesson), 0);
  const reflections = state.lessons.flatMap((lesson) => Object.entries(lesson.answers)
    .filter(([step, value]) => Number(step) === 6 && value.trim())
    .map(([, value]) => ({ concept: lesson.concept, value })));
  content.innerHTML = `
    <div class="eyebrow">나의 배움 돌아보기</div><h1 class="page-title">나의 성장 기록</h1>
    <p class="page-description">점수보다 내가 만든 질문, 연결한 개념, 달라진 생각을 살펴보세요.</p>
    <div class="growth-grid">
      <div class="growth-card"><h3>탐험 여정</h3><div class="growth-big">${state.lessons.length}<small> 개</small></div><div class="growth-sub">내가 시작한 개념 탐험</div></div>
      <div class="growth-card"><h3>생각의 발자국</h3><div class="growth-big">${totalDone}<small> 단계</small></div><div class="growth-sub">질문하고 연결하며 완료한 단계</div></div>
    </div>
    <section class="growth-card"><h3>탐험한 개념</h3><div class="reflection-list">${state.lessons.map((lesson) => `<div class="reflection-row"><span>${escapeHtml(lesson.subject)} · ${escapeHtml(lesson.concept)}</span><b>${completedCount(lesson)} / 7 단계</b></div>`).join("")}</div></section>
    <section class="growth-card" style="margin-top:14px"><h3>나의 성찰 노트</h3>${reflections.length ? `<div class="reflection-list">${reflections.map((item) => `<div class="reflection-row"><span>${escapeHtml(item.concept)} · ${escapeHtml(item.value)}</span><b>성찰</b></div>`).join("")}</div>` : `<p class="growth-sub">아직 성찰 기록이 없어요. 탐험의 마지막 단계에서 배움을 돌아보고 기록해 보세요.</p>`}</section>`;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

document.addEventListener("click", (event) => {
  const lessonButton = event.target.closest("[data-open-lesson]");
  if (lessonButton) {
    const lesson = state.lessons.find((item) => item.id === lessonButton.dataset.openLesson);
    if (lesson) {
      state.activeLessonId = lesson.id;
      state.activeStage = Math.min(completedCount(lesson), 7);
      state.view = "learn";
      render();
    }
    return;
  }
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    event.preventDefault();
    state.view = viewButton.dataset.view;
    render();
    return;
  }
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const lesson = currentLesson();
  switch (actionButton.dataset.action) {
    case "create":
      state.view = "create"; render(); break;
    case "continue":
      if (lesson) {
        state.activeLessonId = lesson.id;
        state.activeStage = Math.min(completedCount(lesson), 7);
        state.view = "learn"; render();
      }
      break;
    case "previous":
      if (state.activeStage > 0) { state.activeStage--; render(); }
      break;
    case "save-answer":
      storeCurrentAnswer();
      showToast("생각을 학습 노트에 저장했어요.");
      break;
    case "complete-stage":
      if (!document.querySelector("#stage-answer")?.value.trim()) {
        showToast("먼저 나의 생각을 한 줄이라도 적어 주세요.");
        document.querySelector("#stage-answer")?.focus();
        return;
      }
      storeCurrentAnswer();
      if (!lesson.completed.includes(state.activeStage)) {
        lesson.completed.push(state.activeStage);
        lesson.completed.sort((a, b) => a - b);
        state.xp = (state.xp || 0) + 10;
      }
      if (state.activeStage < 6) {
        state.activeStage++;
        showToast("새로운 생각을 기록했어요! +10 XP");
      } else {
        state.activeStage = 7;
        showToast("탐험 완주! 나만의 배움이 쌓였어요.");
      }
      save(); render();
      break;
  }
});

function storeCurrentAnswer() {
  const lesson = currentLesson();
  const area = document.querySelector("#stage-answer");
  if (!lesson || !area) return;
  lesson.answers[state.activeStage] = area.value;
  save();
}

document.addEventListener("submit", (event) => {
  if (event.target.id !== "create-form") return;
  event.preventDefault();
  const form = new FormData(event.target);
  const concept = String(form.get("concept") || "").trim();
  const subject = String(form.get("subject") || "").trim();
  if (!concept || !subject) return;
  const keyIdeas = String(form.get("keyIdeas") || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const lesson = {
    id: `lesson-${Date.now()}`,
    subject,
    grade: String(form.get("grade") || "").trim(),
    unit: String(form.get("unit") || "").trim(),
    concept,
    keyIdeas,
    completed: [],
    answers: {},
    createdAt: Date.now(),
  };
  state.lessons.unshift(lesson);
  state.activeLessonId = lesson.id;
  state.activeStage = 0;
  state.view = "learn";
  save(); render();
  showToast("나만의 개념 탐험을 만들었어요!");
});

render();
