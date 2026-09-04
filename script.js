// Socket.IO client for Code Arena multiplayer game
const socket = (() => {
  const s = io();
  window.socket = s;  // Make globally accessible for debugging
  return s;
})();

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
        ${submission.correct ? 'Correct answer' : 'Wrong answer'} · ${languageNames[submission.language] || submission.language}
      </div>`);
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
        `<label for="languageSelect">Language</label>
         <select id="languageSelect">
           <option value="javascript">JavaScript</option><option value="python">Python</option>
           <option value="java">Java</option><option value="cpp">C++</option><option value="c">C</option>
           <option value="csharp">C#</option><option value="go">Go</option><option value="rust">Rust</option>
           <option value="kotlin">Kotlin</option><option value="php">PHP</option>
         </select>
         <pre id="starterCodePreview">${problem.starterCode || ''}</pre>
         <textarea class="code-editor" id="codeInput" spellcheck="false">${problem.starterCode || ''}</textarea>`;
    } else {
      problemContent.textContent = problem.answerSnippet || 'Answer: ...';
    }
  }
  renderSubmissionResult(submission);
  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    if (submission && languageNames[submission.language]) {
      languageSelect.value = submission.language;
    }
    languageSelect.addEventListener('change', () => {
      const code = starterCodeForLanguage(problem, languageSelect.value);
      const preview = document.getElementById('starterCodePreview');
      const editor = document.getElementById('codeInput');
      if (preview) preview.textContent = code;
      if (editor && !submission) editor.value = code;
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
    submitBtn.addEventListener('click', () => {
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
      socket.emit('problem:submit', {
        roomCode: state.room.code,
        problemId: state.selectedProblem.id,
        answer,
        language
      });
      submitBtn.disabled = true;
      submitBtn.textContent = 'Checking...';
    });
  }

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
      socket.disconnect();
      socket.connect();
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
  renderAll();
});
