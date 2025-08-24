# Meal Planner

A modern full-stack application for meal planning with React frontend and Django backend.

## Features

TBD

## Tech Stack

### Frontend
- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Emotion** - CSS-in-JS styling
- **React Router** - Client-side routing

### Backend
- **Django** - Web framework
- **PostgreSQL** - Database
- **Gunicorn** - WSGI server

### Infrastructure
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **Docker Compose** - Multi-container orchestration



### Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd meal_planner
   ```

2. **Set up environment variables:**
   ```bash
   cd docker
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start all services:**
   ```bash
   docker-compose up --build -d
   ```

4. **Apply database migrations:**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

5. **Create superuser (optional):**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

### Access the Application

- **Frontend:** http://localhost
- **API Backend:** http://localhost:8000
- **Admin Panel:** http://localhost/admin/
- **API Documentation:** http://localhost/api/doc/ (requires admin login)
- **PostgreSQL:** localhost:5432

### Development Setup

For local development with IDE support:

1. **Backend (Django):**
   ```bash
   cd backend
   python3 -m venv venv_local
   source venv_local/bin/activate
   pip install -r requirements.txt
   ```

2. **Frontend (React):**
   ```bash
   cd frontend
   yarn install
   yarn dev  # for development server
   ```

### Code Quality and Formatting

The project uses modern tools for code quality and formatting:

#### **VS Code Setup:**
**Recommended Extensions:** VS Code will automatically suggest installing recommended extensions from `.vscode/extensions.json`

**Auto-actions on save:**
- **Python files:** Ruff formatting + import sorting
- **JS/TS/React files:** Prettier formatting only (imports preserved as-is)
- **JSON/CSS files:** Prettier formatting

#### **Backend (Python) - Ruff:**
```bash
cd backend
source venv_local/bin/activate

# Check for linting errors
ruff check .

# Format all Python files
ruff format .

# Auto-fix fixable issues
ruff check --fix .

# Check specific file
ruff check accounts/views.py
```

**What Ruff provides:**
- Line length enforcement (88 characters)
- Unused import detection and removal
- Import sorting with Django-style organization
- Auto-fixing of syntax and style issues
- Integration with pycodestyle, pyflakes, and isort rules

#### **Frontend (React/TypeScript) - ESLint + Prettier:**
```bash
cd frontend

# Run all linting checks (ESLint + TypeScript)
yarn lint

# Check for linting errors only
yarn test:eslint

# Check TypeScript types only
yarn test:typescript

# Format code with Prettier
yarn format

# Check if code is formatted correctly
yarn format:check

# Auto-fix ESLint issues
yarn lint:fix
```

**What ESLint + Prettier provides:**
- **ESLint:** TypeScript/JavaScript error detection and unused variable warnings
- **Prettier:** Code formatting with 2 spaces, semicolons, and 88 character line length
- **Import organization:** Sorting and grouping with defined order
- **Auto-fix capabilities:** Manual import organization and basic syntax fixes

**Configured import organization rules:**
1. **Built-in modules** (Node.js)
2. **External libraries** (react, axios, etc.) - alphabetically sorted
3. **Internal modules** (project components)
4. **Relative imports** (../, ./)
5. **Index imports**

Empty lines between groups, duplicate imports merged automatically.

## Project Structure

```
meal_planner/
├── backend/                    # Django backend
│   ├── meal_planner_backend/   # Django project
│   ├── Dockerfile             # Backend container
│   ├── requirements.txt       # Python dependencies
│   └── manage.py              # Django CLI
├── frontend/                   # React frontend
│   ├── src/                   # Source code
│   ├── Dockerfile             # Frontend container
│   ├── package.json           # Node dependencies
│   └── vite.config.ts         # Vite configuration
├── docker/                     # Docker infrastructure
│   ├── docker-compose.yml     # Multi-container setup
│   ├── nginx/                 # Nginx configuration
│   ├── .env.example           # Environment template
│   └── .env                   # Environment variables (create this)
└── README.md                   # This file
```

## Environment Variables

Key environment variables in `docker/.env`:

```env
# Database
DB_NAME=meal_planner
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=postgres
DB_PORT=5432

# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,backend,nginx
```

## Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# Execute commands in containers
docker-compose exec backend python manage.py shell
docker-compose exec postgres psql -U postgres -d meal_planner

# Check container status
docker-compose ps
```

## API

The Django REST API is available at `/api/` endpoint.

### API Documentation

Interactive API documentation is available via Swagger UI at:
- **URL:** http://localhost/api/doc/
- **Authentication:** Requires admin/staff user login
- **Features:** Interactive API testing, request/response examples, schema definitions

To access the documentation:
1. Create a superuser account (if not already done):
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```
2. Navigate to http://localhost/api/doc/
3. Login with your admin credentials when prompted

## Deployment

TBD

