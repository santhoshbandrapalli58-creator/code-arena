const defaultProblems = [
  {
    id: 'E1',
    title: 'Two Sum Basics',
    difficulty: 'Easy',
    type: 'mcq',
    points: 100,
    text: 'Which operation is the fastest way to find the value in a sorted array with O(log n) time complexity?',
    options: ['Linear scan', 'Binary search', 'Hash map lookup', 'Bubble sort'],
    answer: 'Binary search',
    tag: 'Arrays'
  },
  {
    id: 'E2',
    title: 'Prime Check Logic',
    difficulty: 'Easy',
    type: 'mcq',
    points: 100,
    text: 'A number is prime if it has exactly two positive divisors. Which of these is prime?',
    options: ['1', '9', '13', '21'],
    answer: '13',
    tag: 'Math'
  },
  {
    id: 'E3',
    title: 'Find Max in Array',
    difficulty: 'Easy',
    type: 'fill',
    points: 100,
    text: 'Complete the function that returns the largest value in an array.',
    starterCode: `function maxValue(nums) {
  // TODO: return the maximum element in nums
  return nums[0];
}`,
    answerSnippet: 'Math.max(...nums)',
    tag: 'Arrays'
  },
  {
    id: 'E4',
    title: 'Reverse String',
    difficulty: 'Easy',
    type: 'code',
    points: 100,
    text: 'Write a function that reverses the characters in a string.',
    starterCode: `function reverseString(str) {
  // Write your solution here
}`,
    answerSnippet: 'split("").reverse().join("")',
    tag: 'Strings'
  },
  {
    id: 'M1',
    title: 'Balanced Parentheses',
    difficulty: 'Medium',
    type: 'mcq',
    points: 250,
    text: 'Which data structure is most suitable to validate matching parentheses in a string?',
    options: ['Queue', 'Tree', 'Stack', 'Priority queue'],
    answer: 'Stack',
    tag: 'Stacks'
  },
  {
    id: 'M2',
    title: 'Sum of Even Numbers',
    difficulty: 'Medium',
    type: 'fill',
    points: 250,
    text: 'Fill in the missing logic to sum only even numbers from an array.',
    starterCode: `function sumEven(nums) {
  let total = 0;
  for (let i = 0; i < nums.length; i++) {
    // TODO: add nums[i] to total if it is even
  }
  return total;
}`,
    answerSnippet: 'if (nums[i] % 2 === 0) total += nums[i];',
    tag: 'Loops'
  },
  {
    id: 'M3',
    title: 'Longest Word',
    difficulty: 'Medium',
    type: 'code',
    points: 250,
    text: 'Write a function that returns the longest word in a sentence.',
    starterCode: `function longestWord(sentence) {
  // Write your solution here
}`,
    answerSnippet: 'split(/\\s+/)',
    tag: 'Strings'
  },
  {
    id: 'H1',
    title: 'Merge Sorted Arrays',
    difficulty: 'Hard',
    type: 'fill',
    points: 500,
    text: 'Complete the function that merges two sorted arrays into one sorted array.',
    starterCode: `function mergeSorted(a, b) {
  const merged = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    // TODO: push the smaller value and advance the pointer
  }
  return merged.concat(a.slice(i), b.slice(j));
}`,
    answerSnippet: 'if (a[i] <= b[j]) merged.push(a[i++]); else merged.push(b[j++]);',
    tag: 'Arrays'
  },
  {
    id: 'H2',
    title: 'Top K Frequent',
    difficulty: 'Hard',
    type: 'code',
    points: 500,
    text: 'Write a function that returns the k most frequent elements in descending order of frequency.',
    starterCode: `function topKFrequent(nums, k) {
  // Write your solution here
}`,
    answerSnippet: 'Map',
    tag: 'Hashing'
  },
  {
    id: 'H3',
    title: 'Binary Search Tree Validation',
    difficulty: 'Hard',
    type: 'code',
    points: 500,
    text: 'Write a function that checks whether a tree is a valid BST.',
    starterCode: `function isValidBST(root) {
  // Write your solution here
}`,
    answerSnippet: 'inorder',
    tag: 'Trees'
  }
];

