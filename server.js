const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const PORT = process.env.PORT || 3000;
const supportedLanguages = ['javascript', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'kotlin', 'php'];

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

const rooms = new Map();

function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function broadcastRoomState(room) {
  if (!room) return;
  io.to(room.code).emit('room:state', serializeRoom(room));
}

function addNotification(room, text) {
  room.notifications.unshift(text);
  room.notifications = room.notifications.slice(0, 12);
}

function sortPlayers(players) {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.wrongAttempts !== b.wrongAttempts) return a.wrongAttempts - b.wrongAttempts;
    if (b.firstBloods !== a.firstBloods) return b.firstBloods - a.firstBloods;
    return (a.solvedProblems || []).length - (b.solvedProblems || []).length;
  });
}

function createRoom(code, timerMinutes) {
  const room = {
    code,
    timerMinutes,
    started: false,
    ended: false,
    countdown: timerMinutes * 60,
    players: [],
    notifications: [`Room ${code} created. Share the join link separately.`],
    problems: defaultProblems.map((problem) => ({ ...problem, firstBlood: false })),
    masterSocketId: null,
    timerInterval: null
  };
  rooms.set(code, room);
  return room;
}

function serializeRoom(room) {
  return {
    code: room.code,
    timerMinutes: room.timerMinutes,
    started: room.started,
    ended: room.ended,
    countdown: room.countdown,
    masterSocketId: room.masterSocketId,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      roll: player.roll,
      score: player.score,
      firstBloods: player.firstBloods,
      wrongAttempts: player.wrongAttempts,
      solvedProblems: [...player.solvedProblems],
      submissions: { ...player.submissions },
      role: player.role
    })),
    notifications: [...room.notifications],
    problems: room.problems.map((problem) => ({
      id: problem.id,
      title: problem.title,
      difficulty: problem.difficulty,
      type: problem.type,
      points: problem.points,
      tag: problem.tag,
      firstBlood: Boolean(problem.firstBlood),
      answer: problem.answer,
      answerSnippet: problem.answerSnippet,
      options: problem.options || [],
      text: problem.text,
      starterCode: problem.starterCode || ''
    }))
  };
}

function startRoomTimer(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  room.timerInterval = setInterval(() => {
    if (!room.started || room.ended) return;
    room.countdown -= 1;

    if (room.countdown <= 0) {
      room.countdown = 0;
      room.started = false;
      room.ended = true;
      clearInterval(room.timerInterval);
      addNotification(room, 'Time is up! Final leaderboard locked.');
      broadcastRoomState(room);
      return;
    }

    broadcastRoomState(room);
  }, 1000);
}

function evaluateSubmission(problem, answer) {
  if (problem.type === 'mcq') {
    return String(answer).trim() === String(problem.answer).trim();
  }

  const normalizedAnswer = String(answer || '').replace(/\s+/g, ' ').trim();
  const target = String(problem.answerSnippet || '').replace(/\s+/g, ' ').trim();
  return normalizedAnswer.includes(target) || normalizedAnswer.toLowerCase().includes(problem.title.toLowerCase().split(' ')[0].toLowerCase());
}

