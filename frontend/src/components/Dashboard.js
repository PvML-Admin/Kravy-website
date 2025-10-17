import React, { useState } from 'react';
import DashboardHeader from './DashboardHeader';
import ClanActivitiesGrid from './ClanActivitiesGrid';
import HighestRanks from './HighestRanks';
import About from './About';
import TodayXP from './TodayXP';
import Activity from './Activity';
import './Dashboard.css';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('about');

  const renderContent = () => {
    switch (activeTab) {
      case 'about':
        return (
          <div className="dashboard-grid">
            <div className="grid-column">
              <HighestRanks />
              <Activity />
            </div>
            <div className="grid-column-large">
              <About />
              <ClanActivitiesGrid />
            </div>
            <div className="grid-column">
              <TodayXP />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <DashboardHeader activeTab={activeTab} onTabChange={setActiveTab} />
      {renderContent()}
    </div>
  );
}

export default Dashboard;

