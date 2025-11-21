import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isWithinInterval, differenceInDays, isPast, isToday as isDateToday } from 'date-fns';

function CalendarView({ project, colors }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  if (!project) {
    return <div className="card empty-state">Select a project to view calendar</div>;
  }

  const projectStart = new Date(project.start_date);
  const projectEnd = new Date(project.end_date);
  const stages = project.stages || [];
  const tasks = project.tasks || [];
  const today = new Date();

  // Calculate stage date ranges
  let cumulativeDays = 0;
  const totalDays = Math.ceil((projectEnd - projectStart) / (1000 * 60 * 60 * 24));

  const stageRanges = stages.map((stage, i) => {
    const stageDays = Math.round((stage.percentage / 100) * totalDays);
    const stageStart = addDays(projectStart, cumulativeDays);
    const stageEnd = addDays(projectStart, cumulativeDays + stageDays - 1);
    cumulativeDays += stageDays;

    const isOverdue = isPast(stageEnd) && stage.progress < 100;
    const daysUntilDeadline = differenceInDays(stageEnd, today);
    const isAtRisk = daysUntilDeadline <= 3 && daysUntilDeadline >= 0 && stage.progress < 80;

    return {
      ...stage,
      startDate: stageStart,
      endDate: stageEnd,
      color: stage.color || colors[i % colors.length],
      isOverdue,
      isAtRisk,
      daysUntilDeadline
    };
  });

  // Intelligence calculations
  const overdueTasks = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'done');
  const overdueStages = stageRanges.filter(s => s.isOverdue);
  const atRiskStages = stageRanges.filter(s => s.isAtRisk);
  const upcomingDeadlines = stageRanges.filter(s => s.daysUntilDeadline >= 0 && s.daysUntilDeadline <= 7 && s.progress < 100);

  // Calculate expected vs actual progress
  const daysElapsed = Math.max(0, differenceInDays(today, projectStart));
  const expectedProgress = Math.min(100, (daysElapsed / totalDays) * 100);
  const actualProgress = stages.reduce((sum, s) => sum + (s.percentage * s.progress / 100), 0);
  const progressDelta = actualProgress - expectedProgress;

  // Workload analysis - tasks per week
  const getWeekNumber = (date) => Math.ceil(differenceInDays(date, projectStart) / 7);
  const tasksByWeek = tasks.reduce((acc, task) => {
    if (task.due_date) {
      const week = getWeekNumber(new Date(task.due_date));
      acc[week] = (acc[week] || 0) + 1;
    }
    return acc;
  }, {});
  const maxTasksPerWeek = Math.max(...Object.values(tasksByWeek), 0);
  const heavyWeeks = Object.entries(tasksByWeek).filter(([_, count]) => count >= 3).map(([week]) => parseInt(week));

  const renderHeader = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <button className="btn btn-secondary" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
        ← Prev
      </button>
      <h3>{format(currentMonth, 'MMMM yyyy')}</h3>
      <button className="btn btn-secondary" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
        Next →
      </button>
    </div>
  );

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="calendar-grid">
        {days.map(day => (
          <div key={day} className="calendar-header">{day}</div>
        ))}
      </div>
    );
  };

  const getStageForDate = (date) => {
    return stageRanges.find(stage =>
      isWithinInterval(date, { start: stage.startDate, end: stage.endDate })
    );
  };

  const getTasksForDate = (date) => {
    return tasks.filter(task =>
      task.due_date && isSameDay(new Date(task.due_date), date)
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const isToday = isSameDay(day, new Date());
        const isCurrentMonth = isSameMonth(day, monthStart);
        const stage = getStageForDate(day);
        const dayTasks = getTasksForDate(day);
        const isProjectStart = isSameDay(day, projectStart);
        const isProjectEnd = isSameDay(day, projectEnd);
        const isStageDeadline = stageRanges.some(s => isSameDay(day, s.endDate));
        const deadlineStage = stageRanges.find(s => isSameDay(day, s.endDate));

        // Check for overdue tasks on this day
        const hasOverdueTasks = dayTasks.some(t => isPast(new Date(t.due_date)) && t.status !== 'done');

        days.push(
          <div
            key={day.toString()}
            className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
            style={{
              background: hasOverdueTasks ? '#fef2f2' : stage ? stage.color + '15' : undefined,
              borderLeft: stage ? `3px solid ${stage.color}` : undefined,
              borderTop: isStageDeadline && deadlineStage?.progress < 100 ? '3px solid #ef4444' : undefined
            }}
          >
            <div className="calendar-day-number" style={{
              color: isToday ? '#4361ee' : undefined,
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>{format(day, 'd')}</span>
              {isProjectStart && <span style={{ fontSize: '10px', color: '#22c55e' }}>🚀</span>}
              {isProjectEnd && <span style={{ fontSize: '10px', color: '#3b82f6' }}>🏁</span>}
              {isStageDeadline && !isProjectEnd && (
                <span style={{ fontSize: '10px', color: deadlineStage?.progress >= 100 ? '#22c55e' : '#ef4444' }}>
                  {deadlineStage?.progress >= 100 ? '✓' : '⚠'}
                </span>
              )}
            </div>

            {stage && isCurrentMonth && (
              <div style={{
                fontSize: '10px',
                color: stage.color,
                fontWeight: '500',
                marginBottom: '3px'
              }}>
                {stage.name}
              </div>
            )}

            {dayTasks.map(task => {
              const isTaskOverdue = isPast(new Date(task.due_date)) && task.status !== 'done';
              return (
                <div
                  key={task.id}
                  className="calendar-event"
                  style={{
                    background: isTaskOverdue ? '#ef4444' : task.status === 'done' ? '#22c55e' : stage?.color || '#4361ee',
                    textDecoration: task.status === 'done' ? 'line-through' : 'none'
                  }}
                  title={`${task.title} - ${task.status}${isTaskOverdue ? ' (OVERDUE)' : ''}`}
                >
                  {task.title}
                </div>
              );
            })}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="calendar-grid">
          {days}
        </div>
      );
      days = [];
    }
    return rows;
  };

  return (
    <div>
      {/* Intelligence Alerts */}
      {(overdueStages.length > 0 || overdueTasks.length > 0 || atRiskStages.length > 0 || Math.abs(progressDelta) > 10) && (
        <div className="card" style={{ marginBottom: '20px', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <h4 style={{ color: '#dc2626', marginBottom: '12px' }}>⚠️ Alerts</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {overdueStages.map(stage => (
              <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span style={{ color: '#dc2626' }}>●</span>
                <span><strong>{stage.name}</strong> deadline passed - only {stage.progress}% complete</span>
              </div>
            ))}
            {overdueTasks.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span style={{ color: '#dc2626' }}>●</span>
                <span><strong>{overdueTasks.length}</strong> overdue task{overdueTasks.length > 1 ? 's' : ''} need attention</span>
              </div>
            )}
            {atRiskStages.map(stage => (
              <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span style={{ color: '#f59e0b' }}>●</span>
                <span><strong>{stage.name}</strong> due in {stage.daysUntilDeadline} days but only {stage.progress}% done</span>
              </div>
            ))}
            {progressDelta < -10 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span style={{ color: '#dc2626' }}>●</span>
                <span>Project is <strong>{Math.abs(progressDelta).toFixed(0)}% behind</strong> expected progress</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress vs Time Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '15px' }}>Progress vs Time</h4>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Time Elapsed</div>
            <div className="progress-bar" style={{ height: '12px' }}>
              <div className="progress-fill" style={{ width: `${expectedProgress}%`, background: '#94a3b8' }} />
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{expectedProgress.toFixed(0)}%</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Actual Progress</div>
            <div className="progress-bar" style={{ height: '12px' }}>
              <div className="progress-fill" style={{ width: `${actualProgress}%`, background: progressDelta >= 0 ? '#22c55e' : '#ef4444' }} />
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{actualProgress.toFixed(0)}%</div>
          </div>
          <div style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: progressDelta >= 0 ? '#dcfce7' : '#fef2f2',
            color: progressDelta >= 0 ? '#166534' : '#dc2626',
            fontWeight: '600',
            fontSize: '14px'
          }}>
            {progressDelta >= 0 ? '+' : ''}{progressDelta.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="card">
        {renderHeader()}
        {renderDays()}
        {renderCells()}

        {/* Legend */}
        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#22c55e' }}>✓</span> Stage complete
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#ef4444' }}>⚠</span> Stage deadline (incomplete)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }} /> Overdue task
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '2px' }} /> Completed task
          </div>
        </div>
      </div>

      {/* Stage Timeline with Status */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h4 style={{ marginBottom: '15px' }}>Stage Deadlines</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {stageRanges.map((stage, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: stage.isOverdue ? '#fef2f2' : stage.isAtRisk ? '#fffbeb' : '#f9fafb',
              borderRadius: '8px',
              borderLeft: `4px solid ${stage.isOverdue ? '#ef4444' : stage.isAtRisk ? '#f59e0b' : stage.color}`
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {stage.name}
                  {stage.isOverdue && <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600' }}>OVERDUE</span>}
                  {stage.isAtRisk && <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>AT RISK</span>}
                  {stage.progress >= 100 && <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: '600' }}>✓ DONE</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {format(stage.startDate, 'MMM d')} - {format(stage.endDate, 'MMM d')}
                  {stage.daysUntilDeadline >= 0 && stage.progress < 100 && (
                    <span style={{ marginLeft: '8px', color: stage.daysUntilDeadline <= 3 ? '#ef4444' : '#666' }}>
                      ({stage.daysUntilDeadline} days left)
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: '600', color: stage.isOverdue ? '#dc2626' : stage.color }}>
                  {stage.progress}%
                </div>
                <div style={{ fontSize: '11px', color: '#666' }}>{stage.percentage}% weight</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div className="card" style={{ marginTop: '20px', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <h4 style={{ marginBottom: '15px', color: '#dc2626' }}>Overdue Tasks ({overdueTasks.length})</h4>
          <div>
            {overdueTasks.map(task => {
              const stage = stages.find(s => s.id === task.stage_id);
              const daysOverdue = differenceInDays(today, new Date(task.due_date));
              return (
                <div key={task.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  borderBottom: '1px solid #fecaca'
                }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#ef4444'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>{task.title}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{stage?.name}</div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#dc2626', fontWeight: '500' }}>
                    {daysOverdue} day{daysOverdue > 1 ? 's' : ''} overdue
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Tasks */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h4 style={{ marginBottom: '15px' }}>Upcoming Tasks</h4>
        {tasks.filter(t => t.due_date && new Date(t.due_date) >= new Date() && t.status !== 'done').length === 0 ? (
          <p style={{ color: '#666' }}>No upcoming tasks with due dates</p>
        ) : (
          <div>
            {tasks
              .filter(t => t.due_date && new Date(t.due_date) >= new Date() && t.status !== 'done')
              .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
              .slice(0, 5)
              .map(task => {
                const stage = stages.find(s => s.id === task.stage_id);
                const stageColor = stage?.color || '#4361ee';
                const daysUntil = differenceInDays(new Date(task.due_date), today);
                return (
                  <div key={task.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    borderBottom: '1px solid #eee'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: stageColor
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{task.title}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{stage?.name}</div>
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: daysUntil <= 2 ? '#f59e0b' : '#666',
                      fontWeight: daysUntil <= 2 ? '500' : 'normal'
                    }}>
                      {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CalendarView;
