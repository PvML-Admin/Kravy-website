import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { membersAPI } from '../services/api';
import SpecialName from './SpecialNames';
import './HighestRanks.css';

function HighestRanks() {
  const [highestRanks, setHighestRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHighestRanks = async () => {
      try {
        setLoading(true);
        const response = await membersAPI.getAll(true);
        const allMembers = response.data.members;

        const desiredRanks = ['Owner', 'Deputy Owner', 'Overseer'];
        const highestRankMembers = allMembers
          .filter(member => desiredRanks.includes(member.clan_rank))
          .sort((a, b) => 
            (a.display_name || a.name).localeCompare(b.display_name || b.name)
          );
        
        setHighestRanks(highestRankMembers);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load highest ranks.');
      } finally {
        setLoading(false);
      }
    };
    fetchHighestRanks();
  }, []);

  if (loading) return <div>Loading ranks...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="card">
      <h2>Clan Owners</h2>
      <ul className="highest-ranks-list">
        {highestRanks.map(member => (
          <li key={member.id} onClick={() => navigate(`/profile/${encodeURIComponent(member.name)}`)}>
            <img 
              src={`http://services.runescape.com/m=avatar-rs/${encodeURIComponent(member.name)}/chat.png`} 
              alt={member.display_name || member.name} 
              className="player-avatar"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <span className="member-name" style={{ color: member.rank_color }}>
              <SpecialName name={member.display_name || member.name} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default HighestRanks;
