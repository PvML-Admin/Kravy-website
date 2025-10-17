import React, { useState } from 'react';
import './DashboardHeader.css';

const TABS = ['About', 'List', 'Hiscore', 'XP tracker', 'XP analytics', 'Clan activities', 'Player activities', 'Competitions'];

function DashboardHeader({ activeTab, onTabChange }) {
  const clanName = "Kravy";
  const [clanStats, setClanStats] = useState(null);

  // Use a local, static image for the clan banner to guarantee it loads.
  const clanBannerUrl = '/clan_banner.png';

  // Placeholder data - we will connect this to the API later
  const placeholderStats = {
    totalLevel: 2995,
    totalXp: 489455492108,
    members: 498,
    citadelLevel: 7,
    kdr: 2.21,
  };

  return (
    <div className="dashboard-header">
      <div className="clan-info">
        <img src={clanBannerUrl} alt="Clan Banner" className="clan-banner" />
        <h1>{clanName}</h1>
      </div>
      {placeholderStats && (
        <div className="clan-stats">
          <div className="stat-item">
            <img src="/icons/total_level.png" alt="Total Level" className="stat-icon" />
            <span className="stat-value">{placeholderStats.totalLevel.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <img src="/icons/xp.png" alt="Total XP" className="stat-icon" />
            <span className="stat-value">{placeholderStats.totalXp.toLocaleString()}</span>
            <span className="stat-label">XP</span>
          </div>
          <div className="stat-item">
            <img src="/icons/members.png" alt="Members" className="stat-icon" />
            <span className="stat-value">{placeholderStats.members.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <img src="/icons/world.png" alt="World" className="stat-icon" />
            <span className="stat-value">{placeholderStats.citadelLevel}</span>
          </div>
          <div className="stat-item">
            <img src="/icons/kills.png" alt="Kills" className="stat-icon" />
            <span className="stat-value">{placeholderStats.kdr}</span>
          </div>
        </div>
      )}
      <nav className="dashboard-nav">
        {TABS.map(tab => (
          <a 
            key={tab}
            href="#" 
            className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onTabChange(tab);
            }}
          >
            {tab}
          </a>
        ))}
      </nav>
    </div>
  );
}

export default DashboardHeader;