const BOARD_CONFIG = {
  rows: 5,
  cols: 8,
  nodes: {
    E1: { x: 1, y: 0 },
    E2: { x: 0, y: 2 },
    E3: { x: 4, y: 2 },
    E4: { x: 2, y: 4 },
    M1: { x: 5, y: 0 },
    M2: { x: 3, y: 2 },
    M3: { x: 0, y: 4 },
    H1: { x: 3, y: 4 },
    H2: { x: 5, y: 2 },
    H3: { x: 7, y: 0 }
  }
};

const state = {
  room: null,
  currentPlayer: null,
  master: { name: 'Master', score: 0, solved: 0, wrong: 0, firstBloods: 0, role: 'master' },
  players: [],
  problems: structuredClone(defaultProblems),
  countdown: 25 * 60,
  gameStarted: false,
  ended: false,
  timerInterval: null,
  leaderboardInterval: null,
  notifications: [],
  selectedProblem: null,
  roomHistory: []
};

const roomBadge = document.getElementById('roomBadge');
const timerInput = document.getElementById('timerInput');
const timerValue = document.getElementById('timerValue');
const problemUpload = document.getElementById('problemUpload');
const createRoomButton = document.getElementById('createRoomButton');
const copyJoinLinkButton = document.getElementById('copyJoinLinkButton');
const joinLinkInput = document.getElementById('joinLinkInput');
const problemStats = document.getElementById('problemStats');
const problemBreakdown = document.getElementById('problemBreakdown');
const roomInput = document.getElementById('roomInput');
const rollInput = document.getElementById('rollInput');
const nameInput = document.getElementById('nameInput');
const joinRoomButton = document.getElementById('joinRoomButton');
const startGameButton = document.getElementById('startGameButton');
const lobbyInfo = document.getElementById('lobbyInfo');
const playerList = document.getElementById('playerList');
const problemSidebar = document.getElementById('problemSidebar');
const problemMap = document.getElementById('problemMap');
const leaderboardList = document.getElementById('leaderboardList');
const notificationFeed = document.getElementById('notificationFeed');
const countdownTimer = document.getElementById('countdownTimer');
const activeRoomCode = document.getElementById('activeRoomCode');
const problemModal = document.getElementById('problemModal');
const problemModalContent = document.getElementById('problemModalContent');
const winnerView = document.getElementById('winnerView');
const winnerTitle = document.getElementById('winnerTitle');
const winnerRanking = document.getElementById('winnerRanking');
const resetButton = document.getElementById('resetButton');
const closeModalButton = document.getElementById('closeModal');
const difficultyFilter = document.getElementById('difficultyFilter');

function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getJoinLink(code) {
  return `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(code)}`;
}

function loadRoomFromStorage(code) {
  const raw = localStorage.getItem('codeArena.roomState');
  if (!raw) return null;

  try {
    const roomState = JSON.parse(raw);
    if (roomState.code !== code) return null;
    return roomState;
  } catch (error) {
    return null;
  }
}

function persistRoomState() {
  if (!state.room) return;

  const payload = {
    code: state.room.code,
    timerMinutes: state.room.timerMinutes || Number(timerInput.value || 25),
    started: state.gameStarted,
    players: state.players,
    countdown: state.countdown,
    notifications: state.notifications,
    problems: state.problems,
    ended: state.ended
  };

  localStorage.setItem('codeArena.roomState', JSON.stringify(payload));
}

