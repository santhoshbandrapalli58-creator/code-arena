// Firebase Realtime Database transport for Code Arena multiplayer game.
const firebaseConfig = {
  apiKey: 'AIzaSyCCHTslXIudtdD9lOsXAHK8y6F2GgUDIkY',
  authDomain: 'code-arena-215a3.firebaseapp.com',
  databaseURL: 'https://code-arena-215a3-default-rtdb.firebaseio.com',
  projectId: 'code-arena-215a3',
  storageBucket: 'code-arena-215a3.firebasestorage.app',
  messagingSenderId: '926304068319',
  appId: '1:926304068319:web:d6eea88b87ffda75f33f6a'
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const clientId = localStorage.getItem('codeArenaClientId') ||
  `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
localStorage.setItem('codeArenaClientId', clientId);
const playerSessionKey = 'codeArenaPlayerSession';
const compilerVersions = {
  javascript: ['javascript', '18.15.0'],
  python: ['python', '3.10.0'],
  java: ['java', '15.0.2'],
  cpp: ['c++', '10.2.0'],
  c: ['c', '10.2.0'],
  csharp: ['csharp', '6.12.0'],
  go: ['go', '1.16.2'],
  rust: ['rust', '1.68.2'],
  kotlin: ['kotlin', '1.6.10'],
  php: ['php', '8.2.3']
};
let activeRoomRef = null;
let roomListener = null;
let timerTicker = null;
const socketHandlers = {};
let firebaseSession = null;
try {
  firebaseSession = JSON.parse(localStorage.getItem(playerSessionKey) || 'null');
} catch {
  localStorage.removeItem(playerSessionKey);
}

function emitLocal(event, payload) {
  (socketHandlers[event] || []).forEach(handler => handler(payload));
}

function listenToRoom(roomCode) {
  if (activeRoomRef && roomListener) {
    activeRoomRef.off('value', roomListener);
  }
  activeRoomRef = database.ref(`rooms/${roomCode}`);
  roomListener = snapshot => {
    const room = snapshot.val();
    if (!room) {
      emitLocal('room:error', { message: 'This room no longer exists.' });
      return;
    }
    room.players = Array.isArray(room.players) ? room.players : Object.values(room.players || {});
    room.problems = Array.isArray(room.problems) ? room.problems : Object.values(room.problems || {});
    room.notifications = Array.isArray(room.notifications) ? room.notifications : Object.values(room.notifications || {});
    if (room.started && !room.ended) {
      room.countdown = Math.max(0, Number(room.timerMinutes) * 60 -
        Math.floor((Date.now() - Number(room.startedAt || Date.now())) / 1000));
      if (!timerTicker) {
        timerTicker = setInterval(() => {
          if (state.room && state.room.started && !state.room.ended) {
            state.room.countdown = Math.max(0, Number(state.room.timerMinutes) * 60 -
              Math.floor((Date.now() - Number(state.room.startedAt)) / 1000));
            if (state.room.countdown === 0) state.room.ended = true;
            renderAll();
          }
        }, 1000);
      }
    }
    let session = null;
    try {
      session = JSON.parse(localStorage.getItem(playerSessionKey) || 'null');
    } catch {
      localStorage.removeItem(playerSessionKey);
    }
    if (!state.isMaster && !state.currentPlayer && session && session.roomCode === roomCode) {
      const players = Array.isArray(room.players) ? room.players : Object.values(room.players || {});
      state.currentPlayer = players.find(player =>
        player.id === clientId || String(player.roll).toLowerCase() === String(session.roll).toLowerCase()
      ) || null;
    }
    emitLocal('room:state', room);
  };
  activeRoomRef.on('value', roomListener);
}

function evaluateClientSubmission(problem, answer) {
  if (problem.type === 'mcq') {
    return String(answer).trim().toLowerCase() === String(problem.answer).trim().toLowerCase();
  }

  const normalizedAnswer = String(answer || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const target = String(problem.answerSnippet || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return Boolean(target && normalizedAnswer.includes(target)) ||
    normalizedAnswer.includes(String(problem.title || '').split(' ')[0].toLowerCase());
}

async function runCodeAgainstTests(problem, code, language) {
  const testCases = Array.isArray(problem.testCases) ? problem.testCases : [];
  if (!testCases.length) {
    return {
      correct: evaluateClientSubmission(problem, code),
      message: 'No test cases were supplied; answer pattern validation was used.',
      passed: 0,
      total: 0
    };
  }
  const compiler = compilerVersions[language] || compilerVersions.javascript;
  const results = [];
  for (const testCase of testCases) {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: compiler[0],
        version: compiler[1],
        files: [{ content: code }],
        stdin: String(testCase.input || '')
      })
    });
    if (!response.ok) {
      throw new Error(`Compiler service returned HTTP ${response.status}.`);
    }
    const result = await response.json();
    const output = String(result.run && result.run.stdout || '').trim();
    const expected = String(testCase.output ?? testCase.expectedOutput ?? '').trim();
    const stderr = String(
      result.compile && result.compile.stderr ||
      result.run && result.run.stderr ||
      ''
    ).trim();
    results.push({
      passed: output === expected && !stderr,
      expected,
      actual: output,
      stderr
    });
  }
  return {
    correct: results.every(result => result.passed),
    message: `${results.filter(result => result.passed).length}/${results.length} test cases passed.`,
    passed: results.filter(result => result.passed).length,
    total: results.length,
    results
  };
}

const socket = {
  on(event, handler) {
    socketHandlers[event] = socketHandlers[event] || [];
    socketHandlers[event].push(handler);
  },
  emit(event, payload) {
    if (event === 'master:createRoom') {
      const roomCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const room = {
        code: roomCode,
        timerMinutes: Number(payload.timerMinutes) || 25,
        started: false,
        ended: false,
        countdown: (Number(payload.timerMinutes) || 25) * 60,
        startedAt: null,
        masterClientId: clientId,
        players: [],
        notifications: [`Room ${roomCode} created. Share the join link separately.`],
        problems: Array.isArray(payload.problems) ? payload.problems : []
      };
      database.ref(`rooms/${roomCode}`).set(room).then(() => {
        localStorage.setItem(playerSessionKey, JSON.stringify({
          roomCode, role: 'master', name: '', roll: ''
        }));
        emitLocal('room:created', {
          roomCode,
          joinLink: `${window.location.origin}/?room=${roomCode}`,
          room
        });
        listenToRoom(roomCode);
      }).catch(error => emitLocal('room:error', { message: error.message }));
    } else if (event === 'master:setProblems') {
      const roomRef = database.ref(`rooms/${payload.roomCode}`);
      roomRef.transaction(room => {
        if (!room || room.masterClientId !== clientId || room.started) return room;
        room.problems = payload.problems;
        room.notifications = [...(room.notifications || []),
          `Master uploaded ${payload.problems.length} problems.`];
        return room;
      })
        .catch(error => emitLocal('room:error', { message: error.message }));
    } else if (event === 'player:joinRoom') {
      const roomCode = String(payload.roomCode || '').trim().toUpperCase();
      const roomRef = database.ref(`rooms/${roomCode}`);
      roomRef.once('value').then(snapshot => {
        const room = snapshot.val();
        if (!room) throw new Error('Room not found. Please check the code.');
        const players = Array.isArray(room.players) ? room.players : [];
        const existing = players.find(player =>
          String(player.roll).toLowerCase() === String(payload.roll).toLowerCase());
        const player = existing || {
          id: clientId, name: payload.name, roll: payload.roll, score: 0,
          firstBloods: 0, wrongAttempts: 0, solvedProblems: [], submissions: {}, role: 'player'
        };
        player.id = clientId;
        player.name = payload.name;
        player.roll = payload.roll;
        if (!existing) players.push(player);
        return roomRef.update({
          players,
          notifications: [...(room.notifications || []), `${payload.name} joined room ${roomCode}.`]
        }).then(() => {
          state.currentPlayer = player;
          localStorage.setItem(playerSessionKey, JSON.stringify({
            roomCode, role: 'player', name: payload.name, roll: payload.roll
          }));
          listenToRoom(roomCode);
        });
      }).catch(error => emitLocal('room:error', { message: error.message }));
    } else if (event === 'game:start') {
      database.ref(`rooms/${payload.roomCode}`).update({
        started: true, ended: false, startedAt: Date.now()
      }).catch(error => emitLocal('room:error', { message: error.message }));
    } else if (event === 'problem:submit') {
      const roomRef = database.ref(`rooms/${payload.roomCode}`);
      roomRef.transaction(room => {
        if (!room || !room.started) return room;
        const players = Array.isArray(room.players) ? room.players : [];
        const player = players.find(entry => entry.id === clientId);
        const problem = (room.problems || []).find(entry => entry.id === payload.problemId);
        if (!player || !problem) return room;
        player.submissions = player.submissions || {};
        if (player.submissions[payload.problemId]) return room;
        const correct = problem.type === 'mcq'
          ? evaluateClientSubmission(problem, payload.answer)
          : Boolean(payload.correct);
        player.submissions[payload.problemId] = {
          correct, status: correct ? 'correct' : 'wrong',
          language: payload.language || 'javascript',
          message: payload.message || (correct ? 'All test cases passed.' : 'Some test cases failed.')
        };
        if (correct) {
          player.score += Number(problem.points || 100);
          player.solvedProblems = player.solvedProblems || [];
          player.solvedProblems.push(payload.problemId);
        } else {
          player.wrongAttempts = Number(player.wrongAttempts || 0) + 1;
          player.score = Math.max(0, Number(player.score || 0) - 10);
        }
        room.players = players;
        return room;
      }).catch(error => emitLocal('room:error', { message: error.message }));
    }
  }
};
window.socket = socket;

// Local state
const state = {
  room: null,
  currentPlayer: null,
  isMaster: false,
  problems: [],
  notifications: [],
  selectedProblem: null,
  gameStarted: false,
  gameEnded: false
};

// UI Element references (initialized in DOMContentLoaded)
let adminView, playerView, gameView, winnerView;
let timerInput, timerValue, uploadBtn, joinLinkInput, copyBtn, createRoomButton, startGameButton, roomBadge;
let rollInput, nameInput, roomInput, joinLobbyButton;
let playerList, problemSidebar, problemMap, leaderboardList, notificationFeed, countdownTimer;
let problemModal, problemTitle, problemText, problemContent, closeModalButton, submitBtn, resetButton;
let problemStats, problemBreakdown, activeRoomCode, winnerTitle, winnerRanking;
let joinCard;
let terminalOutput, terminalStatus;

function initializeUI() {
  adminView = document.getElementById('adminView');
  playerView = document.getElementById('playerView');
  gameView = document.getElementById('gameView');
  winnerView = document.getElementById('winnerView');

  timerInput = document.getElementById('timerInput');
  timerValue = document.getElementById('timerValue');
  uploadBtn = document.getElementById('uploadBtn');
  joinLinkInput = document.getElementById('joinLinkInput');
  copyBtn = document.getElementById('copyBtn');
  createRoomButton = document.getElementById('createRoomButton');
  startGameButton = document.getElementById('startGameButton');
  roomBadge = document.getElementById('roomBadge');

  rollInput = document.getElementById('rollInput');
  nameInput = document.getElementById('nameInput');
  roomInput = document.getElementById('roomInput');
  joinLobbyButton = document.getElementById('joinLobbyButton');
  joinCard = document.querySelector('.join-card');

  playerList = document.getElementById('playerList');
  problemSidebar = document.getElementById('problemSidebar');
  problemMap = document.getElementById('problemMap');
  leaderboardList = document.getElementById('leaderboardList');
  notificationFeed = document.getElementById('notificationFeed');
  countdownTimer = document.getElementById('countdownTimer');
  problemStats = document.getElementById('problemStats');
  problemBreakdown = document.getElementById('problemBreakdown');
  activeRoomCode = document.getElementById('activeRoomCode');
  winnerTitle = document.getElementById('winnerTitle');
  winnerRanking = document.getElementById('winnerRanking');

  problemModal = document.getElementById('problemModal');
  problemTitle = document.getElementById('problemTitle');
  problemText = document.getElementById('problemText');
  problemContent = document.getElementById('problemContent');
  closeModalButton = document.getElementById('closeModalButton');
  submitBtn = document.getElementById('submitBtn');
  resetButton = document.getElementById('resetButton');
  terminalOutput = document.getElementById('terminalOutput');
  terminalStatus = document.getElementById('terminalStatus');
}

// Load problems from problems.json
async function loadDefaultProblems() {
  try {
    const response = await fetch('problems.json');
    if (response.ok) {
      state.problems = await response.json();
    }
  } catch (err) {
    console.error('Failed to load problems:', err);
  }
}

// Rendering functions
function renderProblemPreview() {
  if (!problemStats || !problemBreakdown) return;
  const counts = state.problems.reduce((result, problem) => {
    result[problem.difficulty] = (result[problem.difficulty] || 0) + 1;
    return result;
  }, {});
  const totalPoints = state.problems.reduce((total, problem) => total + Number(problem.points || 0), 0);
  problemStats.innerHTML = `<span>${state.problems.length} problems loaded</span><strong>• Total ${totalPoints} pts</strong>`;
  problemBreakdown.innerHTML = ['Easy', 'Medium', 'Hard']
    .map(difficulty => `<li><span>${difficulty}</span><strong>${counts[difficulty] || 0}</strong></li>`)
    .join('');
  if (problemSidebar) {
    problemSidebar.innerHTML = state.problems.map(problem =>
      `<li><strong>${problem.id}:</strong> ${problem.title}<small>${problem.difficulty}</small></li>`
    ).join('');
  }
}

function renderProblemMap() {
  if (!problemMap) return;
  if (!state.room || !state.room.started) {
    problemMap.innerHTML = '';
    return;
  }
  const html = state.room.problems.map(p => {
    const submission = state.currentPlayer && state.currentPlayer.submissions && state.currentPlayer.submissions[p.id];
    const status = submission ? (submission.correct ? 'correct' : 'wrong') : 'pending';
    return `<button class="map-node ${status}" onclick="openProblemModal('${p.id}')">
      <span class="node-label">${p.id}</span><span class="node-points">${submission ? status : `${p.points} pts`}</span>
    </button>`;
  }).join('');
  problemMap.innerHTML = html;
}

function renderLeaderboard() {
  if (!leaderboardList) return;
  if (!state.room || !state.room.players) {
    leaderboardList.innerHTML = '<p>Waiting for players...</p>';
    return;
  }
  const sortedPlayers = [...state.room.players].sort((a, b) => b.score - a.score);
  const html = sortedPlayers.map((p, idx) => 
    `<tr>
      <td>${idx + 1}</td>
      <td>${p.name}</td>
      <td>${p.roll}</td>
      <td>${p.score} pts</td>
      <td>${p.solvedProblems ? p.solvedProblems.length : 0}</td>
      <td>${p.wrongAttempts || 0}</td>
      <td>${p.firstBloods || 0}</td>
    </tr>`
  ).join('');
  leaderboardList.innerHTML = `<table><thead><tr><th>#</th><th>Name</th><th>Roll</th><th>Score</th><th>Solved</th><th>Wrong</th><th>FB</th></tr></thead><tbody>${html}</tbody></table>`;
}

