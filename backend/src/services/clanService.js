const axios = require('axios');
const { normalizeRankName } = require('../utils/clanRanks');

/**
 * Fetch clan members from the official RuneScape clan API
 */
async function fetchClanMembersFromRS(clanName) {
  try {
    const url = `http://services.runescape.com/m=clan-hiscores/members_lite.ws?clanName=${encodeURIComponent(clanName)}`;
    console.log(`Fetching clan members from: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Charset': 'utf-8'
      },
      transformResponse: [(data) => {
        // Handle different encodings - convert buffer to string properly
        if (Buffer.isBuffer(data)) {
          return data.toString('utf8');
        }
        return data;
      }]
    });

    if (!response.data) {
      throw new Error('No data received from RuneScape API');
    }

    // Parse CSV response - the format is: "Name","Rank"
    const lines = response.data.trim().split(/\r?\n/);
    const members = [];

    // Debug: Log first few lines to see the actual format
    console.log('First 3 lines of CSV:');
    console.log(lines.slice(0, 3).map((l, i) => `Line ${i}: ${JSON.stringify(l)}`).join('\n'));

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Debug first line with space
      if (i < 100 && line.toLowerCase().includes('petty')) {
        console.log(`\nFound petty line ${i}:`);
        console.log('Raw line:', JSON.stringify(line));
        console.log('Char codes:', [...line].map((c, idx) => `${idx}:${c.charCodeAt(0)}`).join(' '));
      }

      // CSV Format is: Name,Rank,TotalXP,Kills (comma-separated, no quotes)
      const parts = line.split(',').map(p => p.trim());
      
      if (parts.length >= 2) {
        const rawName = parts[0];
        const rawRank = parts[1];
        const clanXp = parts.length >= 3 ? parseInt(parts[2]) || 0 : 0;
        const kills = parts.length >= 4 ? parseInt(parts[3]) || 0 : 0;
        
        // Clean the name - replace Unicode replacement character and normalize spaces
        const cleanName = rawName
          .replace(/\uFFFD/g, ' ') // Replace � (char 65533) with normal space
          .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ') // Replace all types of spaces
          .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
          .trim();
        
        const cleanRank = normalizeRankName(rawRank);
        
        // Debug cleaned name
        if (i < 100 && cleanName.toLowerCase().includes('petty')) {
          console.log(`After cleaning: "${cleanName}"`);
          console.log('Clean char codes:', [...cleanName].map((c, idx) => `${idx}:${c.charCodeAt(0)}`).join(' '));
        }
        
        if (cleanName && cleanRank) {
          members.push({ 
            name: cleanName, 
            rank: cleanRank,
            clan_xp: clanXp,
            kills: kills
          });
        }
      }
    }

    console.log(`Successfully fetched ${members.length} members from clan ${clanName}`);
    return members;
  } catch (error) {
    console.error(`Error fetching clan members from RS API:`, error.message);
    return null;
  }
}

/**
 * Alternative method to fetch clan members (if primary fails)
 */
async function fetchClanMembersAlternative(clanName) {
  try {
    console.log(`Trying alternative method for clan: ${clanName}`);
    // You could implement a backup method here if needed
    return null;
  } catch (error) {
    console.error('Alternative fetch method failed:', error.message);
    return null;
  }
}

/**
 * Try to fetch clan members from any available source
 */
async function fetchClanMembersFromAnywhere(clanName) {
  let members = await fetchClanMembersFromRS(clanName);
  
  if (!members || members.length === 0) {
    console.log('Primary method failed, trying alternative...');
    members = await fetchClanMembersAlternative(clanName);
  }

  return members || [];
}

/**
 * Fetch general clan statistics
 */
async function fetchClanStats(clanName) {
  try {
    const members = await fetchClanMembersFromAnywhere(clanName);
    
    if (!members || members.length === 0) {
      return null;
    }

    return {
      totalMembers: members.length,
      clanName: clanName
    };
  } catch (error) {
    console.error('Error fetching clan stats:', error.message);
    return null;
  }
}

module.exports = {
  fetchClanMembersFromRS,
  fetchClanMembersAlternative,
  fetchClanMembersFromAnywhere,
  fetchClanStats
};

