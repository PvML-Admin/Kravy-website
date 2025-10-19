import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardOverview from './admin/DashboardOverview';
import MemberManagement from './admin/MemberManagement';
import SyncManagement from './admin/SyncManagement';
import DataManagement from './admin/DataManagement';
import SystemSettings from './admin/SystemSettings';
import './AdminDashboard.css';

function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Dashboard' },
    { id: 'members', label: 'Members' },
    { id: 'sync', label: 'Sync' },
    { id: 'data', label: 'Data' },
    { id: 'system', label: 'System' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview />;
      case 'members':
        return <MemberManagement />;
      case 'sync':
        return <SyncManagement />;
      case 'data':
        return <DataManagement />;
      case 'system':
        return <SystemSettings />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Admin Dashboard</h1>
          <div className="admin-user-info">
            <span className="admin-user-name">{user?.name}</span>
            <span className="admin-user-role">Administrator</span>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-content">
        {renderTabContent()}
      </div>
    </div>
  );
}

export default AdminDashboard;

