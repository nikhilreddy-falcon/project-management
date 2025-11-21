import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { HiOutlineHome, HiOutlineDocumentReport, HiOutlineFolder, HiOutlinePlus, HiOutlineCog, HiOutlineClipboardList, HiOutlineViewBoards, HiOutlineTable, HiOutlineCalendar, HiOutlineChartBar, HiOutlineLogout, HiOutlineUsers } from 'react-icons/hi';
import Dashboard from './views/Dashboard';
import KanbanView from './views/KanbanView';
import TableView from './views/TableView';
import CalendarView from './views/CalendarView';
import WeeklyReport from './views/WeeklyReport';
import ProjectForm from './components/ProjectForm';
import Login from './components/Login';
import UserManagement from './components/UserManagement';

const API = 'http://91.203.132.74:3051/api';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({ totalDevops: 0, totalEngineers: 0 });
  const [startingProject, setStartingProject] = useState(null);
  const [showReports, setShowReports] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setProjects([]);
    setSelectedProject(null);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/settings`);
      setSettings(res.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      await axios.put(`${API}/settings`, newSettings);
      setSettings(newSettings);
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API}/projects`);
      setProjects(res.data);
      if (res.data.length > 0 && !selectedProject) {
        setSelectedProject(res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData) => {
    try {
      await axios.post(`${API}/projects`, projectData);
      fetchProjects();
      setShowProjectForm(false);
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  const updateProject = async (projectData) => {
    try {
      await axios.put(`${API}/projects/${projectData.id}`, projectData);
      fetchProjects();
      setEditingProject(null);
      const res = await axios.get(`${API}/projects/${projectData.id}`);
      setSelectedProject(res.data);
    } catch (err) {
      console.error('Error updating project:', err);
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await axios.delete(`${API}/projects/${id}`);
      if (selectedProject?.id === id) setSelectedProject(null);
      fetchProjects();
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  const updateStageProgress = async (stageId, progress) => {
    try {
      await axios.put(`${API}/stages/${stageId}`, { progress });
      const res = await axios.get(`${API}/projects`);
      setProjects(res.data);
      // Update selected project with fresh data
      if (selectedProject) {
        const updated = res.data.find(p => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    } catch (err) {
      console.error('Error updating stage:', err);
    }
  };

  const refreshProjectData = async () => {
    const res = await axios.get(`${API}/projects`);
    setProjects(res.data);
    if (selectedProject) {
      const updated = res.data.find(p => p.id === selectedProject.id);
      if (updated) setSelectedProject(updated);
    }
  };

  const createTask = async (taskData) => {
    try {
      await axios.post(`${API}/tasks`, taskData);
      await refreshProjectData();
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const updateTask = async (taskId, taskData) => {
    try {
      await axios.put(`${API}/tasks/${taskId}`, taskData);
      await refreshProjectData();
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`);
      await refreshProjectData();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const calculateOverallProgress = (project) => {
    if (!project?.stages || project.stages.length === 0) return 0;
    return project.stages.reduce((sum, s) => sum + (s.percentage * s.progress / 100), 0);
  };

  const views = {
    dashboard: <Dashboard projects={projects} selectedProject={selectedProject} colors={COLORS} updateStageProgress={isAdmin ? updateStageProgress : null} settings={settings} isAdmin={isAdmin} />,
    kanban: <KanbanView project={selectedProject} colors={COLORS} createTask={isAdmin ? createTask : null} updateTask={isAdmin ? updateTask : null} deleteTask={isAdmin ? deleteTask : null} isAdmin={isAdmin} />,
    table: <TableView project={selectedProject} colors={COLORS} updateStageProgress={isAdmin ? updateStageProgress : null} onRefresh={refreshProjectData} isAdmin={isAdmin} />,
    calendar: <CalendarView project={selectedProject} colors={COLORS} />
  };

  return (
    <div className="app">
      {/* Icon Sidebar */}
      <aside className="icon-sidebar">
        <div style={{ padding: '12px 8px', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
          <img src="/logo-icon.svg" alt="FalconDive" style={{ height: '32px', width: 'auto' }} />
        </div>
        <div className={`icon-menu-item ${!selectedProject && !showReports && !showUserManagement && currentView === 'dashboard' ? 'active' : ''}`} onClick={() => { setSelectedProject(null); setShowReports(false); setShowUserManagement(false); setCurrentView('dashboard'); setSidebarExpanded(false); }}>
          <HiOutlineHome className="icon-menu-icon" />
          <span className="icon-menu-label">Home</span>
        </div>
        <div className={`icon-menu-item ${sidebarExpanded ? 'active' : ''}`} onClick={() => setSidebarExpanded(!sidebarExpanded)}>
          <HiOutlineDocumentReport className="icon-menu-icon" />
          <span className="icon-menu-label">Projects</span>
        </div>
        <div className={`icon-menu-item ${showReports ? 'active' : ''}`} onClick={() => { setShowReports(true); setSelectedProject(null); setShowUserManagement(false); setSidebarExpanded(false); }}>
          <HiOutlineChartBar className="icon-menu-icon" />
          <span className="icon-menu-label">Reports</span>
        </div>
        {isAdmin && (
          <div className="icon-menu-item" onClick={() => setShowProjectForm(true)}>
            <HiOutlinePlus className="icon-menu-icon" />
            <span className="icon-menu-label">New</span>
          </div>
        )}
        {isAdmin && (
          <div className={`icon-menu-item ${showUserManagement ? 'active' : ''}`} onClick={() => { setShowUserManagement(true); setSelectedProject(null); setShowReports(false); setSidebarExpanded(false); }}>
            <HiOutlineUsers className="icon-menu-icon" />
            <span className="icon-menu-label">Users</span>
          </div>
        )}
        <div className="icon-menu-item" onClick={() => setShowSettings(true)} style={{ marginTop: 'auto' }}>
          <HiOutlineCog className="icon-menu-icon" />
          <span className="icon-menu-label">Settings</span>
        </div>
        <div className="icon-menu-item" onClick={handleLogout} style={{ marginBottom: '20px' }} title={`Logged in as ${user.name} (${user.role})`}>
          <HiOutlineLogout className="icon-menu-icon" />
          <span className="icon-menu-label">Logout</span>
        </div>
      </aside>

      {/* Expanded Projects Sidebar */}
      {sidebarExpanded && (
        <aside className="projects-sidebar">
          <div className="projects-sidebar-header">
            <h2>Projects</h2>
            <button className="btn-collapse" onClick={() => setSidebarExpanded(false)}>‹</button>
          </div>
          <div className="projects-list">
            {projects.map(p => {
              const progress = calculateOverallProgress(p);
              const isActive = selectedProject?.id === p.id;
              return (
                <div
                  key={p.id}
                  className={`project-item ${isActive ? 'active' : ''}`}
                  onClick={() => { setSelectedProject(p); setShowReports(false); setShowUserManagement(false); setSidebarExpanded(false); }}
                >
                  <HiOutlineClipboardList className="project-item-icon" />
                  <div className="project-item-info">
                    <span className="project-item-name">{p.name}</span>
                    <span className="project-item-desc">{p.description || `${progress.toFixed(0)}% complete`}</span>
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && (
              <div className="projects-empty">No projects yet</div>
            )}
          </div>
        </aside>
      )}

      <main className="main-content">
        {loading ? (
          <div className="card">Loading...</div>
        ) : showUserManagement ? (
          <UserManagement />
        ) : showReports ? (
          <WeeklyReport projects={projects} settings={settings} colors={COLORS} />
        ) : projects.length === 0 ? (
          <div className="card empty-state">
            <h3>Welcome to Project Tracker</h3>
            <p>Create your first project to get started tracking your work!</p>
            <button className="btn btn-primary" onClick={() => setShowProjectForm(true)}>
              + Create Project
            </button>
          </div>
        ) : !selectedProject ? (
          /* All Projects Dashboard */
          <Dashboard projects={projects} selectedProject={null} colors={COLORS} calculateOverallProgress={calculateOverallProgress} settings={settings} />
        ) : (
          <>
            {/* Project Header */}
            <div className="project-header">
              <div className="project-header-top">
                <div>
                  <h1 className="project-title">{selectedProject.name}</h1>
                  {selectedProject.description && (
                    <p className="project-description">{selectedProject.description}</p>
                  )}
                  <div className="project-meta">
                    <div className="meta-item">
                      <span className="meta-icon" style={{ background: '#e8f4fd' }}>📅</span>
                      {selectedProject.start_date ? (
                        <span>{new Date(selectedProject.start_date).toLocaleDateString()} - {new Date(selectedProject.end_date).toLocaleDateString()}</span>
                      ) : (
                        <span style={{ color: '#f59e0b', fontWeight: '500' }}>Not Started (Planning)</span>
                      )}
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon" style={{ background: '#fef3e2' }}>📊</span>
                      <span>{selectedProject.stages?.length || 0} Stages</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon" style={{ background: '#e8fdf5' }}>✓</span>
                      <span>{selectedProject.tasks?.filter(t => t.status === 'done').length || 0} / {selectedProject.tasks?.length || 0} Tasks</span>
                    </div>
                  </div>
                </div>
                <div className="project-actions">
                  {!selectedProject.start_date && (
                    <button className="btn btn-primary" onClick={() => setStartingProject(selectedProject)}>
                      Start Project
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={() => setEditingProject(selectedProject)}>
                    Edit Project
                  </button>
                  <button className="btn btn-danger" onClick={() => deleteProject(selectedProject.id)}>
                    Delete
                  </button>
                </div>
              </div>

              <div className="overall-progress">
                <div className="progress-header">
                  <span className="progress-label">Overall Progress</span>
                  <span className="progress-value">{calculateOverallProgress(selectedProject).toFixed(1)}%</span>
                </div>
                <div className="progress-bar" style={{ height: '12px' }}>
                  <div className="progress-fill" style={{ width: `${calculateOverallProgress(selectedProject)}%` }} />
                </div>
              </div>
            </div>

            {/* View Tabs */}
            <div className="view-tabs">
              {[
                { key: 'dashboard', label: 'Dashboard', Icon: HiOutlineDocumentReport },
                { key: 'kanban', label: 'Kanban', Icon: HiOutlineViewBoards },
                { key: 'table', label: 'Table', Icon: HiOutlineTable },
                { key: 'calendar', label: 'Calendar', Icon: HiOutlineCalendar }
              ].map(view => (
                <button
                  key={view.key}
                  className={`view-tab ${currentView === view.key ? 'active' : ''}`}
                  onClick={() => setCurrentView(view.key)}
                >
                  <view.Icon style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {view.label}
                </button>
              ))}
            </div>

            {/* Current View */}
            {views[currentView]}
          </>
        )}
      </main>

      {showProjectForm && (
        <ProjectForm
          onSubmit={createProject}
          onClose={() => setShowProjectForm(false)}
          colors={COLORS}
        />
      )}

      {editingProject && (
        <ProjectForm
          onSubmit={updateProject}
          onClose={() => setEditingProject(null)}
          colors={COLORS}
          editProject={editingProject}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          projects={projects}
          onSave={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Start Project Modal */}
      {startingProject && (
        <StartProjectModal
          project={startingProject}
          onStart={async (dates) => {
            await updateProject({ ...startingProject, ...dates });
            setStartingProject(null);
          }}
          onClose={() => setStartingProject(null)}
        />
      )}
    </div>
  );
}

// Settings Modal Component
function SettingsModal({ settings, projects, onSave, onClose }) {
  const [totalDevops, setTotalDevops] = useState(settings.totalDevops || 0);
  const [totalEngineers, setTotalEngineers] = useState(settings.totalEngineers || 0);

  // Calculate allocated resources across all projects
  const allocatedResources = projects.reduce((acc, project) => {
    (project.stages || []).forEach(stage => {
      acc.devops += stage.devops || 0;
      acc.engineers += stage.engineers || 0;
    });
    return acc;
  }, { devops: 0, engineers: 0 });

  const availableDevops = totalDevops - allocatedResources.devops;
  const availableEngineers = totalEngineers - allocatedResources.engineers;

  const handleSave = () => {
    onSave({ totalDevops, totalEngineers });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Resource Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: '20px' }}>
          <h4 style={{ marginBottom: '15px', color: '#374151' }}>Total Company Resources</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#4b5563' }}>
                Total DevOps
              </label>
              <input
                type="number"
                min="0"
                value={totalDevops}
                onChange={e => setTotalDevops(parseInt(e.target.value) || 0)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '16px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#4b5563' }}>
                Total Engineers
              </label>
              <input
                type="number"
                min="0"
                value={totalEngineers}
                onChange={e => setTotalEngineers(parseInt(e.target.value) || 0)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '16px' }}
              />
            </div>
          </div>

          <h4 style={{ marginBottom: '15px', color: '#374151' }}>Resource Allocation Summary</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div style={{ background: '#f3f4f6', padding: '15px', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>DevOps</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: availableDevops >= 0 ? '#059669' : '#dc2626' }}>
                    {availableDevops}
                  </span>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}> available</span>
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  {allocatedResources.devops} / {totalDevops} allocated
                </div>
              </div>
              <div className="progress-bar" style={{ height: '8px', marginTop: '10px' }}>
                <div className="progress-fill" style={{
                  width: `${totalDevops > 0 ? Math.min(100, (allocatedResources.devops / totalDevops) * 100) : 0}%`,
                  background: allocatedResources.devops > totalDevops ? '#dc2626' : '#059669'
                }} />
              </div>
            </div>

            <div style={{ background: '#f3f4f6', padding: '15px', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>Engineers</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: availableEngineers >= 0 ? '#059669' : '#dc2626' }}>
                    {availableEngineers}
                  </span>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}> available</span>
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  {allocatedResources.engineers} / {totalEngineers} allocated
                </div>
              </div>
              <div className="progress-bar" style={{ height: '8px', marginTop: '10px' }}>
                <div className="progress-fill" style={{
                  width: `${totalEngineers > 0 ? Math.min(100, (allocatedResources.engineers / totalEngineers) * 100) : 0}%`,
                  background: allocatedResources.engineers > totalEngineers ? '#dc2626' : '#059669'
                }} />
              </div>
            </div>
          </div>

          {/* Per Project Breakdown */}
          {projects.length > 0 && (
            <>
              <h4 style={{ marginBottom: '15px', color: '#374151' }}>Allocation by Project</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {projects.map(project => {
                  const projectDevops = (project.stages || []).reduce((sum, s) => sum + (s.devops || 0), 0);
                  const projectEngineers = (project.stages || []).reduce((sum, s) => sum + (s.engineers || 0), 0);
                  if (projectDevops === 0 && projectEngineers === 0) return null;
                  return (
                    <div key={project.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <span style={{ fontWeight: '500' }}>{project.name}</span>
                      <div style={{ display: 'flex', gap: '20px' }}>
                        <span style={{ color: '#6b7280' }}>DevOps: <strong>{projectDevops}</strong></span>
                        <span style={{ color: '#6b7280' }}>Engineers: <strong>{projectEngineers}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}

// Start Project Modal Component
function StartProjectModal({ project, onStart, onClose }) {
  const plannedWeeks = project.planned_weeks || 10;
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  // Auto-calculate end date from planned weeks
  const handleStartDateChange = (date) => {
    setStartDate(date);
    if (date) {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + (plannedWeeks * 7));
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  // Set initial end date on mount
  React.useEffect(() => {
    handleStartDateChange(startDate);
    // eslint-disable-next-line
  }, []);

  const handleSubmit = () => {
    if (!startDate) {
      alert('Please set a start date');
      return;
    }
    onStart({ start_date: startDate, end_date: endDate });
  };

  const actualWeeks = startDate && endDate
    ? Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24 * 7))
    : plannedWeeks;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h2>Start Project</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px', padding: '15px', background: '#fef3c7', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
            <strong>{project.name}</strong>
            <div style={{ fontSize: '13px', color: '#92400e', marginTop: '5px' }}>
              {project.stages?.length || 0} lifecycle stages | Planned: {plannedWeeks} weeks
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={e => handleStartDateChange(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              End Date (auto-calculated from {plannedWeeks} weeks)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
              You can adjust the end date if needed
            </div>
          </div>

          {startDate && endDate && (
            <div style={{
              padding: '12px',
              background: actualWeeks === plannedWeeks ? '#d1fae5' : '#fef3c7',
              borderRadius: '8px',
              fontSize: '13px'
            }}>
              <strong>Duration:</strong> {actualWeeks} weeks ({Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))} days)
              {actualWeeks !== plannedWeeks && (
                <div style={{ color: '#92400e', marginTop: '4px' }}>
                  Note: Different from planned {plannedWeeks} weeks
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Start Project</button>
        </div>
      </div>
    </div>
  );
}

export default App;
