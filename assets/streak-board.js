(function () {
  'use strict';

  var STORAGE_KEY = 'android-interview-prep:streak-days';
  var activity = window.PrepStreakActivity;
  var users = window.PREP_STREAK_USERS || [
    { id: 'arun', name: 'Arun', color: '#4285f4' },
    { id: 'friend', name: 'Friend', color: '#34a853' }
  ];
  var state = { days: {} };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function formatDate(d) {
    return d.toISOString().slice(0, 10);
  }

  function parseDate(str) {
    var parts = str.split('-').map(Number);
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  }

  function addDays(date, n) {
    var d = new Date(date.getTime());
    d.setUTCDate(d.getUTCDate() + n);
    return d;
  }

  function loadDays() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      state.days = raw ? JSON.parse(raw) : {};
    } catch (e) {
      state.days = {};
    }
    return state.days;
  }

  function saveDays(days) {
    state.days = days;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
  }

  function getActiveDatesForUser(userId, days) {
    return Object.keys(days || {})
      .filter(function (day) {
        return days[day][userId] && days[day][userId].problems > 0;
      })
      .sort();
  }

  function mergeLocalChecklistActivity(userId, days) {
    var merged = JSON.parse(JSON.stringify(days || {}));
    activity.getLocalActiveDates().forEach(function (day) {
      if (!merged[day]) {
        merged[day] = {};
      }
      if (!merged[day][userId]) {
        merged[day][userId] = { problems: 1 };
      }
    });
    return merged;
  }

  function currentStreak(activeDates) {
    if (!activeDates.length) {
      return 0;
    }
    var set = {};
    activeDates.forEach(function (d) {
      set[d] = true;
    });
    var streak = 0;
    var cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);
    if (!set[formatDate(cursor)]) {
      cursor = addDays(cursor, -1);
    }
    while (set[formatDate(cursor)]) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  function longestStreak(activeDates) {
    if (!activeDates.length) {
      return 0;
    }
    var best = 1;
    var run = 1;
    for (var i = 1; i < activeDates.length; i++) {
      var prev = parseDate(activeDates[i - 1]);
      var curr = parseDate(activeDates[i]);
      var diff = (curr - prev) / 86400000;
      if (diff === 1) {
        run += 1;
        best = Math.max(best, run);
      } else if (diff > 1) {
        run = 1;
      }
    }
    return best;
  }

  function level(count) {
    if (!count) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count <= 4) return 3;
    return 4;
  }

  function buildHeatmap(user, days) {
    var end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    var start = addDays(end, -364);
    start = addDays(start, -start.getUTCDay());

    var weeks = [];
    var cursor = new Date(start.getTime());
    while (cursor <= end) {
      var week = [];
      for (var i = 0; i < 7; i++) {
        var key = formatDate(cursor);
        var entry = days[key] && days[key][user.id];
        var count = entry ? entry.problems : 0;
        week.push({ date: key, count: count, level: level(count), future: cursor > end });
        cursor = addDays(cursor, 1);
      }
      weeks.push(week);
    }

    var html = '<div class="streak-heatmap" aria-label="' + user.name + ' activity heatmap">';
    weeks.forEach(function (week) {
      html += '<div class="streak-week">';
      week.forEach(function (cell) {
        if (cell.future) return;
        html +=
          '<span class="streak-cell l' + cell.level + '" style="--user-color:' + user.color +
          '" title="' + cell.date + ': ' + cell.count + ' problem(s)"></span>';
      });
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderUserCard(user, days) {
    var activeDates = getActiveDatesForUser(user.id, days);
    var isMe = activity.getUserId() === user.id;
    return (
      '<article class="streak-user-card' + (isMe ? ' is-me' : '') + '">' +
      '<header class="streak-user-header">' +
      '<span class="streak-user-dot" style="background:' + user.color + '"></span>' +
      '<h3>' + user.name + (isMe ? ' <em>(you)</em>' : '') + '</h3>' +
      '</header>' +
      '<div class="streak-stats">' +
      '<div><strong>' + currentStreak(activeDates) + '</strong><span>Current streak</span></div>' +
      '<div><strong>' + longestStreak(activeDates) + '</strong><span>Longest</span></div>' +
      '<div><strong>' + activeDates.length + '</strong><span>Active days</span></div>' +
      '</div>' +
      buildHeatmap(user, days) +
      '</article>'
    );
  }

  function mergeImportedDays(local, imported) {
    var merged = JSON.parse(JSON.stringify(local || {}));
    Object.keys(imported || {}).forEach(function (day) {
      if (!merged[day]) {
        merged[day] = {};
      }
      Object.keys(imported[day]).forEach(function (userId) {
        var incoming = imported[day][userId];
        var existing = merged[day][userId];
        if (!existing || (incoming.problems || 0) >= (existing.problems || 0)) {
          merged[day][userId] = incoming;
        }
      });
    });
    return merged;
  }

  function exportData() {
    var payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      users: users,
      days: state.days
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'prep-streaks-' + activity.todayKey() + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var payload = JSON.parse(reader.result);
          var imported = payload.days || payload;
          state.days = mergeImportedDays(state.days, imported);
          saveDays(state.days);
          resolve();
        } catch (e) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = function () {
        reject(new Error('Could not read file'));
      };
      reader.readAsText(file);
    });
  }

  function logToday() {
    var userId = activity.getUserId();
    if (!userId) {
      throw new Error('Pick your profile first');
    }
    var today = activity.todayKey();
    var count = Math.max(activity.countProblemsCheckedToday(), 1);
    var days = loadDays();
    if (!days[today]) {
      days[today] = {};
    }
    days[today][userId] = {
      problems: count,
      updatedAt: new Date().toISOString()
    };
    saveDays(days);
  }

  function renderBoard(root) {
    var userId = activity.getUserId();
    var days = loadDays();

    users.forEach(function (user) {
      if (user.id === userId) {
        days = mergeLocalChecklistActivity(user.id, days);
      }
    });

    var setupOptions = users.map(function (user) {
      return '<option value="' + user.id + '"' + (userId === user.id ? ' selected' : '') + '>' + user.name + '</option>';
    }).join('');

    root.innerHTML =
      '<div class="streak-board">' +
      '<div class="streak-setup">' +
      '<label>I am <select id="streak-user-select">' +
      '<option value="">— pick profile —</option>' + setupOptions + '</select></label>' +
      '<button type="button" class="prep-btn" id="streak-log-btn">Log today</button>' +
      '<button type="button" class="prep-btn" id="streak-export-btn">Export</button>' +
      '<label class="prep-btn streak-import-label">Import friend\'s file<input type="file" id="streak-import-input" accept="application/json,.json" hidden></label>' +
      '<span class="streak-local-badge">Local cache</span>' +
      '</div>' +
      '<p class="streak-note">Saved in this browser only. To see both streaks: each person exports their JSON and sends it (WhatsApp, AirDrop, etc.), then the other imports it.</p>' +
      '<div class="streak-grid">' + users.map(function (u) { return renderUserCard(u, days); }).join('') + '</div>' +
      '</div>';

    $('#streak-user-select', root).addEventListener('change', function (e) {
      activity.setUserId(e.target.value);
      renderBoard(root);
    });

    $('#streak-log-btn', root).addEventListener('click', function () {
      try {
        logToday();
        renderBoard(root);
      } catch (err) {
        window.alert(err.message);
      }
    });

    $('#streak-export-btn', root).addEventListener('click', exportData);

    $('#streak-import-input', root).addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      importData(file)
        .then(function () {
          renderBoard(root);
          window.alert('Imported! Both streaks merged into your local cache.');
        })
        .catch(function (err) {
          window.alert('Import failed: ' + err.message);
        });
      e.target.value = '';
    });
  }

  function init() {
    var root = document.getElementById('streak-board-root');
    if (!root) return;
    if (!window.PrepStreakActivity) {
      root.innerHTML = '<p class="streak-error">Activity tracker failed to load.</p>';
      return;
    }
    loadDays();
    renderBoard(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
