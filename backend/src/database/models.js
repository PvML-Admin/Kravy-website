const db = require('../config/database');
const { getRankIcon, getRankColor, CLAN_RANKS_HIERARCHY } = require('../utils/clanRanks');

class MemberModel {
  static async create(name, displayName = null) {
    const result = await db.runAsync(
      'INSERT INTO members (name, display_name) VALUES (?, ?)',
      [name.toLowerCase(), displayName || name]
    );
    return result;
  }

  static async findByName(name) {
    return await db.getAsync('SELECT * FROM members WHERE name = ?', [name.toLowerCase()]);
  }

  static async findById(id) {
    return await db.getAsync('SELECT * FROM members WHERE id = ?', [id]);
  }

  static async getAll(activeOnly = true, sortByRank = false, ranks = null) {
    let query = 'SELECT * FROM members';
    const params = [];
    const whereClauses = [];

    if (activeOnly) {
      whereClauses.push('is_active = TRUE');
    }

    if (ranks && ranks.length > 0) {
      whereClauses.push(`clan_rank IN (${ranks.map(() => '?').join(',')})`);
      params.push(...ranks);
    }
    
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (sortByRank) {
      const rankOrderClause = CLAN_RANKS_HIERARCHY.map((rank) => `WHEN '${rank}' THEN ${CLAN_RANKS_HIERARCHY.indexOf(rank)}`).join(' ');
      query += ` ORDER BY CASE clan_rank ${rankOrderClause} ELSE 999 END, name ASC`;
    } else {
      query += ' ORDER BY total_xp DESC, name ASC';
    }

    const members = await db.allAsync(query, params);

    return members.map(member => {
      const rank = member.clan_rank && CLAN_RANKS_HIERARCHY.includes(member.clan_rank) ? member.clan_rank : 'Recruit';
      return {
        ...member,
        rank_icon: getRankIcon(rank),
        rank_color: getRankColor(rank)
      };
    });
  }

  static async getHiscores(skill = 'Overall', xpBracket = null) {
    let query;
    let params = [];
    const xpConditions = {
      lessThan1b: 'm.total_xp < 1000000000',
      '1b': 'm.total_xp >= 1000000000 AND m.total_xp < 2000000000',
      '2b': 'm.total_xp >= 2000000000 AND m.total_xp < 3000000000',
      '3b': 'm.total_xp >= 3000000000 AND m.total_xp < 4000000000',
      '4b': 'm.total_xp >= 4000000000 AND m.total_xp < 5000000000',
      '5b': 'm.total_xp >= 5000000000 AND m.total_xp < 5800000000',
      max: 'm.total_xp >= 5800000000'
    };

    const whereClauses = ['m.is_active = TRUE'];
    if (xpBracket && xpConditions[xpBracket]) {
      whereClauses.push(xpConditions[xpBracket]);
    }

    if (skill === 'Overall') {
      whereClauses.push('m.total_rank IS NOT NULL');
      query = `
        SELECT m.id, m.name, m.display_name, m.total_xp, m.combat_level, m.total_rank, m.is_active,
          (SELECT SUM(level) FROM skills WHERE member_id = m.id) as total_level
        FROM members m
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY m.total_rank ASC
      `;
    } else {
      whereClauses.push('s.skill_name = ?', 's.rank IS NOT NULL');
      params.push(skill);
      query = `
        SELECT 
          m.id, m.name, m.display_name, m.combat_level, m.is_active, m.total_xp,
          (SELECT SUM(level) FROM skills WHERE member_id = m.id) as total_level,
          s.rank as total_rank,
          s.level
        FROM members m
        JOIN skills s ON m.id = s.member_id
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY s.rank ASC
      `;
    }

    const members = await db.allAsync(query, params);
    
    // Filter out members with no name and add avatar URL
    return members
      .filter(member => member && typeof member.name === 'string' && member.name.trim() !== '')
      .map(member => ({
        ...member,
        avatar_url: `http://services.runescape.com/m=avatar-rs/${encodeURIComponent(member.name)}/chat.png`
      }));
  }