function setupJoinViewFromUrl() {
  const roomCode = new URLSearchParams(window.location.search).get('room');
  if (!roomCode) {
    return false;
  }

  const normalizedCode = roomCode.trim().toUpperCase();
  const storedRoom = loadRoomFromStorage(normalizedCode);
  if (!storedRoom) {
    state.room = { code: normalizedCode, timerMinutes: Number(timerInput.value) || 25, started: false };
    state.players = [];
    state.gameStarted = false;
    state.countdown = 25 * 60;
  } else {
    state.room = { code: normalizedCode, timerMinutes: storedRoom.timerMinutes || 25, started: Boolean(storedRoom.started) };
    state.players = storedRoom.players || [];
    state.gameStarted = Boolean(storedRoom.started);
    state.countdown = Number(storedRoom.countdown || (state.room.timerMinutes * 60));
    state.notifications = storedRoom.notifications || [];
    state.problems = Array.isArray(storedRoom.problems) && storedRoom.problems.length ? storedRoom.problems : structuredClone(defaultProblems);
    state.ended = Boolean(storedRoom.ended);
  }

  roomInput.value = normalizedCode;
  roomBadge.textContent = `Room: ${normalizedCode}`;
  roomBadge.classList.remove('hidden');
  activeRoomCode.textContent = normalizedCode;
  document.getElementById('adminView').classList.add('hidden');
  document.getElementById('playerView').classList.remove('hidden');

  if (state.gameStarted) {
    document.getElementById('gameView').classList.remove('hidden');
    startGameButton.classList.add('hidden');
    renderBoard();
    renderSidebar();
    renderLeaderboard();
    countdownTimer.textContent = formatTimer(state.countdown);
    renderLobby();
    return true;
  }

  lobbyInfo.innerHTML = `<span>${state.players.length}/30 players joined</span><span>Waiting for Master to start...</span>`;
  renderLobby();
  return true;
}

function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getProblemStats(problems) {
  const summary = { Easy: 0, Medium: 0, Hard: 0 };
  problems.forEach((problem) => {
    summary[problem.difficulty] += 1;
  });
  const total = problems.reduce((sum, problem) => sum + problem.points, 0);
  return { summary, total };
}

function renderProblemPreview() {
  const problems = state.problems;
  if (!problems.length) {
    problemStats.innerHTML = '<span>0 problems loaded</span>';
    problemBreakdown.innerHTML = '';
    return;
  }

  const { summary, total } = getProblemStats(problems);
  const entries = Object.entries(summary).map(([difficulty, count]) => `${difficulty}: ${count}`).join(' · ');
  problemStats.innerHTML = `<span>${problems.length} problems loaded</span><strong>• Total ${total} pts</strong>`;
  problemBreakdown.innerHTML = `
    <li><span>Easy</span><strong>${summary.Easy}</strong></li>
    <li><span>Medium</span><strong>${summary.Medium}</strong></li>
    <li><span>Hard</span><strong>${summary.Hard}</strong></li>
    <li><span>Formats</span><strong>${entries}</strong></li>
  `;
}

function addNotification(message) {
  state.notifications.unshift({ text: message, id: Date.now() + Math.random() });
  state.notifications = state.notifications.slice(0, 8);
  renderNotifications();
}

function renderNotifications() {
  notificationFeed.innerHTML = state.notifications
    .map((note) => `<li>${note.text}</li>`)
    .join('');
}

function loadUploadedProblems(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const list = Array.isArray(parsed) ? parsed : parsed.problems || [];
      if (list.length !== 10) {
        alert('The uploaded file should contain 10 problems to match this arena format.');
        return;
      }
      state.problems = list.map((problem) => ({
        ...problem,
        type: problem.type || 'code',
        difficulty: problem.difficulty || 'Easy',
        points: Number(problem.points || 100)
      }));
      renderProblemPreview();
      addNotification('Problem set updated from uploaded JSON.');
    } catch (error) {
      alert('Invalid JSON file. Please upload a valid problems.json file.');
    }
  };
  reader.readAsText(file);
}

function createRoom() {
  const code = randomRoomCode();
  state.room = { code, timerMinutes: Number(timerInput.value), started: false };
  state.players = [];
  state.currentPlayer = null;
  state.notifications = [];
  state.countdown = state.room.timerMinutes * 60;
  state.gameStarted = false;
  state.ended = false;
  roomBadge.textContent = `Room: ${code}`;
  roomBadge.classList.remove('hidden');
  activeRoomCode.textContent = code;
  roomInput.value = code;
  joinLinkInput.value = getJoinLink(code);
  lobbyInfo.innerHTML = `<span>${state.players.length}/30 players ready</span><span>Waiting for Master to start...</span>`;
  playerList.innerHTML = '';
  startGameButton.classList.remove('hidden');
  document.getElementById('adminView').classList.remove('hidden');
  document.getElementById('playerView').classList.add('hidden');
  document.getElementById('gameView').classList.add('hidden');
  winnerView.classList.add('hidden');
  difficultyFilter.value = 'all';
  state.roomHistory = [];
  addNotification(`Room ${code} created. Share the join link separately.`);
  persistRoomState();
  window.history.replaceState({}, '', `${window.location.pathname}?room=${code}`);
}

