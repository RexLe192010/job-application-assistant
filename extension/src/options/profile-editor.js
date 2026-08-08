async function loadStoredProfileToUI() {
  const storage = window.JobApplyAssistant && window.JobApplyAssistant.storage;
  if (!storage) return;
  const profile = await storage.getResumeProfile();
  window._profile = profile || {};
  document.getElementById('full_name').value = profile.personal?.full_name || '';
  document.getElementById('first_name').value = profile.personal?.first_name || '';
  document.getElementById('last_name').value = profile.personal?.last_name || '';
  document.getElementById('email').value = profile.contact?.email || '';
  document.getElementById('phone').value = profile.contact?.phone || '';
  document.getElementById('linkedin').value = profile.links?.linkedin || '';
  document.getElementById('github').value = profile.links?.github || '';
  document.getElementById('rawPreview').textContent = JSON.stringify(profile, null, 2);
  renderEducation(); renderExperience(); renderProjects();
}

async function analyzeUploadedResume() {
  const file = document.getElementById('resumeFile').files && document.getElementById('resumeFile').files[0];
  const status = document.getElementById('analyzeStatus');
  if (!file) { status.textContent = 'Choose a resume file first.'; return; }
  status.textContent = 'Extracting text...';
  const resumeParser = window.JobApplyAssistant && window.JobApplyAssistant.resumeParser;
  const aiClient = window.JobApplyAssistant && window.JobApplyAssistant.aiClient;
  const storage = window.JobApplyAssistant && window.JobApplyAssistant.storage;
  if (!resumeParser) { status.textContent = 'resumeParser not available'; return; }

  try {
    const base = await resumeParser.buildResumePackage(file);
    status.textContent = 'Calling AI to parse resume...';
    let aiResult = null;
    if (aiClient && typeof aiClient.extractResumeData === 'function') {
      try {
        aiResult = await aiClient.extractResumeData(base.sourceText, file.name);
      } catch (e) {
        console.warn('AI extract failed', e);
        aiResult = null;
      }
    }

    let profile = base;
    if (aiResult) {
      // If AI returned parsed JSON, map to canonical profile
      const mapped = aiClient && typeof aiClient.mapParsedToProfile === 'function' ? aiClient.mapParsedToProfile(aiResult, file.name) : null;
      profile = Object.assign({}, base, mapped || {}, { sourceFile: base.sourceFile, sourceText: base.sourceText });
    } else {
      profile = base;
    }

    profile.importedAt = new Date().toISOString();
    await storage.setResumeProfile(profile);
    await storage.mergeKnowledgeBaseFromFields(profile.structuredFields || profile.personal || {}, false);
    await loadStoredProfileToUI();
    status.textContent = `Profile generated and saved from ${file.name}`;
  } catch (e) {
    console.error(e);
    status.textContent = 'Failed: ' + (e.message || e);
  }
}

async function saveProfileFromUI() {
  const storage = window.JobApplyAssistant && window.JobApplyAssistant.storage;
  if (!storage) return alert('storage missing');
  const p = window._profile || {};
  p.personal = p.personal || {};
  p.contact = p.contact || {};
  p.links = p.links || {};
  p.personal.full_name = document.getElementById('full_name').value || null;
  p.personal.first_name = document.getElementById('first_name').value || null;
  p.personal.last_name = document.getElementById('last_name').value || null;
  p.contact.email = document.getElementById('email').value || null;
  p.contact.phone = document.getElementById('phone').value || null;
  p.links.linkedin = document.getElementById('linkedin').value || null;
  p.links.github = document.getElementById('github').value || null;

  p.education = Array.from(document.querySelectorAll('.edu-item')).map(node => ({
    institution: node.querySelector('.edu-institution').value || null,
    degree: node.querySelector('.edu-degree').value || null,
    start_date: node.querySelector('.edu-start').value || null,
    end_date: node.querySelector('.edu-end').value || null,
    coursework: node.querySelector('.edu-coursework').value ? node.querySelector('.edu-coursework').value.split(/[;,\n]+/).map(s=>s.trim()).filter(Boolean) : null,
    raw: node.querySelector('.edu-raw').value || null
  }));

  p.experience = Array.from(document.querySelectorAll('.exp-item')).map(node => ({
    company: node.querySelector('.exp-company').value || null,
    title: node.querySelector('.exp-title').value || null,
    start_date: node.querySelector('.exp-start').value || null,
    end_date: node.querySelector('.exp-end').value || null,
    description: node.querySelector('.exp-desc').value ? node.querySelector('.exp-desc').value.split('\n').map(s=>s.trim()).filter(Boolean) : [],
    raw: node.querySelector('.exp-raw').value || null
  }));

  p.projects = Array.from(document.querySelectorAll('.proj-item')).map(node => ({
    name: node.querySelector('.proj-name').value || null,
    description: node.querySelector('.proj-desc').value || null,
    technologies: node.querySelector('.proj-tech').value ? node.querySelector('.proj-tech').value.split(/[;,\n]+/).map(s=>s.trim()).filter(Boolean) : [],
    raw: node.querySelector('.proj-raw').value || null
  }));

  await storage.setResumeProfile(p);
  await storage.mergeKnowledgeBaseFromFields(p.personal || {}, false);
  window._profile = p;
  document.getElementById('rawPreview').textContent = JSON.stringify(p, null, 2);
  alert('Saved');
}

