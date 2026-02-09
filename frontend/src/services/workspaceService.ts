// =============================================================================
// Workspace Management (No Login Required)
// =============================================================================

export class WorkspaceService {
  private static readonly WORKSPACE_ID_KEY = 'lorance_workspace_id';

  /**
   * Get or create workspace ID for session isolation
   */
  static getWorkspaceId(): string {
    let workspaceId = localStorage.getItem(this.WORKSPACE_ID_KEY);
    
    if (!workspaceId) {
      // Generate a new workspace ID
      workspaceId = `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(this.WORKSPACE_ID_KEY, workspaceId);
    }
    
    return workspaceId;
  }

  /**
   * Reset workspace (for testing or fresh start)
   */
  static resetWorkspace(): string {
    localStorage.removeItem(this.WORKSPACE_ID_KEY);
    return this.getWorkspaceId();
  }

  /**
   * Check if workspace exists
   */
  static hasWorkspace(): boolean {
    return localStorage.getItem(this.WORKSPACE_ID_KEY) !== null;
  }
}