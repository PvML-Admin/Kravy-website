import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './BingoActivity.css';

function BingoActivity({ boardId, selectedTeam, user }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBingoActivities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/bingo/boards/${boardId}/completions`);
      const data = response.data;
      let completions = data.completions || [];

      // Filter by team if selected
      if (selectedTeam) {
        completions = completions.filter(completion => 
          completion.team_id === selectedTeam.id
        );
      }

      // Sort by completion date (most recent first)
      completions = completions.sort((a, b) => 
        new Date(b.completed_at) - new Date(a.completed_at)
      );

      setActivities(completions);
      setError(null);
    } catch (err) {
      console.error('Error loading bingo activities:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [boardId, selectedTeam]);

  useEffect(() => {
    if (boardId) {
      loadBingoActivities();
    }
  }, [boardId, loadBingoActivities]);

  const formatActivityDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London'
    });
  };

  const getActivityText = (completion) => {
    const memberName = completion.completed_by || completion.member_display_name || completion.guest_display_name || 'Unknown';
    
    // For manual completions, just show the bingo square
    if (!completion.activity_text) {
      return `${memberName} completed "${completion.item_name}"`;
    }
    
    // Only show actual item for "Any [Item Type]" bingo squares
    const isAnyItemSquare = completion.item_name && completion.item_name.toLowerCase().startsWith('any ');
    
    if (isAnyItemSquare) {
      // For "Any Item" squares, extract the actual item from activity text
      const actualItem = extractItemFromActivity(completion.activity_text);
      if (actualItem) {
        return `${memberName} completed "${completion.item_name}" (${actualItem})`;
      }
    }
    
    return `${memberName} completed "${completion.item_name}"`;
  };

  const extractItemFromActivity = (activityText) => {
    if (!activityText) return null;
    
    // Common patterns in RuneMetrics activity text
    const patterns = [
      /I received a drop: (.+)/i,
      /I received (.+) as a drop/i,
      /I found (.+)/i,
      /I got (.+)/i,
      /(.+) has been added to your bank/i
    ];
    
    for (const pattern of patterns) {
      const match = activityText.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  };

  const getRuneMetricsUrl = (memberName) => {
    if (!memberName) return null;
    
    // Format: https://apps.runescape.com/runemetrics/app/overview/player/PlayerName
    const encodedName = encodeURIComponent(memberName.replace(/ /g, '%20'));
    return `https://apps.runescape.com/runemetrics/app/overview/player/${encodedName}`;
  };

  const handleActivityClick = (completion) => {
    const memberName = completion.completed_by || completion.member_display_name || completion.guest_display_name;
    if (memberName) {
      const url = getRuneMetricsUrl(memberName);
      if (url) {
        window.open(url, '_blank');
      }
    }
  };

  const getTeamColor = (completion) => {
    return completion.team_color || '#2d9596';
  };

  if (loading) {
    return (
      <div className="bingo-activity">
        <h3>Bingo Activity</h3>
        <div className="activity-loading">
          <div className="loading-spinner"></div>
          <p>Loading activity...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bingo-activity">
        <h3>Bingo Activity</h3>
        <div className="activity-error">
          <p>Failed to load bingo activity: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bingo-activity">
      <h3>
        {selectedTeam ? `${selectedTeam.team_name} Activity` : 'Bingo Activity'}
      </h3>
      
      {activities.length > 0 ? (
        <div className="activity-list">
          {activities.map((completion, index) => (
            <React.Fragment key={`${completion.id}-${index}`}>
              <div 
                className="activity-item clickable-activity"
                onClick={() => handleActivityClick(completion)}
                title={`Click to view ${completion.completed_by || completion.member_display_name || completion.guest_display_name}'s RuneMetrics`}
              >
                <div 
                  className="activity-indicator"
                  style={{ backgroundColor: getTeamColor(completion) }}
                ></div>
                <div className="activity-content">
                  <div className="activity-text">
                    {getActivityText(completion)}
                  </div>
                  <div className="activity-details">
                    <span className="team-name" style={{ color: getTeamColor(completion) }}>
                      {completion.team_name}
                    </span>
                    <span className="activity-separator">•</span>
                    <span className="activity-square-position">
                      ({completion.row_number},{completion.column_number})
                    </span>
                    {!completion.activity_id && (
                      <>
                        <span className="activity-separator">•</span>
                        <span className="manual-completion-badge">
                          Admin manual Add
                        </span>
                      </>
                    )}
                  </div>
                  <div className="activity-date">
                    {formatActivityDate(completion.completed_at)}
                  </div>
                </div>
              </div>
              {index < activities.length - 1 && (
                <div className="activity-separator-line"></div>
              )}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="no-activity">
          <p>
            {selectedTeam 
              ? `No completions yet for ${selectedTeam.team_name}` 
              : 'No bingo completions yet'
            }
          </p>
        </div>
      )}
    </div>
  );
}

export default BingoActivity;