function joinRoom() {
  const roomCode = roomInput.value.trim().toUpperCase();
  const storedRoom = loadRoomFromStorage(roomCode);
  if (!storedRoom) {
    alert('This room has not been created yet. Ask the master to create it first.');
    return;
  }

  state.room = { code: roomCode, timerMinutes: storedRoom.timerMinutes || 25, started: Boolean(storedRoom.started) };
  state.players = storedRoom.players || [];
  state.gameStarted = Boolean(storedRoom.started);
  state.countdown = Number(storedRoom.countdown || (state.room.timerMinutes * 60));
  state.notifications = storedRoom.notifications || [];
  state.problems = Array.isArray(storedRoom.problems) && storedRoom.problems.length ? storedRoom.problems : structuredClone(defaultProblems);
  state.ended = Boolean(storedRoom.ended);

  const name = nameInput.value.trim();
  const roll = rollInput.value.trim();

  if (!name || !roll || !roomCode) {
    alert('Please fill in roll number, name, and room code.');
    return;
  }

  const alreadyIn = state.players.some((player) => player.roll === roll);
  if (alreadyIn) {
    state.currentPlayer = state.players.find((player) => player.roll === roll);
  } else {
    const newPlayer = {
      id: Date.now(),
      name,
      roll,
      score: 0,
      solved: 0,
      firstBloods: 0,
      wrongAttempts: 0,
      role: 'player',
      solvedProblems: []
    };
    state.players.push(newPlayer);
    state.currentPlayer = newPlayer;
  }

  persistRoomState();
  renderLobby();
  lobbyInfo.innerHTML = `<span>${state.players.length}/30 players joined</span><span>Waiting for Master to start...</span>`;
  addNotification(`${name} joined room ${roomCode}.`);
  persistRoomState();
  window.history.replaceState({}, '', `${window.location.pathname}?room=${roomCode}`);

  if (state.gameStarted) {
    document.getElementById('playerView').classList.add('hidden');
    document.getElementById('gameView').classList.remove('hidden');
    renderBoard();
    renderSidebar();
    renderLeaderboard();
    countdownTimer.textContent = formatTimer(state.countdown);
  } else {
    document.getElementById('playerView').classList.remove('hidden');
    document.getElementById('gameView').classList.add('hidden');
  }
}

window.addEventListener('storage', (event) => {
  if (event.key !== 'codeArena.roomState' || !event.newValue) return;

  try {
    const roomState = JSON.parse(event.newValue);
    if (!roomState || !state.room || roomState.code !== state.room.code) return;

    state.players = roomState.players || [];
    state.gameStarted = Boolean(roomState.started);
    state.countdown = Number(roomState.countdown || (state.room.timerMinutes * 60));
    state.notifications = roomState.notifications || [];
    state.problems = Array.isArray(roomState.problems) && roomState.problems.length ? roomState.problems : structuredClone(defaultProblems);
    state.ended = Boolean(roomState.ended);

    if (state.gameStarted) {
      document.getElementById('playerView').classList.add('hidden');
      document.getElementById('gameView').classList.remove('hidden');
      renderBoard();
      renderSidebar();
      renderLeaderboard();
      countdownTimer.textContent = formatTimer(state.countdown);
    } else {
      document.getElementById('playerView').classList.remove('hidden');
      document.getElementById('gameView').classList.add('hidden');
      renderLobby();
      lobbyInfo.innerHTML = `<span>${state.players.length}/30 players joined</span><span>Waiting for Master to start...</span>`;
    }
  } catch (error) {
    // ignore invalid storage payloads
  }
});

function renderLobby() {
  const players = state.players;
  playerList.innerHTML = players
    .map((player, index) => `
      <li>
        <span>${index + 1}. ${player.name}</span>
        <strong>${player.roll}</strong>
      </li>
    `)
    .join('');
}

