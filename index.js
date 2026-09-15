(function(){
  'use strict';

  var form = document.getElementById('searchForm');
  var input = document.getElementById('usernameInput');
  var statusEl = document.getElementById('status');
  var main = document.getElementById('results');
  var profileSection = document.getElementById('profileSection');
  var reposSection = document.getElementById('repoList');
  var langsSection = document.getElementById('langsSection');
  var langBar = document.getElementById('langBar');
  var langLegend = document.getElementById('langLegend');
  var sortButtons = document.querySelectorAll('.sort-toggle button');

  var currentRepos = [];
  var currentSort = 'stars';

  var LANG_COLORS = {
    JavaScript:'#e8c547', TypeScript:'#3178c6', Python:'#3572A5', Java:'#b07219',
    'C++':'#f34b7d', C:'#555555', 'C#':'#178600', Go:'#00ADD8', Rust:'#dea584',
    Ruby:'#701516', PHP:'#4F5D95', Swift:'#F05138', Kotlin:'#A97BFF', Dart:'#00B4AB',
    HTML:'#e34c26', CSS:'#563d7c', Shell:'#89e051', Vue:'#41b883', Scala:'#c22d40',
    Elixir:'#6e4a7e', Haskell:'#5e5086', Lua:'#000080', Perl:'#0298c3', R:'#198CE7',
    'Objective-C':'#438eff', Clojure:'#db5855', Zig:'#ec915c', Nix:'#7e7eff',
    Vim :'#199f4b', Makefile:'#427819', Dockerfile:'#384d54', Jupyter:'#DA5B0B'
  };
  var FALLBACK_COLOR = '#9A9A8C';

  function langColor(l){ return LANG_COLORS[l] || FALLBACK_COLOR; }

  function escapeHtml(str){
    if(str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function icon(name){
    var icons = {
      star: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 1.5l1.9 4.2 4.6.5-3.4 3.1.9 4.5L8 11.6l-4 2.2.9-4.5L1.5 6.2l4.6-.5L8 1.5z" stroke-linejoin="round"/></svg>',
      fork: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="4" cy="3.2" r="1.6"/><circle cx="12" cy="3.2" r="1.6"/><circle cx="8" cy="12.8" r="1.6"/><path d="M4 4.8v1.6c0 1.3 1 2.4 2.3 2.4h3.4c1.3 0 2.3-1.1 2.3-2.4V4.8M8 11.2V8.8"/></svg>',
      pin: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 14.5S13 9.8 13 6.2A5 5 0 003 6.2C3 9.8 8 14.5 8 14.5z"/><circle cx="8" cy="6.2" r="1.8"/></svg>',
      calendar: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="3.5" width="12" height="10.5" rx="1"/><path d="M2 6.5h12M5.3 2v3M10.7 2v3"/></svg>',
      link: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6.5 9.5l3-3M6.8 4.8l1-1a2.6 2.6 0 013.7 3.7l-1 1M9.2 11.2l-1 1a2.6 2.6 0 01-3.7-3.7l1-1"/></svg>',
      org: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.5" y="2.5" width="11" height="11" rx="1"/><path d="M5.5 5.5h1.2M9.3 5.5h1.2M5.5 8h1.2M9.3 8h1.2M5.5 10.5h1.2M9.3 10.5h1.2"/></svg>',
      clock: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="6"/><path d="M8 4.8V8l2.4 1.4"/></svg>'
    };
    return icons[name] || '';
  }

  function relativeTime(dateStr){
    var d = new Date(dateStr);
    var now = new Date();
    var diffMs = now - d;
    var sec = Math.floor(diffMs / 1000);
    var min = Math.floor(sec / 60);
    var hr = Math.floor(min / 60);
    var day = Math.floor(hr / 24);
    var mon = Math.floor(day / 30);
    var yr = Math.floor(day / 365);
    if(yr >= 1) return yr + 'y ago';
    if(mon >= 1) return mon + 'mo ago';
    if(day >= 1) return day + 'd ago';
    if(hr >= 1) return hr + 'h ago';
    if(min >= 1) return min + 'm ago';
    return 'just now';
  }

  function formatDate(dateStr){
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year:'numeric', month:'short' });
  }

  function formatNum(n){
    if(n >= 1000) return (n/1000).toFixed(1).replace(/\.0$/,'') + 'k';
    return String(n);
  }

  function setStatus(html){
    statusEl.innerHTML = html;
  }

  function clearStatus(){
    statusEl.innerHTML = '';
  }

  function showLoading(username){
    main.classList.remove('visible');
    setStatus('<div class="msg">fetching <span class="path">@' + escapeHtml(username) + '</span><span class="dots"></span></div>');
  }

  function showError(kind, username){
    main.classList.remove('visible');
    var body = '';
    if(kind === 404){
      body = '<div class="head">404 — no account found</div>there is no github user at <span class="path">@' + escapeHtml(username) + '</span>. check the spelling and try again.';
    } else if(kind === 403){
      body = '<div class="head">403 — rate limit reached</div>github allows 60 unauthenticated requests per hour from this connection. wait a few minutes and try again.';
    } else if(kind === 'empty'){
      body = '<div class="head">nothing to search</div>type a github username above, or pick one of the examples.';
    } else {
      body = '<div class="head">something went wrong</div>the request failed unexpectedly. check your connection and try again.';
    }
    setStatus('<div class="msg error">' + body + '</div>');
  }

  function renderProfile(user){
    var location = user.location ? '<span class="item">' + icon('pin') + escapeHtml(user.location) + '</span>' : '';
    var company = user.company ? '<span class="item">' + icon('org') + escapeHtml(user.company) + '</span>' : '';
    var blog = user.blog ? '<span class="item">' + icon('link') + '<a href="' + escapeHtml(user.blog.startsWith('http') ? user.blog : 'https://' + user.blog) + '" target="_blank" rel="noopener">' + escapeHtml(user.blog.replace(/^https?:\/\//,'')) + '</a></span>' : '';
    var joined = '<span class="item">' + icon('calendar') + 'joined ' + formatDate(user.created_at) + '</span>';

    profileSection.innerHTML =
      '<img class="avatar" src="' + escapeHtml(user.avatar_url) + '" alt="' + escapeHtml(user.login) + ' avatar">' +
      '<div class="who">' +
        '<h2>' + escapeHtml(user.name || user.login) + '</h2>' +
        '<p class="handle"><a href="' + escapeHtml(user.html_url) + '" target="_blank" rel="noopener">@' + escapeHtml(user.login) + '</a></p>' +
        (user.bio ? '<p class="bio">' + escapeHtml(user.bio) + '</p>' : '') +
        '<div class="meta-row">' + location + company + blog + joined + '</div>' +
        '<div class="stats">' +
          '<div class="stat"><span class="num">' + formatNum(user.followers) + '</span><span class="lbl">followers</span></div>' +
          '<div class="stat"><span class="num">' + formatNum(user.following) + '</span><span class="lbl">following</span></div>' +
          '<div class="stat"><span class="num">' + formatNum(user.public_repos) + '</span><span class="lbl">repositories</span></div>' +
          '<div class="stat"><span class="num">' + formatNum(user.public_gists) + '</span><span class="lbl">gists</span></div>' +
        '</div>' +
      '</div>';
  }

  function renderLangs(repos){
    var counts = {};
    var total = 0;
    repos.forEach(function(r){
      if(r.language){
        counts[r.language] = (counts[r.language] || 0) + 1;
        total++;
      }
    });
    if(total === 0){ langsSection.style.display = 'none'; return; }

    var sorted = Object.keys(counts).sort(function(a,b){ return counts[b]-counts[a]; });
    var top = sorted.slice(0, 6);
    var otherCount = sorted.slice(6).reduce(function(s,l){ return s + counts[l]; }, 0);

    var barHtml = '';
    top.forEach(function(l){
      var pct = (counts[l] / total * 100).toFixed(1);
      barHtml += '<span style="width:' + pct + '%; background:' + langColor(l) + ';" title="' + escapeHtml(l) + ' ' + pct + '%"></span>';
    });
    if(otherCount > 0){
      var pctOther = (otherCount / total * 100).toFixed(1);
      barHtml += '<span style="width:' + pctOther + '%; background:' + FALLBACK_COLOR + ';" title="other ' + pctOther + '%"></span>';
    }
    langBar.innerHTML = barHtml;

    var legendHtml = '';
    top.forEach(function(l){
      var pct = (counts[l] / total * 100).toFixed(0);
      legendHtml += '<span><span class="dot" style="background:' + langColor(l) + ';"></span>' + escapeHtml(l) + ' — ' + pct + '%</span>';
    });
    if(otherCount > 0){
      var pctOther = (otherCount / total * 100).toFixed(0);
      legendHtml += '<span><span class="dot" style="background:' + FALLBACK_COLOR + ';"></span>other — ' + pctOther + '%</span>';
    }
    langLegend.innerHTML = legendHtml;
    langsSection.style.display = 'block';
  }

  function sortRepos(repos, mode){
    var copy = repos.slice();
    if(mode === 'stars'){
      copy.sort(function(a,b){ return b.stargazers_count - a.stargazers_count; });
    } else {
      copy.sort(function(a,b){ return new Date(b.pushed_at) - new Date(a.pushed_at); });
    }
    return copy;
  }

  function renderRepos(repos){
    if(repos.length === 0){
      reposSection.innerHTML = '<div class="empty-repos">this account has no public repositories yet.</div>';
      return;
    }
    var sorted = sortRepos(repos, currentSort).slice(0, 30);
    var html = sorted.map(function(r){
      var dotColor = r.language ? langColor(r.language) : 'transparent';
      var dotBorder = r.language ? 'none' : '1px solid var(--line-strong)';
      return (
        '<div class="repo-row">' +
          '<div class="dotcol"><span class="langdot" style="background:' + dotColor + '; border:' + dotBorder + ';"></span></div>' +
          '<div>' +
            '<a class="name" href="' + escapeHtml(r.html_url) + '" target="_blank" rel="noopener">' + escapeHtml(r.name) + '</a>' +
            (r.fork ? '<span class="fork-badge">fork</span>' : '') +
            (r.description ? '<p class="repo-desc">' + escapeHtml(r.description) + '</p>' : '<p class="repo-desc" style="visibility:hidden;">—</p>') +
            '<div class="repo-meta">' +
              (r.language ? '<span class="item">' + escapeHtml(r.language) + '</span>' : '') +
              '<span class="item">' + icon('star') + formatNum(r.stargazers_count) + '</span>' +
              '<span class="item">' + icon('fork') + formatNum(r.forks_count) + '</span>' +
              '<span class="item">' + icon('clock') + 'updated ' + relativeTime(r.pushed_at) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
    reposSection.innerHTML = html;
  }

  sortButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      currentSort = btn.getAttribute('data-sort');
      sortButtons.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      renderRepos(currentRepos);
    });
  });

  function search(username){
    username = username.trim();
    if(!username){
      showError('empty');
      return;
    }
    showLoading(username);

    fetch('https://api.github.com/users/' + encodeURIComponent(username))
      .then(function(res){
        if(res.status === 404){ throw { kind: 404 }; }
        if(res.status === 403){ throw { kind: 403 }; }
        if(!res.ok){ throw { kind: 'other' }; }
        return res.json();
      })
      .then(function(user){
        return fetch('https://api.github.com/users/' + encodeURIComponent(username) + '/repos?per_page=100&sort=updated')
          .then(function(res){
            if(!res.ok){ throw { kind: 'other' }; }
            return res.json();
          })
          .then(function(repos){
            currentRepos = Array.isArray(repos) ? repos : [];
            currentSort = 'stars';
            sortButtons.forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-sort') === 'stars'); });
            clearStatus();
            renderProfile(user);
            renderLangs(currentRepos);
            renderRepos(currentRepos);
            main.classList.add('visible');
            main.scrollIntoView({ behavior:'smooth', block:'start' });
          });
      })
      .catch(function(err){
        var kind = (err && err.kind) ? err.kind : 'other';
        showError(kind, username);
      });
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    search(input.value);
  });

  document.querySelectorAll('.chip').forEach(function(chip){
    chip.addEventListener('click', function(){
      var u = chip.getAttribute('data-user');
      input.value = u;
      search(u);
    });
  });

})();