function renderPlayerList() {
  if (!playerList) return;
  if (!state.room || !state.room.players) {
    playerList.innerHTML = '<p>Waiting for players...</p>';
    return;
  }
  const count = state.room.players.length;
  const html = state.room.players.map((p, idx) =>
    `<li>${idx + 1}. ${p.name} <strong>${p.roll}</strong></li>`
  ).join('');
  playerList.innerHTML = `<p>${count}/30 players joined</p><ul>${html}</ul>`;
}

function renderNotifications() {
  if (!notificationFeed) return;
  if (!state.room || !state.room.notifications) {
    notificationFeed.innerHTML = '<p>No notifications</p>';
    return;
  }
  const html = state.room.notifications.map(n => `<div class="notification">${n}</div>`).join('');
  notificationFeed.innerHTML = html;
}

function renderCountdown() {
  if (!countdownTimer) return;
  if (!state.room) {
    countdownTimer.textContent = '00:00';
    return;
  }
  const mins = Math.floor(state.room.countdown / 60);
  const secs = state.room.countdown % 60;
  countdownTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  if (timerValue) {
    timerValue.textContent = `${timerInput.value} min`;
  }
}

function renderViews() {
  const hasRoom = state.room !== null;
  const gameActive = hasRoom && state.room.started && !state.room.ended;
  const isPlayer = state.currentPlayer !== null;
  const roomCodeInUrl = new URLSearchParams(window.location.search).get('room');

  // Initially, show admin view if no room created yet and no player joined
  // Show admin if we're the master and room hasn't started game yet
  // Show player view if we have a room and we're a player and game hasn't started
  // Also show player view if we're on a room URL waiting to join
  // Show game view only when game is active
  // Show winner view when game has ended
  
  if (adminView) {
    // Show admin when: no room yet and no room code in URL, OR (we're master and room hasn't started game)
    const showAdmin = (!hasRoom && !roomCodeInUrl) || (state.isMaster && !state.room?.started);
    adminView.classList.toggle('hidden', !showAdmin);
  }
  if (playerView) {
    // Show player when: (we have room AND we're a player) OR (we're waiting to join with a room code in URL)
    const showPlayer = ((hasRoom && isPlayer && !gameActive && !state.room.ended) ||
      (roomCodeInUrl && !hasRoom && !state.isMaster));
    playerView.classList.toggle('hidden', !showPlayer);
  }
  if (joinCard) {
    joinCard.classList.toggle('hidden', Boolean(state.currentPlayer));
  }
  if (gameView) {
    gameView.classList.toggle('hidden', !gameActive);
  }
  if (winnerView) {
    // Show winner when game has ended
    const showWinner = (hasRoom && state.room.ended);
    winnerView.classList.toggle('hidden', !showWinner);
  }

  if (hasRoom && state.isMaster) {
    if (roomBadge) {
      roomBadge.textContent = `Room: ${state.room.code}`;
      roomBadge.classList.remove('hidden');
    }
    if (startGameButton) {
      startGameButton.classList.toggle('hidden', state.room.started);
    }
  } else if (roomBadge) {
    roomBadge.classList.add('hidden');
  }
  if (activeRoomCode) {
    activeRoomCode.textContent = hasRoom ? state.room.code : '--';
  }
  if (hasRoom && state.room.ended && winnerTitle && winnerRanking) {
    const ranking = [...state.room.players].sort((a, b) => b.score - a.score);
    winnerTitle.textContent = ranking.length ? `Winner: ${ranking[0].name}` : 'Final Results';
    winnerRanking.innerHTML = ranking.map((player, index) =>
      `<div>${index + 1}. ${player.name} <strong>${player.score} pts</strong></div>`
    ).join('');
  }

  if (gameActive) {
    renderProblemMap();
    renderLeaderboard();
  }
}

