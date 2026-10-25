# TaskForge

**A modern team collaboration and project management platform.**

TaskForge is a full-stack SaaS application designed to help teams organize projects, manage tasks, coordinate work, and track progress through a collaborative workspace.

## Project Status

🚧 In active development.

## Planned Features

- Secure user registration and authentication
- Workspaces and team membership
- Role-based access control
- Project creation and management
- Kanban boards and task workflows
- Task assignments, priorities, labels, and due dates
- Subtasks, comments, and activity history
- Notifications and real-time collaboration
- Project analytics and team workload insights
- Responsive interface for desktop and mobile

## Technology Stack

### Frontend
- React
- Vite
- Custom CSS design system

### Backend
- Python
- FastAPI
- SQLAlchemy
- Alembic

### Database and Infrastructure
- PostgreSQL
- Docker and Docker Compose
- Redis for future background jobs and supporting services

### Testing
- Pytest
- Frontend component and integration tests

## Architecture

The application will use a separated frontend and backend architecture.

```text
TaskForge/
├── frontend/       # React application
├── backend/        # FastAPI application
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md