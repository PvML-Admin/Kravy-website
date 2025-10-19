import React from 'react';
import SpecialName from './SpecialNames';
import './PlayerDisplayName.css';

const PlayerDisplayName = ({ member }) => {
  if (!member) {
    return null;
  }

  const displayName = member.display_name || member.name;
  
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
      <span className={member.is_discord_booster ? 'discord-booster-name' : ''}>
        <SpecialName name={displayName} />
      </span>
    </div>
  );
};

export default PlayerDisplayName;