function renderAll() {
  renderCountdown();
  renderProblemPreview();
  renderPlayerList();
  renderLeaderboard();
  renderNotifications();
  renderProblemMap();
  renderViews();
}

const languageNames = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  kotlin: 'Kotlin',
  php: 'PHP'
};

function starterCodeForLanguage(problem, language) {
  const templates = {
    javascript: problem.starterCode || '',
    python: `# ${problem.title}\n# Write your solution here\n`,
    java: `// ${problem.title}\nclass Solution {\n    // Write your solution here\n}\n`,
    cpp: `// ${problem.title}\n#include <bits/stdc++.h>\nusing namespace std;\n\n// Write your solution here\n`,
    c: `/* ${problem.title} */\n#include <stdio.h>\n\n/* Write your solution here */\n`,
    csharp: `// ${problem.title}\nusing System;\n\npublic class Solution\n{\n    // Write your solution here\n}\n`,
    go: `// ${problem.title}\npackage main\n\n// Write your solution here\n`,
    rust: `// ${problem.title}\nfn main() {\n    // Write your solution here\n}\n`,
    kotlin: `// ${problem.title}\nfun main() {\n    // Write your solution here\n}\n`,
    php: `<?php\n// ${problem.title}\n// Write your solution here\n`
  };
  return templates[language] || templates.javascript;
}

