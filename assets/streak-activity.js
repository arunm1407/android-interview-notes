(function (global) {
  'use strict';

  var PREFIX = 'android-interview-prep:';

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function markActiveToday() {
    localStorage.setItem(PREFIX + 'daily-active:' + todayKey(), '1');
  }

  function isActiveToday() {
    return localStorage.getItem(PREFIX + 'daily-active:' + todayKey()) === '1';
  }

  function getLocalActiveDates() {
    var dates = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf(PREFIX + 'daily-active:') === 0) {
        dates.push(key.slice((PREFIX + 'daily-active:').length));
      }
    }
    return dates.sort();
  }

  function countProblemsCheckedToday() {
    var count = 0;
    var today = todayKey();
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!key || key.indexOf(PREFIX) !== 0 || localStorage.getItem(key) !== 'true') {
        continue;
      }
      if (key.indexOf('daily-active:') !== -1) {
        continue;
      }
      var touchedKey = PREFIX + 'touched:' + today + ':' + key;
      if (localStorage.getItem(touchedKey) === '1') {
        count += 1;
      }
    }
    return count;
  }

  function noteProblemChecked(storageKey) {
    markActiveToday();
    localStorage.setItem(PREFIX + 'touched:' + todayKey() + ':' + storageKey, '1');
  }

  function getUserId() {
    return localStorage.getItem(PREFIX + 'streak-user-id') || '';
  }

  function setUserId(id) {
    localStorage.setItem(PREFIX + 'streak-user-id', id);
  }

  global.PrepStreakActivity = {
    PREFIX: PREFIX,
    todayKey: todayKey,
    markActiveToday: markActiveToday,
    isActiveToday: isActiveToday,
    getLocalActiveDates: getLocalActiveDates,
    countProblemsCheckedToday: countProblemsCheckedToday,
    noteProblemChecked: noteProblemChecked,
    getUserId: getUserId,
    setUserId: setUserId
  };
})(window);
