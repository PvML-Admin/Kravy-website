const express = require('express');
const router = express.Router();
const axios = require('axios');
const { fetchClanMembersFromAnywhere } = require('../services/clanService');
const { MemberModel, ClanEventModel } = require('../database/models');
const { isAdmin } = require('../middleware/auth');

/**
 * Proxy for fetching a clan's banner image to avoid CORS issues.
 */
router.get('/banner/:clanName', async (req, res) => {
  try {
    const { clanName } = req.params;
    const imageUrl = `http://services.runescape.com/m=avatar-rs/l=3/a=102/g=${encodeURIComponent(clanName)}/clan_image.png`;

    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream'
    });

    res.setHeader('Content-Type', 'image/png');
    response.data.pipe(res);
  } catch (error) {
    res.status(404).json({ success: false, error: 'Clan banner not found.' });
  }
});

/**
 * Fetch and import all clan members in one go
 */
router.post('/import-members', isAdmin, async (req, res) => {
  try {
    const { clanName } = req.body;
    
    if (!clanName) {
      return res.status(400).json({ success: false, error: 'Clan name is required.' });
    }

    console.log(`Importing members from clan: ${clanName}`);
    
    // Fetch clan members from RuneScape API
    const clanMembers = await fetchClanMembersFromAnywhere(clanName);
    
    if (!clanMembers || clanMembers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Could not fetch clan members. Clan may not exist or API is unavailable.' 
      });
    }

    console.log(`Found ${clanMembers.length} members in clan ${clanName}`);

    // Import members into database
    const imported = [];
    const skipped = [];

    console.log(`[Import] Processing ${clanMembers.length} members...`);

    for (const member of clanMembers) {
      try {
        const existing = await MemberModel.findByName(member.name);
        
        if (existing) {
          // Update existing member's clan data
          await MemberModel.update(existing.id, { 
            clan_rank: member.rank,
            clan_xp: member.clan_xp || 0,
            kills: member.kills || 0
          });
          skipped.push(member.name);
        } else {
          await MemberModel.create(member.name, member.name);
          // Update clan rank, clan_xp, and kills
          const newMember = await MemberModel.findByName(member.name);
          if (newMember) {
            await MemberModel.update(newMember.id, { 
              clan_rank: member.rank,
              clan_xp: member.clan_xp || 0,
              kills: member.kills || 0
            });
          }
          imported.push(member.name);
          console.log(`[Import] Added: ${member.name} (${member.rank}, Clan XP: ${member.clan_xp || 0})`);
        }
      } catch (error) {
        console.error(`[Import] Error importing member ${member.name}:`, error);
        skipped.push(member.name);
      }
    }

    console.log(`[Import] Complete. Imported: ${imported.length}, Skipped: ${skipped.length}`);

    res.json({
      success: true,
      imported: imported.length,
      skipped: skipped.length,
      total: clanMembers.length,
      message: `Imported ${imported.length} new members, skipped ${skipped.length} existing members.`
    });
  } catch (error) {
    console.error('Error importing clan members:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to import clan members.' 
    });
  }
});

/**
 * Smart sync: Fetch clan members, add new ones, remove old ones
 */
router.post('/sync-membership', isAdmin, async (req, res) => {
  try {
    const { clanName } = req.body;
    
    if (!clanName) {
      return res.status(400).json({ success: false, error: 'Clan name is required.' });
    }

    console.log(`Syncing membership for clan: ${clanName}`);
    
    // Fetch current clan members from RuneScape
    const currentClanMembers = await fetchClanMembersFromAnywhere(clanName);
    
    if (!currentClanMembers || currentClanMembers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Could not fetch clan members.' 
      });
    }

    // Get current members from database
    const dbMembers = await MemberModel.getAll(false); // Get all, including inactive
    
    const currentClanMemberNames = currentClanMembers.map(m => m.name.toLowerCase());
    const dbMemberNames = dbMembers.map(m => m.name.toLowerCase());

    // Find members to add (in clan but not in DB)
    const membersToAdd = currentClanMembers.filter(
      cm => !dbMemberNames.includes(cm.name.toLowerCase())
    );

    // Find members to remove (in DB but not in clan)
    const membersToRemove = dbMembers.filter(
      dm => !currentClanMemberNames.includes(dm.name.toLowerCase()) && dm.is_active
    );

    let added = 0;
    let removed = 0;
    const addedNames = [];
    const removedNames = [];

    // Add new members
    console.log(`[Sync Membership] Adding ${membersToAdd.length} new members...`);
    for (const member of membersToAdd) {
      try {
        await MemberModel.create(member.name, member.name);
        const newMember = await MemberModel.findByName(member.name);
        if (newMember) {
          await MemberModel.update(newMember.id, { 
            clan_rank: member.rank,
            clan_xp: member.clan_xp || 0,
            kills: member.kills || 0
          });
        }
        await ClanEventModel.create(member.name, 'join');
        added++;
        addedNames.push(member.name);
        console.log(`[Sync Membership] Added: ${member.name} (Clan XP: ${member.clan_xp || 0})`);
      } catch (error) {
        console.error(`[Sync Membership] Error adding member ${member.name}:`, error);
      }
    }
    
    // Update clan XP and kills for existing members
    console.log(`[Sync Membership] Updating clan data for existing members...`);
    for (const member of currentClanMembers) {
      try {
        const existing = await MemberModel.findByName(member.name);
        if (existing && existing.is_active) {
          await MemberModel.update(existing.id, {
            clan_rank: member.rank,
            clan_xp: member.clan_xp || 0,
            kills: member.kills || 0
          });
        }
      } catch (error) {
        console.error(`[Sync Membership] Error updating member ${member.name}:`, error);
      }
    }

    // Mark removed members as inactive
    console.log(`[Sync Membership] Removing ${membersToRemove.length} members...`);
    for (const member of membersToRemove) {
      try {
        await MemberModel.setActive(member.id, false);
        await ClanEventModel.create(member.name, 'leave');
        removed++;
        removedNames.push(member.name);
        console.log(`[Sync Membership] Removed: ${member.name}`);
      } catch (error) {
        console.error(`[Sync Membership] Error removing member ${member.name}:`, error);
      }
    }

    const kept = currentClanMembers.length - added;

    console.log(`[Sync Membership] Complete. Added: ${added}, Removed: ${removed}, Kept: ${kept}`);

    res.json({
      success: true,
      results: {
        kept,
        added,
        removed,
        addedNames,
        removedNames,
        source: 'RuneScape Clan Hiscores'
      },
      message: `Added ${added} members, removed ${removed} members. Total active: ${currentClanMembers.length}`
    });
  } catch (error) {
    console.error('Error syncing clan membership:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to sync clan membership.' 
    });
  }
});

module.exports = router;

