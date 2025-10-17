import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { membersAPI, activitiesAPI } from '../services/api';
import { getSkillIcon, skillOrder } from '../utils/skills';

function PlayerProfile() {
  const { name: memberName } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');

  useEffect(() => {
    const initialSync = async () => {
      try {
        setLoading(true);
        // First, load the initial data for the member to get their ID
        const memberResponse = await membersAPI.getByName(memberName);
        const memberData = memberResponse.data.member;
        setMember(memberData);

        // Now that we have the member, we can load their stats
        await loadMemberData(memberData.id);

        // And trigger the background sync
        handleSync(memberData.id);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    initialSync();
  }, [memberName]);

  const loadMemberData = async (memberId) => {
    try {
      const [statsResponse, activitiesResponse] = await Promise.all([
        membersAPI.getStats(memberId, selectedPeriod),
        activitiesAPI.getMemberActivities(memberName).catch(() => ({ data: { activities: [] } }))
      ]);
      
      setStats(statsResponse.data.stats);
      setActivities(activitiesResponse.data.activities || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleSync = async (memberId) => {
    try {
      setIsSyncing(true);
      await membersAPI.sync(memberId);
      // After syncing, we need to re-fetch the member to get the updated top-level stats (like total xp)
      // And then re-fetch the detailed stats.
      const memberResponse = await membersAPI.getByName(memberName);
      setMember(memberResponse.data.member);
      await loadMemberData(memberId); // Reload all data after sync
    } catch (err) {
      console.error("Background sync failed:", err.response?.data?.error || err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatXp = (xp) => {
    if (!xp) return '0';
    return parseInt(xp).toLocaleString('en-US');
  };

  const formatXpShort = (xp) => {
    if (!xp) return '0';
    if (xp >= 1000000000) return `${(xp / 1000000000).toFixed(2)}B`;
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(2)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(2)}K`;
    return xp.toLocaleString();
  };

  const formatRank = (rank) => {
    if (!rank || rank === 0) return '--';
    return parseInt(rank).toLocaleString('en-US');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const sortSkillsByOrder = (skills) => {
    return [...skills].sort((a, b) => {
      const indexA = skillOrder.indexOf(a.skill_name);
      const indexB = skillOrder.indexOf(b.skill_name);
      return indexA - indexB;
    });
  };

  const getActivityIcon = (text) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('level') || lowerText.includes('levelled')) {
      return 'https://runescape.wiki/images/Level_up_icon.png';
    }
    if (lowerText.includes('quest')) {
      return 'https://runescape.wiki/images/Quest_icon.png';
    }
    if (lowerText.includes('clue') || lowerText.includes('treasure')) {
      return 'https://runescape.wiki/images/Treasure_Trails_icon.png';
    }
    if (lowerText.includes('achievement') || lowerText.includes('unlocked')) {
      return 'https://runescape.wiki/images/Achievement_icon.png';
    }
    if (lowerText.includes('found') || lowerText.includes('received') || lowerText.includes('drop')) {
      return 'https://runescape.wiki/images/Rare_drop_symbol.png';
    }
    return 'https://runescape.wiki/images/RuneScape_icon.png';
  };

  const formatActivityDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const formatXpGain = (xpGain) => {
    if (xpGain > 0) {
      return `+${xpGain.toLocaleString()}`;
    }
    return xpGain?.toLocaleString() || '0';
  };

  const getXpGainColor = (xpGain) => {
    if (xpGain > 0) return 'var(--accent-green)';
    if (xpGain < 0) return 'var(--accent-red)';
    return 'var(--text-secondary)';
  };

  if (loading && !stats) { // Only show full-page loader on initial load
    return (
      <div className="card">
        <p>Loading player profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3>Error</h3>
        <div className="error">{error}</div>
        <button onClick={() => navigate('/members')} className="btn btn-secondary" style={{ marginTop: '10px' }}>
          Back to Members
        </button>
      </div>
    );
  }

  if (!member || !stats) {
    return (
      <div className="card">
        <p>Member not found</p>
        <button onClick={() => navigate('/members')} className="btn btn-secondary">
          Back to Members
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => navigate('/members')} 
          className="btn btn-secondary"
          style={{ marginBottom: '15px', fontSize: '0.9rem' }}
        >
          ← Back to Members
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img 
              src={`http://secure.runescape.com/m=avatar-rs/${encodeURIComponent(member.name)}/chat.png`}
              alt={`${member.display_name || member.name}'s avatar`}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '3px solid var(--primary-light)'
              }}
              onError={(e) => {
                // Fallback to a default or hide if avatar fails to load
                e.target.style.display = 'none';
              }}
            />

            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 5px 0' }}>
                {member.display_name || member.name}
                {isSyncing && <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '10px' }}> (Syncing...)</span>}
              </h2>
              <div style={{ display: 'flex', gap: '20px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                <span>Combat Level: <strong>{member.combat_level || 0}</strong></span>
                <span>Total XP: <strong>{formatXp(member.total_xp)} XP</strong></span>
                {member.total_rank && (
                  <span>Overall Rank: <strong>#{formatRank(member.total_rank)}</strong></span>
                )}
              </div>
              {member.joined_at && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                  Joined: {new Date(member.joined_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px',
          marginTop: '20px'
        }}>
          <div style={{ 
            padding: '15px', 
            backgroundColor: 'var(--primary-light)', 
            borderRadius: '6px',
            borderLeft: '4px solid var(--accent-green)'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Last Active</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>
              {member.last_xp_gain ? formatDate(member.last_xp_gain) : 'No XP gain recorded'}
            </div>
          </div>
        </div>
      </div>

      {/* Skills Table - RunePixels Style */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>Skills</h3>
        </div>
        
        {stats.skills && stats.skills.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '0.9rem'
            }}>
              <thead>
                <tr style={{ 
                  borderBottom: '2px solid var(--border-color)',
                  textAlign: 'left'
                }}>
                  <th style={{ padding: '12px 8px', fontWeight: '600' }}>Skill</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'center' }}>Level</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right' }}>Rank</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right' }}>XP Gain</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right' }}>XP</th>
                </tr>
              </thead>
              <tbody>
                {/* Overall Row */}
                <tr 
                  style={{ 
                    borderBottom: '2px solid var(--border-color)',
                    fontWeight: '600'
                  }}
                >
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img 
                        src="https://cdn.discordapp.com/emojis/632752142113046528.webp?size=96&animated=true" 
                        alt="Overall"
                        style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none'; console.error(`Failed to load icon: ${e.target.src}`); }}
                      />
                      <span style={{ fontWeight: '600' }}>Overall</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--accent-blue)', fontWeight: '600', fontSize: '1rem' }}>
                    {stats.skills.reduce((sum, skill) => sum + (skill.level || 0), 0)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {formatRank(member.total_rank)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: getXpGainColor(stats.skills.reduce((sum, skill) => sum + (skill.xp_gain || 0), 0)) }}>
                    {formatXpGain(stats.skills.reduce((sum, skill) => sum + (skill.xp_gain || 0), 0))}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>
                    {formatXp(member.total_xp)}
                  </td>
                </tr>
                
                {sortSkillsByOrder(stats.skills).map((skill, index) => (
                  <tr 
                    key={skill.skill_name}
                  >
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img 
                          src={getSkillIcon(skill.skill_name)} 
                          alt={skill.skill_name}
                          style={{ 
                            width: '20px', 
                            height: '20px',
                            objectFit: 'contain'
                          }}
                          onError={(e) => { e.target.style.display = 'none'; console.error(`Failed to load icon for ${skill.skill_name}: ${e.target.src}`); }}
                        />
                        <span style={{ fontWeight: '500' }}>{skill.skill_name}</span>
                      </div>
                    </td>
                    <td style={{ 
                      padding: '10px 8px', 
                      textAlign: 'center'
                    }}>
                      <span style={{
                        fontWeight: '600',
                        fontSize: '0.95rem'
                      }}>
                        {skill.level}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {formatRank(skill.rank)}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '500', color: getXpGainColor(skill.xp_gain) }}>
                      {formatXpGain(skill.xp_gain)}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '500' }}>
                      {formatXp(skill.xp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
            No skill data available. Sync this player to fetch their stats.
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>

        {/* Recent Activities Card */}
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Recent Activities</h3>
          
          {activities.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '600px', overflowY: 'auto' }}>
              {activities.map((activity, index) => (
                <div
                  key={index}
                  style={{
                    padding: '10px',
                    backgroundColor: 'var(--primary-light)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    borderLeft: '3px solid var(--accent-blue)'
                  }}
                >
                  <img 
                    src={getActivityIcon(activity.text)} 
                    alt="Activity"
                    style={{ 
                      width: '24px', 
                      height: '24px',
                      marginTop: '2px',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                      {activity.details || activity.text}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {formatActivityDate(activity.date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px', fontSize: '0.9rem' }}>
              No recent activities found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlayerProfile;

