import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { membersAPI } from '../services/api';
import { getSkillIcon, skillOrder } from '../utils/skills';
import SpecialName from './SpecialNames';
import './ClanHiscores.css';

// Custom hook for sorting
const useSortableData = (items, config = null) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};


function ClanHiscores() {
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [selectedSkill, setSelectedSkill] = useState('Overall');
  const [xpBrackets, setXpBrackets] = useState(null);
  const [selectedBracket, setSelectedBracket] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const bracketLabels = {
    lessThan1b: '<1B',
    '1b': '1B+',
    '2b': '2B+',
    '3b': '3B+',
    '4b': '4B+',
    '5b': '5B+',
    max: 'MAX XP'
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [allMembersResponse, bracketsResponse] = await Promise.all([
          membersAPI.getAllHiscores(),
          membersAPI.getHiscoresXpBrackets()
        ]);
        setAllMembers(allMembersResponse.data.members);
        setXpBrackets(bracketsResponse.data.brackets);
      } catch (err) {
        setError(err.response?.data?.error || 'An unknown error occurred while loading hiscores.');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const filteredMembers = useMemo(() => {
    if (!allMembers.length) {
      return [];
    }

    const xpConditions = {
      lessThan1b: (xp) => xp < 1000000000,
      '1b': (xp) => xp >= 1000000000 && xp < 2000000000,
      '2b': (xp) => xp >= 2000000000 && xp < 3000000000,
      '3b': (xp) => xp >= 3000000000 && xp < 4000000000,
      '4b': (xp) => xp >= 4000000000 && xp < 5000000000,
      '5b': (xp) => xp >= 5000000000 && xp < 5800000000,
      max: (xp) => xp >= 5800000000,
    };

    let bracketFiltered = allMembers;
    if (selectedBracket && xpConditions[selectedBracket]) {
      bracketFiltered = allMembers.filter(member => xpConditions[selectedBracket](member.total_xp));
    }

    let skillTransformed;
    if (selectedSkill !== 'Overall') {
      skillTransformed = bracketFiltered.map(member => {
        const skillData = member.skills.find(s => s.skill_name === selectedSkill);
        return {
          ...member,
          total_xp: skillData ? skillData.xp : 0,
          total_rank: skillData ? skillData.rank : null,
          total_level: skillData ? skillData.level : 0,
        };
      }).filter(member => member.total_rank !== null);
    } else {
      skillTransformed = bracketFiltered.filter(member => member.total_rank !== null);
    }
    
    if (searchTerm) {
      return skillTransformed.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return skillTransformed;
  }, [allMembers, selectedSkill, selectedBracket, searchTerm]);
  
  const { items: sortedMembers, requestSort, sortConfig } = useSortableData(filteredMembers, { key: 'total_rank', direction: 'ascending' });
  
  const formatXp = (xp) => {
    if (!xp) return '0';
    // Convert to number if it's a string (PostgreSQL BIGINT returns as string)
    const numXp = typeof xp === 'string' ? parseInt(xp) : xp;
    return numXp.toLocaleString();
  };

  const getSortDirectionClass = (name) => {
    if (!sortConfig) return;
    return sortConfig.key === name ? sortConfig.direction : undefined;
  };

  if (loading) return <div className="loading">Loading Hiscores...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="hiscores-container">
      <div className="hiscores-title">
        <h2>Clan Hiscores</h2>
        <div className="hiscores-search">
          <input
            type="text"
            placeholder="Search for a player..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="card">
        <div className="hiscores-filters">
          {skillOrder.map(skill => (
            <div 
              key={skill}
              className={`skill-icon-wrapper ${selectedSkill === skill ? 'active' : ''}`}
              onClick={() => setSelectedSkill(skill)}
            >
              <img 
                src={getSkillIcon(skill)} 
                alt={skill}
                title={skill}
                className="skill-icon"
              />
            </div>
          ))}
        </div>
        <div className="hiscores-divider"></div>
        <div className="xp-brackets-filter">
          <button 
            className={`bracket-btn ${selectedBracket === null ? 'active' : ''}`}
            onClick={() => setSelectedBracket(null)}
          >
            Overall
          </button>
          {xpBrackets && Object.entries(xpBrackets).map(([bracket, count]) => (
            <button 
              key={bracket}
              className={`bracket-btn ${selectedBracket === bracket ? 'active' : ''}`}
              onClick={() => setSelectedBracket(bracket)}
            >
              {bracketLabels[bracket]} <span className="bracket-count">{count}</span>
            </button>
          ))}
        </div>
        <table className="table hiscores-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th onClick={() => requestSort('total_level')} className={`sortable ${getSortDirectionClass('total_level')}`}>
                Level
              </th>
              <th onClick={() => requestSort('total_rank')} className={`sortable ${getSortDirectionClass('total_rank')}`}>
                Rank
              </th>
              <th onClick={() => requestSort('total_xp')} className={`sortable ${getSortDirectionClass('total_xp')}`}>
                XP
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member, index) => (
              <tr key={member.id} onClick={() => navigate(`/profile/${encodeURIComponent(member.name)}`)}>
                <td>{index + 1}</td>
                <td className="member-name-cell">
                  <img 
                    src={member.avatar_url} 
                    alt={member.name} 
                    className="member-avatar"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <span><SpecialName name={member.display_name || member.name} /></span>
                </td>
                <td>{member.total_level || 'N/A'}</td>
                <td>
                  {member.is_active ? (
                    member.total_rank || 'N/A'
                  ) : (
                    <span className="inactive-tag">INACTIVE</span>
                  )}
                </td>
                <td>{formatXp(member.total_xp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ClanHiscores;
