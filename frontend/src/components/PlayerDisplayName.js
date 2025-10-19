import React from 'react';
import SpecialName from './SpecialNames';
import './PlayerDisplayName.css';

const PlayerDisplayName = ({ member }) => {
  if (!member) {
    return null;
  }

  const displayName = member.display_name || member.name;
  
  // Determine name class based on status
  let nameClass = '';
  if (member.is_grandmaster_ca) {
    nameClass = 'grandmaster-ca-name';
  } else if (member.is_discord_booster) {
    nameClass = 'discord-booster-name';
  }
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {!!member.is_discord_booster && (
        <img 
          src="/discord_booster.png" 
          alt="Discord Booster" 
          title="Discord Booster"
          className="discord-booster-icon"
          style={{ width: '18px', height: '18px' }}
        />
      )}
      <span className={nameClass}>
        <SpecialName name={displayName} />
      </span>
    </div>
  );
};

export default PlayerDisplayName;
