import React, { useState } from 'react';

function KanbanView({ project, colors, createTask, updateTask, deleteTask, isAdmin }) {
  const [showTaskForm, setShowTaskForm] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  if (!project) {
    return <div className="card empty-state">Select a project to view Kanban board</div>;
  }

  const stages = project.stages || [];
  const tasks = project.tasks || [];

  const handleCreateTask = (stageId) => {
    if (!newTaskTitle.trim()) return;
    createTask({
      project_id: project.id,
      stage_id: stageId,
      title: newTaskTitle,
      description: newTaskDesc,
      due_date: newTaskDueDate || null
    });
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskDueDate('');
    setShowTaskForm(null);
  };

  const handleStatusChange = (task, newStatus) => {
    updateTask(task.id, { ...task, status: newStatus });
  };

  const startEditTask = (task) => {
    setEditingTask(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditDueDate(task.due_date || '');
  };

  const handleEditTask = (task) => {
    if (!editTitle.trim()) return;
    updateTask(task.id, { ...task, title: editTitle, description: editDesc, due_date: editDueDate || null });
    setEditingTask(null);
  };

  const getTasksByStage = (stageId) => {
    return tasks.filter(t => t.stage_id === stageId);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'todo': return '#6c757d';
      case 'in_progress': return '#ffc107';
      case 'done': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <div>
      <div className="kanban-board">
        {stages.map((stage, i) => {
          const stageTasks = getTasksByStage(stage.id);
          const stageColor = stage.color || colors[i % colors.length];

          return (
            <div key={stage.id} className="kanban-column">
              <h3>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    background: stageColor
                  }} />
                  {stage.name}
                </span>
                <span>{stageTasks.length}</span>
              </h3>

              <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
                {stage.percentage}% of project • {stage.progress}% complete
              </div>

              <div className="progress-bar" style={{ height: '6px', marginBottom: '15px' }}>
                <div className="progress-fill" style={{ width: `${stage.progress}%`, background: stageColor }} />
              </div>

              {stageTasks.map(task => (
                <div key={task.id} className="kanban-card">
                  {editingTask === task.id ? (
                    /* Edit Mode */
                    <div>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        style={{ marginBottom: '8px', width: '100%' }}
                        autoFocus
                      />
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Description"
                        rows={2}
                        style={{ marginBottom: '8px', width: '100%' }}
                      />
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        style={{ marginBottom: '8px', width: '100%' }}
                      />
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleEditTask(task)}>Save</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingTask(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <h4 style={{ cursor: isAdmin ? 'pointer' : 'default' }} onClick={() => isAdmin && startEditTask(task)}>{task.title}</h4>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => startEditTask(task)}
                              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '14px' }}
                              title="Edit"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '16px' }}
                              title="Delete"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                      {task.description && <p>{task.description}</p>}
                      {task.due_date && (
                        <p style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      )}
                      <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                        <select
                          value={task.status}
                          onChange={(e) => isAdmin && handleStatusChange(task, e.target.value)}
                          disabled={!isAdmin}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            background: getStatusColor(task.status),
                            color: 'white',
                            cursor: isAdmin ? 'pointer' : 'not-allowed'
                          }}
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {showTaskForm === stage.id ? (
                <div className="kanban-card" style={{ background: '#f0f2f5' }}>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Task title"
                    style={{ marginBottom: '8px' }}
                    autoFocus
                  />
                  <textarea
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="Description (optional)"
                    rows={2}
                    style={{ marginBottom: '8px' }}
                  />
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    style={{ marginBottom: '8px' }}
                  />
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleCreateTask(stage.id)}
                    >
                      Add
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowTaskForm(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : isAdmin ? (
                <button
                  onClick={() => setShowTaskForm(stage.id)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'transparent',
                    border: '2px dashed #ddd',
                    borderRadius: '8px',
                    color: '#666',
                    cursor: 'pointer'
                  }}
                >
                  + Add Task
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h4>Task Summary</h4>
        <div style={{ display: 'flex', gap: '30px', marginTop: '15px' }}>
          <div>
            <span style={{ color: '#6c757d', fontWeight: 'bold' }}>
              {tasks.filter(t => t.status === 'todo').length}
            </span> To Do
          </div>
          <div>
            <span style={{ color: '#ffc107', fontWeight: 'bold' }}>
              {tasks.filter(t => t.status === 'in_progress').length}
            </span> In Progress
          </div>
          <div>
            <span style={{ color: '#28a745', fontWeight: 'bold' }}>
              {tasks.filter(t => t.status === 'done').length}
            </span> Done
          </div>
        </div>
      </div>
    </div>
  );
}

export default KanbanView;