io.on('connection', (socket) => {
  socket.on('master:createRoom', ({ timerMinutes = 25 }) => {
    const roomCode = randomRoomCode();
    const room = createRoom(roomCode, Number(timerMinutes));
    room.masterSocketId = socket.id;
    socket.data.roomCode = roomCode;
    socket.data.role = 'master';
    socket.join(roomCode);

    socket.emit('room:created', {
      roomCode,
      joinLink: `${process.env.APP_URL || 'http://localhost:3000'}?room=${roomCode}`,
      room: serializeRoom(room)
    });
    socket.emit('room:state', serializeRoom(room));
  });

  socket.on('player:joinRoom', ({ name, roll, roomCode }) => {
    const normalizedCode = String(roomCode || '').trim().toUpperCase();
    const room = rooms.get(normalizedCode);

    if (!room) {
      socket.emit('room:error', { message: 'Room not found. Please check the code.' });
      return;
    }

    const normalizedName = String(name || '').trim();
    const normalizedRoll = String(roll || '').trim();

    if (!normalizedName || !normalizedRoll) {
      socket.emit('room:error', { message: 'Name and roll number are required.' });
      return;
    }

    let player = room.players.find((entry) => entry.roll.toLowerCase() === normalizedRoll.toLowerCase());
    if (!player) {
      player = {
        id: socket.id,
        name: normalizedName,
        roll: normalizedRoll,
        score: 0,
        firstBloods: 0,
        wrongAttempts: 0,
        solvedProblems: [],
        submissions: {},
        role: 'player'
      };
      room.players.push(player);
    } else {
      player.id = socket.id;
      player.name = normalizedName;
    }

    socket.data.roomCode = normalizedCode;
    socket.data.role = 'player';
    socket.data.roll = normalizedRoll;
    socket.join(normalizedCode);
    addNotification(room, `${normalizedName} joined room ${normalizedCode}.`);
    room.players = sortPlayers(room.players);
    broadcastRoomState(room);
  });

  socket.on('game:start', ({ roomCode }) => {
    const room = rooms.get(String(roomCode || '').trim().toUpperCase());
    if (!room) return;
    if (room.masterSocketId !== socket.id) return;
    room.started = true;
    room.ended = false;
    room.countdown = room.timerMinutes * 60;
    addNotification(room, 'The arena is live. Good luck!');
    startRoomTimer(room);
    broadcastRoomState(room);
  });

  socket.on('problem:submit', ({ roomCode, problemId, answer, language }) => {
    const room = rooms.get(String(roomCode || '').trim().toUpperCase());
    if (!room || !room.started) return;

    const player = room.players.find((entry) => entry.id === socket.id || entry.roll === socket.data.roll);
    if (!player) return;
    player.submissions = player.submissions || {};

    const problem = room.problems.find((entry) => entry.id === problemId);
    if (!problem || player.submissions[problemId]) return;

    const correct = evaluateSubmission(problem, answer);
    const selectedLanguage = supportedLanguages.includes(language) ? language : 'javascript';
    player.submissions[problemId] = {
      correct,
      status: correct ? 'correct' : 'wrong',
      language: selectedLanguage
    };

    if (correct) {
      const previouslySolved = room.players.filter((entry) => entry.solvedProblems.includes(problemId)).length;
      const firstBlood = !problem.firstBlood && previouslySolved === 0;
      const basePoints = problem.points;
      const speedBonus = previouslySolved === 0 ? 30 : previouslySolved === 1 ? 20 : previouslySolved === 2 ? 10 : 0;
      const gain = basePoints + (firstBlood ? 50 : 0) + speedBonus;

      player.score += gain;
      player.solvedProblems.push(problemId);
      if (firstBlood) {
        problem.firstBlood = true;
        player.firstBloods += 1;
        addNotification(room, `First blood on ${problemId} awarded to ${player.name}!`);
      } else {
        addNotification(room, `${player.name} solved ${problemId} for ${basePoints} points.`);
      }
    } else {
      player.wrongAttempts += 1;
      player.score = Math.max(0, player.score - 10);
      addNotification(room, `${player.name} made a wrong attempt on ${problemId}. -10 penalty.`);
    }

    room.players = sortPlayers(room.players);
    broadcastRoomState(room);
  });

  socket.on('disconnect', () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    if (room.masterSocketId === socket.id) {
      room.masterSocketId = null;
      room.started = false;
      room.ended = false;
      addNotification(room, 'Master disconnected. Room is waiting for a new host.');
      broadcastRoomState(room);
      return;
    }

    const playerIndex = room.players.findIndex((entry) => entry.id === socket.id || entry.roll === socket.data.roll);
    if (playerIndex >= 0) {
      const player = room.players[playerIndex];
      room.players.splice(playerIndex, 1);
      if (player && player.name) {
        addNotification(room, `${player.name} left the room.`);
      }
      room.players = sortPlayers(room.players);
      broadcastRoomState(room);
    }
  });
});

app.use(express.static(path.join(__dirname)));

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

// Fallback to index.html for single-page app routing
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Code Arena server running on http://localhost:${PORT}`);
});
