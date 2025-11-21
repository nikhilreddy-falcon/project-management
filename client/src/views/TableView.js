import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://91.203.132.74:3051/api';

function TableView({ project, colors, updateStageProgress, onRefresh, isAdmin }) {
  const [expandedStages, setExpandedStages] = useState({});
  const [editingResources, setEditingResources] = useState(null);
  const [resourceValues, setResourceValues] = useState({ devops: 0, engineers: 0 });
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (project) {
      setNotes(project.notes || '');
    }
  }, [project?.id, project?.notes]);

  if (!project) {
    return <div className="card empty-state">Select a project to view table</div>;
  }

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await axios.put(`${API}/projects/${project.id}`, { notes });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error saving notes:', err);
    }
    setSavingNotes(false);
  };

  const stages = project.stages || [];
  const tasks = project.tasks || [];

  const toggleStage = (stageId) => {
    setExpandedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const calculateOverallProgress = () => {
    if (stages.length === 0) return 0;
    return stages.reduce((sum, s) => sum + (s.percentage * s.progress / 100), 0);
  };

  const overall = calculateOverallProgress();

  const getTasksByStage = (stageId) => {
    return tasks.filter(t => t.stage_id === stageId);
  };

  const getTaskStats = (stageId) => {
    const stageTasks = tasks.filter(t => t.stage_id === stageId);
    return {
      total: stageTasks.length,
      done: stageTasks.filter(t => t.status === 'done').length,
      inProgress: stageTasks.filter(t => t.status === 'in_progress').length
    };
  };

  const getWeekRange = (startPercent, percentage) => {
    const startWeek = Math.floor(startPercent / 10);
    const endWeek = Math.ceil((startPercent + percentage) / 10);
    return `Week ${startWeek} - ${endWeek}`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      todo: { bg: '#6c757d', label: 'To Do' },
      in_progress: { bg: '#ffc107', label: 'In Progress' },
      done: { bg: '#28a745', label: 'Done' }
    };
    const s = styles[status] || styles.todo;
    return (
      <span style={{
        background: s.bg,
        color: 'white',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '11px'
      }}>
        {s.label}
      </span>
    );
  };

  const startEditResources = (stage, e) => {
    e.stopPropagation();
    setEditingResources(stage.id);
    setResourceValues({ devops: stage.devops || 0, engineers: stage.engineers || 0 });
  };

  const saveResources = async (stageId, e) => {
    e.stopPropagation();
    try {
      await axios.put(`${API}/stages/${stageId}`, resourceValues);
      setEditingResources(null);
      if (onRefresh) onRefresh();
      // Force refresh by updating progress with same value
      const stage = stages.find(s => s.id === stageId);
      if (stage) updateStageProgress(stageId, stage.progress);
    } catch (err) {
      console.error('Error updating resources:', err);
    }
  };

  // Calculate total resources for this project
  const totalResources = stages.reduce((acc, s) => ({
    devops: acc.devops + (s.devops || 0),
    engineers: acc.engineers + (s.engineers || 0)
  }), { devops: 0, engineers: 0 });

  let cumulative = 0;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Project Stages</h3>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ fontSize: '13px', color: '#666' }}>
            <span style={{ marginRight: '15px' }}>
              <strong style={{ color: '#8b5cf6' }}>{totalResources.devops}</strong> DevOps
            </span>
            <span>
              <strong style={{ color: '#3b82f6' }}>{totalResources.engineers}</strong> Engineers
            </span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4361ee' }}>
            Overall: {overall.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th style={{ width: '40px' }}>#</th>
              <th>Stage</th>
              <th style={{ width: '100px' }}>Allocation</th>
              <th style={{ width: '120px' }}>Timeline</th>
              <th style={{ width: '150px' }}>Progress</th>
              <th style={{ width: '70px' }}>Complete</th>
              <th style={{ width: '90px' }}>Contribution</th>
              <th style={{ width: '140px' }}>Resources</th>
              <th style={{ width: '80px' }}>Tasks</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage, i) => {
              const stageColor = stage.color || colors[i % colors.length];
              const weekRange = getWeekRange(cumulative, stage.percentage);
              cumulative += stage.percentage;
              const contribution = (stage.percentage * stage.progress / 100);
              const taskStats = getTaskStats(stage.id);
              const stageTasks = getTasksByStage(stage.id);
              const isExpanded = expandedStages[stage.id];

              return (
                <React.Fragment key={stage.id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => toggleStage(stage.id)}>
                    <td>
                      <span style={{ color: '#666', fontSize: '14px' }}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </td>
                    <td>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        background: stageColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {i + 1}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }} title={stage.description || ''}>{stage.name}</div>
                    </td>
                    <td>
                      <span style={{
                        background: stageColor + '20',
                        color: stageColor,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        fontSize: '13px'
                      }}>
                        {stage.percentage}%
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: '#666' }}>{weekRange}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {(stage.devops || 0) === 0 && (stage.engineers || 0) === 0 ? (
                        <div style={{ fontSize: '12px', color: '#ef4444', fontStyle: 'italic' }}>
                          Assign resources first
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={stage.progress}
                            onChange={(e) => isAdmin && updateStageProgress && updateStageProgress(stage.id, parseInt(e.target.value))}
                            disabled={!isAdmin}
                            style={{ flex: 1, cursor: isAdmin ? 'pointer' : 'not-allowed', opacity: isAdmin ? 1 : 0.6 }}
                          />
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 'bold', color: stageColor }}>{stage.progress}%</span>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 'bold',
                        color: contribution >= stage.percentage ? '#28a745' : '#666'
                      }}>
                        {contribution.toFixed(1)}%
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {isAdmin && editingResources === stage.id ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            value={resourceValues.devops}
                            onChange={(e) => setResourceValues(v => ({ ...v, devops: parseInt(e.target.value) || 0 }))}
                            style={{ width: '40px', padding: '2px 4px', fontSize: '12px' }}
                            placeholder="DO"
                          />
                          <input
                            type="number"
                            min="0"
                            value={resourceValues.engineers}
                            onChange={(e) => setResourceValues(v => ({ ...v, engineers: parseInt(e.target.value) || 0 }))}
                            style={{ width: '40px', padding: '2px 4px', fontSize: '12px' }}
                            placeholder="Eng"
                          />
                          <button
                            onClick={(e) => saveResources(stage.id, e)}
                            style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingResources(null); }}
                            style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: isAdmin ? 'pointer' : 'default' }}
                          onClick={(e) => isAdmin && startEditResources(stage, e)}
                          title={isAdmin ? "Click to edit resources" : "View only"}
                        >
                          <span style={{ fontSize: '12px' }}>
                            <span style={{ color: '#8b5cf6', fontWeight: '500' }}>{stage.devops || 0}</span>
                            <span style={{ color: '#9ca3af' }}> DO</span>
                          </span>
                          <span style={{ fontSize: '12px' }}>
                            <span style={{ color: '#3b82f6', fontWeight: '500' }}>{stage.engineers || 0}</span>
                            <span style={{ color: '#9ca3af' }}> Eng</span>
                          </span>
                          <span style={{ color: '#9ca3af', fontSize: '10px' }}>✎</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '13px' }}>
                        {taskStats.done}/{taskStats.total}
                        {taskStats.inProgress > 0 && (
                          <span style={{ color: '#ffc107' }}> ({taskStats.inProgress})</span>
                        )}
                      </span>
                    </td>
                  </tr>
                  {/* Expanded Tasks Row */}
                  {isExpanded && (
                    <tr>
                      <td colSpan="10" style={{ padding: 0, background: '#f9fafb' }}>
                        <div style={{ padding: '12px 20px 12px 60px' }}>
                          {stageTasks.length === 0 ? (
                            <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>No tasks in this stage</p>
                          ) : (
                            <table style={{ width: '100%', fontSize: '13px' }}>
                              <thead>
                                <tr style={{ background: '#e5e7eb' }}>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Task</th>
                                  <th style={{ padding: '8px', width: '120px' }}>Status</th>
                                  <th style={{ padding: '8px', width: '120px' }}>Due Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stageTasks.map(task => (
                                  <tr key={task.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '8px' }}>
                                      <div style={{ fontWeight: '500' }}>{task.title}</div>
                                      {task.description && (
                                        <div style={{ color: '#6b7280', fontSize: '12px' }}>{task.description}</div>
                                      )}
                                    </td>
                                    <td style={{ padding: '8px' }}>{getStatusBadge(task.status)}</td>
                                    <td style={{ padding: '8px', color: '#6b7280' }}>
                                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
              <td></td>
              <td colSpan="2">Total</td>
              <td>100%</td>
              <td>10 Weeks</td>
              <td colSpan="2">
                <div className="progress-bar" style={{ height: '8px' }}>
                  <div className="progress-fill" style={{ width: `${overall}%`, background: '#4361ee' }} />
                </div>
              </td>
              <td style={{ color: '#4361ee' }}>{overall.toFixed(1)}%</td>
              <td>
                <span style={{ fontSize: '12px' }}>
                  <span style={{ color: '#8b5cf6' }}>{totalResources.devops}</span> DO /
                  <span style={{ color: '#3b82f6' }}> {totalResources.engineers}</span> Eng
                </span>
              </td>
              <td>
                {tasks.filter(t => t.status === 'done').length}/{tasks.length}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '10px' }}>Legend</h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px' }}>
          <div><strong>Allocation:</strong> % of project time</div>
          <div><strong>Contribution:</strong> Weighted progress</div>
          <div><strong style={{ color: '#8b5cf6' }}>DO:</strong> DevOps resources</div>
          <div><strong style={{ color: '#3b82f6' }}>Eng:</strong> Engineer resources</div>
        </div>
      </div>

      {/* Notes Section */}
      <div style={{ marginTop: '24px', padding: '20px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0 }}>Project Notes</h4>
          {isAdmin && (
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              style={{
                padding: '6px 12px',
                background: savingNotes ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: savingNotes ? 'not-allowed' : 'pointer'
              }}
            >
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          )}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isAdmin ? "Add notes about this project..." : "No notes added yet"}
          disabled={!isAdmin}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            resize: 'vertical',
            fontFamily: 'inherit',
            background: isAdmin ? 'white' : '#f9fafb',
            cursor: isAdmin ? 'text' : 'default'
          }}
        />
      </div>
    </div>
  );
}

export default TableView;