function startCountdown() {
  if (!state.room || state.gameStarted) return;
  state.gameStarted = true;
  state.room.started = true;
  document.getElementById('playerView').classList.add('hidden');
  document.getElementById('gameView').classList.remove('hidden');
  renderBoard();
  renderSidebar();
  renderLeaderboard();
  countdownTimer.textContent = formatTimer(state.countdown);
  persistRoomState();

  let remaining = 5;
  addNotification('Game starts in 5...');
  persistRoomState();
  const tick = setInterval(() => {
    if (remaining <= 0) {
      clearInterval(tick);
      addNotification('The arena is live. Good luck!');
      persistRoomState();
      startTicking();
      return;
    }
    if (remaining === 5) {
      addNotification('5...');
    } else if (remaining === 4) {
      addNotification('4...');
    } else if (remaining === 3) {
      addNotification('3...');
    } else if (remaining === 2) {
      addNotification('2...');
    } else if (remaining === 1) {
      addNotification('1...');
    }
    remaining -= 1;
    persistRoomState();
  }, 1000);
}

function startTicking() {
  clearInterval(state.timerInterval);
  clearInterval(state.leaderboardInterval);

  state.timerInterval = setInterval(() => {
    if (state.ended) return;
    state.countdown -= 1;
    if (state.countdown <= 0) {
      state.countdown = 0;
      endGame();
      return;
    }
    countdownTimer.textContent = formatTimer(state.countdown);
    persistRoomState();
  }, 1000);

  state.leaderboardInterval = setInterval(() => {
    if (!state.ended) {
      renderLeaderboard();
      persistRoomState();
    }
  }, 3000);
}

function renderBoard() {
  const board = [];
  for (let row = 0; row < BOARD_CONFIG.rows; row += 1) {
    for (let col = 0; col < BOARD_CONFIG.cols; col += 1) {
      board.push({ row, col, empty: true, problem: null });
    }
  }

  const problems = state.problems;
  problems.forEach((problem) => {
    const location = BOARD_CONFIG.nodes[problem.id];
    if (!location) return;
    const flatIndex = location.y * BOARD_CONFIG.cols + location.x;
    const node = board[flatIndex];
    node.empty = false;
    node.problem = problem;
    node.solved = Boolean(state.currentPlayer && state.currentPlayer.solvedProblems.includes(problem.id));
  });

  problemMap.innerHTML = board.map(({ empty, problem, solved }) => {
    if (empty) {
      return '<div class="map-node empty"></div>';
    }

    const firstBlood = problem.firstBlood;
    const solvedClass = solved ? 'solved' : '';
    const firstBloodClass = firstBlood ? 'first-blood' : '';
    const icon = problem.type === 'mcq' ? '🅰️' : problem.type === 'fill' ? '🔧' : '💻';
    return `
      <button class="map-node ${solvedClass} ${firstBloodClass}" data-problem-id="${problem.id}">
        <span class="crown">${firstBlood ? '🏆' : ''}</span>
        <span class="node-icon">${icon}</span>
        <span class="node-label">${problem.id}</span>
        <span class="node-points">${problem.points}</span>
      </button>
    `;
  }).join('');

  const nodes = problemMap.querySelectorAll('.map-node:not(.empty)');
  nodes.forEach((node) => {
    node.addEventListener('click', () => openProblem(node.dataset.problemId));
  });
}

function renderSidebar() {
  const filter = difficultyFilter.value;
  const problems = state.problems.filter((problem) => filter === 'all' || problem.difficulty === filter);

  problemSidebar.innerHTML = problems.map((problem) => {
    const solved = state.currentPlayer && state.currentPlayer.solvedProblems.includes(problem.id);
    const firstBlood = problem.firstBlood;
    return `
      <li data-problem-id="${problem.id}" class="${solved ? 'solved-problem' : ''}">
        <div class="problem-title-row">
          <strong>${problem.id} • ${problem.title}</strong>
          <span class="problem-badge ${problem.difficulty.toLowerCase()}">${problem.difficulty}</span>
        </div>
        <div class="meta">
          <span>${problem.type.toUpperCase()}</span>
          <span>${problem.points} pts</span>
        </div>
        <div class="meta">
          <span>${firstBlood ? '🏆 First blood' : 'Open challenge'}</span>
          <span>${solved ? 'Solved' : 'Unsolved'}</span>
        </div>
      </li>
    `;
  }).join('');

  problemSidebar.querySelectorAll('li').forEach((item) => {
    item.addEventListener('click', () => openProblem(item.dataset.problemId));
  });
}

