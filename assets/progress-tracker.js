(function () {
  'use strict';

  var STORAGE_PREFIX = 'android-interview-prep:';
  var TRACKED = ['dsa-checklist', 'dsa-roadmap', 'neetcode-crossref', 'tosca-checklist'];

  function isTrackedPage() {
    var path = window.location.pathname;
    return TRACKED.some(function (segment) {
      return path.indexOf(segment) !== -1;
    });
  }

  function extractLeetcodeSlug(href) {
    var match = href.match(/leetcode\.com\/problems\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
  }

  function pageKey() {
    return window.location.pathname.replace(/\/+$/, '') || '/';
  }

  function storageKey(id) {
    return STORAGE_PREFIX + pageKey() + ':' + id;
  }

  function loadState(id) {
    return localStorage.getItem(storageKey(id)) === 'true';
  }

  function saveState(id, checked) {
    localStorage.setItem(storageKey(id), checked ? 'true' : 'false');
    if (checked && window.PrepStreakActivity) {
      window.PrepStreakActivity.noteProblemChecked(storageKey(id));
    }
  }

  function allTrackIds() {
    return Array.from(document.querySelectorAll('[data-track-id]')).map(function (el) {
      return el.getAttribute('data-track-id');
    });
  }

  function createCheckbox(id, title) {
    var label = document.createElement('label');
    label.className = 'prep-track-check';
    label.title = title || '';

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('data-track-id', id);
    input.checked = loadState(id);
    input.addEventListener('change', function () {
      saveState(id, input.checked);
      syncRowState(input);
      syncDualItemState(input.closest('li'));
      updateProgressPanel();
    });

    var span = document.createElement('span');
    span.className = 'prep-track-check-title';
    span.textContent = title || '';

    label.appendChild(input);
    if (title) {
      label.appendChild(span);
    }

    return label;
  }

  function syncDualItemState(li) {
    if (!li || !li.classList.contains('prep-dual-track-item')) {
      return;
    }
    var boxes = li.querySelectorAll('[data-track-id]');
    var allDone = boxes.length > 0 && Array.from(boxes).every(function (cb) {
      return cb.checked;
    });
    li.classList.toggle('prep-row-done', allDone);
  }

  function syncRowState(input) {
    var row = input.closest('tr');
    if (!row) {
      return;
    }
    var boxes = row.querySelectorAll('[data-track-id]');
    var allDone = boxes.length > 0 && Array.from(boxes).every(function (cb) {
      return cb.checked;
    });
    row.classList.toggle('prep-row-done', allDone);
    syncDualItemState(input.closest('li'));
  }

  function enableInteractiveCheckboxes() {
    document.querySelectorAll('.markdown input[type="checkbox"]').forEach(function (input) {
      input.removeAttribute('disabled');
    });
  }

  function enhanceDualPassLists() {
    if (window.location.pathname.indexOf('dsa-checklist') === -1) {
      return;
    }

    var section = document.getElementById('80-must-do-problems-do-each-twice');
    if (!section) {
      return;
    }

    var node = section.nextElementSibling;
    while (node && node.id !== '12-week-tracker') {
      if (node.tagName === 'UL') {
        node.querySelectorAll('li').forEach(function (li) {
          enhanceDualPassItem(li);
        });
      }
      node = node.nextElementSibling;
    }
  }

  function enhanceDualPassItem(li) {
    if (li.querySelector('.prep-dual-track-controls')) {
      return;
    }

    var link = li.querySelector('a[href*="leetcode.com"]');
    if (!link) {
      return;
    }

    var slug = extractLeetcodeSlug(link.href);
    if (!slug) {
      return;
    }

    var labelText = li.textContent
      .replace(/^\[ \]\s*/, '')
      .replace(/\s*—\s*LC\s*$/i, '')
      .trim();

    li.className = 'prep-dual-track-item';
    li.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'prep-dual-track-controls';
    wrap.appendChild(createCheckbox('pass1:' + slug, 'Untimed'));
    wrap.appendChild(createCheckbox('pass2:' + slug, 'Timed'));

    var text = document.createElement('span');
    text.className = 'prep-dual-track-label';
    text.innerHTML = labelText + ' — <a href="' + link.href + '" target="_blank" rel="noopener">LC</a>';

    li.appendChild(wrap);
    li.appendChild(text);

    li.querySelectorAll('[data-track-id]').forEach(function (input) {
      syncDualItemState(li);
    });
  }

  function enhanceProblemTables() {
    document.querySelectorAll('.markdown table').forEach(function (table) {
      if (table.dataset.trackEnhanced) {
        return;
      }

      var headerRow = table.querySelector('thead tr') || table.querySelector('tr');
      if (!headerRow) {
        return;
      }

      var headers = Array.from(headerRow.cells).map(function (cell) {
        return cell.textContent.trim().toLowerCase();
      });

      var linkIdx = headers.findIndex(function (h) {
        return h.indexOf('link') !== -1;
      });

      if (linkIdx === -1) {
        return;
      }

      table.dataset.trackEnhanced = 'true';

      var th = document.createElement('th');
      th.textContent = 'Track';
      headerRow.insertBefore(th, headerRow.firstChild);

      Array.from(table.rows).forEach(function (row) {
        if (row === headerRow) {
          return;
        }

        var linkCell = row.cells[linkIdx];
        var link = linkCell && linkCell.querySelector('a[href*="leetcode.com"]');
        if (!link) {
          return;
        }

        var slug = extractLeetcodeSlug(link.href);
        if (!slug) {
          return;
        }

        var td = document.createElement('td');
        td.className = 'prep-track-cell';

        var isChecklistPage = window.location.pathname.indexOf('dsa-checklist') !== -1;
        if (isChecklistPage) {
          td.appendChild(createCheckbox('pass1:' + slug, '1'));
          td.appendChild(createCheckbox('pass2:' + slug, '2'));
        } else {
          td.appendChild(createCheckbox('done:' + slug, 'Done'));
        }

        row.insertBefore(td, row.firstChild);

        Array.from(td.querySelectorAll('[data-track-id]')).forEach(syncRowState);
      });
    });
  }

  function enhanceTaskListCheckboxes() {
    document.querySelectorAll('.markdown input[type="checkbox"]').forEach(function (input, index) {
      input.removeAttribute('disabled');

      if (input.getAttribute('data-track-id')) {
        return;
      }

      var li = input.closest('li');
      var section = li && li.closest('h3, h2');
      var sectionSlug = section ? slugify(section.textContent) : 'section';
      var textSlug = li ? slugify(li.textContent) : 'item-' + index;
      var id = 'task:' + sectionSlug + ':' + textSlug;

      input.setAttribute('data-track-id', id);
      input.checked = loadState(id);
      input.addEventListener('change', function () {
        saveState(id, input.checked);
        updateProgressPanel();
      });
    });
  }

  function injectProgressPanel() {
    var article = document.querySelector('.book-article');
    if (!article || document.querySelector('.prep-progress-panel')) {
      return;
    }

    var panel = document.createElement('div');
    panel.className = 'prep-progress-panel';
    panel.innerHTML =
      '<div class="prep-progress-header">' +
      '<strong>Your progress</strong>' +
      '<span class="prep-progress-count">0 / 0</span>' +
      '</div>' +
      '<div class="prep-progress-bar" aria-hidden="true"><div class="prep-progress-fill"></div></div>' +
      '<p class="prep-progress-note">Saved in this browser (localStorage). <a href="../streak-board/">Streak board</a> · Export to back up.</p>' +
      '<div class="prep-progress-actions">' +
      '<button type="button" class="prep-btn prep-btn-export">Export JSON</button>' +
      '<button type="button" class="prep-btn prep-btn-reset">Reset this page</button>' +
      '</div>';

    article.insertBefore(panel, article.firstChild);

    panel.querySelector('.prep-btn-reset').addEventListener('click', function () {
      if (!window.confirm('Clear all checkboxes on this page?')) {
        return;
      }
      allTrackIds().forEach(function (id) {
        localStorage.removeItem(storageKey(id));
      });
      document.querySelectorAll('[data-track-id]').forEach(function (el) {
        el.checked = false;
      });
      document.querySelectorAll('.prep-row-done').forEach(function (row) {
        row.classList.remove('prep-row-done');
      });
      updateProgressPanel();
    });

    panel.querySelector('.prep-btn-export').addEventListener('click', function () {
      var data = {};
      allTrackIds().forEach(function (id) {
        data[storageKey(id)] = loadState(id);
      });
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'dsa-progress-' + pageKey().replace(/\//g, '-') + '.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function updateProgressPanel() {
    var boxes = document.querySelectorAll('[data-track-id]');
    var total = boxes.length;
    var done = Array.from(boxes).filter(function (el) {
      return el.checked;
    }).length;
    var pct = total ? Math.round((done / total) * 100) : 0;

    var countEl = document.querySelector('.prep-progress-count');
    var fillEl = document.querySelector('.prep-progress-fill');
    var summaryEl = document.querySelector('#prep-summary-done');

    if (countEl) {
      countEl.textContent = done + ' / ' + total + ' (' + pct + '%)';
    }
    if (fillEl) {
      fillEl.style.width = pct + '%';
    }
    if (summaryEl) {
      summaryEl.textContent = done + ' / ' + total;
    }
  }

  function init() {
    if (!isTrackedPage()) {
      return;
    }

    injectProgressPanel();
    enhanceDualPassLists();
    enhanceProblemTables();
    enhanceTaskListCheckboxes();
    enableInteractiveCheckboxes();

    document.querySelectorAll('[data-track-id]').forEach(function (el) {
      if (!el.dataset.listenerAttached) {
        el.dataset.listenerAttached = 'true';
        if (!el.onchange) {
          el.addEventListener('change', function () {
            syncRowState(el);
          });
        }
      }
      syncRowState(el);
    });

    updateProgressPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
