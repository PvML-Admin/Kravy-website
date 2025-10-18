import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import MemberList from './components/MemberList';
import PlayerProfile from './components/PlayerProfile';
import Leaderboard from './components/Leaderboard';
import ClanHiscores from './components/ClanHiscores';
import AddMembers from './components/AddMembers';
import Navbar from './components/Navbar';
import PlaceholderPage from './components/PlaceholderPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <div className="main-content">
          <Navbar />
          <main className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/members" element={<MemberList />} />
              <Route path="/hiscore" element={<ClanHiscores />} />
              <Route path="/xp-tracker" element={<Leaderboard />} />
              <Route path="/competitions" element={<PlaceholderPage title="Competitions" />} />
              <Route path="/profile/:name" element={<PlayerProfile />} />
              <Route path="/admin/add-members" element={<AddMembers />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;

