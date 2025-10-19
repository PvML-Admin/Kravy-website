import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { membersAPI, activitiesAPI } from '../services/api';
import { getSkillIcon, skillOrder } from '../utils/skills';
import { formatDateBST, formatRelativeTimeBST } from '../utils/dateFormatter';
import SpecialName from './SpecialNames';

// Format skill XP text to be more readable
function formatActivityText(text) {
  // Match patterns like "106000000XP in Attack"
  const xpPattern = /(\d+)(XP\s+in\s+)/i;
  return text.replace(xpPattern, (match, number, rest) => {
    // Add commas to the number
    const formattedNumber = parseInt(number).toLocaleString();
    // Add space between number and XP
    return `${formattedNumber} ${rest}`;
  });
}

function PlayerProfile() {
  const { name: memberName } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [isShortScreen, setIsShortScreen] = useState(window.innerHeight < 1080);

  useEffect(() => {
    const handleResize = () => {
      setIsShortScreen(window.innerHeight < 1080);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberName]);

  const loadMemberData = async (memberId) => {
    try {
      const [statsResponse, activitiesResponse] = await Promise.all([
        membersAPI.getStats(memberId, 'weekly'),
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
      // Trigger sync (non-blocking on backend)
      const syncResponse = await membersAPI.sync(memberId);
      console.log(syncResponse.data.message);
      
      // Wait for sync to complete (give it time to fetch from APIs)
      // Typical sync takes 3-5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
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

  const formatRank = (rank) => {
    if (!rank || rank === 0) return '--';
    return parseInt(rank).toLocaleString('en-US');
  };

  const sortSkillsByOrder = (skills) => {
    return [...skills].sort((a, b) => {
      const indexA = skillOrder.indexOf(a.skill_name);
      const indexB = skillOrder.indexOf(b.skill_name);
      return indexA - indexB;
    });
  };

  const formatActivityDate = (timestamp) => {
    return formatRelativeTimeBST(timestamp);
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

  // Check if player has Max Cape (99 in all skills)
  const hasMaxCape = (skills) => {
    if (!skills || skills.length === 0) return false;
    // Check if all skills (excluding Overall) have level 99 or higher
    return skills.every(skill => skill.level >= 99);
  };

  // Check if player has Master Max Cape (120 in all skills = 104,273,167 XP each)
  const hasMasterMaxCape = (skills) => {
    if (!skills || skills.length === 0) return false;
    const MASTER_XP = 104273167;
    // Check if all skills have 104,273,167+ XP
    return skills.every(skill => skill.xp >= MASTER_XP);
  };

  // Get cape badge to display (Master Max takes priority over Max)
  const getCapeAchievement = (skills) => {
    if (hasMasterMaxCape(skills)) {
      return {
        name: 'Master Max Cape',
        icon: 'https://runescape.wiki/images/Master_max_cape_detail.png',
        color: '#FFD700' // Gold color
      };
    } else if (hasMaxCape(skills)) {
      return {
        name: 'Max Cape',
        icon: 'https://runescape.wiki/images/Max_cape_detail.png',
        color: '#4a90e2' // Blue color
      };
    }
    return null;
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

  const cappedCombatLevel = member.combat_level > 152 ? 152 : member.combat_level;

  const tableStyles = {
    fontSize: isShortScreen ? '0.8rem' : '0.9rem',
    headerPadding: isShortScreen ? '6px 8px' : '12px 8px',
    cellPadding: isShortScreen ? '4px 8px' : '10px 8px',
    overallCellPadding: isShortScreen ? '6px 8px' : '12px 8px'
  };

  return (
    <div>
      {/* Header Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                <SpecialName name={member.display_name || member.name} />
                {isSyncing && <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginLeft: '10px' }}> (Syncing...)</span>}
              </h2>
              <div style={{ display: 'flex', gap: '20px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                <span>Combat Level: <strong>{cappedCombatLevel || 0}</strong></span>
                <span>Total XP: <strong>{formatXp(member.total_xp)} XP</strong></span>
                {member.total_rank && (
                  <span>Overall Rank: <strong>#{formatRank(member.total_rank)}</strong></span>
                )}
              </div>
              {member.joined_at && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                  Joined: {formatDateBST(member.joined_at)}
                </div>
              )}
            </div>
          </div>

          {/* Cape Achievement Badge */}
          {stats && stats.skills && (() => {
            const capeAchievement = getCapeAchievement(stats.skills);
            return capeAchievement ? (
              <div
                title={capeAchievement.name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '15px',
                  backgroundColor: 'var(--primary-light)',
                  borderRadius: '8px',
                  cursor: 'help'
                }}
              >
                <img 
                  src={capeAchievement.icon}
                  alt={capeAchievement.name}
                  style={{ 
                    width: '64px', 
                    height: '64px',
                    objectFit: 'contain',
                    filter: `drop-shadow(0 0 6px ${capeAchievement.color}80)`
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '600',
                  color: capeAchievement.color,
                  textAlign: 'center',
                  textShadow: `0 0 8px ${capeAchievement.color}40`
                }}>
                  {capeAchievement.name}
                </div>
              </div>
            ) : null;
          })()}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', maxHeight: 'calc(100vh - 200px)' }}>
        {/* Skills Table */}
        <div className="card" style={{ flex: '2', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Skills</h3>
          </div>
          
          {stats.skills && stats.skills.length > 0 ? (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table className="table" style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: tableStyles.fontSize
              }}>
                <thead>
                  <tr style={{ 
                    borderBottom: '2px solid var(--border-color)',
                    textAlign: 'left'
                  }}>
                    <th style={{ padding: tableStyles.headerPadding, fontWeight: '600' }}>Skill</th>
                    <th style={{ padding: tableStyles.headerPadding, fontWeight: '600', textAlign: 'center' }}>Level</th>
                    <th style={{ padding: tableStyles.headerPadding, fontWeight: '600', textAlign: 'right' }}>Rank</th>
                    <th style={{ padding: tableStyles.headerPadding, fontWeight: '600', textAlign: 'right' }}>XP Gain</th>
                    <th style={{ padding: tableStyles.headerPadding, fontWeight: '600', textAlign: 'right' }}>XP</th>
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
                    <td style={{ padding: tableStyles.overallCellPadding }}>
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
                    <td style={{ padding: tableStyles.overallCellPadding, textAlign: 'center', color: 'var(--accent-blue)', fontWeight: '600', fontSize: '1rem' }}>
                      {stats.skills.reduce((sum, skill) => sum + (skill.level || 0), 0)}
                    </td>
                    <td style={{ padding: tableStyles.overallCellPadding, textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {formatRank(member.total_rank)}
                    </td>
                    <td style={{ padding: tableStyles.overallCellPadding, textAlign: 'right', fontWeight: '600', color: getXpGainColor(stats.skills.reduce((sum, skill) => sum + (skill.xp_gain || 0), 0)) }}>
                      {formatXpGain(stats.skills.reduce((sum, skill) => sum + (skill.xp_gain || 0), 0))}
                    </td>
                    <td style={{ padding: tableStyles.overallCellPadding, textAlign: 'right', fontWeight: '600' }}>
                      {formatXp(member.total_xp)}
                    </td>
                  </tr>
                  
                  {sortSkillsByOrder(stats.skills).map((skill, index) => (
                    <tr 
                      key={skill.skill_name}
                    >
                      <td style={{ padding: tableStyles.cellPadding }}>
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
                        padding: tableStyles.cellPadding, 
                        textAlign: 'center'
                      }}>
                        <span style={{
                          fontWeight: '600',
                          fontSize: '0.95rem'
                        }}>
                          {skill.level}
                        </span>
                      </td>
                      <td style={{ padding: tableStyles.cellPadding, textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {formatRank(skill.rank)}
                      </td>
                      <td style={{ padding: tableStyles.cellPadding, textAlign: 'right', fontWeight: '500', color: getXpGainColor(skill.xp_gain) }}>
                        {formatXpGain(skill.xp_gain)}
                      </td>
                      <td style={{ padding: tableStyles.cellPadding, textAlign: 'right', fontWeight: '500' }}>
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

        {/* Recent Activities Card */}
        <div className="card" style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px' }}>Recent Activities</h3>
          
          {activities.length > 0 ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {activities.map((activity, index) => (
                <React.Fragment key={index}>
                  <div
                    style={{
                      padding: '10px',
                      backgroundColor: 'var(--primary-light)',
                      borderRadius: '6px',
                      borderLeft: '3px solid var(--accent-blue)'
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                      {formatActivityText(activity.details || activity.text)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {formatActivityDate(activity.activity_date)}
                    </div>
                  </div>
                  {index < activities.length - 1 && (
                    <div style={{ 
                      height: '1px', 
                      backgroundColor: 'var(--border-color)',
                      margin: '10px 0'
                    }}></div>
                  )}
                </React.Fragment>
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

