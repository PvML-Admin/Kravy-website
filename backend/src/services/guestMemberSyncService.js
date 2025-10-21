const { fetchPlayerProfile } = require('./runemetrics');
const { BingoModel } = require('../database/models');

class GuestMemberSyncService {
  constructor() {
    this.syncInProgress = new Set();
  }

  /**
   * Sync a specific guest member's activities for bingo tracking
   */
  async syncGuestMember(guestMemberId, displayName) {
    if (this.syncInProgress.has(guestMemberId)) {
      return;
    }

    try {
      this.syncInProgress.add(guestMemberId);

      // Fetch activities from RuneMetrics
      const profileData = await fetchPlayerProfile(displayName, 50);
      const activities = profileData?.activities || [];
      
      
      if (!activities || activities.length === 0) {
        return;
      }

      // Store activities for bingo processing (but not clan tracking)
      // We'll store these in a separate guest_activities table or similar
      // For now, let's just return the activities for bingo processing
      return activities;

    } catch (error) {
      console.error(`[Guest Sync] Failed to sync ${displayName}:`, error.message);
      return null;
    } finally {
      this.syncInProgress.delete(guestMemberId);
    }
  }

  /**
   * Sync all active guest members for active bingo boards
   */
  async syncActiveGuestMembers() {
    try {

      // Get all active bingo boards
      const activeBoards = await BingoModel.getAllBoards();
      const activeBoardIds = activeBoards
        .filter(board => board.is_active)
        .map(board => board.id);

      if (activeBoardIds.length === 0) {
        return;
      }

      // Get all guest members in active boards
      const guestMembers = await BingoModel.getActiveGuestMembers(activeBoardIds);
      
      if (guestMembers.length === 0) {
        return;
      }

      // Sync each guest member
      const syncPromises = guestMembers.map(guest => 
        this.syncGuestMember(guest.id, guest.display_name)
      );

      await Promise.allSettled(syncPromises);

    } catch (error) {
      console.error('[Guest Sync] Error in guest member sync batch:', error);
    }
  }

  /**
   * Get recent activities for a guest member (for bingo processing)
   */
  async getGuestMemberRecentActivities(displayName, hoursBack = 24) {
    try {
      const profileData = await fetchPlayerProfile(displayName, 50);
      const activities = profileData?.activities || [];
      
      if (!activities) return [];

      // Filter to recent activities only
      const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
      return activities.filter(activity => 
        new Date(activity.date).getTime() > cutoffTime
      );

    } catch (error) {
      console.error(`[Guest Sync] Error fetching activities for ${displayName}:`, error);
      return [];
    }
  }
}

module.exports = new GuestMemberSyncService();
