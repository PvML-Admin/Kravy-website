import React from 'react';
import './SpecialNames.css';

// Configuration for special user effects
const SPECIAL_USERS = {
  xtrasparkles: {
    type: 'sparkle',
    gradient: 'linear-gradient(45deg, #ff00ff, #ff1493, #ff00ff)',
    particleCount: 12,
    particleColor: 'white'
  },
  catty: {
    type: 'glow',
    gradient: 'linear-gradient(90deg, #ffb3d9, #ffc0e0, #ffd6eb)',
    particleCount: 0,
    particleColor: ''
  },
  cardiooo: {
    type: 'lightning',
    gradient: 'linear-gradient(90deg, #00d4ff, #0099ff, #0066ff)',
    particleCount: 15,
    particleColor: 'rgba(0, 212, 255, 1)'
  },
  'petty seth': {
    type: 'pulse',
    gradient: 'linear-gradient(90deg, #ff0000, #cc0000, #660000, #000000)',
    particleCount: 12,
    particleColor: 'rgba(255, 68, 68, 0.8)'
  },
  craftking28: {
    type: 'smoke',
    gradient: 'linear-gradient(90deg, #7a8a8c, #8fbc8f, #a8d5ba)',
    particleCount: 12,
    particleColor: 'rgba(120, 120, 120, 0.3)'
  },
  zarakynel: {
    type: 'darkstars',
    gradient: 'linear-gradient(90deg, #4a1f5c, #5d2a72, #3d1650)',
    particleCount: 0,
    particleColor: '#1a1a1a'
  }
};

function SpecialName({ name }) {
  const lowerName = name.toLowerCase();
  const userConfig = SPECIAL_USERS[lowerName];

  if (!userConfig) {
    return name;
  }

  // Generate particles based on type
  const particles = Array.from({ length: userConfig.particleCount }, (_, i) => {
    if (userConfig.type === 'flame') {
      // Position flames along the bottom as an underline
      return {
        id: i,
        left: `${(i / (userConfig.particleCount - 1)) * 100}%`,
        delay: `${i * 0.3}s`,
        duration: `${2.5 + Math.random() * 0.5}s`
      };
    } else if (userConfig.type === 'lightning') {
      // Position lightning bolts around the text
      return {
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${1.5 + Math.random() * 0.5}s`
      };
    } else if (userConfig.type === 'pulse') {
      // Position pulse particles around the text
      return {
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2.5}s`,
        duration: `${2 + Math.random() * 1}s`
      };
    } else if (userConfig.type === 'shimmer') {
      // Position shimmer particles in a wave pattern
      return {
        id: i,
        left: `${(i / userConfig.particleCount) * 120 - 10}%`,
        top: `${30 + Math.sin(i) * 20}%`,
        delay: `${i * 0.4}s`,
        duration: `${3 + Math.random() * 0.5}s`
      };
    } else if (userConfig.type === 'smoke') {
      // Position smoke particles to drift from left to right
      return {
        id: i,
        left: `-10%`,
        top: `${Math.random() * 80 + 10}%`,
        delay: `${i * 0.5}s`,
        duration: `${4 + Math.random() * 2}s`
      };
    } else if (userConfig.type === 'darkstars') {
      // Position dark stars along the top edge only
      const total = userConfig.particleCount;
      const position = i / total;
      
      // Distribute all stars along the top edge
      const left = `${position * 100}%`;
      const top = '-8px';
      
      return {
        id: i,
        left: left,
        top: top,
        delay: `${Math.random() * 16}s`, // Completely random delay across 16 seconds
        duration: `3s`
      };
    } else {
      // Random positions for sparkles
      return {
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${2 + Math.random() * 2}s`
      };
    }
  });

  // Determine text class based on type
  let textClass = 'special-name-text';
  if (userConfig.type === 'lightning') textClass += ' lightning-glow';
  if (userConfig.type === 'pulse') textClass += ' pulse-glow';
  if (userConfig.type === 'glow') textClass += ' simple-glow';
  if (userConfig.type === 'shimmer') textClass += ' shimmer-glow';
  if (userConfig.type === 'smoke') textClass += ' smoke-glow';
  if (userConfig.type === 'darkstars') textClass += ' darkstars-glow glitch-effect';

  return (
    <span className="special-name-wrapper">
      <span 
        className={textClass}
        style={{
          background: userConfig.gradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
        data-text={name}
      >
        {name}
      </span>
      {userConfig.particleCount > 0 && (
        <span className={`particles-container ${userConfig.type}-container`}>
          {particles.map(particle => {
            let className = 'sparkle';
            if (userConfig.type === 'flame') className = 'flame';
            if (userConfig.type === 'lightning') className = 'lightning';
            if (userConfig.type === 'pulse') className = 'pulse-particle';
            if (userConfig.type === 'shimmer') className = 'shimmer-particle';
            if (userConfig.type === 'smoke') className = 'smoke-particle';
            if (userConfig.type === 'darkstars') className = 'darkstar';
            
            return (
              <span
                key={particle.id}
                className={className}
                style={{
                  left: particle.left,
                  top: particle.top,
                  animationDelay: particle.delay,
                  animationDuration: particle.duration,
                  backgroundColor: (userConfig.type === 'flame' || userConfig.type === 'lightning' || userConfig.type === 'pulse' || userConfig.type === 'shimmer' || userConfig.type === 'smoke') ? userConfig.particleColor : 'transparent',
                  color: (userConfig.type === 'sparkle' || userConfig.type === 'darkstars') ? userConfig.particleColor : 'transparent'
                }}
              >
                {userConfig.type === 'sparkle' && '✦'}
                {userConfig.type === 'darkstars' && '✦'}
              </span>
            );
          })}
        </span>
      )}
    </span>
  );
}

export default SpecialName;

