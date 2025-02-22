using System;

namespace ServiceProvider.Core.Domain.Inspectors
{
    /// <summary>
    /// Represents the current status of an inspector in the system
    /// </summary>
    /// <remarks>
    /// This enumeration is fundamental to the inspector mobilization workflow and determines an inspector's 
    /// availability for assignments. Status transitions should follow the logical progression: 
    /// Inactive -> Available -> Mobilized, with Suspended being a special state that can be applied when needed.
    /// 
    /// Valid status transitions:
    /// - Inactive -> Available
    /// - Available -> Mobilized
    /// - Mobilized -> Available
    /// - Any -> Suspended
    /// - Suspended -> Available
    /// </remarks>
    [Serializable]
    public enum InspectorStatus
    {
        /// <summary>
        /// Inspector is registered but not currently available for assignments
        /// </summary>
        Inactive = 0,

        /// <summary>
        /// Inspector is ready and available for assignment
        /// </summary>
        Available = 1,

        /// <summary>
        /// Inspector is currently assigned and actively working
        /// </summary>
        Mobilized = 2,

        /// <summary>
        /// Inspector is temporarily blocked from assignments
        /// </summary>
        Suspended = 3
    }
}