# Nepal Election Live Vote Counter

A real-time vote counting application for monitoring and tracking election results for Nepal's House of Representatives general election on March 5, 2026.

## Description

This full-stack web application provides live tracking of Nepal's parliamentary election results. It displays real-time vote counts and seat tallies across 275 parliamentary seats (165 FPTP constituency seats + 110 PR seats) with automatic updates every 30 seconds.

## Features

- **Live Leaderboard**: Real-time seat count per party (FPTP + PR combined)
- **Progress Tracking**: Visual progress bar showing declared vs. total seats (275)
- **Constituency Results Table**: Searchable and filterable results by province
- **Party Color Coding**: Distinct colors for major parties (NC, CPN-UML, NCP, RSP)
- **Last Updated Timestamp**: Shows freshness of data
- **Mobile Responsive Design**: Fully optimized for desktop and mobile
- **WebSocket Updates**: Automatic frontend updates without page refresh
- **Data Snapshots**: SQLite database stores results every 30 seconds

## Major Parties

- Nepali Congress (NC)
- CPN-UML
- Nepali Communist Party (NCP)
- Rastriya Swatantra Party (RSP)

## Tech Stack

- **Frontend**: React + TypeScript, Tailwind CSS, Vite
- **Backend**: Python + FastAPI
- **Database**: SQLite
- **Real-time**: WebSockets
- **Scraping**: Playwright (for result.election.gov.np)

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Python 3.8+
- pip

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/Scripts/activate  # Windows
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run FastAPI server:
```bash
uvicorn main:app --reload
```

## Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SummaryCards.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── SeatShareBars.tsx
│   │   │   └── ConstituencyTable.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── mockData.ts
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.ts
├── backend/
│   ├── scraper.py
│   ├── main.py
│   └── database.py
└── README.md
```

## Usage

1. Start the backend server
2. Start the frontend development server
3. Open http://localhost:5173 in your browser
4. Results update automatically every 30 seconds via WebSocket

## Data Source

Official results: https://result.election.gov.np

## Build Order

1. ✅ React frontend UI with mock data
2. ⏳ FastAPI backend with SQLite database
3. ⏳ Playwright scraper
4. ⏳ WebSocket integration

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or suggestions, please create an issue on the GitHub repository.

## Disclaimer

This application is designed for legitimate election monitoring and educational purposes only. It is not affiliated with Nepal's Election Commission. Unauthorized access or manipulation of official election data is illegal.