  static async getHiscoresXpBrackets(skill = 'Overall') {
    const xpBrackets = {
      lessThan1b: 0,
      '1b': 0,
      '2b': 0,
      '3b': 0,
      '4b': 0,
      '5b': 0,
      max: 0
    };
    
    // In a real scenario, you'd query the database for counts in each bracket.
    // For now, we'll just return a dummy structure.
    // This will be implemented properly in a future step.
    const query = `
      SELECT
        SUM(CASE WHEN total_xp < 1000000000 THEN 1 ELSE 0 END) as lessThan1b,
        SUM(CASE WHEN total_xp >= 1000000000 AND total_xp < 2000000000 THEN 1 ELSE 0 END) as "1b",
        SUM(CASE WHEN total_xp >= 2000000000 AND total_xp < 3000000000 THEN 1 ELSE 0 END) as "2b",
        SUM(CASE WHEN total_xp >= 3000000000 AND total_xp < 4000000000 THEN 1 ELSE 0 END) as "3b",
        SUM(CASE WHEN total_xp >= 4000000000 AND total_xp < 5000000000 THEN 1 ELSE 0 END) as "4b",
        SUM(CASE WHEN total_xp >= 5000000000 AND total_xp < 5800000000 THEN 1 ELSE 0 END) as "5b",
        SUM(CASE WHEN total_xp >= 5800000000 THEN 1 ELSE 0 END) as max
      FROM members
      WHERE is_active = TRUE
    `;
    
    const brackets = await db.getAsync(query);
    return brackets;
  }

  static async getAllHiscoresData() {
    const query = `
      SELECT
        m.id, m.name, m.display_name, m.total_xp, m.combat_level, m.total_rank, m.is_active, m.is_discord_booster,
        (SELECT SUM(level) FROM skills WHERE member_id = m.id) as total_level,
        s.skill_name, s.level as skill_level, s.xp as skill_xp, s.rank as skill_rank
      FROM members m
      LEFT JOIN skills s ON m.id = s.member_id
      WHERE m.is_active = TRUE
    `;
    const rows = await db.allAsync(query);

    const membersMap = new Map();

    for (const row of rows) {
      if (!membersMap.has(row.id)) {
        membersMap.set(row.id, {
          id: row.id,
          name: row.name,
          display_name: row.display_name,
          total_xp: row.total_xp,
          combat_level: row.combat_level,
          total_rank: row.total_rank,
          is_active: row.is_active,
          is_discord_booster: row.is_discord_booster,
          total_level: row.total_level,
          avatar_url: `http://services.runescape.com/m=avatar-rs/${encodeURIComponent(row.name)}/chat.png`,
          skills: []
        });
      }
      if (row.skill_name) {
        membersMap.get(row.id).skills.push({
          skill_name: row.skill_name,
          level: row.skill_level,
          xp: row.skill_xp,
          rank: row.skill_rank
        });
      }
    }

    return Array.from(membersMap.values());
  }