function renderSubmissionResult(submission) {
  if (!problemContent || !submitBtn) return;
  const existing = problemContent.querySelector('.submission-result');
  if (existing) existing.remove();
  if (submission) {
    problemContent.insertAdjacentHTML('afterbegin',
      `<div class="submission-result ${submission.correct ? 'correct' : 'wrong'}">
        ${submission.correct ? 'Correct answer' : 'Wrong answer'} · ${submission.message || languageNames[submission.language] || submission.language}
      </div>`);
  }

  function setTerminalOutput(text, status = 'Ready', tone = '') {
    if (terminalOutput) {
      terminalOutput.className = tone;
      terminalOutput.textContent = text;
    }
    if (terminalStatus) {
      terminalStatus.textContent = status;
      terminalStatus.className = tone;
    }
  }

  function updateEditorLineNumbers() {
    const editor = document.getElementById('codeInput');
    const gutter = document.getElementById('editorLineNumbers');
    if (!editor || !gutter) return;
    const count = Math.max(1, editor.value.split('\n').length);
    gutter.textContent = Array.from({ length: count }, (_, index) => index + 1).join('\n');
  }
  submitBtn.disabled = Boolean(submission) || !state.currentPlayer;
  submitBtn.textContent = submission ? 'Completed' : 'Submit';
}

