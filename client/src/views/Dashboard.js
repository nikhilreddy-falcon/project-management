import React, { useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isWithinInterval } from 'date-fns';

function Dashboard({ projects, selectedProject, colors, calculateOverallProgress: calcProgress, settings, updateStageProgress, isAdmin }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calculateOverallProgress = calcProgress || ((project) => {
    if (!project.stages || project.stages.length === 0) return 0;
    return project.stages.reduce((sum, s) => sum + (s.percentage * s.progress / 100), 0);
  });

  // ALL PROJECTS DASHBOARD (when no project selected)
  if (!selectedProject) {
    const totalProjects = projects.length;
    const avgProgress = totalProjects > 0
      ? projects.reduce((sum, p) => sum + calculateOverallProgress(p), 0) / totalProjects
      : 0;
    const completedProjects = projects.filter(p => calculateOverallProgress(p) >= 100).length;
    const inProgressProjects = projects.filter(p => {
      const prog = calculateOverallProgress(p);
      return prog > 0 && prog < 100;
    }).length;

    // Resource calculations
    console.log('Dashboard settings:', settings);
    const totalAvailable = {
      totalDevops: settings?.totalDevops || 0,
      totalEngineers: settings?.totalEngineers || 0
    };
    console.log('totalAvailable:', totalAvailable);
    const allStages = projects.flatMap(p => p.stages || []);
    const totalUtilized = allStages.reduce((acc, s) => ({
      devops: acc.devops + (s.devops || 0),
      engineers: acc.engineers + (s.engineers || 0)
    }), { devops: 0, engineers: 0 });
    const freeResources = {
      devops: Math.max(0, totalAvailable.totalDevops - totalUtilized.devops),
      engineers: Math.max(0, totalAvailable.totalEngineers - totalUtilized.engineers)
    };
    const stagesNeedingResources = allStages.filter(s => (s.devops || 0) === 0 && (s.engineers || 0) === 0);
    const avgResourcePerStage = allStages.length > 0 ? {
      devops: totalUtilized.devops / (allStages.length - stagesNeedingResources.length || 1),
      engineers: totalUtilized.engineers / (allStages.length - stagesNeedingResources.length || 1)
    } : { devops: 1, engineers: 1 };
    const potentialNewStages = Math.floor(Math.min(
      avgResourcePerStage.devops > 0 ? freeResources.devops / avgResourcePerStage.devops : 999,
      avgResourcePerStage.engineers > 0 ? freeResources.engineers / avgResourcePerStage.engineers : 999
    ));

    const projectRanges = projects.map((project, idx) => ({
      ...project,
      startDate: new Date(project.start_date),
      endDate: new Date(project.end_date),
      color: colors[idx % colors.length],
      progress: calculateOverallProgress(project)
    }));

    const getProjectsForDate = (date) => {
      return projectRanges.filter(project =>
        isWithinInterval(date, { start: project.startDate, end: project.endDate })
      );
    };

    const renderCalendarHeader = () => (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>← Prev</button>
        <h3>{format(currentMonth, 'MMMM yyyy')}</h3>
        <button className="btn btn-secondary" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>Next →</button>
      </div>
    );

    const renderCalendarDays = () => (
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-header">{day}</div>
        ))}
      </div>
    );

    const renderCalendarCells = () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart);
      const endDate = endOfWeek(monthEnd);
      const rows = [];
      let days = [];
      let day = startDate;

      while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, monthStart);
          const dayProjects = getProjectsForDate(day);
          const startsToday = projectRanges.filter(p => isSameDay(day, p.startDate));
          const endsToday = projectRanges.filter(p => isSameDay(day, p.endDate));

          days.push(
            <div
              key={day.toString()}
              className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
              style={{ minHeight: '80px', background: dayProjects.length > 0 ? dayProjects[0].color + '10' : undefined }}
            >
              <div className="calendar-day-number" style={{ color: isToday ? '#4361ee' : undefined, display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: isToday ? 'bold' : 'normal' }}>{format(day, 'd')}</span>
                {startsToday.length > 0 && <span style={{ fontSize: '10px' }}>🚀</span>}
                {endsToday.length > 0 && <span style={{ fontSize: '10px' }}>🏁</span>}
              </div>
              {dayProjects.slice(0, 3).map((project) => {
                const isStart = isSameDay(day, project.startDate);
                const isEnd = isSameDay(day, project.endDate);
                return (
                  <div key={project.id} style={{ background: project.color, color: 'white', fontSize: '9px', padding: '2px 4px', borderRadius: isStart ? '4px 0 0 4px' : isEnd ? '0 4px 4px 0' : '0', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${project.name} - ${project.progress.toFixed(0)}%`}>
                    {isStart ? project.name : ''}
                  </div>
                );
              })}
              {dayProjects.length > 3 && <div style={{ fontSize: '9px', color: '#666' }}>+{dayProjects.length - 3} more</div>}
            </div>
          );
          day = addDays(day, 1);
        }
        rows.push(<div key={day.toString()} className="calendar-grid">{days}</div>);
        days = [];
      }
      return rows;
    };

    return (
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', color: '#111827' }}>All Projects Dashboard</h1>
        <div className="grid grid-4" style={{ marginBottom: '24px' }}>
          <div className="card stat-card"><div className="stat-value" style={{ color: '#4361ee' }}>{totalProjects}</div><div className="stat-label">Total Projects</div></div>
          <div className="card stat-card"><div className="stat-value" style={{ color: '#06d6a0' }}>{avgProgress.toFixed(0)}%</div><div className="stat-label">Avg Progress</div></div>
          <div className="card stat-card"><div className="stat-value" style={{ color: '#8338ec' }}>{inProgressProjects}</div><div className="stat-label">In Progress</div></div>
          <div className="card stat-card"><div className="stat-value" style={{ color: '#ff006e' }}>{completedProjects}</div><div className="stat-label">Completed</div></div>
        </div>

        {/* Resource Analytics */}
        <div className="grid grid-2" style={{ marginBottom: '24px' }}>
          <div className="card">
            <h3 style={{ marginBottom: '15px' }}>Resource Utilization</h3>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '5px' }}>DevOps</div>
                <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '24px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ background: '#8b5cf6', height: '100%', width: `${totalAvailable.totalDevops > 0 ? (totalUtilized.devops / totalAvailable.totalDevops * 100) : 0}%`, transition: 'width 0.3s' }} />
                  <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: '600' }}>
                    {totalUtilized.devops} / {totalAvailable.totalDevops}
                  </span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '5px' }}>Engineers</div>
                <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '24px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ background: '#3b82f6', height: '100%', width: `${totalAvailable.totalEngineers > 0 ? (totalUtilized.engineers / totalAvailable.totalEngineers * 100) : 0}%`, transition: 'width 0.3s' }} />
                  <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: '600' }}>
                    {totalUtilized.engineers} / {totalAvailable.totalEngineers}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Free Resources</div>
                <div style={{ fontWeight: '600' }}>
                  <span style={{ color: '#8b5cf6' }}>{freeResources.devops}</span> DO, <span style={{ color: '#3b82f6' }}>{freeResources.engineers}</span> Eng
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Can Support ~</div>
                <div style={{ fontWeight: '600', color: '#10b981' }}>{potentialNewStages === 999 ? '∞' : potentialNewStages} more stages</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '15px' }}>Planning Alerts</h3>
            {stagesNeedingResources.length > 0 ? (
              <div>
                <div style={{ padding: '10px', background: '#fef3c7', borderRadius: '6px', borderLeft: '4px solid #f59e0b', marginBottom: '10px' }}>
                  <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '5px' }}>⚠️ {stagesNeedingResources.length} stages need resources</div>
                  <div style={{ fontSize: '12px', color: '#92400e' }}>Assign DevOps/Engineers to enable progress tracking</div>
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {stagesNeedingResources.slice(0, 5).map((stage, i) => {
                    const project = projects.find(p => p.stages?.some(s => s.id === stage.id));
                    return (
                      <div key={i} style={{ padding: '8px', background: '#f9fafb', borderRadius: '4px', marginBottom: '4px', fontSize: '12px' }}>
                        <span style={{ fontWeight: '500' }}>{stage.name}</span>
                        <span style={{ color: '#6b7280' }}> - {project?.name}</span>
                      </div>
                    );
                  })}
                  {stagesNeedingResources.length > 5 && (
                    <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>+{stagesNeedingResources.length - 5} more</div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#10b981' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>✓</div>
                <div style={{ fontWeight: '500' }}>All stages have resources assigned!</div>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>Projects Calendar</h3>
          {renderCalendarHeader()}
          {renderCalendarDays()}
          {renderCalendarCells()}
          <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              {projectRanges.map((project) => (
                <div key={project.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: project.color }} />
                  <span style={{ fontSize: '12px', color: '#374151' }}>{project.name}</span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>({project.progress.toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Projects Overview</h3>
          {projects.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>No projects yet</p>
          ) : (
            projects.map((project, idx) => {
              const overallProgress = calculateOverallProgress(project);
              const daysTotal = Math.ceil((new Date(project.end_date) - new Date(project.start_date)) / (1000 * 60 * 60 * 24));
              const daysElapsed = Math.ceil((new Date() - new Date(project.start_date)) / (1000 * 60 * 60 * 24));
              const daysRemaining = Math.max(0, daysTotal - daysElapsed);
              return (
                <div key={project.id} style={{ padding: '20px', borderBottom: idx < projects.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors[idx % colors.length] }} />
                      <span style={{ fontWeight: '600', fontSize: '16px', color: '#111827' }}>{project.name}</span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{daysRemaining} days left</span>
                    </div>
                    <span style={{ fontWeight: '700', fontSize: '18px', color: '#111827' }}>{overallProgress.toFixed(0)}%</span>
                  </div>
                  {project.stages && project.stages.length > 0 ? (
                    <>
                      <div style={{ display: 'flex', height: '28px', borderRadius: '6px', overflow: 'hidden', background: '#e5e7eb' }}>
                        {project.stages.map((stage, stageIdx) => (
                          <div key={stage.id} style={{ width: `${stage.percentage}%`, background: `linear-gradient(to right, ${stage.color || colors[stageIdx % colors.length]} ${stage.progress}%, #d1d5db ${stage.progress}%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: stageIdx < project.stages.length - 1 ? '1px solid white' : 'none' }} title={`${stage.name}: ${stage.progress}% complete${stage.description ? '\n' + stage.description : ''}`}>
                            <span style={{ fontSize: '10px', fontWeight: '600', color: 'white', textShadow: '0 0 2px rgba(0,0,0,0.5)' }}>{stage.progress}%</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
                        {project.stages.map((stage, stageIdx) => (
                          <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title={stage.description || ''}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: stage.color || colors[stageIdx % colors.length] }} />
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>{stage.name} ({stage.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>No stages defined</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // SINGLE PROJECT DASHBOARD with Timeline
  const overall = calculateOverallProgress(selectedProject);
  const startDate = new Date(selectedProject.start_date);
  const endDate = new Date(selectedProject.end_date);
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const timeProgress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
  const today = new Date();
  const todayPosition = Math.min(100, Math.max(0, ((today - startDate) / (endDate - startDate)) * 100));

  const pieData = selectedProject.stages?.map((stage, i) => ({
    name: stage.name,
    value: stage.percentage,
    progress: stage.progress,
    color: stage.color || colors[i % colors.length]
  })) || [];

  const barData = selectedProject.stages?.map((stage, i) => ({
    name: stage.name,
    progress: stage.progress,
    color: stage.color || colors[i % colors.length]
  })) || [];

  // Calculate stage positions for Gantt
  let cumulativePercent = 0;
  const stagePositions = selectedProject.stages?.map((stage, i) => {
    const start = cumulativePercent;
    cumulativePercent += stage.percentage;
    return {
      ...stage,
      startPercent: start,
      endPercent: cumulativePercent,
      color: stage.color || colors[i % colors.length]
    };
  }) || [];

  // Calculate total resources
  const totalResources = (selectedProject.stages || []).reduce((acc, s) => ({
    devops: acc.devops + (s.devops || 0),
    engineers: acc.engineers + (s.engineers || 0)
  }), { devops: 0, engineers: 0 });

  const stats = [
    { label: 'Overall Progress', value: `${overall.toFixed(1)}%`, color: '#4361ee' },
    { label: 'Time Elapsed', value: `${timeProgress.toFixed(0)}%`, color: '#06d6a0' },
    { label: 'Days Remaining', value: daysRemaining, color: '#ff006e' },
    { label: 'Stages', value: selectedProject.stages?.length || 0, color: '#8338ec' }
  ];

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: '20px' }}>
        {stats.map((stat, i) => (
          <div key={i} className="card stat-card">
            <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Resource Summary */}
      {(totalResources.devops > 0 || totalResources.engineers > 0) && (
        <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>Project Resources</h4>
            <div style={{ display: 'flex', gap: '20px' }}>
              <span><strong style={{ color: '#8b5cf6' }}>{totalResources.devops}</strong> DevOps</span>
              <span><strong style={{ color: '#3b82f6' }}>{totalResources.engineers}</strong> Engineers</span>
            </div>
          </div>
        </div>
      )}

      {/* Timeline / Gantt Chart */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '20px' }}>Project Timeline</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#666' }}>
          <span>Start: {startDate.toLocaleDateString()}</span>
          <span>End: {endDate.toLocaleDateString()} ({totalDays} days)</span>
        </div>

        {/* Week markers */}
        <div style={{ position: 'relative', height: '25px', marginBottom: '5px', marginLeft: '150px' }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(w => (
            <div key={w} style={{ position: 'absolute', left: `${w * 10}%`, transform: 'translateX(-50%)', fontSize: '11px', color: '#888' }}>W{w}</div>
          ))}
        </div>

        {/* Gantt bars */}
        <div className="gantt-container" style={{ position: 'relative' }}>
          {/* Today marker */}
          <div style={{ position: 'absolute', left: `calc(150px + ${todayPosition}% - 1px)`, top: 0, bottom: 0, width: '2px', background: '#ef476f', zIndex: 10 }}>
            <div style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', color: '#ef476f' }}>Today</div>
          </div>

          {stagePositions.map((stage, i) => (
            <div key={i} className="gantt-row">
              <div className="gantt-label" title={stage.description || stage.name}>{stage.name.length > 15 ? stage.name.substring(0, 15) + '...' : stage.name}</div>
              <div className="gantt-bar-container">
                <div className="gantt-bar" style={{ left: `${stage.startPercent}%`, width: `${stage.percentage}%`, background: stage.color, opacity: 0.3 }} />
                <div className="gantt-bar" style={{ left: `${stage.startPercent}%`, width: `${stage.percentage * stage.progress / 100}%`, background: stage.color }}>
                  {stage.percentage >= 15 && `${stage.progress}%`}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline status */}
        <div style={{ textAlign: 'center', marginTop: '15px', color: '#666' }}>
          {timeProgress > overall ? (
            <span style={{ color: '#ef476f' }}>⚠️ Behind schedule by {(timeProgress - overall).toFixed(1)}%</span>
          ) : (
            <span style={{ color: '#06d6a0' }}>✓ On track or ahead by {(overall - timeProgress).toFixed(1)}%</span>
          )}
        </div>

        {/* Legend */}
        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '20px', height: '12px', background: '#4361ee', opacity: 0.3, borderRadius: '2px' }} />
            <span>Allocated</span>
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

      {/* Charts */}
      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Stage Allocation</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Stage Progress</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
                {barData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
