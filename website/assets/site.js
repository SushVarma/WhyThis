// ---- home: live example tabs ----
(function(){
  var demoTabs = document.querySelectorAll('.demo-tab');
  var demoBody = document.getElementById('demo-body');
  if (!demoTabs.length || !demoBody) return;

  var demos = [
    {
      q: "Why does calculateTax() work this way?",
      a: "It includes a client-specific branch because Client X's contract specifies a flat regional tax rate. The generic calculation caused a billing error in February, so this path was added to isolate their case from everyone else's.",
      sources: [
        ["1", "GitHub PR #1842", "Priya Nair · Mar 14, 2026"],
        ["2", "Slack #backend", "discussion thread · Mar 12, 2026"],
        ["3", "Jira TAX-1842", "approved by Sarah, Amit"]
      ]
    },
    {
      q: "Why did we switch payment providers?",
      a: "The prior processor's settlement delay (5–7 days) was blocking the invoicing-automation launch. Finance signed off on the migration once the new provider's same-day settlement was confirmed in a vendor call.",
      sources: [
        ["1", "GitHub PR #2011", "Jordan Ellis · Jan 22, 2026"],
        ["2", "Jira PAY-338", "settlement-delay comparison"],
        ["3", "Slack #finance-eng", "vendor call notes · Jan 19, 2026"]
      ]
    },
    {
      q: "Why is retry disabled on the export job?",
      a: "Retries were removed after a duplicate-export incident: a transient timeout caused three retried runs to email the same report to a client. Until idempotency keys ship, failures alert on-call instead of auto-retrying.",
      sources: [
        ["1", "GitHub commit 7c2a1d0", "Marcus Webb · Nov 3, 2025"],
        ["2", "Jira INC-204", "duplicate export incident"],
        ["3", "Slack #data-eng", "postmortem thread · Nov 4, 2025"]
      ]
    }
  ];

  function renderDemo(i){
    var d = demos[i];
    var rows = d.sources.map(function(s){
      return '<div class="source-row"><span class="idx">[' + s[0] + ']</span><span>' + s[1] + '<br><span class="meta">' + s[2] + '</span></span></div>';
    }).join('');
    demoBody.innerHTML =
      '<p class="demo-question">? ' + d.q + '</p>' +
      '<p class="demo-answer">' + d.a + '</p>' +
      '<div class="demo-sources">' + rows + '</div>';
  }

  demoTabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      demoTabs.forEach(function(t){ t.classList.remove('active'); });
      tab.classList.add('active');
      renderDemo(Number(tab.dataset.demo));
    });
  });
  renderDemo(0);
})();

// ---- contact: mailto form ----
(function(){
  var form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var data = new FormData(form);
    var name = (data.get('name') || '').toString();
    var email = (data.get('email') || '').toString();
    var company = (data.get('company') || '').toString();
    var interest = (data.get('interest') || '').toString();
    var message = (data.get('message') || '').toString();

    var subject = 'WhyThis — ' + interest;
    var bodyLines = [
      'Name: ' + name,
      'Email: ' + email,
      'Company: ' + (company || '—'),
      'Interested in: ' + interest,
      '',
      message
    ];
    var mailto = 'mailto:sushma.verma@instalogic.in' +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(bodyLines.join('\n'));

    var status = document.getElementById('contact-form-status');
    if (status) status.hidden = false;
    window.location.href = mailto;
  });
})();
