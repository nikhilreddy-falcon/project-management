import React, { useState, useRef } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, differenceInDays, differenceInWeeks, isWithinInterval, parseISO } from 'date-fns';
import { HiOutlinePrinter, HiOutlineDownload, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineExclamation, HiOutlineCheckCircle, HiOutlineClock, HiOutlineTrendingUp, HiOutlineTrendingDown } from 'react-icons/hi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

function WeeklyReport({ projects, settings, colors }) {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const reportRef = useRef(null);

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });

  const calculateOverallProgress = (project) => {
    if (!project.stages || project.stages.length === 0) return 0;
    return project.stages.reduce((sum, s) => sum + (s.percentage * s.progress / 100), 0);
  };

  // === EXECUTIVE METRICS ===
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => {
    const progress = calculateOverallProgress(p);
    return progress > 0 && progress < 100;
  }).length;
  const completedProjects = projects.filter(p => calculateOverallProgress(p) >= 100).length;
  const notStartedProjects = projects.filter(p => calculateOverallProgress(p) === 0).length;
  const avgProgress = totalProjects > 0
    ? projects.reduce((sum, p) => sum + calculateOverallProgress(p), 0) / totalProjects
    : 0;

  // === RESOURCE ANALYTICS ===
  const allStages = projects.flatMap(p => p.stages || []);
  const totalUtilized = allStages.reduce((acc, s) => ({
    devops: acc.devops + (s.devops || 0),
    engineers: acc.engineers + (s.engineers || 0)
  }), { devops: 0, engineers: 0 });

  const devopsUtilization = settings.totalDevops > 0 ? (totalUtilized.devops / settings.totalDevops * 100) : 0;
  const engineersUtilization = settings.totalEngineers > 0 ? (totalUtilized.engineers / settings.totalEngineers * 100) : 0;
  const freeDevops = Math.max(0, settings.totalDevops - totalUtilized.devops);
  const freeEngineers = Math.max(0, settings.totalEngineers - totalUtilized.engineers);

  // === TIMELINE ANALYSIS ===
  const projectsWithTimeline = projects.filter(p => p.start_date && p.end_date).map(p => {
    const start = parseISO(p.start_date);
    const end = parseISO(p.end_date);
    const today = new Date();
    const totalDays = differenceInDays(end, start);
    const elapsedDays = differenceInDays(today, start);
    const expectedProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    const actualProgress = calculateOverallProgress(p);
    const variance = actualProgress - expectedProgress;
    const daysRemaining = differenceInDays(end, today);
    const weeksRemaining = differenceInWeeks(end, today);

    return {
      ...p,
      totalDays,
      elapsedDays,
      expectedProgress,
      actualProgress,
      variance,
      daysRemaining,
      weeksRemaining,
      status: variance >= 0 ? 'on-track' : variance >= -10 ? 'at-risk' : 'behind',
      isOverdue: daysRemaining < 0 && actualProgress < 100
    };
  });

  const onTrackProjects = projectsWithTimeline.filter(p => p.status === 'on-track').length;
  const atRiskProjects = projectsWithTimeline.filter(p => p.status === 'at-risk').length;
  const behindProjects = projectsWithTimeline.filter(p => p.status === 'behind').length;
  const overdueProjects = projectsWithTimeline.filter(p => p.isOverdue).length;

  // === STAGE ANALYSIS ===
  const stagesNeedingResources = allStages.filter(s => (s.devops || 0) === 0 && (s.engineers || 0) === 0);
  const stagesCompleted = allStages.filter(s => s.progress >= 100).length;
  const stagesInProgress = allStages.filter(s => s.progress > 0 && s.progress < 100).length;
  const stagesNotStarted = allStages.filter(s => s.progress === 0).length;

  // === TASK ANALYSIS ===
  const allTasks = projects.flatMap(p => p.tasks || []);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.status === 'done').length;
  const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length;
  const todoTasks = allTasks.filter(t => t.status === 'todo').length;
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0;

  // Overdue tasks
  const overdueTasks = allTasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false;
    return new Date(t.due_date) < new Date();
  });

  // === RISK ASSESSMENT ===
  const risks = [];
  if (overdueProjects > 0) risks.push({ level: 'high', message: `${overdueProjects} project(s) are overdue` });
  if (behindProjects > 0) risks.push({ level: 'high', message: `${behindProjects} project(s) significantly behind schedule` });
  if (atRiskProjects > 0) risks.push({ level: 'medium', message: `${atRiskProjects} project(s) at risk of delay` });
  if (stagesNeedingResources.length > 0) risks.push({ level: 'medium', message: `${stagesNeedingResources.length} stage(s) have no resources assigned` });
  if (overdueTasks.length > 0) risks.push({ level: 'medium', message: `${overdueTasks.length} task(s) are overdue` });
  if (devopsUtilization > 90) risks.push({ level: 'medium', message: 'DevOps resources near capacity (>90%)' });
  if (engineersUtilization > 90) risks.push({ level: 'medium', message: 'Engineering resources near capacity (>90%)' });
  if (freeDevops === 0 || freeEngineers === 0) risks.push({ level: 'high', message: 'No available resources for new work' });

  // === CHART DATA ===
  const projectProgressData = projects.map((p, idx) => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
    progress: Math.round(calculateOverallProgress(p)),
    color: colors[idx % colors.length]
  }));

  const resourcePieData = [
    { name: 'DevOps Used', value: totalUtilized.devops, color: '#8b5cf6' },
    { name: 'DevOps Free', value: freeDevops, color: '#e5e7eb' },
  ];

  const engineerPieData = [
    { name: 'Engineers Used', value: totalUtilized.engineers, color: '#3b82f6' },
    { name: 'Engineers Free', value: freeEngineers, color: '#e5e7eb' },
  ];

  const taskStatusData = [
    { name: 'Completed', value: completedTasks, color: '#10b981' },
    { name: 'In Progress', value: inProgressTasks, color: '#f59e0b' },
    { name: 'To Do', value: todoTasks, color: '#6b7280' },
  ];

  const stageStatusData = [
    { name: 'Completed', value: stagesCompleted, color: '#10b981' },
    { name: 'In Progress', value: stagesInProgress, color: '#3b82f6' },
    { name: 'Not Started', value: stagesNotStarted, color: '#e5e7eb' },
  ];

  // === RECOMMENDATIONS ===
  const recommendations = [];
  if (stagesNeedingResources.length > 0) {
    recommendations.push(`Assign resources to ${stagesNeedingResources.length} unassigned stage(s) to begin tracking progress`);
  }
  if (behindProjects > 0) {
    recommendations.push(`Review and reallocate resources for ${behindProjects} behind-schedule project(s)`);
  }
  if (freeDevops > 3 || freeEngineers > 3) {
    recommendations.push(`Consider taking on new projects - ${freeDevops} DevOps and ${freeEngineers} Engineers available`);
  }
  if (overdueTasks.length > 0) {
    recommendations.push(`Address ${overdueTasks.length} overdue task(s) as priority`);
  }
  if (notStartedProjects > 0) {
    recommendations.push(`${notStartedProjects} project(s) have not started - review kickoff schedules`);
  }

  const handlePrint = () => window.print();

  const handleExport = () => {
    const reportContent = `
================================================================================
                        WEEKLY STATUS REPORT
                ${format(weekStart, 'MMMM dd')} - ${format(weekEnd, 'MMMM dd, yyyy')}
================================================================================

EXECUTIVE SUMMARY
-----------------
Total Projects:     ${totalProjects}
  - Active:         ${activeProjects}
  - Completed:      ${completedProjects}
  - Not Started:    ${notStartedProjects}
Average Progress:   ${avgProgress.toFixed(1)}%

PROJECT HEALTH
--------------
On Track:           ${onTrackProjects} project(s)
At Risk:            ${atRiskProjects} project(s)
Behind Schedule:    ${behindProjects} project(s)
Overdue:            ${overdueProjects} project(s)

RESOURCE UTILIZATION
--------------------
DevOps Engineers:   ${totalUtilized.devops} / ${settings.totalDevops} (${devopsUtilization.toFixed(0)}% utilized)
Software Engineers: ${totalUtilized.engineers} / ${settings.totalEngineers} (${engineersUtilization.toFixed(0)}% utilized)
Available:          ${freeDevops} DevOps, ${freeEngineers} Engineers

STAGE PROGRESS
--------------
Total Stages:       ${allStages.length}
  - Completed:      ${stagesCompleted}
  - In Progress:    ${stagesInProgress}
  - Not Started:    ${stagesNotStarted}
  - Need Resources: ${stagesNeedingResources.length}

TASK STATUS
-----------
Total Tasks:        ${totalTasks}
  - Completed:      ${completedTasks} (${taskCompletionRate.toFixed(0)}%)
  - In Progress:    ${inProgressTasks}
  - To Do:          ${todoTasks}
  - Overdue:        ${overdueTasks.length}

PROJECT DETAILS
---------------
${projectsWithTimeline.map(p => `
${p.name}
  Progress:         ${p.actualProgress.toFixed(1)}% (Expected: ${p.expectedProgress.toFixed(1)}%)
  Variance:         ${p.variance >= 0 ? '+' : ''}${p.variance.toFixed(1)}%
  Status:           ${p.status.toUpperCase()}${p.isOverdue ? ' - OVERDUE' : ''}
  Days Remaining:   ${p.daysRemaining}
  Timeline:         ${format(parseISO(p.start_date), 'MMM dd, yyyy')} - ${format(parseISO(p.end_date), 'MMM dd, yyyy')}
  Stages:           ${p.stages?.length || 0}
  Tasks:            ${p.tasks?.filter(t => t.status === 'done').length || 0}/${p.tasks?.length || 0} completed
`).join('')}

RISKS & ISSUES
--------------
${risks.length > 0 ? risks.map(r => `[${r.level.toUpperCase()}] ${r.message}`).join('\n') : 'No significant risks identified'}

RECOMMENDATIONS
---------------
${recommendations.length > 0 ? recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n') : 'No immediate actions required'}

--------------------------------------------------------------------------------
Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}
================================================================================
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-report-${format(weekStart, 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="weekly-report">
      {/* Report Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Weekly Status Report</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '20px' }}>
              <HiOutlineChevronLeft />
            </button>
            <span style={{ fontSize: '16px', color: '#374151', fontWeight: '500' }}>
              {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
            </span>
            <button onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '20px' }}>
              <HiOutlineChevronRight />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HiOutlinePrinter /> Print
          </button>
          <button className="btn btn-primary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HiOutlineDownload /> Export
          </button>
        </div>
      </div>

      <div ref={reportRef}>
        {/* Executive Summary Cards */}
        <div className="grid grid-4" style={{ marginBottom: '20px', gap: '16px' }}>
          <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Projects</div>
            <div style={{ fontSize: '36px', fontWeight: '700' }}>{totalProjects}</div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
              {activeProjects} active, {completedProjects} done
            </div>
          </div>
          <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Avg Progress</div>
            <div style={{ fontSize: '36px', fontWeight: '700' }}>{avgProgress.toFixed(0)}%</div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
              {onTrackProjects} on track
            </div>
          </div>
          <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Tasks Completed</div>
            <div style={{ fontSize: '36px', fontWeight: '700' }}>{completedTasks}/{totalTasks}</div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
              {taskCompletionRate.toFixed(0)}% completion rate
            </div>
          </div>
          <div className="card" style={{ padding: '20px', background: risks.filter(r => r.level === 'high').length > 0 ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', color: 'white' }}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Risk Items</div>
            <div style={{ fontSize: '36px', fontWeight: '700' }}>{risks.length}</div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
              {risks.filter(r => r.level === 'high').length} high priority
            </div>
          </div>
        </div>

        {/* Project Health & Resource Utilization */}
        <div className="grid grid-2" style={{ marginBottom: '20px', gap: '20px' }}>
          {/* Project Health */}
          <div className="card">
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Project Health Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: '#dcfce7', borderRadius: '8px' }}>
                <HiOutlineCheckCircle style={{ fontSize: '24px', color: '#16a34a' }} />
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a' }}>{onTrackProjects}</div>
                <div style={{ fontSize: '11px', color: '#166534' }}>On Track</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
                <HiOutlineClock style={{ fontSize: '24px', color: '#d97706' }} />
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#d97706' }}>{atRiskProjects}</div>
                <div style={{ fontSize: '11px', color: '#92400e' }}>At Risk</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#fee2e2', borderRadius: '8px' }}>
                <HiOutlineTrendingDown style={{ fontSize: '24px', color: '#dc2626' }} />
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>{behindProjects}</div>
                <div style={{ fontSize: '11px', color: '#991b1b' }}>Behind</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: overdueProjects > 0 ? '#7f1d1d' : '#f3f4f6', borderRadius: '8px' }}>
                <HiOutlineExclamation style={{ fontSize: '24px', color: overdueProjects > 0 ? '#fecaca' : '#6b7280' }} />
                <div style={{ fontSize: '24px', fontWeight: '700', color: overdueProjects > 0 ? '#fecaca' : '#6b7280' }}>{overdueProjects}</div>
                <div style={{ fontSize: '11px', color: overdueProjects > 0 ? '#fecaca' : '#6b7280' }}>Overdue</div>
              </div>
            </div>
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectProgressData} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="progress" fill="#667eea" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resource Utilization */}
          <div className="card">
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Resource Utilization</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600' }}>DevOps</span>
                  <span style={{ color: '#6b7280', marginLeft: '8px' }}>{totalUtilized.devops}/{settings.totalDevops}</span>
                </div>
                <div style={{ height: '120px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={resourcePieData} innerRadius={35} outerRadius={50} dataKey="value" startAngle={90} endAngle={-270}>
                        {resourcePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: '700', color: devopsUtilization > 90 ? '#dc2626' : '#8b5cf6' }}>
                  {devopsUtilization.toFixed(0)}%
                </div>
              </div>
              <div>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600' }}>Engineers</span>
                  <span style={{ color: '#6b7280', marginLeft: '8px' }}>{totalUtilized.engineers}/{settings.totalEngineers}</span>
                </div>
                <div style={{ height: '120px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={engineerPieData} innerRadius={35} outerRadius={50} dataKey="value" startAngle={90} endAngle={-270}>
                        {engineerPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: '700', color: engineersUtilization > 90 ? '#dc2626' : '#3b82f6' }}>
                  {engineersUtilization.toFixed(0)}%
                </div>
              </div>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px', display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Available DevOps</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: freeDevops > 0 ? '#10b981' : '#dc2626' }}>{freeDevops}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Available Engineers</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: freeEngineers > 0 ? '#10b981' : '#dc2626' }}>{freeEngineers}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stage & Task Analysis */}
        <div className="grid grid-2" style={{ marginBottom: '20px', gap: '20px' }}>
          <div className="card">
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Stage Progress</h2>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ width: '140px', height: '140px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stageStatusData} innerRadius={40} outerRadius={60} dataKey="value" startAngle={90} endAngle={-270}>
                      {stageStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px' }}>Completed</span>
                    <span style={{ fontWeight: '600', color: '#10b981' }}>{stagesCompleted}</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '8px' }}>
                    <div style={{ background: '#10b981', height: '100%', width: `${allStages.length > 0 ? (stagesCompleted / allStages.length * 100) : 0}%`, borderRadius: '4px' }} />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px' }}>In Progress</span>
                    <span style={{ fontWeight: '600', color: '#3b82f6' }}>{stagesInProgress}</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '8px' }}>
                    <div style={{ background: '#3b82f6', height: '100%', width: `${allStages.length > 0 ? (stagesInProgress / allStages.length * 100) : 0}%`, borderRadius: '4px' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px' }}>Not Started</span>
                    <span style={{ fontWeight: '600', color: '#6b7280' }}>{stagesNotStarted}</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '8px' }}>
                    <div style={{ background: '#9ca3af', height: '100%', width: `${allStages.length > 0 ? (stagesNotStarted / allStages.length * 100) : 0}%`, borderRadius: '4px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Task Status</h2>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ width: '140px', height: '140px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskStatusData} innerRadius={40} outerRadius={60} dataKey="value" startAngle={90} endAngle={-270}>
                      {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px' }}>Done</span>
                    <span style={{ fontWeight: '600', color: '#10b981' }}>{completedTasks}</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '8px' }}>
                    <div style={{ background: '#10b981', height: '100%', width: `${totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0}%`, borderRadius: '4px' }} />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px' }}>In Progress</span>
                    <span style={{ fontWeight: '600', color: '#f59e0b' }}>{inProgressTasks}</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '8px' }}>
                    <div style={{ background: '#f59e0b', height: '100%', width: `${totalTasks > 0 ? (inProgressTasks / totalTasks * 100) : 0}%`, borderRadius: '4px' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px' }}>To Do</span>
                    <span style={{ fontWeight: '600', color: '#6b7280' }}>{todoTasks}</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '8px' }}>
                    <div style={{ background: '#9ca3af', height: '100%', width: `${totalTasks > 0 ? (todoTasks / totalTasks * 100) : 0}%`, borderRadius: '4px' }} />
                  </div>
                </div>
                {overdueTasks.length > 0 && (
                  <div style={{ marginTop: '12px', padding: '8px', background: '#fef2f2', borderRadius: '6px', fontSize: '12px', color: '#dc2626' }}>
                    {overdueTasks.length} overdue task(s)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Project Status */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Detailed Project Status</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Project</th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Progress</th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Expected</th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Variance</th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Days Left</th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {projectsWithTimeline.map((project, idx) => (
                <tr key={project.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[idx % colors.length] }} />
                      <div>
                        <div style={{ fontWeight: '500' }}>{project.name}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          {project.stages?.length || 0} stages | {project.tasks?.length || 0} tasks
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <div style={{ width: '50px', background: '#e5e7eb', borderRadius: '4px', height: '6px' }}>
                        <div style={{ background: colors[idx % colors.length], height: '100%', width: `${project.actualProgress}%`, borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{project.actualProgress.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', color: '#6b7280' }}>
                    {project.expectedProgress.toFixed(0)}%
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: project.variance >= 0 ? '#10b981' : project.variance >= -10 ? '#f59e0b' : '#dc2626'
                    }}>
                      {project.variance >= 0 ? <HiOutlineTrendingUp /> : <HiOutlineTrendingDown />}
                      {project.variance >= 0 ? '+' : ''}{project.variance.toFixed(0)}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px' }}>
                    <span style={{ color: project.daysRemaining < 0 ? '#dc2626' : project.daysRemaining < 14 ? '#f59e0b' : '#6b7280' }}>
                      {project.daysRemaining < 0 ? `${Math.abs(project.daysRemaining)} overdue` : project.daysRemaining}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: project.isOverdue ? '#fef2f2' : project.status === 'on-track' ? '#dcfce7' : project.status === 'at-risk' ? '#fef3c7' : '#fee2e2',
                      color: project.isOverdue ? '#dc2626' : project.status === 'on-track' ? '#166534' : project.status === 'at-risk' ? '#92400e' : '#991b1b'
                    }}>
                      {project.isOverdue ? 'OVERDUE' : project.status === 'on-track' ? 'On Track' : project.status === 'at-risk' ? 'At Risk' : 'Behind'}
                    </span>
                  </td>
                </tr>
              ))}
              {projects.filter(p => !p.start_date).map((project, idx) => (
                <tr key={project.id} style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af' }} />
                      <div>
                        <div style={{ fontWeight: '500', color: '#6b7280' }}>{project.name}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                          {project.stages?.length || 0} stages | Not scheduled
                        </div>
                      </div>
                    </div>
                  </td>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', color: '#9ca3af' }}>
                    Planning phase - no dates assigned
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: '#f3f4f6', color: '#6b7280' }}>
                      Planning
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Risks & Recommendations */}
        <div className="grid grid-2" style={{ marginBottom: '20px', gap: '20px' }}>
          <div className="card" style={{ borderLeft: risks.filter(r => r.level === 'high').length > 0 ? '4px solid #dc2626' : '4px solid #f59e0b' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
              Risks & Issues ({risks.length})
            </h2>
            {risks.length > 0 ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {risks.map((risk, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: risk.level === 'high' ? '#fef2f2' : '#fffbeb',
                    borderRadius: '6px'
                  }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '700',
                      background: risk.level === 'high' ? '#dc2626' : '#f59e0b',
                      color: 'white'
                    }}>
                      {risk.level.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '13px' }}>{risk.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#10b981' }}>
                <HiOutlineCheckCircle style={{ fontSize: '32px', marginBottom: '8px' }} />
                <div style={{ fontWeight: '500' }}>No significant risks identified</div>
              </div>
            )}
          </div>

          <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
              Recommendations
            </h2>
            {recommendations.length > 0 ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {recommendations.map((rec, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    background: '#eff6ff',
                    borderRadius: '6px'
                  }}>
                    <span style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#3b82f6',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '700',
                      flexShrink: 0
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '13px' }}>{rec}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#10b981' }}>
                <HiOutlineCheckCircle style={{ fontSize: '32px', marginBottom: '8px' }} />
                <div style={{ fontWeight: '500' }}>All projects on track - no actions needed</div>
              </div>
            )}
          </div>
        </div>

        {/* Report Footer */}
        <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '12px', borderTop: '1px solid #e5e7eb' }}>
          Weekly Status Report | Generated on {format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm')} | Project Tracker
        </div>
      </div>
    </div>
  );
}

export default WeeklyReport;
