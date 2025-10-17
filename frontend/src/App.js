import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import MemberList from './components/MemberList';
import PlayerProfile from './components/PlayerProfile';
import Leaderboard from './components/Leaderboard';
import Sidebar from './components/Sidebar';
import AddMembers from './components/AddMembers';
import './App.css';

function App() {
  return (
    <Router basename="/Kravy-website">
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <main className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/profile/:name" element={<PlayerProfile />} />
              {/* These routes are now handled within the Dashboard tabs, but we keep the profile route */}
              <Route path="/members" element={<MemberList />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/admin/add-members" element={<AddMembers />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;

