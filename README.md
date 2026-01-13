# SEC - Central Library / Gate Management System 2.0

A modern, full-stack application for managing library gate entries at SEC (Saveetha Engineering College). This system provides real-time tracking of students and staff, handles unregistered users, and offers robust database management tools.

## 🚀 Key Features

*   **Real-time Entry Logging**: Seamlessly logs student and staff entries via barcode/RFID scanning.
*   **Smart Unknown Entry Handling**:
    *   Automatically detects unregistered IDs.
    *   Classifies user type (Student/Staff) based on ID format.
    *   "Unknown Entries" queue for later resolution.
    *   Auto-resolves unknown log entries when the user is added to the master database.
*   **Audio Feedback**: Text-to-Speech (TTS) audio confirmations for check-ins, check-outs, and errors.
*   **Database Management**:
    *   **Bulk Upload**: Import students/staff via CSV with auto-sanitization (strips quotes).
    *   **Bulk Delete**: Remove records via CSV.
    *   **Manual Entry**: Add or edit individual records.
    *   **Scalable List**: Client-side pagination to handle 3000+ records smoothly.
*   **Dashboard & Analytics**:
    *   Live counter for "In-Library" users.
    *   Breakdown of student vs. staff entries.
    *   Visual reports and charts.

## 🛠️ Technology Stack

### Frontend
*   **Framework**: React 18
*   **Build Tool**: Vite
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **State Management**: React Hooks
*   **Icons**: Lucide React
*   **Charts**: Recharts

### Backend
*   **Framework**: Spring Boot 3.2.5
*   **Language**: Java 17
*   **Database**: MySQL
*   **ORM**: JPA / Hibernate
*   **Build Tool**: Maven

## ⚙️ Setup & Installation

### Prerequisites
*   Node.js (v18+)
*   Java JDK 17
*   MySQL Server
*   Maven

### 1. Database Setup
Create a MySQL database named `library_db` and configure your credentials in `backend/src/main/resources/application.properties`.

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/library_db
spring.datasource.username=root
spring.datasource.password=admin
```

### 2. Backend Setup
Navigate to the backend directory and run the Spring Boot application:
```bash
cd backend
mvn spring-boot:run
```
 The server will start on `http://localhost:8080`.

### 3. Frontend Setup
Navigate to the project root, install dependencies, and start the dev server:
```bash
npm install
npm run dev
```
The application will be accessible at `http://localhost:3000` (or `http://localhost:5173`).

## 📂 Project Structure

*   `components/`: Reusable React components (Dashboard, specific feature views).
*   `services/`: API service layer for communicating with the Spring Boot backend.
*   `types/`: TypeScript definitions.
*   `backend/src/main/java/.../controller`: REST coding endpoints.
*   `backend/src/main/java/.../entity`: JPA parsing entities (`LogEntry`, `Student`, `Staff`).

## 🛡️ License
[MIT](LICENSE)
