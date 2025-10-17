/**
 * RuneScape Clan Rank System
 * Ranks in hierarchical order, with associated metadata.
 */
const CLAN_RANKS = {
  'Owner':        { priority: 1,  icon: 'https://runescape.wiki/images/Owner_clan_rank.png',        color: '#FFD700' },
  'Deputy Owner': { priority: 2,  icon: 'https://runescape.wiki/images/Deputy_owner_clan_rank.png',color: '#E0E0E0' },
  'Overseer':     { priority: 3,  icon: 'https://runescape.wiki/images/Overseer_clan_rank.png',    color: '#4A90E2' },
  'Coordinator':  { priority: 4,  icon: 'https://runescape.wiki/images/Coordinator_clan_rank.png',  color: '#9B59B6' },
  'Organiser':    { priority: 5,  icon: 'https://runescape.wiki/images/Organiser_clan_rank.png',    color: '#3498DB' },
  'Admin':        { priority: 6,  icon: 'https://runescape.wiki/images/Admin_clan_rank.png',        color: '#E74C3C' },
  'General':      { priority: 7,  icon: 'https://runescape.wiki/images/General_clan_rank.png',      color: '#F39C12' },
  'Captain':      { priority: 8,  icon: 'https://runescape.wiki/images/Captain_clan_rank.png',      color: '#1ABC9C' },
  'Lieutenant':   { priority: 9,  icon: 'https://runescape.wiki/images/Lieutenant_clan_rank.png',   color: '#16A085' },
  'Sergeant':     { priority: 10, icon: 'https://runescape.wiki/images/Sergeant_clan_rank.png',    color: '#27AE60' },
  'Corporal':     { priority: 11, icon: 'https://runescape.wiki/images/Corporal_clan_rank.png',    color: '#CD7F32' },
  'Recruit':      { priority: 12, icon: 'https://runescape.wiki/images/Recruit_clan_rank.png',      color: '#95A5A6' },
  'Guest':        { priority: 13, icon: 'https://runescape.wiki/images/Guest_clan_rank.png',        color: '#BDC3C7' }
};

const CLAN_RANKS_HIERARCHY = Object.keys(CLAN_RANKS);
const DEFAULT_RANK = 'Recruit';

function getRankData(rankName) {
  return CLAN_RANKS[rankName] || CLAN_RANKS[DEFAULT_RANK];
}

function getRankIcon(rankName) {
  return getRankData(rankName).icon;
}

function getRankColor(rankName) {
  return getRankData(rankName).color;
}

function normalizeRankName(rankName) {
  if (typeof rankName !== 'string' || !rankName.trim()) {
    return DEFAULT_RANK;
  }
  
  const cleaned = rankName.trim();
  for (const key in CLAN_RANKS) {
    if (key.toLowerCase() === cleaned.toLowerCase()) {
      return key;
    }
  }

  return DEFAULT_RANK;
}

function sortMembersByRank(members) {
  return [...members].sort((a, b) => {
    const rankA = getRankData(a.clan_rank);
    const rankB = getRankData(b.clan_rank);
    return rankA.priority - rankB.priority;
  });
}

module.exports = {
  getRankIcon,
  getRankColor,
  normalizeRankName,
  sortMembersByRank,
  CLAN_RANKS_HIERARCHY
};