function downloadJSON() {
  const data = JSON.stringify(window._profile || {}, null, 2);
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'profile.json';
  a.click();
  URL.revokeObjectURL(url);
}

function renderEducation() {
  const list = document.getElementById('educationList'); list.innerHTML = '';
  const items = window._profile.education || [];
  items.forEach(e => addEducationItem(e));
}

function addEducationItem(data={}){
  const list = document.getElementById('educationList');
  const div = document.createElement('div'); div.className='edu-item';
  div.innerHTML = `<label>Institution</label><input class="edu-institution" value="${escapeHtml(data.institution||'')}">`+
    `<label>Degree</label><input class="edu-degree" value="${escapeHtml(data.degree||'')}">`+
    `<div class="row"><div class="col"><label>Start</label><input class="edu-start" value="${escapeHtml(data.start_date||'')}"></div><div class="col"><label>End</label><input class="edu-end" value="${escapeHtml(data.end_date||'')}"></div></div>`+
    `<label>Coursework (comma separated)</label><input class="edu-coursework" value="${escapeHtml((data.coursework||[]).join(', '))}">`+
    `<label>Raw</label><textarea class="edu-raw">${escapeHtml(data.raw||'')}</textarea>`+
    `<button class="remove-btn">Remove</button><hr>`;
  div.querySelector('.remove-btn').addEventListener('click', ()=>{ div.remove(); });
  list.appendChild(div);
}

function renderExperience(){
  const list = document.getElementById('experienceList'); list.innerHTML='';
  const items = window._profile.experience || [];
  items.forEach(it => addExperienceItem(it));
}

function addExperienceItem(data={}){
  const list = document.getElementById('experienceList');
  const div = document.createElement('div'); div.className='exp-item';
  div.innerHTML = `<label>Company</label><input class="exp-company" value="${escapeHtml(data.company||'')}">`+
    `<label>Title</label><input class="exp-title" value="${escapeHtml(data.title||'')}">`+
    `<div class="row"><div class="col"><label>Start</label><input class="exp-start" value="${escapeHtml(data.start_date||'')}"></div><div class="col"><label>End</label><input class="exp-end" value="${escapeHtml(data.end_date||'')}"></div></div>`+
    `<label>Description (one per line)</label><textarea class="exp-desc">${escapeHtml((data.description||[]).join('\n'))}</textarea>`+
    `<label>Raw</label><textarea class="exp-raw">${escapeHtml(data.raw||'')}</textarea>`+
    `<button class="remove-btn">Remove</button><hr>`;
  div.querySelector('.remove-btn').addEventListener('click', ()=>{ div.remove(); });
  list.appendChild(div);
}

function renderProjects(){
  const list = document.getElementById('projectsList'); list.innerHTML='';
  const items = window._profile.projects || [];
  items.forEach(it=> addProjectItem(it));
}

function addProjectItem(data={}){
  const list = document.getElementById('projectsList');
  const div = document.createElement('div'); div.className='proj-item';
  div.innerHTML = `<label>Name</label><input class="proj-name" value="${escapeHtml(data.name||'')}">`+
    `<label>Technologies (comma separated)</label><input class="proj-tech" value="${escapeHtml((data.technologies||[]).join(', '))}">`+
    `<label>Description</label><textarea class="proj-desc">${escapeHtml(data.description||'')}</textarea>`+
    `<label>Raw</label><textarea class="proj-raw">${escapeHtml(data.raw||'')}</textarea>`+
    `<button class="remove-btn">Remove</button><hr>`;
  div.querySelector('.remove-btn').addEventListener('click', ()=>{ div.remove(); });
  list.appendChild(div);
}

function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

document.getElementById('analyzeBtn').addEventListener('click', analyzeUploadedResume);
document.getElementById('loadStoredBtn').addEventListener('click', loadStoredProfileToUI);
document.getElementById('saveBtn').addEventListener('click', saveProfileFromUI);
document.getElementById('downloadBtn').addEventListener('click', downloadJSON);
document.getElementById('addEducation').addEventListener('click', ()=> addEducationItem());
document.getElementById('addExperience').addEventListener('click', ()=> addExperienceItem());
document.getElementById('addProject').addEventListener('click', ()=> addProjectItem());

loadStoredProfileToUI().catch(()=>{});
