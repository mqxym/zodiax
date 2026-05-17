(function () {
  const DB_NAME = 'zodiax-statistics';
  const DB_VERSION = 1;
  const META_STORE = 'meta';
  const SESSIONS_STORE = 'sessions';
  const ANSWERS_STORE = 'answers';
  const MODE_STATS_STORE = 'modeStats';

  const SESSION_STORAGE_KEY = 'zodiax-session-id';
  const SUPPORTED_MODES = ['sorted', 'transitions', 'transitionsShuffled', 'shuffled'];

  let dbPromise = null;
  let activeLocale = 'en';

  function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getTodayKey() {
    return getLocalDateKey();
  }

  function getStartOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function cloneMapTemplate() {
    const map = {};

    for (let i = 1; i <= 12; i++) {
      map[String(i)] = 0;
    }

    return map;
  }

  function cloneModeCountsTemplate() {
    const modeCounts = {};

    SUPPORTED_MODES.forEach((mode) => {
      modeCounts[mode] = 0;
    });

    return modeCounts;
  }

  function createEmptyModeSummary(mode) {
    return {
      mode,
      attempts: 0,
      correct: 0,
      wrong: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastStreakDate: '',
      zodiacCorrect: cloneMapTemplate(),
      zodiacWrong: cloneMapTemplate()
    };
  }

  function withAccuracy(summary) {
    const attempts = summary.attempts || 0;
    const correct = summary.correct || 0;
    return {
      ...summary,
      attempts,
      correct,
      wrong: summary.wrong || 0,
      accuracy: attempts === 0 ? 0 : Math.round((correct / attempts) * 100)
    };
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function getObjectStore(transaction, storeName) {
    return transaction.objectStore(storeName);
  }

  function openDatabase() {
    if (dbPromise) {
      return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          const sessionsStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
          sessionsStore.createIndex('startedAt', 'startedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(ANSWERS_STORE)) {
          const answersStore = db.createObjectStore(ANSWERS_STORE, { keyPath: 'id', autoIncrement: true });
          answersStore.createIndex('sessionId', 'sessionId', { unique: false });
          answersStore.createIndex('mode', 'mode', { unique: false });
          answersStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(MODE_STATS_STORE)) {
          db.createObjectStore(MODE_STATS_STORE, { keyPath: 'mode' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return dbPromise;
  }

  async function getOrCreateSession(locale) {
    const db = await openDatabase();
    let sessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (sessionId) {
      return sessionId;
    }

    sessionId = `session-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    const now = new Date().toISOString();

    const tx = db.transaction([SESSIONS_STORE], 'readwrite');
    const store = getObjectStore(tx, SESSIONS_STORE);

    await requestToPromise(store.put({
      id: sessionId,
      locale,
      startedAt: now,
      updatedAt: now,
      attempts: 0,
      correct: 0,
      wrong: 0,
      modeCounts: cloneModeCountsTemplate()
    }));

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    return sessionId;
  }

  async function getModeSummary(mode) {
    const db = await openDatabase();
    const tx = db.transaction([MODE_STATS_STORE], 'readwrite');
    const store = getObjectStore(tx, MODE_STATS_STORE);
    const existing = await requestToPromise(store.get(mode));
    const summary = existing || createEmptyModeSummary(mode);

    if (summary.lastStreakDate && summary.lastStreakDate !== getTodayKey()) {
      summary.currentStreak = 0;
      await requestToPromise(store.put(summary));
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    return withAccuracy(summary);
  }

  async function getLiveModeSummary(mode) {
    if (!SUPPORTED_MODES.includes(mode)) {
      throw new Error('Unsupported mode for summary');
    }

    const db = await openDatabase();
    const tx = db.transaction([ANSWERS_STORE], 'readonly');
    const answersStore = getObjectStore(tx, ANSWERS_STORE);
    const answersByModeIndex = answersStore.index('mode');
    const startOfToday = getStartOfToday().getTime();
    const answers = await requestToPromise(answersByModeIndex.getAll(IDBKeyRange.only(mode)));

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    const todaysAnswers = answers
      .filter((answer) => {
        if (!answer || typeof answer.timestamp !== 'string') {
          return false;
        }

        const answerTime = new Date(answer.timestamp).getTime();
        return Number.isFinite(answerTime) && answerTime >= startOfToday;
      })
      .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());

    const summary = createEmptyModeSummary(mode);
    summary.zodiacCorrect = ensureZodiacMap(summary.zodiacCorrect);
    summary.zodiacWrong = ensureZodiacMap(summary.zodiacWrong);
    summary.lastStreakDate = getTodayKey();

    todaysAnswers.forEach((answer) => {
      const correctZodiacKey = String(answer.correctZodiacKey);
      const isCorrect = Boolean(answer.isCorrect);

      summary.attempts += 1;

      if (isCorrect) {
        summary.correct += 1;
        summary.currentStreak += 1;
        summary.bestStreak = Math.max(summary.bestStreak, summary.currentStreak);
        summary.zodiacCorrect[correctZodiacKey] = (summary.zodiacCorrect[correctZodiacKey] || 0) + 1;
      } else {
        summary.wrong += 1;
        summary.currentStreak = 0;
        summary.zodiacWrong[correctZodiacKey] = (summary.zodiacWrong[correctZodiacKey] || 0) + 1;
      }
    });

    return withAccuracy(summary);
  }

  function ensureZodiacMap(map) {
    const result = cloneMapTemplate();

    if (!map) {
      return result;
    }

    Object.keys(result).forEach((key) => {
      result[key] = Number(map[key] || 0);
    });

    return result;
  }

  function ensureModeCounts(modeCounts) {
    const result = cloneModeCountsTemplate();

    if (!modeCounts) {
      return result;
    }

    SUPPORTED_MODES.forEach((mode) => {
      result[mode] = Number(modeCounts[mode] || 0);
    });

    return result;
  }

  async function recordAnswer(payload) {
    const mode = SUPPORTED_MODES.includes(payload.mode) ? payload.mode : 'sorted';
    const selectedZodiacKey = String(payload.selectedZodiacKey);
    const correctZodiacKey = String(payload.correctZodiacKey);
    const isCorrect = Boolean(payload.isCorrect);
    const db = await openDatabase();
    const sessionId = await getOrCreateSession(activeLocale);
    const timestamp = new Date().toISOString();
    const todayKey = getTodayKey();

    const tx = db.transaction([MODE_STATS_STORE, ANSWERS_STORE, SESSIONS_STORE], 'readwrite');
    const modeStatsStore = getObjectStore(tx, MODE_STATS_STORE);
    const answersStore = getObjectStore(tx, ANSWERS_STORE);
    const sessionsStore = getObjectStore(tx, SESSIONS_STORE);

    const modeStatsExisting = await requestToPromise(modeStatsStore.get(mode));
    const summary = modeStatsExisting || createEmptyModeSummary(mode);

    summary.zodiacCorrect = ensureZodiacMap(summary.zodiacCorrect);
    summary.zodiacWrong = ensureZodiacMap(summary.zodiacWrong);

    if (summary.lastStreakDate && summary.lastStreakDate !== todayKey) {
      summary.currentStreak = 0;
    }

    summary.attempts += 1;

    if (isCorrect) {
      summary.correct += 1;
      summary.currentStreak += 1;
      summary.bestStreak = Math.max(summary.bestStreak, summary.currentStreak);
      summary.zodiacCorrect[correctZodiacKey] = (summary.zodiacCorrect[correctZodiacKey] || 0) + 1;
    } else {
      summary.wrong += 1;
      summary.currentStreak = 0;
      summary.zodiacWrong[correctZodiacKey] = (summary.zodiacWrong[correctZodiacKey] || 0) + 1;
    }

    summary.lastStreakDate = todayKey;

    await requestToPromise(modeStatsStore.put(summary));
    await requestToPromise(answersStore.add({
      sessionId,
      mode,
      selectedZodiacKey,
      correctZodiacKey,
      isCorrect,
      timestamp
    }));

    const session = await requestToPromise(sessionsStore.get(sessionId));

    if (session) {
      session.modeCounts = ensureModeCounts(session.modeCounts);
      session.attempts = Number(session.attempts || 0) + 1;
      session.correct = Number(session.correct || 0) + (isCorrect ? 1 : 0);
      session.wrong = Number(session.wrong || 0) + (isCorrect ? 0 : 1);
      session.modeCounts[mode] = Number(session.modeCounts[mode] || 0) + 1;
      session.updatedAt = timestamp;
      await requestToPromise(sessionsStore.put(session));
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    return withAccuracy(summary);
  }

  function findTopEntry(map) {
    if (!map) {
      return { zodiacKey: null, count: 0 };
    }

    let topKey = null;
    let topCount = 0;

    Object.keys(map).forEach((key) => {
      const count = Number(map[key] || 0);

      if (count > topCount) {
        topCount = count;
        topKey = key;
      }
    });

    return { zodiacKey: topKey, count: topCount };
  }

  async function getAllModeSummaries() {
    const db = await openDatabase();
    const tx = db.transaction([MODE_STATS_STORE], 'readonly');
    const store = getObjectStore(tx, MODE_STATS_STORE);

    const records = await requestToPromise(store.getAll());

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    const result = {};

    SUPPORTED_MODES.forEach((mode) => {
      const existing = records.find((entry) => entry.mode === mode) || createEmptyModeSummary(mode);
      existing.zodiacCorrect = ensureZodiacMap(existing.zodiacCorrect);
      existing.zodiacWrong = ensureZodiacMap(existing.zodiacWrong);

      if (existing.lastStreakDate && existing.lastStreakDate !== getTodayKey()) {
        existing.currentStreak = 0;
      }

      const withRate = withAccuracy(existing);

      result[mode] = {
        ...withRate,
        topCorrect: findTopEntry(withRate.zodiacCorrect),
        topWrong: findTopEntry(withRate.zodiacWrong)
      };
    });

    return result;
  }

  async function getRecentSessions(limit = 12) {
    const db = await openDatabase();
    const tx = db.transaction([SESSIONS_STORE], 'readonly');
    const store = getObjectStore(tx, SESSIONS_STORE);
    const sessions = await requestToPromise(store.getAll());

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    const selectedSessions = sessions
      .filter((session) => Number(session.attempts || 0) > 0)
      .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())
      .slice(0, limit);

    const modeCountsBySession = {};
    const modeCountsTx = db.transaction([ANSWERS_STORE], 'readonly');
    const answersStore = getObjectStore(modeCountsTx, ANSWERS_STORE);
    const answersBySessionIndex = answersStore.index('sessionId');

    for (const session of selectedSessions) {
      const modeCounts = cloneModeCountsTemplate();
      const answers = await requestToPromise(answersBySessionIndex.getAll(IDBKeyRange.only(session.id)));

      answers.forEach((answer) => {
        const mode = SUPPORTED_MODES.includes(answer.mode) ? answer.mode : 'sorted';
        modeCounts[mode] = Number(modeCounts[mode] || 0) + 1;
      });

      const hasAnswerRecords = answers.length > 0;

      if (!hasAnswerRecords) {
        modeCountsBySession[session.id] = ensureModeCounts(session.modeCounts);
        continue;
      }

      modeCountsBySession[session.id] = modeCounts;
    }

    await new Promise((resolve, reject) => {
      modeCountsTx.oncomplete = () => resolve();
      modeCountsTx.onerror = () => reject(modeCountsTx.error);
      modeCountsTx.onabort = () => reject(modeCountsTx.error);
    });

    return selectedSessions.map((session) => {
        const attempts = Number(session.attempts || 0);
        const correct = Number(session.correct || 0);
        const modeCounts = modeCountsBySession[session.id] || ensureModeCounts(session.modeCounts);
        const playedModes = SUPPORTED_MODES.filter((mode) => Number(modeCounts[mode] || 0) > 0);

        return {
          ...session,
          attempts,
          correct,
          wrong: Number(session.wrong || 0),
          accuracy: attempts === 0 ? 0 : Math.round((correct / attempts) * 100),
          modeCounts,
          playedModes
        };
      });
  }

  async function init(locale) {
    activeLocale = locale || 'en';
    await openDatabase();
    await getOrCreateSession(activeLocale);
  }

  async function resetModeStatistics(mode) {
    if (!SUPPORTED_MODES.includes(mode)) {
      throw new Error('Unsupported mode for reset');
    }

    const db = await openDatabase();
    const tx = db.transaction([MODE_STATS_STORE, ANSWERS_STORE], 'readwrite');
    const modeStatsStore = getObjectStore(tx, MODE_STATS_STORE);
    const answersStore = getObjectStore(tx, ANSWERS_STORE);

    await requestToPromise(modeStatsStore.put(createEmptyModeSummary(mode)));

    const allAnswers = await requestToPromise(answersStore.getAll());
    const deletions = allAnswers
      .filter((entry) => entry.mode === mode)
      .map((entry) => requestToPromise(answersStore.delete(entry.id)));

    await Promise.all(deletions);

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async function resetAllStatistics() {
    const db = await openDatabase();
    const tx = db.transaction([SESSIONS_STORE, ANSWERS_STORE, MODE_STATS_STORE], 'readwrite');

    await requestToPromise(getObjectStore(tx, SESSIONS_STORE).clear());
    await requestToPromise(getObjectStore(tx, ANSWERS_STORE).clear());
    await requestToPromise(getObjectStore(tx, MODE_STATS_STORE).clear());

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    await getOrCreateSession(activeLocale);
  }

  window.StatisticsService = {
    init,
    getModeSummary,
    getLiveModeSummary,
    getAllModeSummaries,
    getRecentSessions,
    recordAnswer,
    resetModeStatistics,
    resetAllStatistics,
    SUPPORTED_MODES: [...SUPPORTED_MODES]
  };
})();