function renderLeaderboard() {
  const unsortedPlayers = [...state.players];
  const leaderboard = unsortedPlayers.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.wrongAttempts !== b.wrongAttempts) return a.wrongAttempts - b.wrongAttempts;
    if (b.firstBloods !== a.firstBloods) return b.firstBloods - a.firstBloods;
    return (a.solvedProblems || []).length - (b.solvedProblems || []).length;
  });

  leaderboardList.innerHTML = leaderboard.map((player, index) => `
    <div class="leaderboard-item">
      <span class="rank">${index + 1}</span>
      <div class="player-meta">
        <strong>${player.name}</strong>
        <small>${player.solvedProblems.length}✓ • ${player.firstBloods} First Bloods</small>
      </div>
      <span class="score">${player.score}</span>
    </div>
  `).join('');
}

function openProblem(problemId) {
  const problem = state.problems.find((item) => item.id === problemId);
  if (!problem) return;
  state.selectedProblem = problem;
  const existing = state.currentPlayer?.solvedProblems.includes(problem.id);

  problemModalContent.innerHTML = `
    <div class="problem-modal-header">
      <p class="eyebrow">${problem.difficulty} • ${problem.type.toUpperCase()}</p>
      <h3>${problem.id} • ${problem.title}</h3>
      <div class="problem-detail-grid">
        <span>Points: ${problem.points}</span>
        <span>Category: ${problem.tag}</span>
        <span>${existing ? 'Solved by you' : 'Active challenge'}</span>
      </div>
    </div>
    <div class="problem-statement">
      ${problem.text}
    </div>
    ${renderProblemEditor(problem)}
    <div class="modal-actions">
      <button id="submitProblemButton" class="primary-btn">Submit</button>
    </div>
  `;

  problemModal.classList.remove('hidden');

  document.getElementById('submitProblemButton').addEventListener('click', () => submitProblem(problem));
}

function renderProblemEditor(problem) {
  if (problem.type === 'mcq') {
    return `
      <div class="option-list">
        ${problem.options.map((option) => `
          <label class="option-row">
            <input type="radio" name="mcqAnswer" value="${option}" />
            <span>${option}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  return `
    <textarea class="code-editor" id="codeInput" spellcheck="false">${problem.starterCode || ''}</textarea>
  `;
}

function submitProblem(problem) {
  if (!state.currentPlayer) {
    return;
  }

  const player = state.currentPlayer;
  let isCorrect = false;
  let answerValue = '';

  if (problem.type === 'mcq') {
    const checked = document.querySelector('input[name="mcqAnswer"]:checked');
    answerValue = checked ? checked.value : '';
    isCorrect = answerValue === problem.answer;
  } else {
    const codeInput = document.getElementById('codeInput');
    answerValue = codeInput ? codeInput.value : '';
    const normalized = answerValue.replace(/\s+/g, ' ').trim();
    const target = String(problem.answerSnippet || '').replace(/\s+/g, ' ').trim();
    isCorrect = normalized.includes(target) || normalized.includes(problem.answerSnippet || '') || normalized.toLowerCase().includes(problem.title.toLowerCase().split(' ')[0].toLowerCase());
  }

  if (isCorrect) {
    const alreadySolved = player.solvedProblems.includes(problem.id);
    if (!alreadySolved) {
      const firstBlood = !state.problems.find((p) => p.id === problem.id)?.firstBlood;
      const basePoints = problem.points;
      const solveScore = basePoints + (firstBlood ? 50 : 0) + (state.players.filter((entry) => entry.solvedProblems.includes(problem.id)).length > 0 ? 20 : 0);
      player.score += solveScore;
      player.solvedProblems.push(problem.id);
      player.solved += 1;
      problem.firstBlood = problem.firstBlood || firstBlood;
      if (firstBlood) {
        player.firstBloods += 1;
        addNotification(`First blood on ${problem.id} awarded to ${player.name}!`);
      } else {
        addNotification(`${player.name} solved ${problem.id} for ${basePoints} points.`);
      }
      renderBoard();
      renderSidebar();
      renderLeaderboard();
      problemModal.classList.add('hidden');
    }
  } else {
    player.wrongAttempts += 1;
    player.score = Math.max(0, player.score - 10);
    addNotification(`${player.name} made a wrong attempt on ${problem.id}. -10 penalty.`);
    renderLeaderboard();
  }
}

function endGame() {
  if (state.ended) return;
  state.ended = true;
  clearInterval(state.timerInterval);
  clearInterval(state.leaderboardInterval);

  const ranking = [...state.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.wrongAttempts !== b.wrongAttempts) return a.wrongAttempts - b.wrongAttempts;
    if (b.firstBloods !== a.firstBloods) return b.firstBloods - a.firstBloods;
    return (a.solvedProblems || []).length - (b.solvedProblems || []).length;
  });

  const champion = ranking[0] || { name: 'No champion' };
  winnerTitle.textContent = `Winner: ${champion.name}`;
  winnerRanking.innerHTML = ranking.map((player, index) => `
    <div class="rank-row">
      <span class="medal">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</span>
      <span>${player.name}</span>
      <strong>${player.score} pts</strong>
    </div>
  `).join('');

  winnerView.classList.remove('hidden');
  document.getElementById('gameView').classList.add('hidden');
  addNotification('Time is up! Final leaderboard locked.');
}