// Problem modal
function openProblemModal(problemId) {
  const problem = state.room.problems.find(p => p.id === problemId);
  if (!problem) return;
  state.selectedProblem = problem;

  if (problemTitle) problemTitle.textContent = `${problem.id}: ${problem.title} (${problem.points} pts)`;
  if (problemText) problemText.textContent = problem.text;
  const submission = state.currentPlayer && state.currentPlayer.submissions &&
    state.currentPlayer.submissions[problem.id];

  if (problemContent) {
    if (problem.type === 'mcq') {
      problemContent.innerHTML = problem.options.map(opt => 
        `<label><input type="radio" name="mcqAnswer" value="${opt}"/> ${opt}</label>`
      ).join('<br/>');
    } else if (problem.type === 'code' || problem.type === 'fill') {
      problemContent.innerHTML = 
        `<div class="ide-window">
         <div class="ide-titlebar"><span class="ide-dot red"></span><span class="ide-dot yellow"></span><span class="ide-dot green"></span><span class="ide-title">solution.${problem.type === 'fill' ? 'txt' : 'code'}</span></div>
         <div class="ide-tabbar"><span class="ide-tab active">${languageNames.javascript}</span></div>
         <label class="ide-language-label" for="languageSelect">Language</label>
         <select id="languageSelect">
           <option value="javascript">JavaScript</option><option value="python">Python</option>
           <option value="java">Java</option><option value="cpp">C++</option><option value="c">C</option>
           <option value="csharp">C#</option><option value="go">Go</option><option value="rust">Rust</option>
           <option value="kotlin">Kotlin</option><option value="php">PHP</option>
         </select>
         <div class="editor-frame">
           <pre id="editorLineNumbers" class="editor-line-numbers">1</pre>
           <textarea class="code-editor" id="codeInput" spellcheck="false">${problem.starterCode || ''}</textarea>
         </div>
         </div>`;
    } else {
      problemContent.textContent = problem.answerSnippet || 'Answer: ...';
    }
  }
  renderSubmissionResult(submission);
  setTerminalOutput(submission ? `${submission.message || 'Submission completed.'}` : 'Run your solution to see output here.',
    submission ? (submission.correct ? 'Passed' : 'Failed') : 'Ready',
    submission ? (submission.correct ? 'terminal-success' : 'terminal-error') : '');
  updateEditorLineNumbers();
  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    if (submission && languageNames[submission.language]) {
      languageSelect.value = submission.language;
    }
    languageSelect.addEventListener('change', () => {
      const code = starterCodeForLanguage(problem, languageSelect.value);
      const editor = document.getElementById('codeInput');
      if (editor && !submission) editor.value = code;
      const tab = document.querySelector('.ide-tab.active');
      if (tab) tab.textContent = languageNames[languageSelect.value] || languageSelect.value;
      updateEditorLineNumbers();
    });
  }

  if (problemModal) problemModal.classList.remove('hidden');
}

