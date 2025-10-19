import React from 'react';
import './DashboardHeader.css';

function DashboardHeader({ clanName = "Kravy" }) {
  // Use a local, static image for the clan banner to guarantee it loads.
  const clanBannerUrl = '/clan_banner.png';

  // Placeholder data - we will connect this to the API later
  const placeholderStats = {
    totalLevel: 3001,
    totalXp: 495802108020,
    members: 499,
    citadelLevel: 7,
    kdr: 2.21,
  };

  return (
    <div className="dashboard-header">
      <div className="clan-info">
        <img src={clanBannerUrl} alt="Clan Banner" className="clan-banner" />
        <div className="clan-name-section">
          <h1>{clanName}</h1>
          <div className="social-media-links">
            <a href="https://discord.gg/kravy" target="_blank" rel="noopener noreferrer" className="social-icon discord" title="Discord">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </a>
            <a href="https://x.com/KravyRS" target="_blank" rel="noopener noreferrer" className="social-icon twitter" title="X (Twitter)">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://www.instagram.com/kravyrs/" target="_blank" rel="noopener noreferrer" className="social-icon instagram" title="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href="https://www.twitch.tv/kravyrs" target="_blank" rel="noopener noreferrer" className="social-icon twitch" title="Twitch">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
              </svg>
            </a>
          </div>
        </div>
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
    </div>
  );
}

export default DashboardHeader;