function resetGame() {
  clearInterval(state.timerInterval);
  clearInterval(state.leaderboardInterval);
  state.room = null;
  state.players = [];
  state.currentPlayer = null;
  state.problems = structuredClone(defaultProblems);
  state.countdown = 25 * 60;
  state.gameStarted = false;
  state.ended = false;
  state.notifications = [];
  state.selectedProblem = null;
  problemModal.classList.add('hidden');
  winnerView.classList.add('hidden');
  document.getElementById('adminView').classList.remove('hidden');
  document.getElementById('playerView').classList.add('hidden');
  document.getElementById('gameView').classList.add('hidden');
  roomBadge.classList.add('hidden');
  roomBadge.textContent = 'Room: --';
  joinLinkInput.value = 'https://example.com/?room=ROOMCODE';
  startGameButton.classList.add('hidden');
  countdownTimer.textContent = '25:00';
  timerInput.value = 25;
  timerValue.textContent = '25 min';
  window.history.replaceState({}, '', window.location.pathname);
  renderProblemPreview();
  renderNotifications();
  renderLobby();
  renderSidebar();
}

function copyJoinLink() {
  const link = joinLinkInput.value;
  if (!link || link.includes('ROOMCODE')) {
    return;
  }
  navigator.clipboard.writeText(link).then(() => {
    addNotification('Join link copied to clipboard.');
  }).catch(() => {
    joinLinkInput.select();
    document.execCommand('copy');
    addNotification('Join link copied to clipboard.');
  });
}

timerInput.addEventListener('input', () => {
  timerValue.textContent = `${timerInput.value} min`;
});

problemUpload.addEventListener('change', (event) => {
  const [file] = event.target.files;
  loadUploadedProblems(file);
});

createRoomButton.addEventListener('click', createRoom);
copyJoinLinkButton.addEventListener('click', copyJoinLink);
joinRoomButton.addEventListener('click', joinRoom);
startGameButton.addEventListener('click', startCountdown);
resetButton.addEventListener('click', resetGame);
closeModalButton.addEventListener('click', () => problemModal.classList.add('hidden'));

difficultyFilter.addEventListener('change', () => {
  if (state.gameStarted) renderSidebar();
});

if (setupJoinViewFromUrl()) {
  renderLobby();
} else {
  document.getElementById('adminView').classList.remove('hidden');
  document.getElementById('playerView').classList.add('hidden');
}

renderProblemPreview();
renderNotifications();
renderLobby();
renderSidebar();
