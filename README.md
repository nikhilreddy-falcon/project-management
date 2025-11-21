# Project Tracker

A full-stack project tracking application with customizable lifecycle stages and multiple views.

## Features

- **Custom Lifecycle Stages**: Define your own project stages with percentage allocations (must total 100%)
- **5 Different Views**:
  - **Dashboard**: Overview with charts, stats, and progress indicators
  - **Gantt Chart**: Timeline view showing stage allocation and progress
  - **Kanban Board**: Task management with drag status changes
  - **Table View**: Spreadsheet-like view with editable progress
  - **Calendar View**: Monthly calendar showing stage timelines and tasks

## Setup

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. Install all dependencies:
```bash
npm run install-all
```

2. Start the application (runs both server and client):
```bash
npm run dev
```

Or run them separately:
```bash
# Terminal 1 - Backend (port 5000)
npm run server

# Terminal 2 - Frontend (port 3000)
npm run client
```

3. Open http://localhost:3000 in your browser

## Usage

1. Click "New Project" to create a project
2. Set project name, start date (end date auto-calculates to 10 weeks)
3. Add lifecycle stages with percentage allocations (must total 100%)
4. Use sliders to update stage progress
5. Add tasks to stages in Kanban view
6. Switch between views using tabs

## Tech Stack

- **Backend**: Node.js, Express, SQLite (better-sqlite3)
- **Frontend**: React, Recharts (for charts), date-fns
