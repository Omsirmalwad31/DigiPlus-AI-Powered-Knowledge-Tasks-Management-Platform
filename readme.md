# DigiPlus - AI-Powered Knowledge & Tasks

DigiPlus is a React and Spring Boot workspace for meeting minutes, task follow-up, team knowledge, and handovers.

## Run locally


The backend defaults to an in-memory H2 database in MySQL compatibility mode. It initializes its SQL schema at startup, so MySQL credentials are not required for local development.

In PowerShell, start the backend:

```powershell
Set-Location 'D:\PROJECTS\OA PROJECT\backend\knowledge-task-management'
$env:SPRING_PROFILES_ACTIVE = "local"
.\mvnw.cmd spring-boot:run
```

In a second terminal, start the frontend. Port 5173 may already belong to another project, so use 5174:

```powershell
Set-Location 'D:\PROJECTS\OA PROJECT\frontend'
npm install
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Open `http://127.0.0.1:5174`. The Vite proxy forwards API requests to the backend at `http://localhost:8081`.

## AI services

Gemini and Speechify credentials are optional for starting the app, but required for their corresponding AI features. Create new keys after revoking any credentials previously shared in chat or source files.

For local development, put keys in the gitignored project-root `file.env` (or `.env`). Spring Boot loads that file automatically on startup:

```env
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-3.5-flash
SPEECHIFY_API_KEY=your-speechify-key
SPEECHIFY_VOICE_ID=geffen_32
```

You can also export the same variables in PowerShell before `mvnw spring-boot:run`. Google AI Studio now issues `AQ.` auth keys as well as older `AIza` keys; both work with this backend. Prefer `gemini-3.5-flash` (or another currently available Gemini model) because older Flash models are unavailable to new API keys.

The React app never receives provider keys. Without a Gemini key, SQL workspace functionality remains available and the UI indicates that Gemini generation is not configured.

The AI Meeting Assistant accepts TXT, DOCX, PDF, MP3, WAV, M4A, AAC, OGG, and FLAC uploads up to 14 MB. It produces an editable draft containing the transcript, summary, decisions, action items, risks, open tasks, and questions. Confirmed minutes are saved with meeting history through the workspace SQL API. Browser text-to-speech is free; optional Speechify MP3 playback may incur provider charges.

## MySQL profile

To use MySQL instead of local H2, initialize the database with `backend/knowledge-task-management/src/main/resources/db/mysql/create-database.sql` and `schema.sql`, then set the database variables privately:

```powershell
$env:DB_URL = "jdbc:mysql://localhost:3306/digiplus?serverTimezone=UTC"
$env:DB_USERNAME = Read-Host "MySQL username"
$secureDbPassword = Read-Host "MySQL password" -AsSecureString
$env:DB_PASSWORD = [System.Net.NetworkCredential]::new("", $secureDbPassword).Password
$env:SPRING_PROFILES_ACTIVE = "mysql"
```

The MySQL account needs permission to create the schema tables on first startup. Never commit `.env` files, API keys, or passwords.

## Validation

```powershell
Set-Location 'D:\PROJECTS\OA PROJECT\backend\knowledge-task-management'
.\mvnw.cmd test

Set-Location 'D:\PROJECTS\OA PROJECT\frontend'
npm run build
```