// Setup event listeners (called after DOM is ready)
function setupEventListeners() {
  if (closeModalButton) {
    closeModalButton.addEventListener('click', () => {
      if (problemModal) problemModal.classList.add('hidden');
      state.selectedProblem = null;
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      if (!state.selectedProblem || !state.currentPlayer || !state.room) return;
      let answer = '';
      let language = 'javascript';
      if (state.selectedProblem.type === 'mcq') {
        const selected = document.querySelector('input[name="mcqAnswer"]:checked');
        answer = selected ? selected.value : '';
      } else {
        const input = document.getElementById('codeInput');
        answer = input ? input.value : '';
        const languageInput = document.getElementById('languageSelect');
        language = languageInput ? languageInput.value : language;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Checking...';
      setTerminalOutput(`> Running ${languageNames[language] || language} test cases...\n\n`, 'Running', 'terminal-running');
      let validation = {
        correct: evaluateClientSubmission(state.selectedProblem, answer),
        message: 'Answer checked.'
      };
      if (state.selectedProblem.type === 'code' || state.selectedProblem.type === 'fill') {
        try {
          validation = await runCodeAgainstTests(state.selectedProblem, answer, language);
        } catch (error) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit';
          setTerminalOutput(error.message, 'Compilation error', 'terminal-error');
          problemContent.insertAdjacentHTML('afterbegin',
            `<div class="submission-result wrong">Compilation error · ${error.message}</div>`);
          return;
        }
      }
      if (validation.results) {
        setTerminalOutput(validation.results.map((result, index) =>
          `Test ${index + 1}: ${result.passed ? 'PASS' : 'FAIL'}\n  expected: ${result.expected}\n  received: ${result.actual}${result.stderr ? `\n  error: ${result.stderr}` : ''}`
        ).join('\n\n'), validation.correct ? 'Passed' : 'Failed',
        validation.correct ? 'terminal-success' : 'terminal-error');
      } else {
        setTerminalOutput(validation.message, validation.correct ? 'Passed' : 'Failed',
          validation.correct ? 'terminal-success' : 'terminal-error');
      }
      socket.emit('problem:submit', {
        roomCode: state.room.code,
        problemId: state.selectedProblem.id,
        answer,
        language,
        correct: validation.correct,
        message: validation.message
      });
    });
  }

  document.addEventListener('input', event => {
    if (event.target && event.target.id === 'codeInput') updateEditorLineNumbers();
  });

  if (timerInput) {
    timerInput.addEventListener('change', updateTimerDisplay);
  }

  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (!Array.isArray(data) || data.length === 0) {
              throw new Error('Problem file must contain a non-empty array.');
            }
            state.problems = data;
            if (state.room && state.isMaster && !state.room.started) {
              socket.emit('master:setProblems', {
                roomCode: state.room.code,
                problems: data
              });
            }
            renderAll();
          } catch (err) {
            alert(err.message || 'Invalid JSON file.');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      joinLinkInput.select();
      document.execCommand('copy');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
    });
  }

  if (createRoomButton) {
    createRoomButton.addEventListener('click', () => {
      const timerMinutes = Number(timerInput.value) || 25;
      socket.emit('master:createRoom', {
        timerMinutes,
        problems: state.problems
      });
    });
  }

  if (startGameButton) {
    startGameButton.addEventListener('click', () => {
      if (!state.room) return;
      socket.emit('game:start', { roomCode: state.room.code });
    });
  }

  if (joinLobbyButton) {
    joinLobbyButton.addEventListener('click', () => {
      const name = nameInput.value.trim();
      const roll = rollInput.value.trim();
      const roomCode = roomInput.value.trim();
      if (!name || !roll || !roomCode) {
        alert('Please fill all fields');
        return;
      }
      socket.emit('player:joinRoom', { name, roll, roomCode });
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      state.room = null;
      state.currentPlayer = null;
      state.isMaster = false;
      localStorage.removeItem(playerSessionKey);
      if (activeRoomRef && roomListener) {
        activeRoomRef.off('value', roomListener);
      }
      activeRoomRef = null;
      roomListener = null;
      renderAll();
    });
  }
}