  static async getUnsynced(activeOnly = true) {
    const query = activeOnly
      ? 'SELECT * FROM members WHERE is_active = TRUE AND last_synced IS NULL ORDER BY name'
      : 'SELECT * FROM members WHERE last_synced IS NULL ORDER BY name';
    return await db.allAsync(query);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    
    if (data.total_xp !== undefined) {
      fields.push('total_xp = ?');
      values.push(data.total_xp);
    }
    if (data.total_rank !== undefined) {
      fields.push('total_rank = ?');
      values.push(data.total_rank);
    }
    if (data.clan_xp !== undefined) {
      fields.push('clan_xp = ?');
      values.push(data.clan_xp);
    }
    if (data.kills !== undefined) {
      fields.push('kills = ?');
      values.push(data.kills);
    }
    if (data.combat_level !== undefined) {
      fields.push('combat_level = ?');
      values.push(data.combat_level);
    }
    if (data.last_synced !== undefined) {
      fields.push('last_synced = ?');
      values.push(data.last_synced);
    }
    if (data.display_name !== undefined) {
      fields.push('display_name = ?');
      values.push(data.display_name);
    }
    if (data.clan_rank !== undefined) {
      fields.push('clan_rank = ?');
      values.push(data.clan_rank);
    }

    if (fields.length === 0) return;

    values.push(id);
    return await db.runAsync(`UPDATE members SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async delete(id) {
    return await db.runAsync('DELETE FROM members WHERE id = ?', [id]);
  }

  static async setActive(id, isActive) {
    return await db.runAsync('UPDATE members SET is_active = ? WHERE id = ?', [isActive, id]);
  }

  static async setDiscordBooster(id, isBooster) {
    return await db.runAsync('UPDATE members SET is_discord_booster = ? WHERE id = ?', [isBooster ? 1 : 0, id]);
  }
}

class SnapshotModel {
  static async create(memberId, totalXp) {
    return await db.runAsync(
      'INSERT INTO xp_snapshots (member_id, total_xp) VALUES (?, ?)',
      [memberId, totalXp]
    );
  }

  static async getByMember(memberId, limit = 100) {
    return await db.allAsync(
      'SELECT * FROM xp_snapshots WHERE member_id = ? ORDER BY timestamp DESC LIMIT ?',
      [memberId, limit]
    );
  }

  static async getLatest(memberId) {
    return await db.getAsync(
      'SELECT * FROM xp_snapshots WHERE member_id = ? ORDER BY timestamp DESC LIMIT 1',
      [memberId]
    );
  }

  static async getByTimeRange(memberId, startDate, endDate) {
    return await db.allAsync(
      'SELECT * FROM xp_snapshots WHERE member_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
      [memberId, startDate, endDate]
    );
  }
}

class SkillModel {
  static async upsert(memberId, skillId, skillName, level, xp, rank, dailyXpGain, weeklyXpGain) {
    return await db.runAsync(
      `INSERT INTO skills (member_id, skill_id, skill_name, level, xp, rank, daily_xp_gain, weekly_xp_gain, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(member_id, skill_id) DO UPDATE SET
         level = excluded.level,
         xp = excluded.xp,
         rank = excluded.rank,
         daily_xp_gain = excluded.daily_xp_gain,
         weekly_xp_gain = excluded.weekly_xp_gain,
         updated_at = CURRENT_TIMESTAMP`,
      [memberId, skillId, skillName, level, xp, rank, dailyXpGain, weeklyXpGain]
    );
  }

  static async getByMember(memberId) {
    return await db.allAsync(
      'SELECT * FROM skills WHERE member_id = ? ORDER BY skill_id',
      [memberId]
    );
  }

  static async getSkillHistory(memberId, skillName) {
    return await db.allAsync(
      'SELECT * FROM skills WHERE member_id = ? AND skill_name = ? ORDER BY updated_at DESC',
      [memberId, skillName]
    );
  }

  static async getTopGains(period = 'daily', limit = 10) {
    const gainColumn = period === 'weekly' ? 'weekly_xp_gain' : 'daily_xp_gain';
    const query = `
      SELECT
        m.id,
        m.name,
        m.display_name,
        SUM(s.${gainColumn}) as xpGain
      FROM skills s
      JOIN members m ON s.member_id = m.id
      WHERE m.is_active = TRUE
      GROUP BY m.id, m.name, m.display_name
      HAVING SUM(s.${gainColumn}) > 0
      ORDER BY xpGain DESC
      LIMIT ?
    `;
    const results = await db.allAsync(query, [limit]);
    // Convert BIGINT xpGain to number (PostgreSQL returns lowercase column names)
    return results.map(row => ({
      ...row,
      xpGain: parseInt(row.xpgain || row.xpGain) || 0
    }));
  }
}

class SyncLogModel {
  static async create(memberId, success, errorMessage = null) {
    return await db.runAsync(
      'INSERT INTO sync_log (member_id, success, error_message) VALUES (?, ?, ?)',
      [memberId, success, errorMessage]
    );
  }

  static async getRecent(limit = 100) {
    return await db.allAsync(
      `SELECT sl.*, m.name as member_name
       FROM sync_log sl
       LEFT JOIN members m ON sl.member_id = m.id
       ORDER BY sl.timestamp DESC
       LIMIT ?`,
      [limit]
    );
  }
}

class ActivityModel {
  static async create(memberId, activityDate, text, details, category) {
    const sql = `
      INSERT INTO activities (member_id, activity_date, text, details, category) 
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (member_id, activity_date, text) DO NOTHING
    `;
    try {
      const result = await db.runAsync(sql, [memberId, activityDate, text, details, category]);
      return result;
    } catch (error) {
      // Ignore duplicate activities
      if (error.message.includes('duplicate key')) {
        return null;
      }
      throw error;
    }
  }

  static async getRecent(limit = 100) {
    return await db.allAsync(`
      SELECT 
        a.*,
        m.name as member_name,
        m.display_name,
        a.activity_date as sort_key
      FROM activities a
      JOIN members m ON a.member_id = m.id
      ORDER BY a.activity_date DESC
      LIMIT ?
    `, [limit]);
  }

  static async getByMember(memberId, limit = 50) {
    return await db.allAsync(`
      SELECT 
        *,
        activity_date as sort_key
      FROM activities
      WHERE member_id = ?
      ORDER BY activity_date DESC
      LIMIT ?
    `, [memberId, limit]);
  }

  static async deleteOld(daysToKeep = 30) {
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    return await db.runAsync(
      'DELETE FROM activities WHERE activity_date < ?',
      [cutoff]
    );
  }
}

class ClanEventModel {
  static async create(memberName, eventType) {
    return await db.runAsync(
      'INSERT INTO clan_events (member_name, event_type) VALUES (?, ?)',
      [memberName, eventType]
    );
  }

  static async getRecent(limit = 10) {
    return await db.allAsync(
      'SELECT * FROM clan_events ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
  }
}

module.exports = {
  MemberModel,
  SnapshotModel,
  SkillModel,
  SyncLogModel,
  ActivityModel,
  ClanEventModel
};
