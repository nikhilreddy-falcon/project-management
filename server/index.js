const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Simple JSON file storage
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      // Ensure settings exists
      if (!d.settings) d.settings = { totalDevops: 0, totalEngineers: 0 };
      return d;
    }
  } catch (e) {}
  return { projects: [], stages: [], tasks: [], settings: { totalDevops: 0, totalEngineers: 0 } };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let data = loadData();
let nextId = { project: 1, stage: 1, task: 1, user: 1 };

// Initialize IDs
if (data.projects.length) nextId.project = Math.max(...data.projects.map(p => p.id)) + 1;
if (data.stages.length) nextId.stage = Math.max(...data.stages.map(s => s.id)) + 1;
if (data.tasks.length) nextId.task = Math.max(...data.tasks.map(t => t.id)) + 1;
if (data.users?.length) nextId.user = Math.max(...data.users.map(u => u.id)) + 1;

// Ensure users array exists
if (!data.users) {
  data.users = [
    { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'Administrator' },
    { id: 2, username: 'viewer', password: 'viewer123', role: 'viewer', name: 'View User' }
  ];
  nextId.user = 3;
  saveData(data);
}

// GET all projects
app.get('/api/projects', (req, res) => {
  const result = data.projects.map(p => ({
    ...p,
    stages: data.stages.filter(s => s.project_id === p.id).sort((a, b) => a.order_index - b.order_index),
    tasks: data.tasks.filter(t => t.project_id === p.id)
  }));
  res.json(result);
});

// GET single project
app.get('/api/projects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const project = data.projects.find(p => p.id === id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  res.json({
    ...project,
    stages: data.stages.filter(s => s.project_id === id).sort((a, b) => a.order_index - b.order_index),
    tasks: data.tasks.filter(t => t.project_id === id)
  });
});

// CREATE project
app.post('/api/projects', (req, res) => {
  const { name, description, start_date, end_date, planned_weeks, stages } = req.body;

  const project = {
    id: nextId.project++,
    name,
    description: description || '',
    planned_weeks: planned_weeks || 10,
    start_date: start_date || null,
    end_date: end_date || null,
    created_at: new Date().toISOString()
  };
  data.projects.push(project);

  stages.forEach((stage, index) => {
    data.stages.push({
      id: nextId.stage++,
      project_id: project.id,
      name: stage.name,
      description: stage.description || '',
      percentage: stage.percentage,
      progress: 0,
      color: stage.color,
      order_index: index
    });
  });

  saveData(data);
  res.json({ id: project.id, message: 'Project created' });
});

// UPDATE project with stages
app.put('/api/projects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, start_date, end_date, planned_weeks, stages } = req.body;
  const project = data.projects.find(p => p.id === id);
  if (project) {
    project.name = name;
    project.description = description;
    project.planned_weeks = planned_weeks || project.planned_weeks || 10;
    project.start_date = start_date;
    project.end_date = end_date;

    // If stages provided, update them
    if (stages) {
      // Remove old stages for this project
      const oldStages = data.stages.filter(s => s.project_id === id);
      data.stages = data.stages.filter(s => s.project_id !== id);

      // Add new/updated stages
      stages.forEach((stage, index) => {
        const oldStage = oldStages.find(os => os.id === stage.id);
        data.stages.push({
          id: stage.id || nextId.stage++,
          project_id: id,
          name: stage.name,
          description: stage.description || '',
          percentage: stage.percentage,
          progress: oldStage ? oldStage.progress : (stage.progress || 0),
          color: stage.color,
          order_index: index,
          devops: oldStage?.devops || 0,
          engineers: oldStage?.engineers || 0
        });
      });
    }
    saveData(data);
  }
  res.json({ message: 'Project updated' });
});

// DELETE project
app.delete('/api/projects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  data.projects = data.projects.filter(p => p.id !== id);
  data.stages = data.stages.filter(s => s.project_id !== id);
  data.tasks = data.tasks.filter(t => t.project_id !== id);
  saveData(data);
  res.json({ message: 'Project deleted' });
});

// TASKS CRUD
app.post('/api/tasks', (req, res) => {
  const { project_id, stage_id, title, description, due_date } = req.body;
  const task = {
    id: nextId.task++,
    project_id,
    stage_id,
    title,
    description: description || '',
    status: 'todo',
    due_date: due_date || null,
    created_at: new Date().toISOString()
  };
  data.tasks.push(task);
  saveData(data);
  res.json({ id: task.id });
});

app.put('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description, status, stage_id, due_date } = req.body;
  const task = data.tasks.find(t => t.id === id);
  if (task) {
    task.title = title;
    task.description = description;
    task.status = status;
    task.stage_id = stage_id;
    task.due_date = due_date;
    saveData(data);
  }
  res.json({ message: 'Task updated' });
});

app.delete('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  data.tasks = data.tasks.filter(t => t.id !== id);
  saveData(data);
  res.json({ message: 'Task deleted' });
});

// SETTINGS endpoints
app.get('/api/settings', (req, res) => {
  res.json(data.settings || { totalDevops: 0, totalEngineers: 0 });
});

app.put('/api/settings', (req, res) => {
  const { totalDevops, totalEngineers } = req.body;
  data.settings = { totalDevops: totalDevops || 0, totalEngineers: totalEngineers || 0 };
  saveData(data);
  res.json({ message: 'Settings updated' });
});

// UPDATE stage with resources
app.put('/api/stages/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { progress, devops, engineers } = req.body;
  const stage = data.stages.find(s => s.id === id);
  if (stage) {
    if (progress !== undefined) stage.progress = progress;
    if (devops !== undefined) stage.devops = devops;
    if (engineers !== undefined) stage.engineers = engineers;
    saveData(data);
  }
  res.json({ message: 'Stage updated' });
});

// AUTH endpoints
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = data.users?.find(u => u.username === username && u.password === password);
  if (user) {
    res.json({ id: user.id, username: user.username, role: user.role, name: user.name });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// GET all users (admin only - client should check role)
app.get('/api/users', (req, res) => {
  res.json((data.users || []).map(u => ({ id: u.id, username: u.username, role: u.role, name: u.name })));
});

// CREATE user (admin only)
app.post('/api/users', (req, res) => {
  const { username, password, role, name } = req.body;
  if (data.users?.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  const user = { id: nextId.user++, username, password, role: role || 'viewer', name: name || username };
  data.users.push(user);
  saveData(data);
  res.json({ id: user.id, username: user.username, role: user.role, name: user.name });
});

// UPDATE user (admin only)
app.put('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { username, password, role, name } = req.body;
  const user = data.users?.find(u => u.id === id);
  if (user) {
    if (username) user.username = username;
    if (password) user.password = password;
    if (role) user.role = role;
    if (name) user.name = name;
    saveData(data);
    res.json({ id: user.id, username: user.username, role: user.role, name: user.name });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// DELETE user (admin only)
app.delete('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  data.users = data.users.filter(u => u.id !== id);
  saveData(data);
  res.json({ message: 'User deleted' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