// Setup URL-based room detection
function setupJoinFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get('room');
  if (roomCode) {
    if (roomInput) roomInput.value = roomCode;
    if (playerView) playerView.classList.remove('hidden');
    if (adminView) adminView.classList.add('hidden');
  } else {
    if (adminView) adminView.classList.remove('hidden');
    if (playerView) playerView.classList.add('hidden');
  }
}

// Socket.IO event handlers
socket.on('room:created', (data) => {
  state.room = data.room;
  state.isMaster = true;
  if (joinLinkInput) {
    joinLinkInput.value = data.joinLink;
  }
  renderAll();
});

socket.on('room:state', (data) => {
  state.room = data;
  if (Array.isArray(data.problems)) {
    state.problems = data.problems;
  }
  if (!state.isMaster && !state.currentPlayer && rollInput && data.players) {
    state.currentPlayer = data.players.find(
      player => player.roll.toLowerCase() === rollInput.value.trim().toLowerCase()
    ) || null;
  }
  if (state.currentPlayer && data.players) {
    const updated = data.players.find(p => p.id === state.currentPlayer.id);
    if (updated) {
      state.currentPlayer = updated;
    }
  }
  if (state.selectedProblem && state.currentPlayer) {
    const submission = state.currentPlayer.submissions &&
      state.currentPlayer.submissions[state.selectedProblem.id];
    if (submission) {
      renderSubmissionResult(submission);
    }
  }
  renderAll();
});

socket.on('game:started', (data) => {
  state.room = data;
  state.gameStarted = true;
  renderAll();
});

socket.on('error', (msg) => {
  alert(`Error: ${msg}`);
});

socket.on('room:error', ({ message }) => {
  alert(message);
});

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
  initializeUI();
  await loadDefaultProblems();
  setupJoinFromUrl();
  setupEventListeners();
  if (firebaseSession && firebaseSession.roomCode) {
    if (firebaseSession.role === 'master') state.isMaster = true;
    if (firebaseSession.role === 'player') {
      rollInput.value = firebaseSession.roll || '';
      nameInput.value = firebaseSession.name || '';
      state.currentPlayer = {
        id: clientId,
        name: firebaseSession.name || '',
        roll: firebaseSession.roll || '',
        score: 0,
        solvedProblems: [],
        submissions: {},
        wrongAttempts: 0,
        firstBloods: 0,
        role: 'player'
      };
    }
    listenToRoom(firebaseSession.roomCode);
  }
  renderAll();
});
