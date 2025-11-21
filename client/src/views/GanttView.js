import React from 'react';

function GanttView({ project, colors, updateStageProgress }) {
  if (!project) {
    return <div className="card empty-state">Select a project to view Gantt chart</div>;
  }

  const startDate = new Date(project.start_date);
  const endDate = new Date(project.end_date);
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const today = new Date();
  const todayPosition = Math.min(100, Math.max(0, ((today - startDate) / (endDate - startDate)) * 100));

  // Calculate stage positions based on their percentage allocation
  let cumulativePercent = 0;
  const stagePositions = project.stages?.map((stage, i) => {
    const start = cumulativePercent;
    cumulativePercent += stage.percentage;
    return {
      ...stage,
      startPercent: start,
      endPercent: cumulativePercent,
      color: stage.color || colors[i % colors.length]
    };
  }) || [];

  // Generate week markers
  const weeks = [];
  for (let i = 0; i <= 10; i++) {
    weeks.push({
      week: i,
      position: (i / 10) * 100
    });
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '20px' }}>Project Timeline - Gantt View</h3>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#666' }}>
        <span>Start: {startDate.toLocaleDateString()}</span>
        <span>End: {endDate.toLocaleDateString()} ({totalDays} days / 10 weeks)</span>
      </div>

      {/* Week markers */}
      <div style={{ position: 'relative', height: '30px', marginBottom: '10px' }}>
        {weeks.map(w => (
          <div key={w.week} style={{
            position: 'absolute',
            left: `${w.position}%`,
            transform: 'translateX(-50%)',
            fontSize: '11px',
            color: '#888'
          }}>
            W{w.week}
          </div>
        ))}
      </div>

      {/* Gantt bars container */}
      <div className="gantt-container" style={{ position: 'relative' }}>
        {/* Today marker */}
        <div style={{
          position: 'absolute',
          left: `calc(150px + ${todayPosition}% - 1px)`,
          top: 0,
          bottom: 0,
          width: '2px',
          background: '#ef476f',
          zIndex: 10
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '10px',
            color: '#ef476f',
            whiteSpace: 'nowrap'
          }}>
            Today
          </div>
        </div>

        {stagePositions.map((stage, i) => (
          <div key={i} className="gantt-row">
            <div className="gantt-label" title={stage.name}>
              {stage.name.length > 15 ? stage.name.substring(0, 15) + '...' : stage.name}
            </div>
            <div className="gantt-bar-container">
              {/* Background bar showing allocation */}
              <div
                className="gantt-bar"
                style={{
                  left: `${stage.startPercent}%`,
                  width: `${stage.percentage}%`,
                  background: stage.color,
                  opacity: 0.3
                }}
              />
              {/* Progress bar */}
              <div
                className="gantt-bar"
                style={{
                  left: `${stage.startPercent}%`,
                  width: `${stage.percentage * stage.progress / 100}%`,
                  background: stage.color
                }}
              >
                {stage.percentage >= 15 && `${stage.progress}%`}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stage details */}
      <h4 style={{ marginTop: '30px', marginBottom: '15px' }}>Stage Progress</h4>
      {stagePositions.map((stage, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          padding: '12px',
          background: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '10px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            background: stage.color,
            flexShrink: 0
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '500' }}>{stage.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Week {Math.floor(stage.startPercent / 10)} - Week {Math.ceil(stage.endPercent / 10)} ({stage.percentage}% of project)
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={stage.progress}
            onChange={(e) => updateStageProgress(stage.id, parseInt(e.target.value))}
            style={{ width: '150px' }}
          />
          <span style={{ width: '50px', textAlign: 'right', fontWeight: 'bold', color: stage.color }}>
            {stage.progress}%
          </span>
        </div>
      ))}

      {/* Legend */}
      <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '20px', height: '12px', background: '#4361ee', opacity: 0.3, borderRadius: '2px' }} />
            <span>Allocated Time</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '20px', height: '12px', background: '#4361ee', borderRadius: '2px' }} />
            <span>Completed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '2px', height: '12px', background: '#ef476f' }} />
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GanttView;
