import React, { useState, useEffect } from 'react';

function ProjectForm({ onSubmit, onClose, colors, editProject }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectMode, setProjectMode] = useState('planning'); // 'planning' or 'start'
  const [plannedWeeks, setPlannedWeeks] = useState(10);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stages, setStages] = useState([]);
  const [stageName, setStageName] = useState('');
  const [stageDesc, setStageDesc] = useState('');
  const [stagePercent, setStagePercent] = useState('');

  const isEditing = !!editProject;

  useEffect(() => {
    if (editProject) {
      setName(editProject.name || '');
      setDescription(editProject.description || '');
      setStartDate(editProject.start_date || '');
      setEndDate(editProject.end_date || '');
      setPlannedWeeks(editProject.planned_weeks || 10);
      setProjectMode(editProject.start_date ? 'start' : 'planning');
      setStages(editProject.stages?.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
        percentage: s.percentage,
        progress: s.progress,
        color: s.color
      })) || []);
    }
  }, [editProject]);

  const totalPercent = stages.reduce((sum, s) => sum + s.percentage, 0);

  const addStage = () => {
    if (!stageName || !stagePercent) return;
    const percent = parseInt(stagePercent);
    if (isNaN(percent) || percent <= 0) return;

    setStages([...stages, {
      name: stageName,
      description: stageDesc,
      percentage: percent,
      progress: 0,
      color: colors[stages.length % colors.length]
    }]);
    setStageName('');
    setStageDesc('');
    setStagePercent('');
  };

  const removeStage = (index) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) {
      alert('Please fill in project name');
      return;
    }
    if (totalPercent !== 100 && stages.length > 0) {
      alert('Lifecycle stages must total 100%');
      return;
    }
    if (projectMode === 'start' && !startDate) {
      alert('Please set a start date');
      return;
    }
    onSubmit({
      id: editProject?.id,
      name,
      description,
      planned_weeks: plannedWeeks,
      start_date: projectMode === 'start' ? startDate : null,
      end_date: projectMode === 'start' ? endDate : null,
      stages
    });
  };

  // Auto-calculate end date from start date and planned weeks
  const handleStartDateChange = (date) => {
    setStartDate(date);
    if (date) {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + (plannedWeeks * 7));
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  // Calculate week allocation for each percentage
  const getWeeksForPercent = (percent) => {
    return ((percent / 100) * plannedWeeks).toFixed(1);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{isEditing ? 'Edit Project' : 'Create New Project'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Project description (optional)"
              rows={2}
            />
          </div>

          {/* Project Mode Selection */}
          {!isEditing && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>Project Mode</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setProjectMode('planning')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: projectMode === 'planning' ? '2px solid #f59e0b' : '1px solid #d1d5db',
                    background: projectMode === 'planning' ? '#fef3c7' : 'white',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: '600', color: projectMode === 'planning' ? '#92400e' : '#374151' }}>Planning Mode</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Set weeks, start later</div>
                </button>
                <button
                  type="button"
                  onClick={() => setProjectMode('start')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: projectMode === 'start' ? '2px solid #10b981' : '1px solid #d1d5db',
                    background: projectMode === 'start' ? '#d1fae5' : 'white',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: '600', color: projectMode === 'start' ? '#065f46' : '#374151' }}>Start Now</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Set dates immediately</div>
                </button>
              </div>
            </div>
          )}

          {/* Planning Mode - Set Weeks */}
          {(projectMode === 'planning' || isEditing) && (
            <div style={{ padding: '15px', background: '#fef3c7', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #f59e0b' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#92400e' }}>
                Planned Duration (Weeks)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={plannedWeeks}
                  onChange={e => setPlannedWeeks(parseInt(e.target.value) || 10)}
                  style={{ width: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '16px', textAlign: 'center' }}
                />
                <span style={{ color: '#92400e', fontSize: '14px' }}>
                  = {plannedWeeks * 7} days
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#92400e', marginTop: '8px' }}>
                Use this to calculate stage durations (e.g., 20% = {getWeeksForPercent(20)} weeks)
              </div>
            </div>
          )}

          {/* Start Now Mode - Set Dates */}
          {projectMode === 'start' && (
            <div style={{ padding: '15px', background: '#d1fae5', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #10b981' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500', color: '#065f46' }}>
                Project Timeline
              </label>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => handleStartDateChange(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              {startDate && endDate && (
                <div style={{ fontSize: '12px', color: '#065f46', marginTop: '8px' }}>
                  Duration: {Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24 * 7))} weeks ({Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))} days)
                </div>
              )}
            </div>
          )}

          {/* Editing existing project with dates */}
          {isEditing && editProject?.start_date && (
            <div style={{ padding: '15px', background: '#d1fae5', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #10b981' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500', color: '#065f46' }}>
                Project Timeline
              </label>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <h3 style={{ margin: '20px 0 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Lifecycle Stages</span>
            <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#6b7280' }}>
              {plannedWeeks} weeks total
            </span>
          </h3>

          <div style={{ marginBottom: '15px', background: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
            <div className="form-row" style={{ marginBottom: '10px' }}>
              <input
                type="text"
                value={stageName}
                onChange={e => setStageName(e.target.value.slice(0, 50))}
                placeholder="Stage name (max 50 chars)"
                style={{ flex: 2 }}
                maxLength={50}
              />
              <input
                type="number"
                value={stagePercent}
                onChange={e => setStagePercent(e.target.value)}
                placeholder="%"
                min="1"
                max="100"
                style={{ flex: 1 }}
              />
            </div>
            {stagePercent && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                = {getWeeksForPercent(parseInt(stagePercent) || 0)} weeks
              </div>
            )}
            <textarea
              value={stageDesc}
              onChange={e => setStageDesc(e.target.value)}
              placeholder="Stage description (optional) - Describe what this stage involves..."
              style={{ width: '100%', marginBottom: '10px', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'vertical', minHeight: '60px' }}
              rows={2}
            />
            <button type="button" className="btn btn-secondary" onClick={addStage} style={{ width: '100%' }}>
              Add Stage
            </button>
          </div>

          {stages.length > 0 && (
            <>
              <div style={{ marginBottom: '15px' }}>
                {stages.map((stage, i) => (
                  <div key={stage.id || i} style={{
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    borderLeft: `4px solid ${stage.color}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ flex: 1, fontWeight: '500' }}>{stage.name}</span>
                      {isEditing && stage.progress > 0 && (
                        <span style={{ fontSize: '12px', color: '#666' }}>({stage.progress}% done)</span>
                      )}
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{getWeeksForPercent(stage.percentage)}w</span>
                      <span style={{ fontWeight: 'bold', color: '#4361ee' }}>{stage.percentage}%</span>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeStage(i)}
                      >
                        ×
                      </button>
                    </div>
                    {stage.description && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px', paddingLeft: '2px' }}>
                        {stage.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{
                padding: '12px',
                borderRadius: '8px',
                background: totalPercent === 100 ? '#d4edda' : '#f8d7da',
                color: totalPercent === 100 ? '#155724' : '#721c24',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                Total: {totalPercent}% ({getWeeksForPercent(totalPercent)} weeks) {totalPercent === 100 ? '✓' : '(must equal 100%)'}
              </div>
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Save Changes' : (projectMode === 'start' ? 'Create & Start' : 'Create (Planning)')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectForm;
